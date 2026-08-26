import { sb } from './config.js';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
const BATCH=1000, PER=20;
let active=null;

function ensureStyles(){
  if($('#abaMatrixStyles'))return;
  const st=document.createElement('style');
  st.id='abaMatrixStyles';
  st.textContent=`
  .aba-matrix-modal{position:fixed;inset:0;z-index:1300;background:rgba(8,26,59,.72);display:none;align-items:stretch;justify-content:flex-end}.aba-matrix-modal.on{display:flex}
  .aba-matrix-shell{width:min(1180px,100vw);height:100vh;background:#f4f6f9;overflow:auto;box-shadow:-18px 0 55px rgba(8,26,59,.24)}
  .aba-matrix-head{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #d6dde8;padding:18px 22px;display:flex;gap:18px;align-items:flex-start;justify-content:space-between}
  .aba-matrix-head h2{margin:4px 0;color:#0f2a5a}.aba-matrix-head p{margin:0;color:#667386;font-size:12px}.aba-matrix-head-actions{display:flex;gap:7px;flex-wrap:wrap}
  .aba-matrix-body{padding:18px 22px 34px}.aba-matrix-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.aba-matrix-stat{background:#fff;border:1px solid #d6dde8;border-radius:8px;padding:12px}.aba-matrix-stat span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#667386}.aba-matrix-stat strong{display:block;font-size:25px;color:#0f2a5a;margin-top:3px}
  .aba-matrix-tools{display:grid;grid-template-columns:minmax(260px,2fr) minmax(180px,1fr) minmax(150px,1fr);gap:9px;margin-bottom:14px}.aba-matrix-tools input,.aba-matrix-tools select{width:100%;padding:10px;border:1px solid #c8d1dd;border-radius:6px;background:#fff}
  .aba-matrix-list{display:grid;gap:10px}.aba-matrix-item{background:#fff;border:1px solid #d6dde8;border-left:4px solid #dce5f0;border-radius:8px;padding:13px}.aba-matrix-item.scored{border-left-color:#244b82}.aba-matrix-item.na{border-left-color:#aeb8c6}.aba-matrix-item.ne{border-left-color:#17613f}
  .aba-matrix-title{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.aba-matrix-title b{color:#0f2a5a}.aba-matrix-title small{color:#667386}.aba-matrix-def{font-size:11px;line-height:1.45;color:#596779;margin-top:5px}.aba-matrix-inputs{display:grid;grid-template-columns:150px 110px 110px 170px 1fr;gap:8px;margin-top:10px;align-items:end}.aba-matrix-inputs label,.aba-matrix-detail label{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#5a6a7e;font-weight:800}.aba-matrix-inputs input,.aba-matrix-inputs select,.aba-matrix-detail input,.aba-matrix-detail textarea{width:100%;padding:8px;border:1px solid #c8d1dd;border-radius:5px;background:#fff;font-size:12px}.aba-matrix-detail{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.aba-matrix-detail textarea{min-height:62px;resize:vertical}.aba-matrix-checks{display:flex;gap:14px;align-items:center;padding-bottom:8px;font-size:11px}.aba-matrix-checks label{display:flex;gap:5px;align-items:center;text-transform:none;letter-spacing:0}.aba-matrix-checks input{width:auto}
  .aba-matrix-pager{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:15px;padding:12px;background:#fff;border:1px solid #d6dde8;border-radius:8px}.aba-matrix-pager span{font-size:11px;color:#667386}.aba-matrix-dirty{font-size:10px;color:#8a6300;font-weight:800;margin-top:4px;display:none}.aba-matrix-item.dirty .aba-matrix-dirty{display:block}
  @media(max-width:850px){.aba-matrix-summary{grid-template-columns:repeat(2,1fr)}.aba-matrix-tools{grid-template-columns:1fr}.aba-matrix-inputs{grid-template-columns:1fr 1fr}.aba-matrix-inputs>div:last-child{grid-column:1/-1}.aba-matrix-detail{grid-template-columns:1fr}.aba-matrix-head{position:static;flex-direction:column}.aba-matrix-head-actions{width:100%}.aba-matrix-head-actions .aba-btn{flex:1}.aba-matrix-body{padding:14px}.aba-matrix-title{flex-direction:column}}
  `;
  document.head.appendChild(st);
}

function flash(message,type='ok'){
  const el=$('#abaFlash');
  if(!el)return;
  el.textContent=message;el.className=`aba-flash on ${type}`;
  clearTimeout(flash.t);flash.t=setTimeout(()=>el.className='aba-flash',3500);
}

async function paged(builder){
  const out=[];
  for(let from=0;;from+=BATCH){
    const {data,error}=await builder(from,from+BATCH-1);
    if(error)throw error;
    out.push(...(data||[]));
    if((data||[]).length<BATCH)break;
  }
  return out;
}

async function fetchMatrix(assessmentId){
  const {data:a,error:ae}=await sb.from('aba_assessments').select('id,client_id,protocol_id,assessment_date,status,notes').eq('id',assessmentId).single();
  if(ae)throw ae;
  const [{data:p,error:pe},criteria,results]=await Promise.all([
    sb.from('aba_protocols').select('id,name,description,official_license_required,official_notice,library_version').eq('id',a.protocol_id).single(),
    paged((from,to)=>sb.from('aba_protocol_criteria').select('*').eq('protocol_id',a.protocol_id).eq('active',true).order('position').range(from,to)),
    paged((from,to)=>sb.from('aba_assessment_results').select('*').eq('assessment_id',assessmentId).order('created_at').range(from,to))
  ]);
  if(pe)throw pe;
  return {assessment:a,protocol:p,criteria,results};
}

function resultMap(){return new Map(active.results.filter(r=>r.criterion_id).map(r=>[r.criterion_id,r]));}
function stateOf(r){if(!r)return 'pending';if(r.result_state==='not_applicable')return 'ne';if(r.result_state==='tested')return 'scored';return 'pending';}
function scoreValue(r){if(!r)return '';if(r.result_state==='not_applicable')return 'NE';if(r.result_state==='not_tested')return 'NA';return r.score==null?'':String(Number(r.score));}

function ensureModal(){
  ensureStyles();
  let m=$('#abaMatrixModal');
  if(m)return m;
  m=document.createElement('div');m.id='abaMatrixModal';m.className='aba-matrix-modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
  m.innerHTML='<div class="aba-matrix-shell"><div id="abaMatrixContent"></div></div>';
  m.addEventListener('click',e=>{if(e.target===m)closeMatrix()});
  document.body.appendChild(m);
  return m;
}
function closeMatrix(){const m=$('#abaMatrixModal');if(m)m.classList.remove('on');active=null;}

function filtered(){
  const q=(active.search||'').toLowerCase(),d=active.domain||'',s=active.filter||'all',rm=resultMap();
  return active.criteria.filter(c=>!d||c.domain===d).filter(c=>!q||`${c.criterion_code||''} ${c.domain||''} ${c.title||''} ${c.operational_definition||''} ${c.target||''} ${c.sd||''}`.toLowerCase().includes(q)).filter(c=>s==='all'||stateOf(rm.get(c.id))===s);
}

function stats(){
  const rm=resultMap(), total=active.criteria.length;
  let tested=0,ne=0,pending=0;
  active.criteria.forEach(c=>{const st=stateOf(rm.get(c.id));if(st==='scored')tested++;else if(st==='ne')ne++;else pending++;});
  return {total,tested,ne,pending,coverage:total?Math.round(((tested+ne)/total)*100):0};
}

function render(){
  if(!active)return;
  const host=$('#abaMatrixContent'), st=stats(), list=filtered();
  const pages=Math.max(1,Math.ceil(list.length/PER));active.page=Math.min(Math.max(1,active.page||1),pages);
  const part=list.slice((active.page-1)*PER,active.page*PER), rm=resultMap();
  const domains=[...new Set(active.criteria.map(c=>c.domain).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  host.innerHTML=`
    <div class="aba-matrix-head">
      <div><span class="aba-product-kicker">Aplicação integral da matriz</span><h2>${esc(active.protocol.name)}</h2><p>${active.criteria.length.toLocaleString('pt-BR')} critérios ativos · avaliação ${esc(active.assessment.assessment_date||'')}</p></div>
      <div class="aba-matrix-head-actions"><button class="aba-btn secondary" id="abaMatrixSave">Salvar página</button><button class="aba-btn" id="abaMatrixSaveNext">Salvar e avançar</button><button class="aba-btn ghost" id="abaMatrixClose">Fechar</button></div>
    </div>
    <div class="aba-matrix-body">
      <div class="aba-matrix-summary">
        <div class="aba-matrix-stat"><span>Total</span><strong>${st.total.toLocaleString('pt-BR')}</strong></div>
        <div class="aba-matrix-stat"><span>Avaliados</span><strong>${st.tested.toLocaleString('pt-BR')}</strong></div>
        <div class="aba-matrix-stat"><span>Não elegíveis</span><strong>${st.ne.toLocaleString('pt-BR')}</strong></div>
        <div class="aba-matrix-stat"><span>Cobertura</span><strong>${st.coverage}%</strong></div>
      </div>
      <div class="aba-alert ok">Escore operacional: 0 = não demonstrado; 1 = alto suporte; 2 = parcial/inconsistente; 3 = independente no contexto avaliado; 4 = generalizado/manutenção; NE = não elegível; NA = ainda não avaliado. A interpretação deve considerar dado bruto, contexto, integridade da aplicação e validade social.</div>
      <div class="aba-matrix-tools">
        <input id="abaMatrixSearch" placeholder="Buscar código, domínio, habilidade, definição, alvo ou SD" value="${esc(active.search||'')}">
        <select id="abaMatrixDomain"><option value="">Todos os domínios</option>${domains.map(d=>`<option value="${esc(d)}" ${active.domain===d?'selected':''}>${esc(d)}</option>`).join('')}</select>
        <select id="abaMatrixFilter"><option value="all" ${active.filter==='all'?'selected':''}>Todos</option><option value="pending" ${active.filter==='pending'?'selected':''}>Pendentes</option><option value="scored" ${active.filter==='scored'?'selected':''}>Avaliados</option><option value="ne" ${active.filter==='ne'?'selected':''}>Não elegíveis</option></select>
      </div>
      <div class="aba-matrix-list">${part.map(c=>itemHTML(c,rm.get(c.id))).join('')||'<div class="aba-empty">Nenhum critério encontrado com este filtro.</div>'}</div>
      <div class="aba-matrix-pager"><button class="aba-btn small secondary" id="abaMatrixPrev" ${active.page<=1?'disabled':''}>Anterior</button><span>Página ${active.page} de ${pages} · ${part.length} exibidos · ${list.length.toLocaleString('pt-BR')} no filtro · ${st.pending.toLocaleString('pt-BR')} pendentes no protocolo</span><button class="aba-btn small secondary" id="abaMatrixNext" ${active.page>=pages?'disabled':''}>Próxima</button></div>
    </div>`;
  bind(pages);
}

function itemHTML(c,r){
  const v=scoreValue(r),cls=stateOf(r);
  return `<article class="aba-matrix-item ${cls}" data-matrix-item="${c.id}">
    <div class="aba-matrix-title"><div><b>${esc(c.criterion_code||'—')} · ${esc(c.title)}</b><br><small>${esc(c.domain||'—')}${c.context_name?' · '+esc(c.context_name):''}</small></div><span class="aba-badge info">${esc(c.measure||'operacional')}</span></div>
    <div class="aba-matrix-def">${esc(c.operational_definition||'Sem definição operacional cadastrada.')}</div>
    <div class="aba-matrix-inputs">
      <div><label>Escore</label><select data-f="score"><option value="" ${v===''?'selected':''}>—</option>${['0','1','2','3','4'].map(x=>`<option value="${x}" ${v===x?'selected':''}>${x}</option>`).join('')}<option value="NE" ${v==='NE'?'selected':''}>NE</option><option value="NA" ${v==='NA'?'selected':''}>NA</option></select></div>
      <div><label>Oportunidades</label><input data-f="opportunities" type="number" min="0" value="${r?.opportunities??''}"></div>
      <div><label>Independentes</label><input data-f="independent_responses" type="number" min="0" value="${r?.independent_responses??''}"></div>
      <div><label>Nível de ajuda</label><input data-f="prompt_level" value="${esc(r?.prompt_level||'')}"></div>
      <div class="aba-matrix-checks"><label><input data-f="generalized" type="checkbox" ${r?.generalized?'checked':''}> Generalizado</label><label><input data-f="maintained" type="checkbox" ${r?.maintained?'checked':''}> Mantido</label></div>
    </div>
    <div class="aba-matrix-detail">
      <div><label>Contexto observado</label><input data-f="context" value="${esc(r?.context||c.context_name||'')}"></div>
      <div><label>Evidência observável</label><textarea data-f="evidence">${esc(r?.evidence||'')}</textarea></div>
      <div style="grid-column:1/-1"><label>Notas clínicas</label><textarea data-f="notes">${esc(r?.notes||'')}</textarea></div>
    </div>
    <div class="aba-matrix-dirty">Alteração ainda não salva</div>
  </article>`;
}

function bind(pages){
  $('#abaMatrixClose').onclick=closeMatrix;
  $('#abaMatrixSearch').oninput=e=>{active.search=e.target.value;active.page=1;render()};
  $('#abaMatrixDomain').onchange=e=>{active.domain=e.target.value;active.page=1;render()};
  $('#abaMatrixFilter').onchange=e=>{active.filter=e.target.value;active.page=1;render()};
  $$('[data-matrix-item]').forEach(card=>card.querySelectorAll('[data-f]').forEach(el=>el.addEventListener('change',()=>card.classList.add('dirty'))));
  $('#abaMatrixPrev').onclick=()=>{if(active.page>1){active.page--;render()}};
  $('#abaMatrixNext').onclick=()=>{if(active.page<pages){active.page++;render()}};
  $('#abaMatrixSave').onclick=()=>savePage(false);
  $('#abaMatrixSaveNext').onclick=()=>savePage(true);
}

async function savePage(goNext){
  const cards=$$('.aba-matrix-item.dirty');
  if(!cards.length){if(goNext){active.page++;render()}else flash('Nenhuma alteração nesta página.');return;}
  const payload=[];
  for(const card of cards){
    const c=active.criteria.find(x=>x.id===card.dataset.matrixItem);if(!c)continue;
    const get=n=>card.querySelector(`[data-f="${n}"]`),sv=get('score').value;
    const opp=get('opportunities').value===''?null:Number(get('opportunities').value),ind=get('independent_responses').value===''?null:Number(get('independent_responses').value);
    if(opp!=null&&ind!=null&&ind>opp){flash(`${c.criterion_code||c.title}: independentes não podem exceder oportunidades.`,'bad');return;}
    let result_state='not_tested',score=null;
    if(sv==='NE')result_state='not_applicable';else if(sv==='NA'||sv==='')result_state='not_tested';else{result_state='tested';score=Number(sv)}
    payload.push({assessment_id:active.assessment.id,criterion_id:c.id,domain:c.domain,result_state,score,opportunities:opp,independent_responses:ind,prompt_level:get('prompt_level').value.trim()||null,context:get('context').value.trim()||null,generalized:get('generalized').checked,maintained:get('maintained').checked,evidence:get('evidence').value.trim()||null,notes:get('notes').value.trim()||null,updated_at:new Date().toISOString()});
  }
  const save=$('#abaMatrixSave'),next=$('#abaMatrixSaveNext');save.disabled=next.disabled=true;
  try{
    const {data,error}=await sb.from('aba_assessment_results').upsert(payload,{onConflict:'assessment_id,criterion_id'}).select();
    if(error)throw error;
    const map=resultMap();(data||[]).forEach(r=>map.set(r.criterion_id,r));active.results=[...map.values(),...active.results.filter(r=>!r.criterion_id)];
    flash(`${payload.length} critérios salvos.`);
    if(goNext)active.page++;
    render();
    $('#abaRefresh')?.click();
  }catch(e){console.error(e);flash(e?.message||String(e),'bad');save.disabled=next.disabled=false;}
}

async function openMatrix(id){
  try{
    const m=ensureModal();
    m.classList.add('on');$('#abaMatrixContent').innerHTML='<div class="aba-matrix-body"><div class="aba-card">Carregando matriz completa…</div></div>';
    const x=await fetchMatrix(id);
    active={...x,page:1,search:'',domain:'',filter:'pending'};
    render();
  }catch(e){console.error(e);closeMatrix();flash('Não foi possível abrir a matriz completa: '+(e?.message||e),'bad');}
}

function patch(){
  $$('[data-result-new]').forEach(btn=>{
    const head=btn.parentElement;if(!head||head.querySelector('[data-matrix-open]'))return;
    const b=document.createElement('button');b.type='button';b.className='aba-btn';b.dataset.matrixOpen=btn.dataset.resultNew;b.textContent='Aplicar matriz completa';b.onclick=()=>openMatrix(b.dataset.matrixOpen);head.insertBefore(b,btn);
  });
}

new MutationObserver(()=>queueMicrotask(patch)).observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('DOMContentLoaded',patch,{once:true});
setTimeout(patch,700);
