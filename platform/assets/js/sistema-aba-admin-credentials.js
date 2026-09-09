import { sb } from './config.js';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const isStrong=p=>p.length>=14&&/[A-Z]/.test(p)&&/[a-z]/.test(p)&&/[0-9]/.test(p)&&/[^A-Za-z0-9]/.test(p);

function installStyle(){
  if($('#abaCredentialStyle'))return;
  const st=document.createElement('style');st.id='abaCredentialStyle';st.textContent=`
  .aba-credential-fab{position:fixed;right:18px;bottom:18px;z-index:1490;border:1px solid #0f2a5a;background:#0f2a5a;color:#fff;border-radius:8px;padding:10px 13px;font:800 12px Arial,sans-serif;box-shadow:0 8px 24px rgba(15,42,90,.2);cursor:pointer}
  .aba-credential-modal{position:fixed;inset:0;z-index:1800;background:rgba(8,26,59,.72);display:none;align-items:center;justify-content:center;padding:16px}.aba-credential-modal.on{display:flex}
  .aba-credential-box{width:min(560px,100%);background:#fff;border-radius:10px;padding:18px;color:#24364a}.aba-credential-box h3{margin:0 0 6px;color:#0f2a5a}.aba-credential-box p{font-size:12px;line-height:1.5;color:#627083}
  .aba-credential-grid{display:grid;gap:10px;margin-top:14px}.aba-credential-grid label{font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.04em;color:#596b80}.aba-credential-grid input{width:100%;padding:10px;border:1px solid #c6d0dc;border-radius:7px;font:14px Arial,sans-serif}
  .aba-credential-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}.aba-credential-actions button{border:1px solid #0f2a5a;border-radius:7px;padding:9px 12px;font-weight:800;cursor:pointer}.aba-credential-actions .secondary{background:#fff;color:#0f2a5a}.aba-credential-actions .primary{background:#0f2a5a;color:#fff}.aba-credential-msg{margin-top:10px;padding:10px;border-radius:7px;font-size:12px;display:none}.aba-credential-msg.on{display:block}.aba-credential-msg.ok{background:#edf7f1;color:#205b3e;border:1px solid #b8d8c5}.aba-credential-msg.bad{background:#fff0f0;color:#842c2c;border:1px solid #dfb7b7}
  @media(max-width:640px){.aba-credential-fab{right:12px;bottom:12px}}
  `;document.head.appendChild(st);
}

function modal(currentEmail){
  let m=$('#abaCredentialModal');
  if(!m){m=document.createElement('div');m.id='abaCredentialModal';m.className='aba-credential-modal';document.body.appendChild(m)}
  m.innerHTML=`<div class="aba-credential-box"><h3>Trocar credenciais do administrador</h3><p>Altere seu login sem criar outro prontuário profissional. O mesmo identificador interno e todos os vínculos clínicos permanecem preservados.</p><div class="aba-credential-grid"><div><label>E-mail atual</label><input value="${esc(currentEmail)}" disabled></div><div><label>Novo e-mail de login</label><input id="abaCredentialEmail" type="email" autocomplete="email" placeholder="novo-email@exemplo.com"></div><div><label>Nova senha</label><input id="abaCredentialPassword" type="password" autocomplete="new-password" placeholder="mínimo 14 caracteres"></div><div><label>Confirmar nova senha</label><input id="abaCredentialPassword2" type="password" autocomplete="new-password"></div></div><p>A senha deve ter pelo menos 14 caracteres, com maiúscula, minúscula, número e símbolo. O Supabase pode exigir confirmação do novo e-mail.</p><div id="abaCredentialMsg" class="aba-credential-msg"></div><div class="aba-credential-actions"><button class="secondary" id="abaCredentialCancel">Cancelar</button><button class="primary" id="abaCredentialSave">Trocar credenciais</button></div></div>`;
  m.classList.add('on');
  $('#abaCredentialCancel').onclick=()=>m.classList.remove('on');m.onclick=e=>{if(e.target===m)m.classList.remove('on')};
  $('#abaCredentialSave').onclick=async()=>{
    const email=$('#abaCredentialEmail').value.trim().toLowerCase(),p=$('#abaCredentialPassword').value,p2=$('#abaCredentialPassword2').value,msg=$('#abaCredentialMsg'),btn=$('#abaCredentialSave');
    const show=(t,type)=>{msg.textContent=t;msg.className=`aba-credential-msg on ${type}`};
    if(!email||!/^\S+@\S+\.\S+$/.test(email))return show('Informe um novo e-mail válido.','bad');
    if(!isStrong(p))return show('A nova senha não atende aos requisitos de segurança.','bad');
    if(p!==p2)return show('As duas senhas não coincidem.','bad');
    if(email===String(currentEmail||'').toLowerCase())return show('O novo e-mail precisa ser diferente do login atual.','bad');
    if(!confirm('Confirmar a troca do e-mail de login e da senha do administrador?'))return;
    btn.disabled=true;show('Atualizando credenciais…','ok');
    try{
      const {data,error}=await sb.auth.updateUser({email,password:p,data:{module:'aba',aba_access:'admin'}});if(error)throw error;
      const activeEmail=data?.user?.email||currentEmail;
      if(activeEmail&&activeEmail!==currentEmail){await sb.from('aba_professionals').update({email:activeEmail,updated_at:new Date().toISOString(),notes:'Credenciais administrativas atualizadas pelo próprio administrador autenticado; identidade clínica preservada.'}).eq('user_id',data.user.id)}
      const pending=String(data?.user?.new_email||'').toLowerCase()===email.toLowerCase()&&String(activeEmail||'').toLowerCase()!==email.toLowerCase();
      show(pending?'Senha alterada. O novo e-mail foi solicitado e precisa ser confirmado antes de substituir o login atual.':'Credenciais alteradas. O login anterior deixa de valer conforme a confirmação do Supabase.','ok');
      $('#abaCredentialPassword').value='';$('#abaCredentialPassword2').value='';
    }catch(e){show(e?.message||'Não foi possível trocar as credenciais.','bad')}finally{btn.disabled=false}
  };
}

async function boot(){
  if(!location.pathname.includes('sistema-aba')&&!location.hostname.includes('walef-sistema-aba'))return;
  const {data:{session}}=await sb.auth.getSession();if(!session)return;
  const {data:me,error}=await sb.from('aba_professionals').select('id,user_id,email,role,active').eq('user_id',session.user.id).eq('active',true).maybeSingle();
  if(error||!me||me.role!=='admin')return;
  if(session.user.email&&me.email!==session.user.email){await sb.from('aba_professionals').update({email:session.user.email,updated_at:new Date().toISOString()}).eq('id',me.id)}
  installStyle();
  if(!$('#abaCredentialFab')){const b=document.createElement('button');b.id='abaCredentialFab';b.className='aba-credential-fab';b.type='button';b.textContent='Credenciais';b.onclick=()=>modal(session.user.email||me.email||'');document.body.appendChild(b)}
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
