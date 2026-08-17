import { sb, CONFIG } from './config.js';
export const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((Number(c)||0)/100);
export const dt=v=>v?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'—';
export const dateOnly=v=>v?new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium'}).format(new Date(v)):'—';
export const q=s=>document.querySelector(s); export const qa=s=>[...document.querySelectorAll(s)];
const timed=(promise,ms=12000,code='network_timeout')=>Promise.race([Promise.resolve(promise),new Promise((_,reject)=>setTimeout(()=>reject(new Error(code)),ms))]);
function cachedSession(){
 try{
  const ref=new URL(CONFIG.SUPABASE_URL).hostname.split('.')[0];
  const raw=localStorage.getItem(`sb-${ref}-auth-token`);if(!raw)return null;
  const parsed=JSON.parse(raw);const session=parsed?.currentSession||parsed?.session||parsed;
  return session?.user&&session?.access_token?session:null;
 }catch{return null}
}
const sessionUsable=session=>!!session&&(!session.expires_at||(Number(session.expires_at)*1000>Date.now()+15000));
async function loadProfile(userId){
 try{const r=await timed(sb.from('profiles').select('*').eq('id',userId).maybeSingle(),6000,'profile_timeout');return r.error?null:(r.data||null)}
 catch(err){console.warn('profile_load_failed',err);return null}
}
export function flash(message,type='ok',timeout=5200){let el=q('#flash');if(!el){el=document.createElement('div');el.id='flash';document.body.append(el)}el.textContent=message;el.className='flash '+type;el.hidden=false;clearTimeout(window.__wtFlash);window.__wtFlash=setTimeout(()=>el.hidden=true,timeout)}
export function setBusy(btn,on,label='Processando…'){if(!btn)return;if(on){btn.dataset.old=btn.textContent;btn.disabled=true;btn.textContent=label}else{btn.disabled=false;btn.textContent=btn.dataset.old||btn.textContent}}
export function salePrice(c){const now=Date.now(),start=c.sale_starts_at?new Date(c.sale_starts_at).getTime():null,end=c.sale_ends_at?new Date(c.sale_ends_at).getTime():null;const active=c.sale_price_cents!=null&&(!start||now>=start)&&(!end||now<=end);return active?c.sale_price_cents:c.regular_price_cents}
export async function publicCourses(){const{data,error}=await timed(sb.rpc('get_public_courses'));if(error)throw error;return data||[]}
export async function courseBySlug(slug){const courses=await publicCourses();return courses.find(c=>c.slug===slug)||null}
export async function courseOutline(slug){const{data,error}=await timed(sb.rpc('get_course_outline',{p_slug:slug}));if(error)throw error;return data||[]}
export async function currentUser(){
 const cached=cachedSession();
 if(sessionUsable(cached))return{user:cached.user,profile:await loadProfile(cached.user.id)};
 const {data,error}=await timed(sb.auth.getSession(),12000,'auth_timeout');
 if(error)throw error;
 const user=data?.session?.user||null;
 if(!user)return{user:null,profile:null};
 return{user,profile:await loadProfile(user.id)};
}
export async function activeEnrollments(){const{data,error}=await timed(sb.from('enrollments').select('*,courses(*)').in('status',['active','completed']).order('created_at',{ascending:false}),10000,'enrollments_timeout');if(error)throw error;return data||[]}
export async function enrollmentForCourse(courseId){const{data,error}=await timed(sb.from('enrollments').select('*,courses(*)').eq('course_id',courseId).in('status',['active','completed']).order('created_at',{ascending:false}).limit(1).maybeSingle(),10000,'enrollment_timeout');if(error)throw error;return data||null}
export async function loadCoursePrivate(courseId){
 const [{data:mods,error:me},{data:mats,error:ma},{data:assess,error:ae},{data:events,error:ee}]=await Promise.all([
  timed(sb.from('course_modules').select('id,course_id,title,position,workload_hours').eq('course_id',courseId).order('position'),12000,'modules_timeout'),
  timed(sb.from('materials').select('id,course_id,lesson_id,title,file_url,mime_type,visibility,position,storage_path,published').eq('course_id',courseId).eq('published',true).order('position'),12000,'materials_timeout'),
  timed(sb.from('assessments').select('id,course_id,title,type,passing_score,question_count,max_attempts,active,created_at').eq('course_id',courseId).order('created_at'),12000,'assessments_timeout'),
  timed(sb.from('calendar_events').select('id,course_id,title,description,starts_at,meeting_url').eq('course_id',courseId).order('starts_at'),12000,'events_timeout')
 ]);
 if(me)throw me;if(ma)throw ma;if(ae)throw ae;if(ee)throw ee;
 const mids=(mods||[]).map(x=>x.id);let lessons=[];
 if(mids.length){
  const{data,error}=await timed(sb.from('lessons').select('id,module_id,position,title,type,duration_minutes,description,recording_url,video_url,live_starts_at,live_url,completion_rule,published').in('module_id',mids).eq('published',true).order('position'),12000,'lessons_timeout');
  if(error)throw error;lessons=data||[];
 }
 return{modules:mods||[],lessons,materials:mats||[],assessments:assess||[],events:events||[]}
}
export async function lessonContent(lessonId){const{data,error}=await timed(sb.from('lessons').select('id,content').eq('id',lessonId).maybeSingle(),12000,'lesson_content_timeout');if(error)throw error;return String(data?.content||'')}
export async function invokeMaterial(materialId){const{data,error}=await timed(sb.functions.invoke('material-url',{body:{material_id:materialId}}),15000,'material_timeout');if(error){let code='';try{const ctx=error.context;const response=ctx?.clone?ctx.clone():ctx;const payload=await response?.json?.();code=payload?.error||''}catch{}if(code)throw new Error(code);throw error}if(data?.error)throw new Error(data.error);return data}
export function userError(err){const s=String(err?.message||err||'').toLowerCase();if(s.includes('invalid login'))return'E-mail ou senha incorretos.';if(s.includes('email not confirmed'))return'Confirme seu e-mail antes de entrar.';if(s.includes('rate limit')||s.includes('too many requests'))return'Muitas solicitações em sequência. Aguarde alguns segundos e tente novamente.';if(s.includes('auth_timeout'))return'Sua sessão demorou para ser revalidada. Volte à Área do Aluno e entre novamente.';if(s.includes('timeout'))return'A conexão demorou mais que o esperado. Tente novamente.';if(s.includes('incomplete_assessment'))return'Responda todas as questões antes de enviar.';if(s.includes('attempt_limit'))return'Você atingiu o limite de tentativas desta avaliação.';if(s.includes('material_file_pending'))return'O material ainda não está disponível no armazenamento.';if(s.includes('signed_url_failed'))return'Não foi possível gerar o link temporário deste arquivo. Tente novamente em instantes.';if(s.includes('material_not_available'))return'Material indisponível para esta conta.';if(s.includes('course_access_required'))return'Esta atividade exige matrícula ativa.';if(s.includes('password'))return'Verifique a senha informada. Ela deve ter pelo menos 6 caracteres.';if(s.includes('failed to fetch')||s.includes('network'))return'A conexão oscilou. Verifique a internet e tente novamente.';return'Ocorreu um erro ao executar esta ação. Tente novamente.'}
