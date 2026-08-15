import {sb} from './config.js';
import {q,flash,userError,setBusy} from './api.js';

const labels={scholarship:'Bolsa integral',courtesy:'Cortesia',manual_free:'Gratuidade'};
export function setupDirectAccessGrant(){
 const form=q('#grantForm');
 if(!form||form.dataset.directGrant==='1')return;
 form.dataset.directGrant='1';
 form.addEventListener('submit',async e=>{
  e.preventDefault();e.stopImmediatePropagation();
  const btn=form.querySelector('button[type=submit]');setBusy(btn,true,'Liberando…');
  try{
   const email=form.email.value.trim(),course_id=form.course_id.value,source=form.source.value,access_days=Number(form.days.value)||365,note=form.note.value||null;
   if(!email||!course_id)throw new Error('Informe e-mail e curso.');
   const{data,error}=await sb.functions.invoke('admin-invite-student',{body:{email,course_id,source,access_days,note}});
   if(error)throw error;if(data?.error)throw new Error(data.message||data.error);
   const type=labels[source]||'Acesso';
   flash(data.invited?`${type} vinculada. O convite de acesso foi enviado para ${email}.`:`${type} vinculada ao aluno com sucesso.`,'ok');
   form.reset();location.hash='alunos';setTimeout(()=>location.reload(),900);
  }catch(err){flash(userError(err),'bad');setBusy(btn,false)}
 },true);
}
