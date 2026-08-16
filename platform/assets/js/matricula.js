import { CONFIG,sb } from './config.js';
import { publicCourses,salePrice,money,currentUser,flash,userError,q,setBusy } from './api.js';
import { bindAuthBox,logout } from './auth.js';

let course=null;
bindAuthBox(document);
q('#switchAccount')?.addEventListener('click',logout);

async function load(){
 const slug=new URLSearchParams(location.search).get('curso')||CONFIG.DEFAULT_COURSE_SLUG;
 try{
  const courses=await publicCourses();
  course=(courses||[]).find(c=>c.slug===slug)||(courses||[]).find(c=>c.slug===CONFIG.DEFAULT_COURSE_SLUG)||null;
  if(!course)throw new Error('not_found');
  const price=salePrice(course);
  q('#checkoutTitle').textContent=course.title;
  q('#checkoutMeta').textContent=`Curso livre · ${Number(course.workload_hours)} horas · ${course.access_days} dias de acesso`;
  q('#checkoutRegular').textContent=price!==course.regular_price_cents?money(course.regular_price_cents):'';
  q('#checkoutPrice').textContent=money(price);
  q('#checkoutInstallments').textContent=course.installment_max>1?`Até ${course.installment_max}x conforme condições apresentadas pelo checkout.`:'';
  await authState();
 }catch(err){
  console.error('matricula-course',err);
  q('#checkoutPage').innerHTML='<div class="wrap section"><div class="empty-state error">Curso indisponível para matrícula.</div></div>';
 }
}

async function authState(){
 const me=await currentUser();
 q('#checkoutAuth').hidden=!!me.user;
 q('#checkoutPay').hidden=!me.user;
 if(!me.user||!course)return;
 const{data:en}=await sb.from('enrollments').select('*').eq('user_id',me.user.id).eq('course_id',course.id).in('status',['active','completed']).maybeSingle();
 q('#checkoutHello').textContent=me.profile?.full_name||me.user.email;
 q('#alreadyEnrolled').hidden=!en;
 q('#payActions').hidden=!!en;
}

q('#payBtn')?.addEventListener('click',async()=>{
 const btn=q('#payBtn');setBusy(btn,true,'Abrindo pagamento…');
 try{
  const{data,error}=await sb.functions.invoke('create-checkout',{body:{course_id:course.id,return_origin:CONFIG.SITE_URL}});
  if(error){const status=error?.context?.status;if(status===503)throw new Error('payment_unavailable');throw error}
  if(data?.already_enrolled)return location.href='/area-aluno.html';
  if(data?.checkout_url)return location.href=data.checkout_url;
  throw new Error('payment_unavailable');
 }catch(err){
  if(String(err.message).includes('payment_unavailable'))flash('O pagamento online ainda não está ativado. Utilize os canais oficiais de contato da plataforma para concluir a matrícula.','bad',8000);
  else flash(userError(err),'bad');
 }finally{setBusy(btn,false)}
});

sb.auth.onAuthStateChange(()=>authState());
load();
