import { sb, CONFIG } from './config.js';
const form=document.querySelector('#abaLoginForm');
const msg=document.querySelector('#abaLoginMessage');
const forgot=document.querySelector('#abaForgot');
const parentHint=document.querySelector('#abaParentHint');
const passwordToggle=document.querySelector('#abaPasswordToggle');
const passwordInput=document.querySelector('#abaPassword');
const APP='https://walef-sistema-aba.vercel.app';
const setMsg=(text,type='')=>{msg.textContent=text;msg.className='aba-login-message '+type};
const busy=(on)=>{const b=form.querySelector('button[type=submit]');b.disabled=on;b.setAttribute('aria-busy',String(on));b.textContent=on?'Validando…':'Entrar no Sistema ABA'};
const loginError=(err)=>{const raw=String(err?.message||err||'');if(/invalid login credentials/i.test(raw))return 'E-mail ou senha inválidos.';if(!navigator.onLine)return 'Sem conexão com a internet. Verifique a rede e tente novamente.';if(/rate limit|too many requests/i.test(raw))return 'Muitas tentativas em sequência. Aguarde antes de tentar novamente.';return 'Não foi possível autenticar agora. Tente novamente.'};
async function accessDestination(userId){
  const {data:member,error}=await sb.from('aba_professionals').select('id,full_name,role,active').eq('user_id',userId).eq('active',true).maybeSingle();if(error)throw error;
  if(member)return member.role==='applicator'?`${APP}/app?area=aplicador`:`${APP}/app`;
  const {data:guardian,error:ge}=await sb.from('aba_guardian_access').select('id').eq('user_id',userId).eq('active',true).limit(1);if(ge)throw ge;
  if(guardian?.length)return `${APP}/app?area=pais`;return null;
}
async function redirectIfAuthorized(){const {data:{session}}=await sb.auth.getSession();if(!session)return;try{const dest=await accessDestination(session.user.id);if(dest)location.replace(dest)}catch{setMsg('Não foi possível validar a sessão atual. Entre novamente.','bad')}}
passwordToggle?.addEventListener('click',()=>{const showing=passwordInput.type==='text';passwordInput.type=showing?'password':'text';passwordToggle.textContent=showing?'Mostrar':'Ocultar';passwordToggle.setAttribute('aria-pressed',String(!showing));passwordInput.focus()});
form.addEventListener('submit',async e=>{e.preventDefault();setMsg('');if(!form.reportValidity())return;busy(true);try{const email=form.email.value.trim(),password=form.password.value;const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;const dest=await accessDestination(data.user.id);if(!dest){await sb.auth.signOut();throw new Error('unauthorized_account')}setMsg('Acesso autorizado.','ok');location.replace(dest)}catch(err){setMsg(loginError(err),'bad')}finally{busy(false)}});
forgot.addEventListener('click',async()=>{const email=form.email.value.trim();if(!email||!form.email.checkValidity()){setMsg('Informe um e-mail válido para recuperar a senha.','bad');form.email.focus();return}forgot.disabled=true;forgot.setAttribute('aria-busy','true');try{const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:CONFIG.SITE_URL+'/nova-senha.html'});if(error)throw error;setMsg('Se a conta existir, as instruções de recuperação serão enviadas por e-mail.','ok')}catch{setMsg('Não foi possível solicitar a recuperação agora. Tente novamente.','bad')}finally{forgot.disabled=false;forgot.removeAttribute('aria-busy')}});
parentHint?.addEventListener('click',()=>{setMsg('Pais e responsáveis usam o mesmo formulário com o acesso entregue pelo administrador. O direcionamento para a área familiar é automático.','ok');form.email.focus()});
window.addEventListener('offline',()=>setMsg('Conexão perdida. O login ficará disponível quando a rede retornar.','bad'));
redirectIfAuthorized();