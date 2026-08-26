import { sb } from './config.js';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const BATCH=1000, PER=20;
let active=null;

function ensureStyles(){
  if($('#abaMatrixStyles'))return;
  const st=document.createElement('style');
  st.id='abaMatrixStyles';
  st.textContent=`
  .aba-matrix-modal{position:fixed;inset:0;z-index:1300;background:rgba(8,26,59,.72);display:none;align-items:stretch;justify-content:flex-end}.aba-matrix-modal.on{display:flex}
  .aba-matrix-shell{width:min(1220px,100vw);height:100vh;background:#f4f6f9;overflow:auto;box-shadow:-18px 0 55px rgba(8,26,59,.24)}
  .aba-matrix-head{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #d6dde8;padding:18px 22px;display:flex;gap:18px;align-items:flex-start;justify-content:space-between}.aba-matrix-head h2{margin:4px 0;color:#0f2a5a}.aba-matrix-head p{margin:0;color:#667386;font-size:12px}.aba-matrix-head-actions{display:flex;gap:7px;flex-wrap:wrap}
  .aba-matrix-body{padding:18px 22px 34px}.aba-matrix-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:14px}.aba-matrix-stat{background:#fff;border:1px solid #d6dde8;border-radius:8px;padding:12px}.aba-matrix-stat span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#667386}.aba-matrix-stat strong{display:block;font-size:25px;color:#0f2a5a;margin-top:3px}
  .aba-matrix-provenance{background:#fff;border:1px solid #d6dde8;border-left:4px solid #0f2a5a;border-radius:8px;padding:12px;margin:0 0 14px}.aba-matrix-provenance b{color:#0f2a5a}.aba-matrix-provenance p{font-size:11px;color:#586a80;margin:4px 0}.aba-matrix-provenance code{font-size:10px;color:#42566d}
  .aba-matrix-tools{display:grid;grid-template-columns:minmax(260px,2fr) minmax(180px,1fr) minmax(150px,1fr) minmax(160px,1fr);gap:9px;margin-bottom:14px}.aba-matrix-tools input,.aba-matrix-tools select{width:100%;padding:10px;border:1px solid #c8d1dd;border-radius:6px;background:#fff}
  .aba-matrix-list{display:grid;gap:10px}.aba-matrix-item{background:#fff;border:1px solid #d6dde8;border-left:4px solid #dce5f0;border-radius:8px;padding:13px}.aba-matrix-item.scored{border-left-color:#244b82}.aba-matrix-item.ne{border-left-color:#17613f}.aba-matrix-item.source{box-shadow:inset 0 0 0 1px rgba(23,97,63,.08)}
  .aba-matrix-title{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.aba-matrix-title b{color:#0f2a5a}.aba-matrix-title small{color:#667386}.aba-matrix-tags{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.aba-matrix-tag{display:inline-flex;padding:3px 6px;border-radius:999px;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;background:#edf3fb;color:#244b82}.aba-matrix-tag.source{background:#eaf4ef;color:#18583c}.aba-matrix-tag.map{background:#fff5d9;color:#7d5b00}
  .aba-matrix-def{font-size:11px;line-height:1.45;color:#596779;margin-top:6px}.aba-matrix-source-fields{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px;padding:9px;background:#f8fafc;border:1px solid #e0e6ef;border-radius:6px}.aba-matrix-source-fields div{font-size:10px;line-height:1.4;color:#53657b}.aba-matrix-source-fields b{display:block;color:#0f2a5a;font-size:9px;text-transform:uppercase;letter-spacing:.04em}
  .aba-matrix-inputs{display:grid;grid-template-columns:170px 110px 110px 170px 1fr;gap:8px;margin-top:10px;align-items:end}.aba-matrix-inputs label,.aba-matrix-detail label{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#5a6a7e;font-weight:800}.aba-matrix-inputs input,.aba-matrix-inputs select,.aba-matrix-detail input,.aba-matrix-detail textarea{width:100%;padding:8px;border:1px solid #c8d1dd;border-radius:5px;background:#fff;font-size:12px}.aba-matrix-detail{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.aba-matrix-detail textarea{min-height:62px;resize:vertical}.aba-matrix-checks{display:flex;gap:14px;align-items:center;padding-bottom:8px;font-size:11px}.aba-matrix-checks label{display:flex;gap:5px;align-items:center;text-transform:none;letter-spacing:0}.aba-matrix-checks input{width:auto}
  .aba-matrix-pager{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:15px;padding:12px;background:#fff;border:1px solid #d6dde8;border-radius:8px}.aba-matrix-pager span{font-size:11px;color:#667386}.aba-matrix-dirty{font-size:10px;color:#8a6300;font-weight:800;margin-top:4px;display:none}.aba-matrix-item.dirty .aba-matrix-dirty{display:block}
  @media(max-width:900px){.aba-matrix-summary{grid-template-columns:repeat(2,1fr)}.aba-matrix-tools{grid-template-columns:1fr 1fr}.aba-matrix-inputs{grid-template-columns:1fr 1fr}.aba-matrix-inputs>div:last-child{grid-column:1/-1}.aba-matrix-detail,.aba-matrix-source-fields{grid-template-columns:1fr}.aba-matrix-head{position:static;flex-direction:column}.aba-matrix-head-actions{width:100%}.aba-matrix-head-actions .aba-btn{flex:1}.aba-matrix-body{padding:14px}.aba-matrix-title{flex-direction:column}.aba-matrix-tags{justify-content:flex-start}}
  @media(max-width:560px){.aba-matrix-tools{grid-template-columns:1fr}.aba-matrix-summary{grid-template-columns:1fr 1fr}.aba-matrix-inputs{grid-template-columns:1fr}}
  `;
  document.head.appendChild(st);
}

function flash(message,type='ok'){
  const el=$('#abaFlash');if(!el)return;
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
  const [{data:p,error:pe},criteria,results,{data:sections,error:se},{data:sources,error:soe}]=await Promise.all([
    sb.from('aba_protocols').select('*').eq('id',a.protocol_id).single(),
    paged((from,to)=>sb.from('aba_protocol_criteria').select('*').eq('protocol_id',a.protocol_id).eq('active',true).order('position').order('criterion_code').range(from,to)),
    paged((from,to)=>sb.from('aba_assessment_results').select('*').eq('assessment_id',assessmentId).order('created_at').range(from,to)),
    sb.from('aba_protocol_sections').select('*').eq('protocol_id',a.protocol_id).order('position'),
    sb.from('aba_protocol_sources').select('*').eq('protocol_id',a.protocol_id).eq('active',true).order('created_at')
  ]);
  if(pe)throw pe;if(se)throw se;if(soe)throw soe;
  return {assessment:a,protocol:p,criteria,results,sections:sections||[],sources:sources||[]};
}

function resultMap(){
  const m=new Map();
  active.results.filter(r=>r.criterion_id).forEach(r=>m.set(r.criterion_id,r));
  return m;
}
function isSource(c){return !!c.source_verified || String(c.fidelity_status||'').startsWith('source')}
function stateOf(r){if(!r)return 'pending';if(r.result_state==='not_applicable')return 'ne';if(r.result_state==='tested')return 'scored';return 'pending'}
function scoreValue(r){
  if(!r)return '';
  if(r.result_state==='not_applicable')return 'NE';
  if(r.result_state==='not_tested')return 'NA';
  if(r.score_raw!=null&&String(r.score_raw)!=='')return String(r.score_raw);
  return r.score==null?'':String(Number(r.score));
}
function numericOptions(values){return (values||[]).map(v=>String(v)).filter(v=>v!==''&&v!=='NA'&&v!=='NE')}
function scoreOptions(c){
  if(Array.isArray(c.official_score_options)&&c.official_score_options.length)return numericOptions(c.official_score_options);
  if(c.score_guide && typeof c.score_guide==='object' && !Array.isArray(c.score_guide)){
    const keys=Object.keys(c.score_guide).filter(k=>/^\d+(\.\d+)?$/.test(k));if(keys.length)return keys.sort((a,b)=>Number(a)-Number(b));
  }
  if(Array.isArray(active.protocol?.score_scale)&&active.protocol.score_scale.length)return numericOptions(active.protocol.score_scale);
  return ['0','1','2','3','4'];
}
function scoreMax(c,opts){
  if(c.score_max!=null)return Number(c.score_max);
  const n=opts.map(Number).filter(Number.isFinite);return n.length?Math.max(...n):null;
}
function scoreSystem(c){
  if(isSource(c))return `source:${active.protocol.id}`;
  return 'operational:criterion-specific';
}

function ensureModal(){
  ensureStyles();
  let m=$('#abaMatrixModal');if(m)return m;
  m=document.createElement('div');m.id='abaMatrixModal';m.className='aba-matrix-modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
  m.innerHTML='<div class="aba-matrix-shell"><div id="abaMatrixContent"></div></div>';
  m.addEventListener('click',e=>{if(e.target===m)closeMatrix()});
  document.body.appendChild(m);return m;
}
function closeMatrix(){const m=$('#abaMatrixModal');if(m)m.classList.remove('on');active=null}

function filtered(){
  const q=(active.search||'').toLowerCase(),d=active.domain||'',s=active.filter||'all',f=active.fidelity||'all',rm=resultMap();
  return active.criteria
    .filter(c=>!d||c.domain===d)
    .filter(c=>!q||`${c.criterion_code||''} ${c.source_item_code||''} ${c.domain||''} ${c.title||''} ${c.official_title||''} ${c.operational_definition||''} ${c.official_objective||''} ${c.target||''} ${c.sd||''}`.toLowerCase().includes(q))
    .filter(c=>s==='all'||stateOf(rm.get(c.id))===s)
    .filter(c=>f==='all'||(f==='source'?isSource(c):!isSource(c)));
}

function stats(){
  const rm=resultMap(),total=active.criteria.length;let tested=0,ne=0,pending=0,source=0;
  active.criteria.forEach(c=>{const st=stateOf(rm.get(c.id));if(st==='scored')tested++;else if(st==='ne')ne++;else pending++;if(isSource(c))source++});
  return {total,tested,ne,pending,source,coverage:total?Math.round(((tested+ne)/total)*100):0};
}

function provenanceHTML(st){
  const p=active.protocol,src=active.sources?.[0];
  const file=p.source_file_title||src?.source_file_title||'';
  const expected=p.expected_item_count==null?'—':Number(p.expected_item_count).toLocaleString('pt-BR');
  const kind=p.source_status==='user_provided_source'?'Fonte documental enviada + camada clínica':'Biblioteca operacional clínica';
  const msg=p.source_status==='user_provided_source'
    ? (st.source?`${st.source.toLocaleString('pt-BR')} item(ns) desta matriz já estão marcados como transcrição/mapa de fonte. Os demais permanecem identificados como operacionais.`:'A estrutura documental está vinculada, porém os critérios desta matriz ainda são a camada operacional. O sistema não os apresenta como transcrição oficial.')
    : 'Esta matriz foi construída para avaliação e planejamento clínico operacional e permanece separada de protocolos documentais/licenciados.';
  return `<div class="aba-matrix-provenance"><b>${esc(kind)}</b>${file?`<p>Arquivo-fonte: <code>${esc(file)}</code></p>`:''}<p>${esc(msg)}</p><p>Itens esperados na fonte: <b>${expected}</b> · seções documentais cadastradas: <b>${active.sections.length}</b>.</p></div>`;
}

function render(){
  if(!active)return;
  const host=$('#abaMatrixContent'),st=stats(),list=filtered();
  const pages=Math.max(1,Math.ceil(list.length/PER));active.page=Math.min(Math.max(1,active.page||1),pages);
  const part=list.slice((active.page-1)*PER,active.page*PER),rm=resultMap();
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
        <div class="aba-matrix-stat"><span>Fonte verificada/mapa</span><strong>${st.source.toLocaleString('pt-BR')}</strong></div>
        <div class="aba-matrix-stat"><span>Cobertura</span><strong>${st.coverage}%</strong></div>
      </div>
      ${provenanceHTML(st)}
      <div class="aba-alert ok">O escore é definido por item. Quando existe escala/critério transcrito da fonte, ela tem prioridade. Quando não existe, permanece a regra operacional cadastrada no critério. NA = ainda não avaliado; NE = não elegível.</div>
      <div class="aba-matrix-tools">
        <input id="abaMatrixSearch" placeholder="Buscar código, domínio, habilidade, definição, objetivo ou SD" value="${esc(active.search||'')}">
        <select id="abaMatrixDomain"><option value="">Todos os domínios</option>${domains.map(d=>`<option value="${esc(d)}" ${active.domain===d?'selected':''}>${esc(d)}</option>`).join('')}</select>
        <select id="abaMatrixFilter"><option value="all" ${active.filter==='all'?'selected':''}>Todos os estados</option><option value="pending" ${active.filter==='pending'?'selected':''}>Pendentes</option><option value="scored" ${active.filter==='scored'?'selected':''}>Avaliados</option><option value="ne" ${active.filter==='ne'?'selected':''}>Não elegíveis</option></select>
        <select id="abaMatrixFidelity"><option value="all" ${active.fidelity==='all'?'selected':''}>Fonte + operacional</option><option value="source" ${active.fidelity==='source'?'selected':''}>Somente fonte/mapa</option><option value="operational" ${active.fidelity==='operational'?'selected':''}>Somente operacional</option></select>
      </div>
      <div class="aba-matrix-list">${part.map(c=>itemHTML(c,rm.get(c.id))).join('')||'<div class="aba-empty">Nenhum critério encontrado com este filtro.</div>'}</div>
      <div class="aba-matrix-pager"><button class="aba-btn small secondary" id="abaMatrixPrev" ${active.page<=1?'disabled':''}>Anterior</button><span>Página ${active.page} de ${pages} · ${part.length} exibidos · ${list.length.toLocaleString('pt-BR')} no filtro · ${st.pending.toLocaleString('pt-BR')} pendentes</span><button class="aba-btn small secondary" id="abaMatrixNext" ${active.page>=pages?'disabled':''}>Próxima</button></div>
    </div>`;
  bind(pages);
}

function sourceFields(c){
  if(!isSource(c))return '';
  const rows=[['Objetivo da fonte',c.official_objective],['Pergunta/condição',c.official_question],['Exemplo',c.official_example],['Critério de pontuação',c.official_criterion_text],['Arquivo',c.source_file_title],['Página',c.source_page]].filter(x=>x[1]!=null&&String(x[1]).trim());
  if(!rows.length)return '';
  return `<div class="aba-matrix-source-fields">${rows.map(([k,v])=>`<div><b>${esc(k)}</b>${esc(v)}</div>`).join('')}</div>`;
}

function itemHTML(c,r){
  const v=scoreValue(r),cls=stateOf(r),source=isSource(c),opts=scoreOptions(c),max=scoreMax(c,opts);
  const title=c.official_title||c.title||c.target||'Critério';
  const def=source?(c.official_objective||c.operational_definition||c.target):(c.operational_definition||c.target||'Sem definição operacional cadastrada.');
  const fidelity=source?(String(c.fidelity_status||'').includes('map')?'Mapa da fonte':'Fonte transcrita'):'Operacional';
  return `<article class="aba-matrix-item ${cls} ${source?'source':''}" data-matrix-item="${c.id}">
    <div class="aba-matrix-title"><div><b>${esc(c.source_item_code||c.criterion_code||'—')} · ${esc(title)}</b><br><small>${esc(c.domain||'—')}${c.context_name?' · '+esc(c.context_name):''}</small></div><div class="aba-matrix-tags"><span class="aba-matrix-tag ${source?'source':''}">${esc(fidelity)}</span><span class="aba-matrix-tag">${esc(c.measure||'critério')}</span></div></div>
    <div class="aba-matrix-def">${esc(def)}</div>${sourceFields(c)}
    <div class="aba-matrix-inputs">
      <div><label>Escore ${source?'da fonte/critério':'do critério'}</label><select data-f="score"><option value="" ${v===''?'selected':''}>—</option>${opts.map(x=>`<option value="${esc(x)}" ${v===String(x)?'selected':''}>${esc(x)}</option>`).join('')}<option value="NE" ${v==='NE'?'selected':''}>NE</option><option value="NA" ${v==='NA'?'selected':''}>NA</option></select>${max!=null?`<small>máx. ${esc(max)}</small>`:''}</div>
      <div><label>Oportunidades</label><input data-f="opportunities" type="number" min="0" value="${r?.opportunities??''}"></div>
      <div><label>Independentes</label><input data-f="independent_responses" type="number" min="0" value="${r?.independent_responses??''}"></div>
      <div><label>Nível de ajuda</label><input data-f="prompt_level" value="${esc(r?.prompt_level||'')}"></div>
      <div class="aba-matrix-checks"><label><input data-f="generalized" type="checkbox" ${r?.generalized?'checked':''}> Generalizado</label><label><input data-f="maintained" type="checkbox" ${r?.maintained?'checked':''}> Mantido</label></div>
    </div>
    <div class="aba-matrix-detail"><div><label>Contexto observado</label><input data-f="context" value="${esc(r?.context||c.context_name||'')}"></div><div><label>Evidência observável</label><textarea data-f="evidence">${esc(r?.evidence||'')}</textarea></div><div style="grid-column:1/-1"><label>Notas clínicas</label><textarea data-f="notes">${esc(r?.notes||'')}</textarea></div></div>
    <div class="aba-matrix-dirty">Alteração ainda não salva</div>
  </article>`;
}

function bind(pages){
  $('#abaMatrixClose').onclick=closeMatrix;
  $('#abaMatrixSearch').oninput=e=>{active.search=e.target.value;active.page=1;render()};
  $('#abaMatrixDomain').onchange=e=>{active.domain=e.target.value;active.page=1;render()};
  $('#abaMatrixFilter').onchange=e=>{active.filter=e.target.value;active.page=1;render()};
  $('#abaMatrixFidelity').onchange=e=>{active.fidelity=e.target.value;active.page=1;render()};
  $$('[data-matrix-item]').forEach(card=>card.querySelectorAll('[data-f]').forEach(el=>el.addEventListener('change',()=>card.classList.add('dirty'))));
  $('#abaMatrixPrev').onclick=()=>{if(active.page>1){active.page--;render()}};
  $('#abaMatrixNext').onclick=()=>{if(active.page<pages){active.page++;render()}};
  $('#abaMatrixSave').onclick=()=>savePage(false);
  $('#abaMatrixSaveNext').onclick=()=>savePage(true);
}

function snapshot(c,opts){
  return {protocol_id:c.protocol_id,criterion_id:c.id,criterion_code:c.criterion_code,source_item_code:c.source_item_code,domain:c.domain,title:c.title,official_title:c.official_title,official_criterion_text:c.official_criterion_text,score_options:opts,score_max:scoreMax(c,opts),fidelity_status:c.fidelity_status,source_verified:!!c.source_verified,source_file_title:c.source_file_title,source_page:c.source_page,library_version:c.library_version};
}

async function savePage(goNext){
  const cards=$$('.aba-matrix-item.dirty');
  if(!cards.length){if(goNext){active.page++;render()}else flash('Nenhuma alteração nesta página.');return}
  const payload=[];
  for(const card of cards){
    const c=active.criteria.find(x=>String(x.id)===String(card.dataset.matrixItem));if(!c)continue;
    const get=n=>card.querySelector(`[data-f="${n}"]`),sv=get('score').value;
    const opp=get('opportunities').value===''?null:Number(get('opportunities').value),ind=get('independent_responses').value===''?null:Number(get('independent_responses').value);
    if(opp!=null&&ind!=null&&ind>opp){flash(`${c.source_item_code||c.criterion_code||c.title}: independentes não podem exceder oportunidades.`,'bad');return}
    let result_state='not_tested',score=null,scoreRaw=null;
    if(sv==='NE'){result_state='not_applicable';scoreRaw='NE'}
    else if(sv==='NA'||sv===''){result_state='not_tested';scoreRaw=sv||'NA'}
    else{result_state='tested';scoreRaw=sv;const n=Number(sv);score=Number.isFinite(n)?n:null}
    const opts=scoreOptions(c);
    payload.push({assessment_id:active.assessment.id,criterion_id:c.id,domain:c.domain,result_state,score,score_raw:scoreRaw,score_max:scoreMax(c,opts),score_system:scoreSystem(c),source_fidelity:isSource(c)?(c.fidelity_status||'source_verified'):'operational',criterion_snapshot:snapshot(c,opts),opportunities:opp,independent_responses:ind,prompt_level:get('prompt_level').value.trim()||null,context:get('context').value.trim()||null,generalized:get('generalized').checked,maintained:get('maintained').checked,evidence:get('evidence').value.trim()||null,notes:get('notes').value.trim()||null,updated_at:new Date().toISOString()});
  }
  const save=$('#abaMatrixSave'),next=$('#abaMatrixSaveNext');save.disabled=next.disabled=true;
  try{
    const {data,error}=await sb.from('aba_assessment_results').upsert(payload,{onConflict:'assessment_id,criterion_id'}).select();if(error)throw error;
    const map=resultMap();(data||[]).forEach(r=>map.set(r.criterion_id,r));active.results=[...map.values(),...active.results.filter(r=>!r.criterion_id)];
    flash(`${payload.length} critério(s) salvo(s) com snapshot da regra de pontuação.`);if(goNext)active.page++;render();$('#abaRefresh')?.click();
  }catch(e){console.error(e);flash(e?.message||String(e),'bad');save.disabled=next.disabled=false}
}

async function openMatrix(id){
  try{
    const m=ensureModal();m.classList.add('on');$('#abaMatrixContent').innerHTML='<div class="aba-matrix-body"><div class="aba-card">Carregando matriz completa…</div></div>';
    const x=await fetchMatrix(id);active={...x,page:1,search:'',domain:'',filter:'pending',fidelity:'all'};render();
  }catch(e){console.error(e);closeMatrix();flash('Não foi possível abrir a matriz completa: '+(e?.message||e),'bad')}
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
