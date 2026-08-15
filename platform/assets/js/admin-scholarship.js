import {sb} from './config.js';
import {flash,userError,setBusy,q} from './api.js';

export function setupScholarshipAdmin(refresh){
  const form=q('#grantForm');
  if(!form||form.dataset.inviteReady==='1')return;
  form.dataset.inviteReady='1';

  const emailLabel=form.elements.email?.closest('label');
  if(emailLabel&&!form.elements.full_name){
    const nameLabel=document.createElement('label');
    nameLabel.innerHTML='Nome do aluno<input name="full_name" autocomplete="name" placeholder="Opcional">';
    emailLabel.before(nameLabel);
  }

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    e.stopImmediatePropagation();
    const btn=form.querySelector('button[type="submit"],button:not([type])');
    setBusy(btn,true,'Liberando…');
    try{
      const body={
        email:form.elements.email.value.trim(),
        full_name:form.elements.full_name?.value.trim()||'',
        course_id:form.elements.course_id.value,
        source:form.elements.source.value,
        access_days:Number(form.elements.days.value)||null,
        note:form.elements.note.value.trim()||null
      };
      const{data,error}=await sb.functions.invoke('admin-invite-student',{body});
      if(error)throw error;
      if(data?.error)throw new Error(data.error);
      form.reset();
      flash(data?.invited?'Aluno convidado por e-mail e matrícula liberada.':'Matrícula atualizada e acesso liberado.','ok');
      if(refresh)await refresh();
    }catch(err){flash(userError(err),'bad')}
    finally{setBusy(btn,false)}
  },true);
}
