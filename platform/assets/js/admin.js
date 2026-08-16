import {sb} from './config.js';
import {currentUser,flash,userError,q,qa} from './api.js';
import {setupCourseAdmin,refreshCourseAdmin} from './admin-courses.js';
import {setupOpsAdmin,refreshOpsAdmin} from './admin-ops.js';
import {setupMaterialUpload,setupPublicMediaUploads} from './admin-storage.js';
import {setupDirectAccessGrant} from './admin-access.js';
export const A={user:null,profile:null,courses:[],course:null,modules:[],lessons:[]};
export const fail=e=>flash(userError(e),'bad');
export const courseOptions=()=>A.courses.map(c=>`<option value="${c.id}">${c.title.replace(/[&<>"']/g,'')}</option>`).join('');
export function fillCourseOptions(){qa('[data-course-options]').forEach(s=>{const v=s.value;s.innerHTML=courseOptions();if(v)s.value=v})}
function show(n){qa('[data-admin-view]').forEach(b=>b.classList.toggle('on',b.dataset.adminView===n));qa('[data-admin-pane]').forEach(p=>p.classList.toggle('on',p.dataset.adminPane===n));location.hash=n}
qa('[data-admin-view]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.adminView)));
q('#adminLogout')?.addEventListener('click',async()=>{sessionStorage.removeItem('wt_admin_gate');await sb.auth.signOut();location.href='/painel-wt.html'});
export async function loadCourses(){const{data,error}=await sb.from('courses').select('*').order('position').order('created_at');if(error)throw error;A.courses=data||[];const sel=q('#adminCourseSelect');sel.innerHTML=courseOptions();if(!A.course||!A.courses.some(c=>c.id===A.course.id))A.course=A.courses[0]||null;sel.value=A.course?.id||'';fillCourseOptions();await refreshCourseAdmin(A);sel.onchange=async()=>{A.course=A.courses.find(c=>c.id===sel.value)||null;await refreshCourseAdmin(A);fillCourseOptions()}}
async function boot(){if(sessionStorage.getItem('wt_admin_gate')!=='1'){location.href='/painel-wt.html';return}const me=await currentUser();if(!me.user){sessionStorage.removeItem('wt_admin_gate');location.href='/painel-wt.html';return}if(me.profile?.role!=='admin'){sessionStorage.removeItem('wt_admin_gate');await sb.auth.signOut();location.href='/painel-wt.html?denied=1';return}A.user=me.user;A.profile=me.profile;q('#adminGuard').hidden=true;q('#adminShell').hidden=false;setupDirectAccessGrant();setupCourseAdmin(A,loadCourses,fail);setupOpsAdmin(A,loadCourses,fail,fillCourseOptions);setupMaterialUpload(A);setupPublicMediaUploads();await loadCourses();await refreshOpsAdmin(A,fillCourseOptions);const h=location.hash.slice(1);if(h&&q(`[data-admin-view="${CSS.escape(h)}"]`))show(h)}
boot().catch(fail);
