import { CONFIG } from './config.js';
import { esc,money,salePrice,publicCourses,courseOutline,q } from './api.js';

const FALLBACK_COURSE={
 id:'37fae0a9-f7b3-4131-a286-626e68c73bd9',
 slug:'formacao-aplicador-aba',
 title:'Curso Livre de Formação de Aplicador em Análise do Comportamento Aplicada — ABA',
 subtitle:'Curso livre de formação profissional — 80 horas',
 description:'Formação estruturada em fundamentos filosóficos e científicos, princípios da Análise do Comportamento e competências de aplicação supervisionada.',
 workload_hours:80,
 regular_price_cents:99700,
 sale_price_cents:79700,
 sale_starts_at:null,
 sale_ends_at:null,
 installment_max:10,
 access_days:365
};

function paintCourse(course){
 const price=salePrice(course);
 q('#courseTitle').textContent=course.title;
 q('#courseSubtitle').textContent=course.description||course.subtitle||'';
 q('#courseHours').textContent=Number(course.workload_hours)+' horas';
 q('#courseRegular').textContent=price!==course.regular_price_cents?money(course.regular_price_cents):'';
 q('#coursePrice').textContent=money(price);
 q('#courseInstallments').textContent=course.installment_max>1?`até ${course.installment_max}x conforme o checkout`:'';
 q('#enrollCourse').href='/matricula.html?curso='+encodeURIComponent(course.slug);
 const second=q('#enrollCourse2');if(second)second.href=q('#enrollCourse').href;
}

function fallbackCurriculum(){
 const el=q('#curriculum');if(!el)return;
 el.innerHTML=`<section class="module-public"><header><span class="kicker">BLOCO I</span><h2>Fundamentos Filosóficos, Científicos e Históricos</h2><span>20 horas</span></header></section><section class="module-public"><header><span class="kicker">BLOCO II</span><h2>Princípios e Processos da Análise do Comportamento</h2><span>24 horas</span></header></section><section class="module-public"><header><span class="kicker">BLOCO III</span><h2>Aplicação, Intervenção, Ética e Competência Profissional</h2><span>36 horas</span></header></section>`;
}

async function boot(){
 const host=q('#coursePage');if(!host)return;
 const requested=new URLSearchParams(location.search).get('slug')||CONFIG.DEFAULT_COURSE_SLUG;
 paintCourse(FALLBACK_COURSE);
 fallbackCurriculum();
 try{
  const courses=await publicCourses();
  const course=courses.find(c=>c.slug===requested)||courses.find(c=>c.slug===CONFIG.DEFAULT_COURSE_SLUG)||FALLBACK_COURSE;
  paintCourse(course);
  try{
   const outline=await courseOutline(course.slug);
   if(!outline?.length)return;
   const grouped=new Map();
   outline.forEach(r=>{if(!grouped.has(r.module_id))grouped.set(r.module_id,{title:r.module_title,pos:r.module_position,lessons:[]});grouped.get(r.module_id).lessons.push(r)});
   q('#curriculum').innerHTML=[...grouped.values()].sort((a,b)=>a.pos-b.pos).map(m=>`<section class="module-public"><header><span class="kicker">MÓDULO ${m.pos}</span><h2>${esc(m.title)}</h2><span>${m.lessons.length} aulas</span></header><div class="lesson-public-list">${m.lessons.sort((a,b)=>a.lesson_position-b.lesson_position).map(l=>`<div><b>${String(l.lesson_position).padStart(2,'0')}</b><span>${esc(l.lesson_title)}</span><small>${esc(l.lesson_type)}${l.duration_minutes?' · '+l.duration_minutes+' min':''}</small></div>`).join('')}</div></section>`).join('');
  }catch(err){console.error('course-outline',err)}
 }catch(err){console.error('public-course',err)}
}

boot();
