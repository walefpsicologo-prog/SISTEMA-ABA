import { CONFIG, sb } from './config.js';
import { currentUser, flash, setBusy, userError } from './api.js?v=20260817-signup2';

const BUILD='20260817-signup2';
const COOLDOWN_MS=120000;
const normalizeEmail=v=>String(v||'').trim().toLowerCase();
function stampKey(kind,email){return `wt_${kind}_${normalizeEmail(email)}`}
function remaining(kind,email){try{const ts=Number(localStorage.getItem(stampKey(kind,email))||0);return Math.max(0,COOLDOWN_MS-(Date.now()-ts))}catch{return 0}}
function mark(kind,email){try{localStorage.setItem(stampKey(kind,email),String(Date.now()))}catch{}}
function authMessage(err){
 const s=String(err?.message||err||'').toLowerCase();
 const code=String(err?.code||'').toLowerCase();
 if(s.includes('email rate limit')||s.includes('rate limit')||s.includes('too many requests')||code.includes('over_email_send_rate_limit'))return'O serviço de confirmação por e-mail atingiu o limite temporário. Não repita o cadastro. Se esta foi sua primeira tentativa, aguarde alguns minutos e use “Reenviar confirmação” uma única vez.';
 if(s.includes('email not authorized'))return'O serviço de e-mail da plataforma ainda não está autorizado a enviar para este endereço. Entre em contato com o suporte.';
 return userError(err);
}

export async function login(email,password){const{data,error}=await sb.auth.signInWithPassword({email:normalizeEmail(email),password});if(error)throw error;if(!data?.session)throw new Error('session_not_created');return data}
export async function signup({name,email,password,redirect=`/area-aluno.html?v=${BUILD}`}){const{data,error}=await sb.auth.signUp({email:normalizeEmail(email),password,options:{data:{full_name:String(name||'').trim()},emailRedirectTo:CONFIG.SITE_URL+redirect}});if(error)throw error;return data}
export async function resendSignup(email){const e=normalizeEmail(email);if(remaining('resend',e)>0)throw new Error('resend_cooldown');mark('resend',e);const{error}=await sb.auth.resend({type:'signup',email:e,options:{emailRedirectTo:CONFIG.SITE_URL+`/area-aluno.html?v=${BUILD}`}});if(error)throw error}
export async function requestPasswordReset(email){const e=normalizeEmail(email);if(remaining('recovery',e)>0)throw new Error('recovery_cooldown');mark('recovery',e);const{error}=await sb.auth.resetPasswordForEmail(e,{redirectTo:CONFIG.SITE_URL+'/nova-senha.html'});if(error)throw error}
export async function logout(){try{await sb.auth.signOut()}finally{location.href=`/area-aluno.html?v=${BUILD}`}}

export function bindAuthBox(root=document){
 const loginForm=root.querySelector('#loginForm'),signupForm=root.querySelector('#signupForm'),loginTab=root.querySelector('#loginTab'),signupTab=root.querySelector('#signupTab'),forgot=root.querySelector('#forgotLink'),forgotBox=root.querySelector('#forgotBox'),resend=root.querySelector('#resendLink');
 if(!loginForm||!signupForm)return;
 const tab=s=>{loginTab?.classList.toggle('on',!s);signupTab?.classList.toggle('on',s);loginForm.hidden=s;signupForm.hidden=!s;if(forgotBox)forgotBox.hidden=true};
 loginTab?.addEventListener('click',()=>tab(false));signupTab?.addEventListener('click',()=>tab(true));
 loginForm.addEventListener('submit',async e=>{e.preventDefault();const btn=loginForm.querySelector('button[type=submit]');setBusy(btn,true,'Entrando…');try{await login(loginForm.querySelector('[name=email]').value,loginForm.querySelector('[name=password]').value);location.reload()}catch(err){flash(authMessage(err),'bad',9000);setBusy(btn,false)}});
 signupForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=signupForm.querySelector('button[type=submit]');const email=normalizeEmail(signupForm.querySelector('[name=email]').value);
  if(remaining('signup',email)>0){flash('Este cadastro já foi enviado há poucos instantes. Não envie novamente. Aguarde a confirmação por e-mail.','bad',10000);return}
  mark('signup',email);setBusy(btn,true,'Criando cadastro…');
  const waitHint=setTimeout(()=>{if(btn.disabled)btn.textContent='Ainda processando… não envie novamente'},8000);
  try{
   const data=await signup({name:signupForm.querySelector('[name=name]').value,email,password:signupForm.querySelector('[name=password]').value});
   loginForm.querySelector('[name=email]').value=email;
   if(data.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0){tab(false);flash('Este e-mail já possui cadastro. Entre com sua senha. Se ainda não confirmou o e-mail, use “Reenviar confirmação” somente uma vez.','bad',12000)}
   else if(!data.session){tab(false);flash('Cadastro criado. Verifique sua caixa de entrada e o spam para confirmar o e-mail. Não refaça o cadastro enquanto aguarda.','ok',15000)}
   else location.reload();
  }catch(err){
   loginForm.querySelector('[name=email]').value=email;
   const msg=String(err?.message||'').toLowerCase();const code=String(err?.code||'').toLowerCase();
   if(msg.includes('rate limit')||msg.includes('too many requests')||code.includes('over_email_send_rate_limit'))tab(false);
   flash(authMessage(err),'bad',14000);
  }finally{clearTimeout(waitHint);setBusy(btn,false)}
 });
 forgot?.addEventListener('click',e=>{e.preventDefault();if(forgotBox){forgotBox.hidden=false;forgotBox.querySelector('[name=email]').value=loginForm.querySelector('[name=email]').value||''}});
 forgotBox?.addEventListener('submit',async e=>{e.preventDefault();const btn=forgotBox.querySelector('button[type=submit]');setBusy(btn,true,'Enviando…');try{await requestPasswordReset(forgotBox.querySelector('[name=email]').value);flash('Se houver uma conta com esse e-mail, enviaremos as instruções para redefinição. Não solicite novamente nos próximos minutos.','ok',10000);forgotBox.hidden=true}catch(err){const s=String(err?.message||'');flash(s==='recovery_cooldown'?'Aguarde antes de solicitar outro e-mail de recuperação.':authMessage(err),'bad',10000)}finally{setBusy(btn,false)}});
 resend?.addEventListener('click',async e=>{e.preventDefault();const email=normalizeEmail(loginForm.querySelector('[name=email]').value);if(!email)return flash('Informe o e-mail no campo de login para reenviar a confirmação.','bad');try{await resendSignup(email);flash('Solicitação enviada. Verifique caixa de entrada e spam. Não clique novamente enquanto aguarda.','ok',12000)}catch(err){const s=String(err?.message||'');flash(s==='resend_cooldown'?'A confirmação já foi solicitada. Aguarde pelo menos dois minutos antes de tentar novamente.':authMessage(err),'bad',12000)}})
}
export async function authState(){return currentUser()}
export { sb, CONFIG };
