import { sb } from './config.js';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let summaries=[],sections=[],sources=[],criteriaCache=new Map(),loaded=false,loading=false;

function ensureStyle(){
  if($('#abaSourceFidelityStyle'))return;
  const st=document.createElement('style');st.id='abaSourceFidelityStyle';st.textContent=`
  .aba-source-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.aba-source-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;border:1px solid #cbd6e5;background:#f5f8fc;color:#41556f}.aba-source-badge.verified{background:#eaf4ef;border-color:#b8d7c7;color:#18583c}.aba-source-badge.operational{background:#edf3fb;border-color:#c5d5ea;color:#244b82}.aba-source-badge.map{background:#fff6df;border-color:#e5d4a4;color:#7b5b08}
  .aba-source-panel{margin:0 0 14px;padding:14px;border:1px solid #cfd9e7;border-left:4px solid #0f2a5a;border-radius:8px;background:#f8fafc}.aba-source-panel h4{margin:0;color:#0f2a5a}.aba-source-panel p{margin:5px 0;color:#53657c;font-size:11px;line-height:1.45}.aba-source-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}.aba-source-stat{padding:9px;background:#fff;border:1px solid #d9e1ec;border-radius:6px}.aba-source-stat span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.06em;color:#708097;font-weight:800}.aba-source-stat b{display:block;color:#0f2a5a;font-size:15px;margin-top:3px}.aba-source-structure{margin-top:10px}.aba-source-structure summary{cursor:pointer;font-size:11px;font-weight:850;color:#0f2a5a}.aba-source-sections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px}.aba-source-section{background:#fff;border:1px solid #d9e1ec;border-radius:6px;padding:8px;font-size:10px;color:#4e6076}.aba-source-section b{color:#0f2a5a}.aba-source-file{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;color:#52657b}.aba-source-row-tag{display:inline-flex;margin-left:6px;padding:2px 5px;border-radius:999px;font-size:8px;font-weight:850;background:#eef3f9;color:#40556f;vertical-align:middle}.aba-source-row-tag.verified{background:#eaf4ef;color:#18583c}.aba-source-row-tag.operational{background:#edf3fb;color:#244b82}
  @media(max-width:780px){.aba-source-grid{grid-template-columns:repeat(2,1fr)}.aba-source-sections{grid-template-columns:1fr}}
  `;document.head.appendChild(st);
}

async function load(){
  if(loaded||loading)return;loading=true;
  try{
    const [a,b,c]=await Promise.all([
      sb.from('aba_protocol_catalog_summary').select('*').order('name'),
      sb.from('aba_protocol_sections').select('*').order('protocol_id').order('position'),
      sb.from('aba_protocol_sources').select('*').eq('active',true).order('protocol_id').order('created_at')
    ]);
    if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;
    summaries=a.data||[];sections=b.data||[];sources=c.data||[];loaded=true;
  }catch(e){console.error('source fidelity load',e)}finally{loading=false}
}

function statusLabel(p){
  if(p.source_status==='user_provided_source')return ['Fonte enviada','verified'];
  if(p.protocol_kind==='source_protocol_map')return ['Mapa da fonte','map'];
  if(p.source_status==='operational_complete')return ['Matriz operacional extensa','operational'];
  if(p.source_status==='operational_focused')return ['Módulo operacional','operational'];
  return ['Biblioteca clínica','operational'];
}
function summaryByName(name){return summaries.find(p=>String(p.name||'').trim()===String(name||'').trim())||null}
function fmt(v){return Number(v||0).toLocaleString('pt-BR')}
function badge(text,cls=''){return `<span class="aba-source-badge ${cls}">${esc(text)}</span>`}

async function criteriaFor(pid){
  if(criteriaCache.has(pid))return criteriaCache.get(pid);
  const out=[];for(let from=0;;from+=1000){const {data,error}=await sb.from('aba_protocol_criteria').select('id,criterion_code,source_item_code,source_verified,fidelity_status,official_title').eq('protocol_id',pid).eq('active',true).order('position').range(from,from+999);if(error){console.error(error);break}out.push(...(data||[]));if((data||[]).length<1000)break}
  criteriaCache.set(pid,out);return out;
}

function patchCards(){
  const view=$('#abaView-protocols');if(!view||!summaries.length)return;
  view.querySelectorAll('.aba-card').forEach(card=>{
    if(card.closest('#abaProtocolDetail'))return;
    const title=card.querySelector('h3,h4,strong')?.textContent?.trim();if(!title)return;
    const p=summaryByName(title);if(!p||card.querySelector('.aba-source-badges'))return;
    const [lab,cls]=statusLabel(p);const box=document.createElement('div');box.className='aba-source-badges';
    box.innerHTML=badge(lab,cls)+(p.group_name?badge(p.group_name):'')+(p.source_verified?badge('estrutura verificada','verified'):'');
    const anchor=card.querySelector('h3,h4,strong');anchor?.insertAdjacentElement('afterend',box);
  });
}

async function patchDetail(){
  const panel=$('#abaProtocolDetail .aba-criteria-panel');if(!panel||panel.dataset.sourcePatched==='1'||!summaries.length)return;
  const title=panel.querySelector('h3')?.textContent?.trim();const p=summaryByName(title);if(!p)return;
  panel.dataset.sourcePatched='1';
  const src=sources.filter(x=>x.protocol_id===p.id),sec=sections.filter(x=>x.protocol_id===p.id);const [lab,cls]=statusLabel(p);
  const sourceFile=p.source_file_title||src[0]?.source_file_title||'';
  const expected=p.expected_item_count==null?'—':fmt(p.expected_item_count);
  const actual=fmt(p.active_criteria),verified=fmt(p.source_verified_criteria),oper=fmt(p.operational_criteria);
  const sourceText=p.source_status==='user_provided_source'
    ? 'O documento enviado pelo usuário está vinculado a este protocolo. A interface distingue conteúdo documental transcrito de critérios operacionais complementares.'
    : 'Este protocolo pertence à biblioteca operacional clínica e não é apresentado como transcrição integral de um instrumento comercial.';
  const box=document.createElement('div');box.className='aba-source-panel';
  box.innerHTML=`<div class="aba-source-badges">${badge(lab,cls)}${p.source_verified?badge('fonte confirmada','verified'):''}${p.group_name?badge(p.group_name):''}</div><h4>Origem e fidelidade do protocolo</h4><p>${esc(sourceText)}</p>${sourceFile?`<p><b>Arquivo-fonte:</b> <span class="aba-source-file">${esc(sourceFile)}</span></p>`:''}<div class="aba-source-grid"><div class="aba-source-stat"><span>Critérios ativos</span><b>${actual}</b></div><div class="aba-source-stat"><span>Itens esperados na fonte</span><b>${expected}</b></div><div class="aba-source-stat"><span>Itens transcritos/verificados</span><b>${verified}</b></div><div class="aba-source-stat"><span>Camada operacional</span><b>${oper}</b></div></div>${sec.length?`<details class="aba-source-structure"><summary>Ver estrutura documental (${sec.length} áreas/seções)</summary><div class="aba-source-sections">${sec.map(s=>`<div class="aba-source-section"><b>${esc(s.section_code)} · ${esc(s.section_name)}</b>${s.item_range?`<br>${esc(s.item_range)}`:''}${s.expected_item_count!=null?` · ${fmt(s.expected_item_count)} itens`:''}</div>`).join('')}</div></details>`:''}${p.source_notes?`<p>${esc(p.source_notes)}</p>`:''}`;
  panel.querySelector('.aba-section-head')?.insertAdjacentElement('afterend',box);

  const cc=await criteriaFor(p.id);const byCode=new Map(cc.map(c=>[String(c.criterion_code||c.source_item_code||''),c]));
  panel.querySelectorAll('#abaCriteriaRows tr').forEach(tr=>{const td=tr.querySelector('td');if(!td)return;const code=td.textContent.trim();const c=byCode.get(code);if(!c)return;const tag=document.createElement('span');tag.className='aba-source-row-tag '+(c.source_verified?'verified':'operational');tag.textContent=c.source_verified?'Fonte':'Operacional';td.appendChild(tag)});
}

function patch(){if(!loaded)return;patchCards();patchDetail()}

ensureStyle();
load().then(()=>patch());
new MutationObserver(()=>queueMicrotask(patch)).observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('DOMContentLoaded',()=>load().then(patch),{once:true});
setInterval(()=>{if(loaded)patch()},1800);
