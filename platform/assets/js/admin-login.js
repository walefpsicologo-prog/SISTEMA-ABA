import {sb,CONFIG} from './config.js';
import {flash,userError,setBusy,q,currentUser} from './api.js';

async function goIfAdmin(){
 const me=await currentUser();
 if(me.user&&me.profile?.role==='admin'){location.href='/admin.html';return true}
 return false
}

q('#adminLoginForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]');setBusy(b,true,'Validando…');
 try{
  const{error}=await sb.auth.signInWithPassword({email:f.email.value.trim(),password:f.password.value});
  if(error)throw error;
  const me=await currentUser();
  if(me.profile?.role!=='admin'){
   await sb.auth.signOut();
   flash('Esta conta não possui permissão administrativa.','bad');
   return
  }
  location.href='/admin.html'
 }catch(err){flash(userError(err),'bad')}finally{setBusy(b,false)}
});

q('#adminForgot')?.addEventListener('click',e=>{e.preventDefault();const box=q('#adminResetForm');box.hidden=!box.hidden;if(!box.hidden)box.email.value=q('#adminLoginForm').email.value||''});
q('#adminResetForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('button');setBusy(b,true,'Enviando…');try{const{error}=await sb.auth.resetPasswordForEmail(f.email.value.trim(),{redirectTo:CONFIG.SITE_URL+'/nova-senha.html'});if(error)throw error;flash('Se o e-mail administrativo for válido, enviaremos as instruções de recuperação.','ok');f.hidden=true}catch(err){flash(userError(err),'bad')}finally{setBusy(b,false)}});

const qs=new URLSearchParams(location.search);if(qs.get('denied')==='1')flash('Acesso restrito ao administrador.','bad');goIfAdmin().catch(()=>{});
