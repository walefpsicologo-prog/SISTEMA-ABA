import { sb } from './config.js';
import { flash,userError,setBusy,q } from './api.js';

const ABA_APP='https://walef-sistema-aba.vercel.app/';
let recovery=false;
let returnUrl='/area-aluno.html';
let systemAccount=false;

async function resolveReturn(session){
  if(!session?.user?.id)return '/area-aluno.html';
  const userId=session.user.id;
  const email=String(session.user.email||'').toLowerCase();
  try{
    const [memberQ,guardianQ]=await Promise.all([
      sb.from('aba_professionals').select('id,role').eq('user_id',userId).eq('active',true).maybeSingle(),
      sb.from('aba_guardian_access').select('id').eq('user_id',userId).eq('active',true).limit(1)
    ]);
    if(memberQ.data||guardianQ.data?.length)return ABA_APP;
  }catch{}
  if(email==='walefpsicologo@gmail.com')return ABA_APP;
  return '/area-aluno.html';
}

function applyPolicy(){
  const form=q('#resetForm');
  const inputs=form?.querySelectorAll('input[type="password"]')||[];
  inputs.forEach(input=>input.minLength=systemAccount?14:6);
  const back=q('a[href="/area-aluno.html"]');
  if(back&&systemAccount){back.href=ABA_APP;back.textContent='Voltar para o Sistema ABA'}
}

async function setRecoverySession(session,message){
  recovery=true;
  returnUrl=await resolveReturn(session);
  systemAccount=returnUrl===ABA_APP;
  applyPolicy();
  q('#resetStatus').textContent=message;
}

sb.auth.onAuthStateChange(async(event,session)=>{
  if(event==='PASSWORD_RECOVERY')await setRecoverySession(session,'Link de recuperação validado. Defina sua nova senha.');
});

async function boot(){
  const {data:{session}}=await sb.auth.getSession();
  if(session)await setRecoverySession(session,'Sessão de recuperação válida. Defina sua nova senha.');
  else q('#resetStatus').textContent='Abra esta página a partir do link de recuperação enviado por e-mail.';
}

q('#resetForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const f=e.currentTarget;
  if(!recovery)return flash('O link de recuperação não está válido nesta sessão. Solicite um novo link.','bad');
  if(f.password.value!==f.confirm.value)return flash('As senhas não coincidem.','bad');
  if(systemAccount){
    const p=f.password.value;
    if(p.length<14||!/[A-Z]/.test(p)||!/[a-z]/.test(p)||!/[0-9]/.test(p)||!/[^A-Za-z0-9]/.test(p))return flash('Use pelo menos 14 caracteres, com maiúscula, minúscula, número e símbolo.','bad');
  }else if(f.password.value.length<6)return flash('Use pelo menos 6 caracteres.','bad');
  const btn=f.querySelector('button');
  setBusy(btn,true,'Alterando…');
  const {error}=await sb.auth.updateUser({password:f.password.value});
  if(error){flash(userError(error),'bad');setBusy(btn,false);return}
  flash('Senha alterada com sucesso.','ok');
  const separator=returnUrl.includes('?')?'&':'?';
  setTimeout(()=>location.href=`${returnUrl}${separator}password=updated`,700);
});

boot();
