import { sb, CONFIG } from './config.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const LOGIN_URL='https://walef-sistema-aba.vercel.app/';
let me=null,clients=[],professionals=[],assignments=[];

function ensure(){
  if($('#abaAccessAdminStyle'))return;
  const st=document.createElement('style');st.id='abaAccessAdminStyle';st.textContent=`
  .aba-access-modal{position:fixed;inset:0;background:rgba(8,26,59,.7);display:none;align-items:center;justify-content:center;padding:16px;z-index:1600}.aba-access-modal.on{display:flex}
  .aba-access-box{width:min(760px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:9px;padding:16px}.aba-access-box h3{margin-top:0;color:#0f2a5a}
  .aba-access-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.aba-access-grid .wide{grid-column:1/-1}.aba-access-grid label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#5f7085;font-weight:850;margin-bottom:4px}.aba-access-grid input,.aba-access-grid select{width:100%;padding:9px;border:1px solid #c8d1dd;border-radius:6px}.aba-access-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:14px}.aba-access-cred{padding:13px;border:1px solid #b9d5c5;background:#eef7f1;border-radius:7px;color:#174f37}.aba-access-cred code{display:block;font-size:14px;margin-top:5px;word-break:break-all}.aba-access-cred a{color:#0f2a5a;font-weight:850}.aba-access-clients{min-height:150px}.aba-access-note{font-size:11px;color:#667386;line-height:1.5}.aba-access-row{display:flex;gap:6px;flex-wrap:wrap}
  @media(max-width:650px){.aba-access-grid{grid-template-columns:1fr}.aba-access-grid .wide{grid-column:auto}}
  `;document.head.appendChild(st);
  const m=document.createElement('div');m.id='abaAccessModal';m.className='aba-access-modal';m.innerHTML='<div class="aba-access-box"><h3 id="abaAccessTitle">Acesso</h3><div id="abaAccessBody"></div><div class="aba-access-actions"><button class="aba-btn secondary" id="abaAccessCancel">Fechar</button><button class="aba-btn" id="abaAccessSave">Salvar</button></div></div>';document.body.appendChild(m);
  $('#abaAccessCancel').onclick=()=>m.classList.remove('on');m.onclick=e=>{if(e.target===m)m.classList.remove('on')};
}

async function reloadMeta(){
  const [c,p,a]=await Promise.all([
    sb.from('aba_clients').select('id,full_name,preferred_name,guardian_name,guardian_email,active').eq('active',true).order('full_name'),
    sb.from('aba_professionals').select('id,user_id,full_name,email,registration,specialty,role,active').order('full_name'),
    sb.from('aba_client_professionals').select('id,client_id,professional_id,active')
  ]);
  if(c.error)throw c.error;if(p.error)throw p.error;if(a.error)throw a.error;
  clients=c.data||[];professionals=p.data||[];assignments=a.data||[];
}
async function boot(){
  ensure();const {data:{session}}=await sb.auth.getSession();if(!session)return;
  const {data}=await sb.from('aba_professionals').select('id,role').eq('user_id',session.user.id).eq('active',true).maybeSingle();me=data;if(me?.role!=='admin')return;
  try{await reloadMeta();patch()}catch(e){console.error('access admin boot',e)}
}
async function call(payload){
  const {data:{session}}=await sb.auth.getSession();if(!session)throw new Error('Sessão administrativa não encontrada.');
  const r=await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/aba-provision-access`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:CONFIG.SUPABASE_KEY},body:JSON.stringify(payload)});
  const j=await r.json();if(!r.ok)throw new Error(j.error||'Falha ao criar acesso.');return j;
}
function credentialText(j){return j.password?`Sistema ABA\nAcesso: ${LOGIN_URL}\nLogin: ${j.email}\nSenha temporária: ${j.password}`:`Sistema ABA\nAcesso: ${LOGIN_URL}\nLogin: ${j.email}\nUse a senha atual ou a opção “Recuperar senha”.`;}
function creds(j){
  const body=$('#abaAccessBody');$('#abaAccessSave').style.display='none';
  body.innerHTML=`<div class="aba-access-cred"><b>${j.password?'Acesso pronto':'Acesso já existente'}</b><code>Acesso: <a href="${LOGIN_URL}" target="_blank" rel="noopener">${LOGIN_URL}</a></code><code>Login: ${esc(j.email||'')}</code>${j.password?`<code>Senha temporária: ${esc(j.password)}</code><p>Entregue esta senha somente à profissional. Ela deve trocar a senha após o primeiro acesso.</p>`:'<p>Esse e-mail já possui conta. A profissional usa a senha atual ou “Recuperar senha”.</p>'}</div><div class="aba-access-row" style="margin-top:10px"><button class="aba-btn secondary" id="copyCred">Copiar dados de acesso</button><a class="aba-btn ghost" href="${LOGIN_URL}" target="_blank" rel="noopener">Abrir login</a></div>`;
  $('#copyCred').onclick=async()=>{await navigator.clipboard.writeText(credentialText(j));$('#copyCred').textContent='Copiado'};
}
function clientOptions(selected=[]){const set=new Set(selected);return clients.map(c=>`<option value="${c.id}" ${set.has(c.id)?'selected':''}>${esc(c.preferred_name||c.full_name)}</option>`).join('')}
function roleOptions(selected='professional'){return [['applicator','Aplicador'],['professional','Profissional'],['supervisor','Supervisor'],['viewer','Visualizador']].map(([v,l])=>`<option value="${v}" ${selected===v?'selected':''}>${l}</option>`).join('')}

function newProfessionalModal(){
  ensure();$('#abaAccessTitle').textContent='Novo profissional + acesso';$('#abaAccessSave').style.display='';$('#abaAccessSave').textContent='Cadastrar e gerar acesso';
  $('#abaAccessBody').innerHTML=`<div class="aba-access-grid"><div class="wide"><label>Nome completo *</label><input id="aaName"></div><div><label>E-mail/login *</label><input id="aaEmail" type="email"></div><div><label>Registro profissional</label><input id="aaReg"></div><div><label>Especialidade</label><input id="aaSpecialty" value="Psicologia / ABA"></div><div><label>Função</label><select id="aaRole">${roleOptions('professional')}</select></div><div class="wide"><label>Aprendizes vinculados</label><select id="aaClients" class="aba-access-clients" multiple>${clientOptions()}</select></div></div><p class="aba-access-note">O cadastro cria o registro profissional e a conta de login na mesma operação. Os vínculos podem ser alterados depois.</p>`;
  $('#abaAccessModal').classList.add('on');
  $('#abaAccessSave').onclick=async()=>{const name=$('#aaName').value.trim(),email=$('#aaEmail').value.trim(),ids=[...$('#aaClients').selectedOptions].map(o=>o.value);if(!name||!email)return alert('Preencha nome e e-mail.');$('#abaAccessSave').disabled=true;try{const j=await call({action:'provision_professional',full_name:name,email,registration:$('#aaReg').value.trim()||null,specialty:$('#aaSpecialty').value.trim()||null,role:$('#aaRole').value,client_ids:ids,sync_client_links:true});creds(j);await reloadMeta();$('#abaRefresh')?.click()}catch(e){alert(e.message||e)}finally{$('#abaAccessSave').disabled=false}};
}
function professionalAccessModal(id){
  const p=professionals.find(x=>x.id===id);if(!p)return;
  ensure();const selected=assignments.filter(a=>a.professional_id===id&&a.active).map(a=>a.client_id);
  $('#abaAccessTitle').textContent=`Acesso profissional · ${p.full_name}`;$('#abaAccessSave').style.display='';$('#abaAccessSave').textContent=p.user_id?'Salvar vínculos':'Gerar acesso';
  $('#abaAccessBody').innerHTML=`<div class="aba-access-grid"><div class="wide"><label>Nome completo</label><input id="paName" value="${esc(p.full_name)}"></div><div><label>E-mail/login *</label><input id="paEmail" type="email" value="${esc(p.email||'')}"></div><div><label>Registro</label><input id="paReg" value="${esc(p.registration||'')}"></div><div><label>Especialidade</label><input id="paSpecialty" value="${esc(p.specialty||'')}"></div><div><label>Função</label><select id="paRole">${roleOptions(p.role)}</select></div><div class="wide"><label>Aprendizes vinculados</label><select id="paClients" class="aba-access-clients" multiple>${clientOptions(selected)}</select></div></div><p class="aba-access-note">${p.user_id?'Conta de login já vinculada. Você pode atualizar os aprendizes autorizados ou redefinir uma senha temporária.':'Ainda não existe conta de login para este cadastro. Clique em “Gerar acesso”.'}</p>${p.user_id?'<div class="aba-access-row"><button class="aba-btn danger small" type="button" id="paResetPassword">Redefinir senha temporária</button></div>':''}`;
  $('#abaAccessModal').classList.add('on');
  $('#paResetPassword')?.addEventListener('click',async()=>{if(!confirm('Gerar uma nova senha temporária para esta profissional? A senha anterior deixará de funcionar.'))return;const b=$('#paResetPassword');b.disabled=true;try{const j=await call({action:'reset_professional_password',professional_id:p.id});creds(j)}catch(e){alert(e.message||e)}finally{b.disabled=false}});
  $('#abaAccessSave').onclick=async()=>{const ids=[...$('#paClients').selectedOptions].map(o=>o.value),email=$('#paEmail').value.trim();if(!email)return alert('Informe o e-mail/login.');$('#abaAccessSave').disabled=true;try{const j=await call({action:'provision_professional',professional_id:p.id,full_name:$('#paName').value.trim(),email,registration:$('#paReg').value.trim()||null,specialty:$('#paSpecialty').value.trim()||null,role:$('#paRole').value,client_ids:ids,sync_client_links:true});creds(j);await reloadMeta();$('#abaRefresh')?.click()}catch(e){alert(e.message||e)}finally{$('#abaAccessSave').disabled=false}};
}
function guardianModal(clientId){
  const c=clients.find(x=>x.id===clientId);if(!c)return;ensure();$('#abaAccessTitle').textContent=`Acesso dos pais · ${c.preferred_name||c.full_name}`;$('#abaAccessSave').style.display='';$('#abaAccessSave').textContent='Gerar acesso dos pais';
  $('#abaAccessBody').innerHTML=`<div class="aba-access-grid"><div><label>Nome do responsável</label><input id="agName" value="${esc(c.guardian_name||'')}"></div><div><label>Relação</label><input id="agRel" value="responsável"></div><div class="wide"><label>E-mail/login *</label><input id="agEmail" type="email" value="${esc(c.guardian_email||'')}"></div></div><p class="aba-access-note">O acesso familiar é somente leitura: avaliação, próxima reavaliação, sessões, programas e gráficos de evolução.</p>`;
  $('#abaAccessModal').classList.add('on');$('#abaAccessSave').onclick=async()=>{$('#abaAccessSave').disabled=true;try{const j=await call({action:'provision_guardian',client_id:clientId,email:$('#agEmail').value.trim(),guardian_name:$('#agName').value.trim(),relationship:$('#agRel').value.trim()||'responsável'});creds(j)}catch(e){alert(e.message||e)}finally{$('#abaAccessSave').disabled=false}};
}

function patch(){
  if(me?.role!=='admin')return;
  const pv=$('#abaView-professionals');
  if(pv){
    const old=pv.querySelector('[data-prof-new]');if(old&&!old.dataset.accessReplaced){const b=old.cloneNode(true);b.dataset.accessReplaced='1';b.textContent='Novo profissional + acesso';b.removeAttribute('data-prof-new');b.onclick=newProfessionalModal;old.replaceWith(b)}
    pv.querySelectorAll('[data-prof-edit]').forEach(btn=>{const id=btn.dataset.profEdit,td=btn.parentElement;if(!td||td.querySelector(`[data-prof-access="${id}"]`))return;const p=professionals.find(x=>x.id===id);if(!p)return;const b=document.createElement('button');b.className='aba-btn small ghost';b.dataset.profAccess=id;b.textContent=p.user_id?'Acesso':'Gerar acesso';b.onclick=()=>professionalAccessModal(id);td.appendChild(document.createTextNode(' '));td.appendChild(b)});
  }
  $$('[data-client-edit]').forEach(btn=>{const td=btn.parentElement;if(!td||td.querySelector('[data-guardian-access]'))return;const b=document.createElement('button');b.className='aba-btn small ghost';b.dataset.guardianAccess=btn.dataset.clientEdit;b.textContent='Acesso dos pais';b.onclick=()=>guardianModal(b.dataset.guardianAccess);td.appendChild(document.createTextNode(' '));td.appendChild(b)});
  const roleSelect=$('#abaModalBody select[name="role"]');if(roleSelect&&!roleSelect.querySelector('option[value="applicator"]')){const o=document.createElement('option');o.value='applicator';o.textContent='applicator';roleSelect.appendChild(o)}
}

new MutationObserver(()=>queueMicrotask(patch)).observe(document.documentElement,{subtree:true,childList:true});
boot();
