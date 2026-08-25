import { sb, CONFIG } from './config.js';
const form=document.querySelector('#abaLoginForm');
const msg=document.querySelector('#abaLoginMessage');
const forgot=document.querySelector('#abaForgot');
const setMsg=(text,type='')=>{msg.textContent=text;msg.className='aba-login-message '+type};
const busy=(on)=>{const b=form.querySelector('button[type=submit]');b.disabled=on;b.textContent=on?'Validando…':'Entrar no Sistema ABA'};

async function abaMembership(userId){
  const {data,error}=await sb.from('aba_professionals').select('id,full_name,role,active').eq('user_id',userId).eq('active',true).maybeSingle();
  if(error) throw error;
  return data;
}

async function redirectIfAuthorized(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session) return;
  try{
    const member=await abaMembership(session.user.id);
    if(member) location.replace('/sistema-aba.html');
  }catch{}
}

form.addEventListener('submit',async e=>{
  e.preventDefault();setMsg('');busy(true);
  try{
    const email=form.email.value.trim();
    const password=form.password.value;
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(error) throw error;
    const member=await abaMembership(data.user.id);
    if(!member){await sb.auth.signOut();throw new Error('Esta conta não possui vínculo ativo com o Sistema ABA.');}
    setMsg('Acesso autorizado.','ok');
    location.replace('/sistema-aba.html');
  }catch(err){
    const raw=String(err?.message||err||'Falha de autenticação.');
    const friendly=/invalid login credentials/i.test(raw)?'E-mail ou senha inválidos.':raw;
    setMsg(friendly,'bad');
  }finally{busy(false)}
});

forgot.addEventListener('click',async()=>{
  const email=form.email.value.trim();
  if(!email){setMsg('Informe o e-mail da conta ABA para recuperar a senha.','bad');return;}
  forgot.disabled=true;
  try{
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:CONFIG.SITE_URL+'/nova-senha.html'});
    if(error) throw error;
    setMsg('Se a conta existir, as instruções de recuperação serão enviadas por e-mail.','ok');
  }catch(err){setMsg(String(err?.message||err),'bad')}
  finally{forgot.disabled=false}
});

redirectIfAuthorized();
