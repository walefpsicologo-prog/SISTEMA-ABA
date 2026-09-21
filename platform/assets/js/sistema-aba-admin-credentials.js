import { sb, CONFIG } from './config.js';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const isStrong=p=>p.length>=14&&/[A-Z]/.test(p)&&/[a-z]/.test(p)&&/[0-9]/.test(p)&&/[^A-Za-z0-9]/.test(p);
const ABA_LOGIN='https://walef-sistema-aba.vercel.app/';
const PEDRO_ID='fb39c1ba-7750-4572-8073-6e885d3accbc';

function installStyle(){
  if($('#abaCredentialStyle'))return;
  const st=document.createElement('style');st.id='abaCredentialStyle';st.textContent=`
  .aba-credential-fab{position:fixed;right:18px;bottom:18px;z-index:1490;border:1px solid #0f2a5a;background:#0f2a5a;color:#fff;border-radius:8px;padding:10px 13px;font:800 12px Arial,sans-serif;box-shadow:0 8px 24px rgba(15,42,90,.2);cursor:pointer}
  .aba-parent-fab{position:fixed;right:18px;bottom:64px;z-index:1490;border:1px solid #1f6b4b;background:#1f6b4b;color:#fff;border-radius:8px;padding:10px 13px;font:800 12px Arial,sans-serif;box-shadow:0 8px 24px rgba(15,42,90,.16);cursor:pointer}
  .aba-credential-modal{position:fixed;inset:0;z-index:1800;background:rgba(8,26,59,.72);display:none;align-items:center;justify-content:center;padding:16px}.aba-credential-modal.on{display:flex}
  .aba-credential-box{width:min(620px,100%);background:#fff;border-radius:10px;padding:18px;color:#24364a;max-height:92vh;overflow:auto}.aba-credential-box h3{margin:0 0 6px;color:#0f2a5a}.aba-credential-box p{font-size:12px;line-height:1.5;color:#627083}
  .aba-credential-grid{display:grid;gap:10px;margin-top:14px}.aba-credential-grid label{font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.04em;color:#596b80}.aba-credential-grid input{width:100%;padding:10px;border:1px solid #c6d0dc;border-radius:7px;font:14px Arial,sans-serif}
  .aba-credential-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px;flex-wrap:wrap}.aba-credential-actions button{border:1px solid #0f2a5a;border-radius:7px;padding:9px 12px;font-weight:800;cursor:pointer}.aba-credential-actions .secondary{background:#fff;color:#0f2a5a}.aba-credential-actions .primary{background:#0f2a5a;color:#fff}.aba-credential-msg{margin-top:10px;padding:10px;border-radius:7px;font-size:12px;display:none}.aba-credential-msg.on{display:block}.aba-credential-msg.ok{background:#edf7f1;color:#205b3e;border:1px solid #b8d8c5}.aba-credential-msg.bad{background:#fff0f0;color:#842c2c;border:1px solid #dfb7b7}
  .aba-parent-card{border:1px solid #c8d9cf;background:#f5faf7;border-radius:8px;padding:12px;margin-top:10px}.aba-parent-card b{color:#174f37}.aba-parent-card code{display:block;margin-top:5px;font-size:13px;word-break:break-all}.aba-parent-card a{color:#0f2a5a;font-weight:800}
  @media(max-width:640px){.aba-credential-fab{right:12px;bottom:12px}.aba-parent-fab{right:12px;bottom:58px}}
  `;document.head.appendChild(st);
}

function modal(currentEmail){
  let m=$('#abaCredentialModal');
  if(!m){m=document.createElement('div');m.id='abaCredentialModal';m.className='aba-credential-modal';document.body.appendChild(m)}
  m.innerHTML=`<div class="aba-credential-box"><h3>Trocar credenciais do administrador</h3><p>Altere seu login sem criar outro prontuário profissional. O mesmo identificador interno e todos os vínculos clínicos permanecem preservados.</p><div class="aba-credential-grid"><div><label>E-mail atual</label><input value="${esc(currentEmail)}" disabled></div><div><label for="abaCredentialEmail">E-mail de login</label><input id="abaCredentialEmail" type="email" autocomplete="email" value="${esc(currentEmail)}"></div><div><label>Nova senha</label><input id="abaCredentialPassword" type="password" autocomplete="new-password" placeholder="mínimo 14 caracteres"></div><div><label>Confirmar nova senha</label><input id="abaCredentialPassword2" type="password" autocomplete="new-password"></div></div><p>A senha deve ter pelo menos 14 caracteres, com maiúscula, minúscula, número e símbolo. Mantenha o e-mail atual para trocar somente a senha. Alterações de e-mail podem exigir confirmação.</p><div id="abaCredentialMsg" class="aba-credential-msg"></div><div class="aba-credential-actions"><button class="secondary" id="abaCredentialCancel">Cancelar</button><button class="primary" id="abaCredentialSave">Trocar credenciais</button></div></div>`;
  m.classList.add('on');
  $('#abaCredentialCancel').onclick=()=>m.classList.remove('on');m.onclick=e=>{if(e.target===m)m.classList.remove('on')};
  $('#abaCredentialSave').onclick=async()=>{
    const email=($('#abaCredentialEmail').value.trim()||currentEmail||'').toLowerCase(),p=$('#abaCredentialPassword').value,p2=$('#abaCredentialPassword2').value,msg=$('#abaCredentialMsg'),btn=$('#abaCredentialSave');
    const show=(t,type)=>{msg.textContent=t;msg.className=`aba-credential-msg on ${type}`};
    if(!email||!/^\S+@\S+\.\S+$/.test(email))return show('Informe um e-mail válido.','bad');
    if(!isStrong(p))return show('A nova senha não atende aos requisitos de segurança.','bad');
    if(p!==p2)return show('As duas senhas não coincidem.','bad');
    const changingEmail=email!==String(currentEmail||'').toLowerCase();
    if(!confirm(changingEmail?'Confirmar a troca do e-mail e da senha do administrador?':'Confirmar a troca da senha do administrador?'))return;
    btn.disabled=true;show('Atualizando credenciais…','ok');
    try{
      const changes={password:p,data:{must_change_password:false}};if(changingEmail)changes.email=email;
      const {data,error}=await sb.auth.updateUser(changes);if(error)throw error;
      const activeEmail=data?.user?.email||currentEmail;
      let profileWarning=false;
      if(activeEmail&&activeEmail!==currentEmail){const {error:profileError}=await sb.from('aba_professionals').update({email:activeEmail,updated_at:new Date().toISOString()}).eq('user_id',data.user.id);profileWarning=Boolean(profileError)}
      const pending=String(data?.user?.new_email||'').toLowerCase()===email.toLowerCase()&&String(activeEmail||'').toLowerCase()!==email.toLowerCase();
      const message=pending?'Senha alterada. Confirme o novo e-mail para concluir a mudança do login.':changingEmail?'E-mail e senha atualizados.':'Senha alterada. Seu e-mail de login permanece o mesmo.';
      show(message+(profileWarning?' O e-mail do cadastro profissional ainda não foi sincronizado. Atualize a página.':''),profileWarning?'bad':'ok');
      $('#abaCredentialPassword').value='';$('#abaCredentialPassword2').value='';
    }catch(e){show(e?.message||'Não foi possível trocar as credenciais.','bad')}finally{btn.disabled=false}
  };
}

async function callAccess(payload){
  const {data:{session}}=await sb.auth.getSession();if(!session)throw new Error('Sessão administrativa não encontrada.');
  const r=await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/aba-provision-access`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:CONFIG.SUPABASE_KEY},body:JSON.stringify(payload)});
  const j=await r.json();if(!r.ok)throw new Error(j.error||'Falha ao criar acesso.');return j;
}
async function guardianCredential(email,name,relationship){
  let j=await callAccess({action:'provision_guardian',client_id:PEDRO_ID,email,guardian_name:name,relationship});
  if(!j.password)j=await callAccess({action:'reset_guardian_password',client_id:PEDRO_ID,email});
  return j;
}
function parentsModal(){
  let m=$('#abaCredentialModal');if(!m){m=document.createElement('div');m.id='abaCredentialModal';m.className='aba-credential-modal';document.body.appendChild(m)}
  m.innerHTML=`<div class="aba-credential-box"><h3>Acessos dos pais · Pedro</h3><p>Esta ação gera uma nova senha temporária para Danielle e cria ou redefine o acesso de Rafael. Os dois ficam vinculados somente ao cadastro de Pedro, com visualização familiar autorizada.</p><div id="abaParentsMsg" class="aba-credential-msg on ok">Pronto para gerar os dois acessos.</div><div id="abaParentsResult"></div><div class="aba-credential-actions"><button class="secondary" id="abaParentsClose">Fechar</button><button class="primary" id="abaParentsGenerate">Gerar acessos Danielle + Rafael</button></div></div>`;
  m.classList.add('on');$('#abaParentsClose').onclick=()=>m.classList.remove('on');m.onclick=e=>{if(e.target===m)m.classList.remove('on')};
  $('#abaParentsGenerate').onclick=async()=>{
    if(!confirm('Gerar ou redefinir agora os dois acessos dos pais do Pedro?'))return;
    const btn=$('#abaParentsGenerate'),msg=$('#abaParentsMsg'),res=$('#abaParentsResult');btn.disabled=true;msg.textContent='Gerando e validando os dois acessos…';msg.className='aba-credential-msg on ok';res.innerHTML='';
    try{
      const dani=await guardianCredential('dani.dms22@gmail.com','Danielle','mãe');
      const rafael=await guardianCredential('mfarias_rafael@hotmail.com','Rafael','pai');
      const text=`Sistema ABA - Pedro\nAcesso: ${ABA_LOGIN}\n\nDanielle\nLogin: ${dani.email}\nSenha temporária: ${dani.password}\n\nRafael\nLogin: ${rafael.email}\nSenha temporária: ${rafael.password}`;
      res.innerHTML=`<div class="aba-parent-card"><b>Danielle · mãe</b><code>Login: ${esc(dani.email)}</code><code>Senha temporária: ${esc(dani.password)}</code></div><div class="aba-parent-card"><b>Rafael · pai</b><code>Login: ${esc(rafael.email)}</code><code>Senha temporária: ${esc(rafael.password)}</code></div><div class="aba-parent-card"><a href="${ABA_LOGIN}" target="_blank" rel="noopener">Abrir Sistema ABA</a></div>`;
      msg.textContent='Os dois acessos foram gerados e vinculados ao Pedro.';msg.className='aba-credential-msg on ok';btn.textContent='Gerar novas senhas';
      const copy=document.createElement('button');copy.className='secondary';copy.textContent='Copiar os dois acessos';copy.onclick=async()=>{await navigator.clipboard.writeText(text);copy.textContent='Copiado'};btn.parentElement.insertBefore(copy,btn);
    }catch(e){msg.textContent=e?.message||'Não foi possível gerar os acessos.';msg.className='aba-credential-msg on bad'}finally{btn.disabled=false}
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
  if(!$('#abaParentFab')){const b=document.createElement('button');b.id='abaParentFab';b.className='aba-parent-fab';b.type='button';b.textContent='Pais do Pedro';b.onclick=parentsModal;document.body.appendChild(b)}
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
