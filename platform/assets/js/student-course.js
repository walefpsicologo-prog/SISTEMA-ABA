import {sb} from './config.js';
import {esc,dt,dateOnly,flash,userError,currentUser,enrollmentForCourse,loadCoursePrivate,q,qa} from './api.js?v=20260817-stable1';
import {logout} from './auth.js?v=20260817-stable1';

window.__WT_COURSE_BOOT_STARTED=true;
const BUILD='20260817-stable1';
const C={user:null,profile:null,enrollment:null,course:null,modules:[],lessons:[],materials:[],assessments:[],events:[],progress:[]};
q('#courseLogout')?.addEventListener('click',logout);
q('#closeExam')?.addEventListener('click',()=>q('#examModal')?.close());
function view(name){qa('[data-course-view]').forEach(b=>b.classList.toggle('on',b.dataset.courseView===name));qa('[data-course-pane]').forEach(p=>p.classList.toggle('on',p.dataset.coursePane===name));location.hash=name}
qa('[data-course-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.courseView)));
const doneSet=()=>new Set(C.progress.filter(x=>x.completed).map(x=>x.lesson_id));
const lessonMode=l=>({recorded:'GRAVADA',live:'AO VIVO',hybrid:'HÍBRIDA',activity:'ATIVIDADE'})[l.type]||l.type;

function guardStatus(title,text,actions=''){
 const guard=q('#courseGuard');if(!guard)return;
 guard.hidden=false;
 guard.innerHTML=`<section class="auth-card"><span class="kicker">Acesso protegido</span><h1>${esc(title)}</h1><p>${esc(text)}</p>${actions}</section>`;
}
function guardError(err){
 const message=userError(err);
 console.error('student_course_boot_failed',err);
 guardStatus('Não foi possível abrir o curso',message,`<div class="actions" style="margin-top:18px"><button class="btn" type="button" id="retryCourse">Tentar novamente</button><a class="btn secondary" href="/area-aluno.html?v=${BUILD}">Meus cursos</a></div>`);
 q('#retryCourse')?.addEventListener('click',()=>location.reload());
}
function showShell(){
 q('#courseGuard').hidden=true;q('#courseShell').hidden=false;
 q('#sideCourseTitle').textContent=C.course?.title||'Curso';q('#courseTitle').textContent=C.course?.title||'Curso';q('#courseDescription').textContent=C.course?.description||C.course?.subtitle||'';
 q('#lessonsArea').innerHTML='<div class="empty-state">Carregando aulas…</div>';
 q('#materialsArea').innerHTML='<div class="empty-state">Carregando materiais…</div>';
 q('#agendaArea').innerHTML='<div class="empty-state">Carregando agenda…</div>';
 q('#assessmentsArea').innerHTML='<div class="empty-state">Carregando avaliações…</div>';
 renderOverview();
}

async function boot(){
 const slow=setTimeout(()=>{if(!q('#courseShell')?.hidden)return;guardStatus('Ainda carregando…','A autenticação está demorando mais que o normal.','<div class="actions" style="margin-top:18px"><button class="btn" type="button" id="slowRetry">Tentar novamente</button><a class="btn secondary" href="/area-aluno.html?v='+BUILD+'">Meus cursos</a></div>');q('#slowRetry')?.addEventListener('click',()=>location.reload())},14000);
 try{
  const courseId=new URLSearchParams(location.search).get('curso');
  if(!courseId){location.href=`/area-aluno.html?v=${BUILD}`;return}
  guardStatus('Abrindo seu curso…','Verificando sua sessão.');
  const me=await currentUser();
  if(!me.user){location.href=`/area-aluno.html?v=${BUILD}`;return}
  C.user=me.user;C.profile=me.profile;
  guardStatus('Verificando matrícula…','Confirmando seu acesso ao curso.');
  C.enrollment=await enrollmentForCourse(courseId);
  if(!C.enrollment){clearTimeout(slow);guardStatus('Curso não liberado','Esta conta não possui matrícula ativa para este curso.',`<div class="actions" style="margin-top:18px"><a class="btn" href="/area-aluno.html?v=${BUILD}">Voltar aos meus cursos</a></div>`);return}
  C.course=C.enrollment.courses||{id:courseId,title:'Curso',description:''};
  clearTimeout(slow);showShell();
  const progressPromise=sb.from('lesson_progress').select('lesson_id,completed,completed_at,updated_at').eq('user_id',C.user.id).then(({data,error})=>{if(!error){C.progress=data||[];renderOverview()}else console.warn('progress_load_failed',error)}).catch(err=>console.warn('progress_load_failed',err));
  try{
    const data=await loadCoursePrivate(courseId);Object.assign(C,data);
    renderOverview();renderLessons();renderMaterials();renderAgenda();
  }catch(err){
    console.error('course_content_load_failed',err);
    q('#lessonsArea').innerHTML='<div class="empty-state">Não foi possível carregar as aulas agora. Tente atualizar a página.</div>';
    q('#materialsArea').innerHTML='<div class="empty-state">Não foi possível carregar os materiais agora.</div>';
    flash(userError(err),'bad');
  }
  progressPromise;
  Promise.allSettled([renderAssessments(),renderDoubts(),renderForum()]);
  const hash=location.hash.replace('#','');if(hash&&q(`[data-course-view="${CSS.escape(hash)}"]`))view(hash);
 }catch(err){clearTimeout(slow);guardError(err)}
}

function renderOverview(){const done=doneSet(),pct=C.lessons.length?Math.round(done.size/C.lessons.length*100):0,next=C.events.filter(e=>new Date(e.starts_at)>new Date())[0];q('#doneLessonsN').textContent=String(done.size);q('#progressN').textContent=pct+'%';q('#nextClass').textContent=next?`${next.title} · ${dt(next.starts_at)}`:'Nenhuma atividade agendada';q('#courseOverview').innerHTML=`<article class="panel"><span class="kicker">PROGRESSO DO CURSO</span><h2>${esc(C.course?.title||'Curso')}</h2><div class="progress"><span style="width:${pct}%"></span></div><p>${pct}% concluído · ${done.size}/${C.lessons.length} aulas</p><button class="btn" id="continueCourse">Continuar pelas aulas</button></article>`;q('#continueCourse')?.addEventListener('click',()=>view('aulas'))}

function renderLessons(){const done=doneSet();q('#lessonsArea').innerHTML=C.modules.map(m=>{const ls=C.lessons.filter(l=>l.module_id===m.id);return `<section class="module-box"><header><span class="kicker">${m.workload_hours?esc(m.workload_hours)+'H':'MÓDULO'}</span><h3>${esc(m.title)}</h3></header>${ls.map(l=>{const complete=done.has(l.id),media=l.recording_url||l.video_url;return `<article class="lesson-row"><button class="complete-btn ${complete?'done':''}" data-complete="${l.id}" aria-label="${complete?'Marcar como não concluída':'Marcar como concluída'}">${complete?'✓':''}</button><div><b>${String(l.position).padStart(2,'0')} · ${esc(l.title)}</b><div class="lesson-tags"><span>${esc(lessonMode(l))}</span>${l.duration_minutes?`<span>${l.duration_minutes} min</span>`:''}<span>APOSTILA</span></div>${l.description?`<p>${esc(l.description)}</p>`:''}${(l.type==='live'||l.type==='hybrid')&&l.live_starts_at?`<div class="live-strip"><strong>${dt(l.live_starts_at)}</strong>${l.live_url?`<a href="${esc(l.live_url)}" target="_blank" rel="noopener">Entrar no Google Meet →</a>`:''}</div>`:''}${media?`<a class="btn secondary small" href="${esc(media)}" target="_blank" rel="noopener">Assistir aula</a>`:(l.type==='recorded'||l.type==='hybrid'?'<span class="availability">Aula ainda não disponibilizada</span>':'')}</div></article>`}).join('')}</section>`}).join('')||'<div class="empty-state">Nenhuma aula publicada.</div>';qa('[data-complete]').forEach(b=>b.addEventListener('click',()=>toggleProgress(b.dataset.complete)))}
async function toggleProgress(lessonId){const lesson=C.lessons.find(l=>l.id===lessonId);if(lesson?.completion_rule&&lesson.completion_rule!=='manual')return flash('Esta aula possui critério de conclusão controlado pelo curso.','bad');const old=C.progress.find(x=>x.lesson_id===lessonId),completed=!old?.completed;const{error}=await sb.from('lesson_progress').upsert({user_id:C.user.id,lesson_id:lessonId,completed,completed_at:completed?new Date().toISOString():null,updated_at:new Date().toISOString()},{onConflict:'user_id,lesson_id'});if(error)return flash(userError(error),'bad');const{data}=await sb.from('lesson_progress').select('lesson_id,completed,completed_at,updated_at').eq('user_id',C.user.id);C.progress=data||[];renderOverview();renderLessons()}

function renderMaterials(){q('#materialsArea').innerHTML=C.materials.length?C.materials.map(m=>`<div class="resource-row"><div><span class="kicker">${m.mime_type==='application/pdf'?'PDF':'ARQUIVO'}</span><strong>${esc(m.title)}</strong></div><button class="btn secondary small" data-material="${m.id}">Abrir material</button></div>`).join(''):'<div class="empty-state">Nenhum material foi liberado neste curso.</div>'}
function renderAgenda(){const ev=C.events.filter(e=>new Date(e.starts_at)>=new Date(Date.now()-86400000));q('#agendaArea').innerHTML=ev.length?ev.map(e=>`<div class="agenda-row"><div><span class="kicker">${dt(e.starts_at)}</span><strong>${esc(e.title)}</strong><p>${esc(e.description||'')}</p></div>${e.meeting_url?`<a class="btn secondary small" href="${esc(e.meeting_url)}" target="_blank" rel="noopener">Entrar</a>`:''}</div>`).join(''):'<div class="empty-state">Nenhum evento programado.</div>'}

async function renderAssessments(){try{const{data:attempts}=await sb.from('assessment_attempts').select('*').eq('user_id',C.user.id).order('submitted_at',{ascending:false});const active=C.assessments.filter(a=>a.active);q('#assessmentsArea').innerHTML=active.length?active.map(a=>{const mine=(attempts||[]).filter(x=>x.assessment_id===a.id),last=mine[0];return `<article class="assessment-card"><div><span class="kicker">${esc(a.type)}</span><h3>${esc(a.title)}</h3><p>Critério interno: ${a.passing_score}% · ${a.question_count} questões${a.max_attempts?` · até ${a.max_attempts} tentativas`:''}.</p>${last?`<p><strong>Última tentativa:</strong> ${Number(last.score).toFixed(1)}% · ${dateOnly(last.submitted_at)}</p>`:''}</div><button class="btn" data-assessment="${a.id}">Iniciar avaliação</button></article>`}).join(''):'<div class="empty-state">Nenhuma avaliação está liberada neste momento.</div>';qa('[data-assessment]').forEach(b=>b.addEventListener('click',()=>startAssessment(b.dataset.assessment)))}catch(err){console.warn('assessments_load_failed',err);q('#assessmentsArea').innerHTML='<div class="empty-state">Avaliações temporariamente indisponíveis.</div>'}}
async function startAssessment(id){try{const{data,error}=await sb.rpc('get_assessment_questions',{p_assessment_id:id});if(error)throw error;if(!data?.length)return flash('A avaliação ainda não possui questões disponíveis.','bad');examModal(id,data)}catch(err){flash(userError(err),'bad')}}
function examModal(id,questions){const modal=q('#examModal'),body=q('#examBody');let idx=0,answers={};function save(){const c=body.querySelector('input[name=answer]:checked');if(c)answers[questions[idx].question_id]=c.value}function paint(){const x=questions[idx],opts=x.options||{};body.innerHTML=`<div class="exam-progress">Questão ${idx+1} de ${questions.length}</div><h2>${esc(x.stem)}</h2><div class="option-list">${Object.entries(opts).map(([k,v])=>`<label><input type="radio" name="answer" value="${esc(k)}" ${answers[x.question_id]===k?'checked':''}><span><b>${esc(k)}</b> ${esc(v)}</span></label>`).join('')}</div><div class="exam-actions"><button class="btn secondary" id="examPrev" ${idx===0?'disabled':''}>Anterior</button><button class="btn" id="examNext">${idx===questions.length-1?'Enviar avaliação':'Próxima'}</button></div>`;q('#examPrev')?.addEventListener('click',()=>{save();idx--;paint()});q('#examNext')?.addEventListener('click',async()=>{save();if(!answers[x.question_id])return flash('Escolha uma alternativa para continuar.','bad');if(idx<questions.length-1){idx++;paint();return}if(questions.some(z=>!answers[z.question_id]))return flash('Responda todas as questões antes de enviar.','bad');if(!confirm('Enviar a avaliação? Esta tentativa será registrada.'))return;const{data,error}=await sb.rpc('submit_assessment',{p_assessment_id:id,p_answers:answers});if(error)return flash(userError(error),'bad');modal.close();const r=data?.[0];flash(`Avaliação enviada: ${Number(r?.score||0).toFixed(1)}% — ${r?.passed?'critério atingido':'critério ainda não atingido'}.`,r?.passed?'ok':'bad');await renderAssessments()})}modal.showModal();paint()}

async function renderDoubts(){try{const{data,error}=await sb.from('doubts').select('*').eq('course_id',C.course.id).eq('user_id',C.user.id).order('created_at',{ascending:false});if(error)throw error;q('#doubtsList').innerHTML=data?.length?data.map(d=>`<article class="thread-card"><span class="status">${esc(d.status)}</span><h3>${esc(d.subject)}</h3><p>${esc(d.body)}</p>${d.official_reply?`<div class="official-reply"><b>Resposta oficial</b><p>${esc(d.official_reply)}</p></div>`:''}</article>`).join(''):'<div class="empty-state">Você ainda não enviou dúvidas.</div>'}catch(err){console.warn('doubts_load_failed',err);q('#doubtsList').innerHTML='<div class="empty-state">Dúvidas temporariamente indisponíveis.</div>'}}
q('#doubtForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,{error}=await sb.from('doubts').insert({course_id:C.course.id,user_id:C.user.id,subject:f.subject.value.trim(),body:f.body.value.trim(),status:'open'});if(error)return flash(userError(error),'bad');f.reset();flash('Dúvida enviada.','ok');renderDoubts()});

async function renderForum(){try{const{data,error}=await sb.from('forum_threads').select('*').eq('course_id',C.course.id).eq('archived',false).order('pinned',{ascending:false}).order('created_at',{ascending:false});if(error)throw error;q('#forumThreads').innerHTML=data?.length?data.map(t=>`<button class="forum-thread" data-thread="${t.id}"><span>${t.pinned?'FIXADO · ':''}${t.locked?'BLOQUEADO · ':''}${dateOnly(t.created_at)}</span><strong>${esc(t.title)}</strong><p>${esc(t.body)}</p></button>`).join(''):'<div class="empty-state">Nenhum tópico publicado.</div>';qa('[data-thread]').forEach(b=>b.addEventListener('click',()=>openThread(b.dataset.thread)))}catch(err){console.warn('forum_load_failed',err);q('#forumThreads').innerHTML='<div class="empty-state">Fórum temporariamente indisponível.</div>'}}
q('#threadForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,{error}=await sb.from('forum_threads').insert({course_id:C.course.id,author_id:C.user.id,title:f.title.value.trim(),body:f.body.value.trim()});if(error)return flash(userError(error),'bad');f.reset();flash('Tópico publicado.','ok');renderForum()});
async function openThread(id){const{data:thread,error:te}=await sb.from('forum_threads').select('*').eq('id',id).single();if(te)return flash(userError(te),'bad');const{data:posts}=await sb.from('forum_posts').select('*').eq('thread_id',id).is('deleted_at',null).order('created_at');const box=q('#forumDetail');box.innerHTML=`<div class="panel"><h2>${esc(thread.title)}</h2><p>${esc(thread.body)}</p></div>${(posts||[]).map(p=>`<div class="forum-post ${p.official?'official':''}"><p>${esc(p.body)}</p><small>${dt(p.created_at)}</small></div>`).join('')}${thread.locked?'<div class="empty-state">Este tópico está bloqueado para novas respostas.</div>':`<form id="postReply" class="inline-form"><textarea name="body" rows="3" required placeholder="Escreva sua resposta"></textarea><button class="btn">Responder</button></form>`}`;q('#postReply')?.addEventListener('submit',async e=>{e.preventDefault();const{error}=await sb.from('forum_posts').insert({thread_id:id,author_id:C.user.id,body:e.currentTarget.body.value.trim()});if(error)return flash(userError(error),'bad');openThread(id)});view('forum')}
boot();
