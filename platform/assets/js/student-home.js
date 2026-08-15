import {sb} from './config.js';
import {esc,dt,flash,userError,currentUser,activeEnrollments,q} from './api.js';
import {bindAuthBox,logout} from './auth.js';

const auth=q('#authGate'),home=q('#studentHome'),actions=q('#loggedActions');
bindAuthBox(document);
q('#logoutBtn')?.addEventListener('click',logout);

const sourceLabel=s=>({scholarship:'Bolsa integral',courtesy:'Cortesia',manual_free:'Gratuidade',external_payment:'Pagamento externo',purchase:'Matrícula paga'})[s]||'Matrícula ativa';

async function boot(){
  try{
    const me=await currentUser();
    if(!me.user){auth.hidden=false;home.hidden=true;actions.hidden=true;return}
    auth.hidden=true;home.hidden=false;actions.hidden=false;
    q('#studentName').textContent=me.profile?.full_name||me.user.email||'';
    q('#welcomeName').textContent=(me.profile?.full_name||'Aluno').split(' ')[0];
    q('#adminShortcut').hidden=me.profile?.role!=='admin';
    const enrollments=await activeEnrollments();
    q('#activeCoursesN').textContent=String(enrollments.length);
    q('#coursesOwned').innerHTML=enrollments.length?enrollments.map(e=>`<article class="student-course-card"><div><span class="badge-access">${esc(sourceLabel(e.source))}</span><h2>${esc(e.courses?.title||'Curso')}</h2><p>${esc(e.courses?.subtitle||e.courses?.description||'')}</p>${e.access_ends_at?`<p><strong>Acesso até:</strong> ${new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium'}).format(new Date(e.access_ends_at))}</p>`:''}</div><div class="actions"><a class="btn" href="/curso-aluno.html?curso=${encodeURIComponent(e.course_id)}">Entrar no curso</a></div></article>`).join(''):'<div class="empty-state">Você ainda não possui matrícula ativa. Se recebeu bolsa ou cortesia, entre com o mesmo e-mail usado na liberação.</div>';
    const{data,error}=await sb.from('notifications').select('*').eq('user_id',me.user.id).order('created_at',{ascending:false}).limit(5);
    if(error)throw error;
    q('#recentNotifications').innerHTML=data?.length?data.map(n=>`<article class="notice ${n.read_at?'read':''}"><span class="kicker">${esc(n.type)}</span><strong>${esc(n.title)}</strong><p>${esc(n.body||'')}</p><small>${dt(n.created_at)}</small></article>`).join(''):'<div class="empty-state">Nenhuma notificação recente.</div>';
    const qs=new URLSearchParams(location.search);if(qs.get('password')==='updated')flash('Senha alterada com sucesso.','ok');
  }catch(err){flash(userError(err),'bad')}
}
boot();
