import {sb} from './config.js';
import {esc,dt,flash,userError,currentUser,activeEnrollments,publicCourses,salePrice,money,q} from './api.js?v=20260817-stable1';
import {bindAuthBox,logout} from './auth-registerfix1.js';

const COURSE_BUILD='20260817-stable1';
const auth=q('#authGate'),home=q('#studentHome'),actions=q('#loggedActions');
bindAuthBox(document);
q('#logoutBtn')?.addEventListener('click',logout);

const sourceLabel=s=>({checkout:'Matrícula paga',scholarship:'Bolsa integral',courtesy:'Cortesia',manual_free:'Gratuidade',external_payment:'Pagamento externo',coupon:'Cupom'})[s]||'Matrícula ativa';
const ownedCard=e=>`<article class="student-course-card"><div><span class="badge-access">${esc(sourceLabel(e.source))}</span><h2>${esc(e.courses?.title||'Curso')}</h2><p>${esc(e.courses?.subtitle||e.courses?.description||'')}</p>${e.access_ends_at?`<p><strong>Acesso até:</strong> ${new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium'}).format(new Date(e.access_ends_at))}</p>`:''}</div><div class="actions"><a class="btn" href="/curso-aluno.html?v=${COURSE_BUILD}&curso=${encodeURIComponent(e.course_id)}">Entrar no curso</a></div></article>`;
const availableCard=c=>{const price=salePrice(c);return `<article class="student-course-card"><div><span class="badge-access">Disponível para matrícula</span><h2>${esc(c.title)}</h2><p>${esc(c.subtitle||c.description||'')}</p><p><strong>${Number(c.workload_hours)} horas</strong>${c.access_days?` · ${esc(c.access_days)} dias de acesso`:''}</p><div class="course-price"><strong>${money(price)}</strong></div></div><div class="actions"><a class="btn" href="/matricula.html?curso=${encodeURIComponent(c.slug)}">Matricular-se</a><a class="btn secondary" href="/curso-aplicador-aba.html?slug=${encodeURIComponent(c.slug)}">Conhecer o curso</a></div></article>`};

async function boot(){
  try{
    const me=await currentUser();
    if(!me.user){auth.hidden=false;home.hidden=true;actions.hidden=true;return}
    auth.hidden=true;home.hidden=false;actions.hidden=false;
    q('#studentName').textContent=me.profile?.full_name||me.user.email||'';
    q('#welcomeName').textContent=(me.profile?.full_name||'Aluno').split(' ')[0];
    const enrollments=await activeEnrollments();
    q('#activeCoursesN').textContent=String(enrollments.length);
    let catalog=[];try{catalog=await publicCourses()}catch(err){console.error('student_catalog',err)}
    const ownedIds=new Set(enrollments.map(e=>e.course_id));const available=(catalog||[]).filter(c=>!ownedIds.has(c.id));const blocks=[];
    if(enrollments.length)blocks.push(enrollments.map(ownedCard).join(''));
    if(available.length){if(enrollments.length)blocks.push('<div style="grid-column:1/-1;margin-top:8px"><span class="kicker">Outros cursos disponíveis</span></div>');blocks.push(available.map(availableCard).join(''))}
    q('#coursesOwned').innerHTML=blocks.length?blocks.join(''):'<div class="empty-state">Nenhum curso publicado está disponível para esta conta no momento.</div>';
    try{const{data,error}=await sb.from('notifications').select('*').eq('user_id',me.user.id).order('created_at',{ascending:false}).limit(5);if(error)throw error;q('#recentNotifications').innerHTML=data?.length?data.map(n=>`<article class="notice ${n.read_at?'read':''}"><span class="kicker">${esc(n.type)}</span><strong>${esc(n.title)}</strong><p>${esc(n.body||'')}</p><small>${dt(n.created_at)}</small></article>`).join(''):'<div class="empty-state">Nenhuma notificação recente.</div>'}catch(err){console.warn('notifications_load_failed',err);q('#recentNotifications').innerHTML='<div class="empty-state">Notificações temporariamente indisponíveis.</div>'}
    const qs=new URLSearchParams(location.search);if(qs.get('password')==='updated')flash('Senha alterada com sucesso.','ok');
  }catch(err){flash(userError(err),'bad')}
}
boot();
