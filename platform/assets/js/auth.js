import { CONFIG, sb } from './config.js';
import { currentUser, flash, setBusy, userError } from './api.js?v=20260817-stable1';

const BUILD='20260817-registerfix1';
const COOLDOWN_MS=120000;
const FORM_STARTED_AT=Date.now();
const normalizeEmail=v=>String(v||'').trim().toLowerCase();
function stampKey(kind,email){return `wt_${kind}_${normalizeEmail(email)}`}
function remaining(kind,email){try{const ts=Number(localStorage.getItem(stampKey(kind,email))||0);return Math.max(0,COOLDOWN_MS-(Date.now()-ts))}catch{return 0}}
function mark(kind,email){try{localStorage.setItem(stampKey(kind,email),String(Date.now()))}catch{}}
function authMessage(err){
 const code=String(err?.code||err?.message||err||'').toLowerCase();
 if(code.includes('register_rate_limit'))return'Muitas tentativas de cadastro em sequência. Aguarde alguns minutos e tente novamente.';
 if(code.includes('account_exists_or_password'))return'Este e-mail já possui cadastro. Confira a senha ou use “Esqueci minha senha”.';
 if(code.includes('account_exists'))return'Este e-mail já possui cadastro. Entre com sua senha.';
 if(code.includes('invalid_password'))return'A senha precisa ter pelo menos 8 caracteres.';
 if(code.includes('invalid_email'))return'Informe um e-mail válido.';
 if(code.includes('invalid_name'))return'Informe seu nome completo.';
 if(code.includes('invalid_timing'))return'Aguarde alguns segundos e envie o cadastro novamente.';
 if(code.includes('email rate limit')||code.includes('too many requests')||code.includes('over_email_send_rate_limit'))return'O serviço de e-mail está temporariamente limitado. O cadastro principal não depende mais desse envio; tente novamente nesta página atualizada.';
 return userError(err);
}
async function jsonFetch(url,options,ms=16000){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);try{return await fetch(url,{...options,signal:controller.signal})}finally{clearTimeout(timer)}}

export async function login(email,password){const{data,error}=await sb.auth.signInWithPassword({email:normalizeEmail(email),password});if(error)throw error;if(!data?.session)throw new Error('session_not_created');return data}
export async function signup({name,email,password,website=''}){
 const response=await jsonFetch(`${CONFIG.SUPABASE_URL}/functions/v1/public-register`,{method:'POST',headers:{'Content-Type':'application/json','apikey':CONFIG.SUPABASE_KEY},body:JSON.stringify({name:String(name||'').trim(),email:normalizeEmail(email),password,website:String(website||''),started_at:FORM_STARTED_AT})});
 let payload={};try{payload=await response.json()}catch{}
 if(!response.ok){const err=new Error(payload?.error||`register_http_${response.status}`);err.code=payload?.error||'';throw err}
 return payload;
}
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
  const btn=signupForm.querySelector('button[type=submit]');const email=normalizeEmail(signupForm.querySelector('[name=email]').value);const password=signupForm.querySelector('[name=password]').value;
  if(remaining('signup',email)>0){flash('Este cadastro já foi enviado há poucos instantes. Aguarde antes de enviar novamente.','bad',9000);return}
  mark('signup',email);setBusy(btn,true,'Criando cadastro…');
  try{
   await signup({name:signupForm.querySelector('[name=name]').value,email,password,website:signupForm.querySelector('[name=website]')?.value||''});
   loginForm.querySelector('[name=email]').value=email;
   loginForm.querySelector('[name=password]').value=password;
   setBusy(btn,true,'Entrando…');
   await login(email,password);
   location.href=`/area-aluno.html?v=${BUILD}`;
  }catch(err){flash(authMessage(err),'bad',12000);setBusy(btn,false)}
 });
 forgot?.addEventListener('click',e=>{e.preventDefault();if(forgotBox){forgotBox.hidden=false;forgotBox.querySelector('[name=email]').value=loginForm.querySelector('[name=email]').value||''}});
 forgotBox?.addEventListener('submit',async e=>{e.preventDefault();const btn=forgotBox.querySelector('button[type=submit]');setBusy(btn,true,'Enviando…');try{await requestPasswordReset(forgotBox.querySelector('[name=email]').value);flash('Se houver uma conta com esse e-mail, enviaremos as instruções para redefinição.','ok',10000);forgotBox.hidden=true}catch(err){const s=String(err?.message||'');flash(s==='recovery_cooldown'?'Aguarde antes de solicitar outro e-mail de recuperação.':authMessage(err),'bad',10000)}finally{setBusy(btn,false)}});
 resend?.addEventListener('click',async e=>{e.preventDefault();const email=normalizeEmail(loginForm.querySelector('[name=email]').value);if(!email)return flash('Informe o e-mail no campo de login.','bad');try{await resendSignup(email);flash('Solicitação enviada. Verifique caixa de entrada e spam.','ok',10000)}catch(err){const s=String(err?.message||'');flash(s==='resend_cooldown'?'A confirmação já foi solicitada. Aguarde antes de tentar novamente.':authMessage(err),'bad',10000)}})
}
export async function authState(){return currentUser()}
export { sb, CONFIG };
