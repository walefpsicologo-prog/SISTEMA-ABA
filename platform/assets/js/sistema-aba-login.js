import { sb, CONFIG } from './config.js';
const form=document.querySelector('#abaLoginForm');
const msg=document.querySelector('#abaLoginMessage');
const forgot=document.querySelector('#abaForgot');
const parentHint=document.querySelector('#abaParentHint');
const APP='https://walef-sistema-aba.vercel.app';
const setMsg=(text,type='')=>{msg.textContent=text;msg.className='aba-login-message '+type};
const busy=(on)=>{const b=form.querySelector('button[type=submit]');b.disabled=on;b.textContent=on?'Validando…':'Entrar no Sistema ABA'};
async function accessDestination(userId){
  const {data:member,error}=await sb.from('aba_professionals').select('id,full_name,role,active').eq('user_id',userId).eq('active',true).maybeSingle();if(error)throw error;
  if(member)return member.role==='applicator'?`${APP}/app?area=aplicador`:`${APP}/app`;
  const {data:guardian,error:ge}=await sb.from('aba_guardian_access').select('id').eq('user_id',userId).eq('active',true).limit(1);if(ge)throw ge;
  if(guardian?.length)return `${APP}/app?area=pais`;return null;
}
async function redirectIfAuthorized(){const {data:{session}}=await sb.auth.getSession();if(!session)return;try{const dest=await accessDestination(session.user.id);if(dest)location.replace(dest)}catch{}}
form.addEventListener('submit',async e=>{e.preventDefault();setMsg('');busy(true);try{const email=form.email.value.trim(),password=form.password.value;const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;const dest=await accessDestination(data.user.id);if(!dest){await sb.auth.signOut();throw new Error('Esta conta não possui vínculo ativo com o Sistema ABA.')}setMsg('Acesso autorizado.','ok');location.replace(dest)}catch(err){const raw=String(err?.message||err||'Falha de autenticação.');setMsg(/invalid login credentials/i.test(raw)?'E-mail ou senha inválidos.':raw,'bad')}finally{busy(false)}});
forgot.addEventListener('click',async()=>{const email=form.email.value.trim();if(!email){setMsg('Informe o e-mail da conta para recuperar a senha.','bad');return}forgot.disabled=true;try{const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:CONFIG.SITE_URL+'/nova-senha.html'});if(error)throw error;setMsg('Se a conta existir, as instruções de recuperação serão enviadas por e-mail.','ok')}catch(err){setMsg(String(err?.message||err),'bad')}finally{forgot.disabled=false}});
parentHint?.addEventListener('click',()=>{setMsg('Pais e responsáveis usam o mesmo formulário com o login entregue pelo administrador. A conta será direcionada automaticamente ao dashboard familiar.','ok');form.email.focus()});
redirectIfAuthorized();
