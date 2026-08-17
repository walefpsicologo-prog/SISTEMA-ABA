import { lessonContent, esc, flash, userError } from './api.js';

function renderText(text=''){
  const lines=String(text||'').replace(/\r/g,'').split('\n');let html='',list=false;
  const close=()=>{if(list){html+='</ul>';list=false}};
  for(const raw of lines){const line=raw.trim();if(!line){close();continue}
    if(/^---+$/.test(line)){close();html+='<div class="study-rule"></div>';continue}
    if(line.startsWith('### ')){close();html+=`<h3>${esc(line.slice(4))}</h3>`;continue}
    if(line.startsWith('## ')){close();html+=`<h2>${esc(line.slice(3))}</h2>`;continue}
    if(line.startsWith('# ')){close();html+=`<h2>${esc(line.slice(2))}</h2>`;continue}
    if(/^[-*] /.test(line)){if(!list){html+='<ul>';list=true}html+=`<li>${esc(line.slice(2))}</li>`;continue}
    close();html+=`<p>${esc(line)}</p>`;
  }close();return html;
}
async function load(details,lessonId){
  if(details.dataset.loaded==='1'||details.dataset.loading==='1')return;
  details.dataset.loading='1';const body=details.querySelector('.lesson-study-body');
  body.innerHTML='<p>Carregando conteúdo didático…</p>';
  try{const content=await lessonContent(lessonId);details.dataset.loaded='1';body.innerHTML=content?renderText(content):'<p>Conteúdo textual não cadastrado nesta aula. Consulte os materiais do curso.</p>'}
  catch(err){body.innerHTML='<p>Não foi possível carregar esta apostila agora.</p>';flash(userError(err),'bad')}
  finally{details.dataset.loading='0'}
}
function attach(){
  document.querySelectorAll('#lessonsArea .lesson-row').forEach(row=>{
    if(row.dataset.lazyStudy==='1')return;row.dataset.lazyStudy='1';
    const btn=row.querySelector('[data-complete]');const lessonId=btn?.dataset.complete;if(!lessonId)return;
    const contentBox=row.querySelector('.lesson-row > div');if(!contentBox)return;
    const tags=contentBox.querySelector('.lesson-tags');if(tags&&!tags.querySelector('[data-lazy-badge]'))tags.insertAdjacentHTML('beforeend','<span data-lazy-badge>APOSTILA</span>');
    if(contentBox.querySelector('.lesson-study'))return;
    const details=document.createElement('details');details.className='lesson-study';details.dataset.lesson=lessonId;
    details.innerHTML='<summary>Abrir apostila didática</summary><div class="lesson-study-body"><p>O conteúdo será carregado quando você abrir esta seção.</p></div>';
    details.addEventListener('toggle',()=>{if(details.open)load(details,lessonId)});
    contentBox.append(details);
  });
}
const area=document.querySelector('#lessonsArea');if(area){new MutationObserver(attach).observe(area,{childList:true,subtree:true});attach()}
