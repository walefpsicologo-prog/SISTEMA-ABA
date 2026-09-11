import { sb, CONFIG } from './config.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const LOGIN_URL='https://walef-sistema-aba.vercel.app/';
const dt=v=>v?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'Nunca';
let me=null, clients=[], professionals=[], assignments=[];

function ensure(){
  if($('#abaAccessAdminStyle'))return;
  const st=document.createElement('style');st.id='abaAccessAdminStyle';st.textContent=`
  .aba-access-modal{position:fixed;inset:0;background:rgba(8,26,59,.72);display:none;align-items:center;justify-content:center;padding:16px;z-index:1900}.aba-access-modal.on{display:flex}
  .aba-access-box{width:min(880px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:13px;padding:18px;box-shadow:0 22px 70px rgba(8,26,59,.24)}.aba-access-box h3{margin:0;color:#0f2a5a}.aba-access-sub{margin:5px 0 16px;font-size:12px;color:#65768a;line-height:1.5}
  .aba-access-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.aba-access-grid .wide{grid-column:1/-1}.aba-access-grid label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#5f7085;font-weight:850;margin-bottom:4px}.aba-access-grid input,.aba-access-grid select{width:100%;padding:10px;border:1px solid #c8d1dd;border-radius:8px;font:inherit}.aba-access-clients{min-height:150px}
  .aba-access-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.aba-access-note{font-size:11px;color:#667386;line-height:1.5}.aba-access-row{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
  .aba-access-list{display:grid;gap:10px}.aba-access-person{border:1px solid #d8e0e9;border-radius:11px;padding:13px;background:#fff}.aba-access-person.inactive{background:#f7f8fa;opacity:.84}.aba-access-person header{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.aba-access-person h4{margin:0;color:#173d73;font-size:15px}.aba-access-person p{margin:4px 0 0;color:#607185;font-size:12px;line-height:1.45}.aba-access-status{padding:4px 8px;border-radius:999px;font-size:10px;font-weight:850;background:#e8f5ed;color:#246044}.aba-access-status.off{background:#f2e9e9;color:#7a3838}.aba-access-person .aba-access-row{margin-top:11px;padding-top:10px;border-top:1px solid #edf1f5}
  .aba-access-cred{padding:14px;border:1px solid #b9d5c5;background:#eef7f1;border-radius:9px;color:#174f37}.aba-access-cred code{display:block;font-size:14px;margin-top:6px;word-break:break-all}.aba-access-cred a{color:#0f2a5a;font-weight:850}.aba-access-divider{height:1px;background:#e7ebf0;margin:16px 0}.aba-access-section-title{margin:0 0 9px;color:#173d73;font-size:14px}.aba-access-loading{padding:24px;text-align:center;color:#667386}
  @media(max-width:650px){.aba-access-grid{grid-template-columns:1fr}.aba-access-grid .wide{grid-column:auto}.aba-access-person header{flex-direction:column}.aba-access-row .aba-btn{flex:1 1 46%}.aba-access-actions{display:grid;grid-template-columns:1fr 1fr}}
  `;document.head.appendChild(st);
  const m=document.createElement('div');m.id='abaAccessModal';m.className='aba-access-modal';m.innerHTML='<div class="aba-access-box"><h3 id="abaAccessTitle">Acesso</h3><p id="abaAccessSub" class="aba-access-sub"></p><div id="abaAccessBody"></div><div class="aba-access-actions"><button class="aba-btn secondary" id="abaAccessCancel">Fechar</button><button class="aba-btn" id="abaAccessSave">Salvar</button></div></div>';document.body.appendChild(m);
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

async function call(payload){
  const {data:{session}}=await sb.auth.getSession();if(!session)throw new Error('Sessão administrativa não encontrada.');
  const r=await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/aba-provision-access`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,apikey:CONFIG.SUPABASE_KEY},body:JSON.stringify(payload)});
  const j=await r.json();if(!r.ok)throw new Error(j.error||'Falha ao administrar o acesso.');return j;
}

function credentialText(j){return `Sistema ABA\nAcesso: ${LOGIN_URL}\nLogin: ${j.email}\nSenha temporária: ${j.password}`}
function showCredentials(j,back){
  const body=$('#abaAccessBody');$('#abaAccessSave').style.display='none';$('#abaAccessSub').textContent='Credencial temporária gerada e gravada no Supabase Auth.';
  body.innerHTML=`<div class="aba-access-cred"><b>Acesso pronto</b><code>Acesso: <a href="${LOGIN_URL}" target="_blank" rel="noopener">${LOGIN_URL}</a></code><code>Login: ${esc(j.email||'')}</code><code>Senha temporária: ${esc(j.password||'')}</code><p>Entregue esta senha somente ao usuário. A senha deve ser trocada após o primeiro acesso.</p></div><div class="aba-access-row" style="margin-top:10px"><button class="aba-btn secondary" id="copyCred">Copiar dados de acesso</button><a class="aba-btn ghost" href="${LOGIN_URL}" target="_blank" rel="noopener">Abrir login</a>${back?'<button class="aba-btn secondary" id="backAccess">Voltar aos acessos</button>':''}</div>`;
  $('#copyCred').onclick=async()=>{await navigator.clipboard.writeText(credentialText(j));$('#copyCred').textContent='Copiado'};
  if(back)$('#backAccess').onclick=back;
}

function clientOptions(selected=[]){const set=new Set(selected);return clients.map(c=>`<option value="${c.id}" ${set.has(c.id)?'selected':''}>${esc(c.preferred_name||c.full_name)}</option>`).join('')}
function roleOptions(selected='professional'){return [['applicator','Aplicador'],['professional','Profissional'],['supervisor','Supervisor'],['viewer','Visualizador']].map(([v,l])=>`<option value="${v}" ${selected===v?'selected':''}>${l}</option>`).join('')}

function newProfessionalModal(){
  ensure();$('#abaAccessTitle').textContent='Novo profissional + acesso';$('#abaAccessSub').textContent='Crie o cadastro profissional, o login e os vínculos autorizados.';$('#abaAccessSave').style.display='';$('#abaAccessSave').textContent='Cadastrar e gerar acesso';
  $('#abaAccessBody').innerHTML=`<div class="aba-access-grid"><div class="wide"><label>Nome completo *</label><input id="aaName"></div><div><label>E-mail/login *</label><input id="aaEmail" type="email"></div><div><label>Registro profissional</label><input id="aaReg"></div><div><label>Especialidade</label><input id="aaSpecialty" value="Psicologia / ABA"></div><div><label>Função</label><select id="aaRole">${roleOptions('professional')}</select></div><div class="wide"><label>Pacientes vinculados</label><select id="aaClients" class="aba-access-clients" multiple>${clientOptions()}</select></div></div><p class="aba-access-note">A autorização é definida no banco do Sistema ABA. O e-mail não concede privilégio por si só.</p>`;
  $('#abaAccessModal').classList.add('on');
  $('#abaAccessSave').onclick=async()=>{const name=$('#aaName').value.trim(),email=$('#aaEmail').value.trim(),ids=[...$('#aaClients').selectedOptions].map(o=>o.value);if(!name||!email)return alert('Preencha nome e e-mail.');const b=$('#abaAccessSave');b.disabled=true;try{let j=await call({action:'provision_professional',full_name:name,email,registration:$('#aaReg').value.trim()||null,specialty:$('#aaSpecialty').value.trim()||null,role:$('#aaRole').value,client_ids:ids,sync_client_links:true});await reloadMeta();if(j.password)showCredentials(j,()=>professionalAccessModal(j.professional_id));else professionalAccessModal(j.professional_id)}catch(e){alert(e.message||e)}finally{b.disabled=false}};
}

async function professionalAccessModal(id){
  const p=professionals.find(x=>x.id===id);if(!p)return;ensure();
  $('#abaAccessTitle').textContent=`Acesso profissional · ${p.full_name}`;$('#abaAccessSub').textContent='Login, vínculos, status e segurança da conta profissional.';$('#abaAccessSave').style.display='';$('#abaAccessSave').textContent=p.user_id?'Salvar alterações':'Gerar acesso';
  let meta=null;try{meta=(await call({action:'list_professional_access',professional_id:id})).professional}catch{}
  const selected=assignments.filter(a=>a.professional_id===id&&a.active).map(a=>a.client_id), active=meta?.active??p.active;
  $('#abaAccessBody').innerHTML=`<div class="aba-access-grid"><div class="wide"><label>Nome completo</label><input id="paName" value="${esc(p.full_name)}"></div><div><label>E-mail/login *</label><input id="paEmail" type="email" value="${esc(meta?.auth_email||p.email||'')}"></div><div><label>Registro</label><input id="paReg" value="${esc(p.registration||'')}"></div><div><label>Especialidade</label><input id="paSpecialty" value="${esc(p.specialty||'')}"></div><div><label>Função</label><select id="paRole">${roleOptions(p.role)}</select></div><div class="wide"><label>Pacientes vinculados</label><select id="paClients" class="aba-access-clients" multiple>${clientOptions(selected)}</select></div></div><div class="aba-access-divider"></div><div class="aba-access-person ${active?'':'inactive'}"><header><div><h4>${active?'Acesso ativo':'Acesso desativado'}</h4><p>Último login: ${dt(meta?.last_sign_in_at)} · Auth: ${meta?.auth_exists?'vinculado':'não provisionado'}</p></div><span class="aba-access-status ${active?'':'off'}">${active?'ATIVO':'INATIVO'}</span></header>${p.user_id?`<div class="aba-access-row"><button class="aba-btn small secondary" id="paReset">Redefinir senha</button><button class="aba-btn small secondary" id="paRevoke">Revogar sessões + nova senha</button><button class="aba-btn small ${active?'danger':'secondary'}" id="paToggle">${active?'Desativar acesso':'Reativar acesso'}</button></div>`:''}</div>`;
  $('#abaAccessModal').classList.add('on');
  const back=()=>professionalAccessModal(id);
  $('#paReset')?.addEventListener('click',async()=>{if(!confirm('Gerar nova senha temporária? A senha anterior deixará de funcionar.'))return;const j=await call({action:'reset_professional_password',professional_id:id});showCredentials(j,back)});
  $('#paRevoke')?.addEventListener('click',async()=>{if(!confirm('Encerrar o acesso anterior por rotação de senha e gerar uma nova senha temporária?'))return;const j=await call({action:'revoke_professional_sessions',professional_id:id});showCredentials(j,back)});
  $('#paToggle')?.addEventListener('click',async()=>{const action=active?'deactivate_professional':'reactivate_professional';if(active&&!confirm('Desativar este acesso profissional?'))return;await call({action,professional_id:id});await reloadMeta();professionalAccessModal(id)});
  $('#abaAccessSave').onclick=async()=>{const ids=[...$('#paClients').selectedOptions].map(o=>o.value),email=$('#paEmail').value.trim();if(!email)return alert('Informe o e-mail/login.');const b=$('#abaAccessSave');b.disabled=true;try{const j=await call({action:'provision_professional',professional_id:id,full_name:$('#paName').value.trim(),email,registration:$('#paReg').value.trim()||null,specialty:$('#paSpecialty').value.trim()||null,role:$('#paRole').value,client_ids:ids,sync_client_links:true,active});await reloadMeta();if(j.password)showCredentials(j,back);else professionalAccessModal(id);$('#abaRefresh')?.click()}catch(e){alert(e.message||e)}finally{b.disabled=false}};
}

function guardianCard(g){
  const active=Boolean(g.active),auth=Boolean(g.auth_exists),last=dt(g.last_sign_in_at);
  return `<article class="aba-access-person ${active?'':'inactive'}" data-ga="${g.id}"><header><div><h4>${esc(g.guardian_name||'Responsável')}</h4><p>${esc(g.guardian_email||g.auth_email||'')} · ${esc(g.relationship||'responsável')}<br>Último login: ${esc(last)} · ${auth?'Auth vinculado':'Auth não encontrado'}</p></div><span class="aba-access-status ${active?'':'off'}">${active?'ATIVO':'INATIVO'}</span></header><div class="aba-access-row"><button class="aba-btn small secondary" data-ga-reset="${g.id}">Redefinir senha</button><button class="aba-btn small secondary" data-ga-login="${g.id}">Alterar login</button><button class="aba-btn small secondary" data-ga-revoke="${g.id}">Revogar sessões</button><button class="aba-btn small ${active?'danger':'secondary'}" data-ga-toggle="${g.id}" data-active="${active?'1':'0'}">${active?'Desativar':'Reativar'}</button></div></article>`;
}

async function guardianModal(clientId){
  const c=clients.find(x=>x.id===clientId);if(!c)return;ensure();
  $('#abaAccessTitle').textContent=`ACESSOS DOS RESPONSÁVEIS · ${c.preferred_name||c.full_name}`;$('#abaAccessSub').textContent='Cada responsável tem login individual e só recebe os dados dos pacientes vinculados ao próprio usuário.';$('#abaAccessSave').style.display='';$('#abaAccessSave').textContent='Gerar novo acesso';$('#abaAccessModal').classList.add('on');
  $('#abaAccessBody').innerHTML='<div class="aba-access-loading">Carregando acessos…</div>';
  let result;try{result=await call({action:'list_guardians',client_id:clientId})}catch(e){$('#abaAccessBody').innerHTML=`<div class="aba-access-note">${esc(e.message||e)}</div>`;return}
  const guardians=result.guardians||[];
  $('#abaAccessBody').innerHTML=`<h4 class="aba-access-section-title">Responsáveis cadastrados</h4><div class="aba-access-list">${guardians.map(g=>guardianCard(g)).join('')||'<div class="aba-access-note">Nenhum responsável cadastrado.</div>'}</div><div class="aba-access-divider"></div><h4 class="aba-access-section-title">Novo responsável</h4><div class="aba-access-grid"><div><label>Nome</label><input id="agName" placeholder="Nome do responsável"></div><div><label>Relação</label><input id="agRel" value="responsável" placeholder="mãe, pai, responsável..."></div><div class="wide"><label>E-mail/login *</label><input id="agEmail" type="email" placeholder="email@exemplo.com"></div></div><p class="aba-access-note">Ao gerar acesso, se o e-mail já existir no Auth e ainda não tiver senha temporária nesta operação, o sistema fará uma redefinição controlada para entregar uma credencial utilizável.</p>`;
  const byId=new Map(guardians.map(g=>[g.id,g]));
  $$('[data-ga-reset]').forEach(b=>b.onclick=async()=>{const g=byId.get(b.dataset.gaReset);if(!g)return;if(!confirm(`Gerar nova senha temporária para ${g.guardian_name||g.guardian_email}?`))return;try{const j=await call({action:'reset_guardian_password',guardian_access_id:g.id});showCredentials(j,()=>guardianModal(clientId))}catch(e){alert(e.message||e)}});
  $$('[data-ga-revoke]').forEach(b=>b.onclick=async()=>{const g=byId.get(b.dataset.gaRevoke);if(!g)return;if(!confirm(`Revogar o acesso anterior de ${g.guardian_name||g.guardian_email} por rotação de senha?`))return;try{const j=await call({action:'revoke_guardian_sessions',guardian_access_id:g.id});showCredentials(j,()=>guardianModal(clientId))}catch(e){alert(e.message||e)}});
  $$('[data-ga-toggle]').forEach(b=>b.onclick=async()=>{const active=b.dataset.active==='1',g=byId.get(b.dataset.gaToggle);if(!g)return;if(active&&!confirm(`Desativar o acesso de ${g.guardian_name||g.guardian_email}?`))return;try{await call({action:active?'deactivate_guardian':'reactivate_guardian',guardian_access_id:g.id});guardianModal(clientId)}catch(e){alert(e.message||e)}});
  $$('[data-ga-login]').forEach(b=>b.onclick=async()=>{const g=byId.get(b.dataset.gaLogin);if(!g)return;const email=prompt('Novo e-mail de login:',g.auth_email||g.guardian_email||'');if(!email||email.trim().toLowerCase()===(g.auth_email||g.guardian_email||'').toLowerCase())return;try{await call({action:'update_guardian_login',guardian_access_id:g.id,new_email:email.trim()});guardianModal(clientId)}catch(e){alert(e.message||e)}});
  $('#abaAccessSave').onclick=async()=>{const email=$('#agEmail').value.trim(),name=$('#agName').value.trim(),rel=$('#agRel').value.trim()||'responsável';if(!email)return alert('Informe o e-mail/login.');const b=$('#abaAccessSave');b.disabled=true;try{let j=await call({action:'provision_guardian',client_id:clientId,email,guardian_name:name,relationship:rel});if(!j.password)j=await call({action:'reset_guardian_password',guardian_access_id:j.guardian_access_id});showCredentials(j,()=>guardianModal(clientId))}catch(e){alert(e.message||e)}finally{b.disabled=false}};
}

function patch(){
  if(me?.role!=='admin')return;
  const pv=$('#abaView-professionals');
  if(pv){
    const old=pv.querySelector('[data-prof-new]');if(old&&!old.dataset.accessReplaced){const b=old.cloneNode(true);b.dataset.accessReplaced='1';b.textContent='Novo profissional + acesso';b.removeAttribute('data-prof-new');b.onclick=newProfessionalModal;old.replaceWith(b)}
    pv.querySelectorAll('[data-prof-edit]').forEach(btn=>{const id=btn.dataset.profEdit,td=btn.parentElement;if(!td||td.querySelector(`[data-prof-access="${id}"]`))return;const p=professionals.find(x=>x.id===id);if(!p||p.role==='admin')return;const b=document.createElement('button');b.className='aba-btn small ghost';b.dataset.profAccess=id;b.textContent=p.user_id?'Acesso':'Gerar acesso';b.onclick=()=>professionalAccessModal(id);td.appendChild(document.createTextNode(' '));td.appendChild(b)});
  }
  $$('[data-client-edit]').forEach(btn=>{const td=btn.parentElement;if(!td||td.querySelector('[data-guardian-access]'))return;const b=document.createElement('button');b.className='aba-btn small ghost';b.dataset.guardianAccess=btn.dataset.clientEdit;b.textContent='Acessos dos responsáveis';b.onclick=()=>guardianModal(b.dataset.guardianAccess);td.appendChild(document.createTextNode(' '));td.appendChild(b)});
  const roleSelect=$('#abaModalBody select[name="role"]');if(roleSelect&&!roleSelect.querySelector('option[value="applicator"]')){const o=document.createElement('option');o.value='applicator';o.textContent='applicator';roleSelect.appendChild(o)}
}

async function boot(){
  ensure();const {data:{session}}=await sb.auth.getSession();if(!session)return;
  const {data}=await sb.from('aba_professionals').select('id,role').eq('user_id',session.user.id).eq('active',true).maybeSingle();me=data;if(me?.role!=='admin')return;
  try{await reloadMeta();patch()}catch(e){console.error('access admin boot',e)}
}

(()=>{let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch()})}).observe(document.documentElement,{subtree:true,childList:true})})();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();