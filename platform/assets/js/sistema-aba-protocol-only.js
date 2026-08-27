import { sb } from './config.js';

const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let summaries=[],scheduled=false,ready=false;

const FAMILIES=[
  {
    key:'ablls',title:'ABLLS-R',ids:['ablls'],
    description:'Assessment of Basic Language and Learning Skills – Revised.',
    structure:'25 áreas · 544 habilidades na estrutura do protocolo',
    parts:['Protocolo único organizado pelas áreas A–Z aplicáveis, sem criar matrizes paralelas.']
  },
  {
    key:'vbmapp',title:'VB-MAPP',ids:['vbmapp_n1','vbmapp_n2','vbmapp_n3','vbmapp_barreiras','vbmapp_transition'],
    description:'Verbal Behavior Milestones Assessment and Placement Program.',
    structure:'170 marcos · 24 barreiras · 18 medidas de transição',
    parts:['Marcos — Nível 1','Marcos — Nível 2','Marcos — Nível 3','Avaliação de Barreiras','Avaliação de Transição']
  },
  {
    key:'afls',title:'AFLS',ids:['afls_basico','afls_domestico','afls_comunidade','afls_escolar','afls_vocacional','afls_independente'],
    description:'Assessment of Functional Living Skills.',
    structure:'6 protocolos do conjunto AFLS · 66 áreas funcionais',
    parts:['Basic Living Skills','Home Skills','Community Participation Skills','School Skills','Vocational Skills','Independent Living Skills']
  },
  {
    key:'socially-savvy',title:'Socially Savvy',ids:['socially_savvy'],
    description:'Avaliação estruturada de repertórios sociais.',
    structure:'Protocolo social mantido como um único instrumento',
    parts:['Os domínios pertencem ao protocolo; não aparecem como protocolos separados.']
  },
  {
    key:'efl',title:'Essentials for Living',ids:['efl'],
    description:'Instrumento de avaliação e planejamento de habilidades funcionais.',
    structure:'Um único instrumento no catálogo',
    parts:['Sem matriz operacional paralela na tela de Protocolos.']
  },
  {
    key:'peak',title:'PEAK',ids:['peak'],
    description:'Promoting the Emergence of Advanced Knowledge.',
    structure:'Um único instrumento no catálogo',
    parts:['Sem bibliotecas clínicas genéricas apresentadas como protocolo.']
  }
];
const ALLOWED_IDS=new Set(FAMILIES.flatMap(x=>x.ids));
const LABELS={
  ablls:'ABLLS-R',
  vbmapp_n1:'VB-MAPP — Marcos Nível 1',vbmapp_n2:'VB-MAPP — Marcos Nível 2',vbmapp_n3:'VB-MAPP — Marcos Nível 3',
  vbmapp_barreiras:'VB-MAPP — Avaliação de Barreiras',vbmapp_transition:'VB-MAPP — Avaliação de Transição',
  afls_basico:'AFLS — Habilidades Básicas de Vida',afls_domestico:'AFLS — Habilidades de Vida Doméstica',afls_comunidade:'AFLS — Participação Comunitária',
  afls_escolar:'AFLS — Habilidades Escolares',afls_vocacional:'AFLS — Habilidades Vocacionais',afls_independente:'AFLS — Habilidades de Vida Independente',
  socially_savvy:'Socially Savvy',efl:'Essentials for Living',peak:'PEAK'
};

function ensureStyle(){
  if($('#abaProtocolOnlyStyle'))return;
  const s=document.createElement('style');s.id='abaProtocolOnlyStyle';s.textContent=`
  .aba-protocol-only-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.aba-protocol-only{border:1px solid #d5dde8;border-radius:8px;padding:15px;background:#fff}.aba-protocol-only h4{margin:0;color:#0f2a5a;font-size:18px}.aba-protocol-only>p{margin:6px 0;color:#596a7e;font-size:11px;line-height:1.5}.aba-protocol-only-structure{font-weight:850;color:#273d59!important}.aba-protocol-only-parts{margin:10px 0 0;padding:10px 12px;border-top:1px solid #e2e7ef;background:#f8fafc;border-radius:6px}.aba-protocol-only-parts b{display:block;color:#0f2a5a;font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}.aba-protocol-only-parts span{display:block;font-size:10px;color:#526479;padding:2px 0}.aba-protocol-only-status{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.aba-protocol-only-note{margin-top:12px;padding:10px 12px;border-left:4px solid #0f2a5a;background:#f5f8fc;border-radius:6px;font-size:11px;color:#53657a;line-height:1.5}.aba-protocol-only .aba-badge{font-size:8px}
  @media(max-width:760px){.aba-protocol-only-grid{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
}

async function load(){
  if(ready)return;
  const {data,error}=await sb.from('aba_protocol_catalog_summary').select('id,source_status,source_verified,expected_item_count,active_criteria,source_verified_criteria,operational_criteria').in('id',[...ALLOWED_IDS]);
  if(error){console.error('protocol-only catalog',error);return}
  summaries=data||[];ready=true;
}
const summary=id=>summaries.find(x=>x.id===id);
function stateFor(f){
  const rows=f.ids.map(summary).filter(Boolean),verified=rows.reduce((n,x)=>n+Number(x.source_verified_criteria||0),0),expected=rows.reduce((n,x)=>n+(x.expected_item_count==null?0:Number(x.expected_item_count)),0),hasSource=rows.some(x=>x.source_status==='user_provided_source'||x.source_verified);
  if(expected>0&&verified>=expected)return ['Fonte integral conferida','ok'];
  if(hasSource&&verified>0)return ['Fonte vinculada · conferência parcial','warn'];
  if(hasSource)return ['Fonte vinculada · itens em conferência','warn'];
  return ['Fonte integral ainda não vinculada','info'];
}
function renderCatalog(){
  const root=$('#abaView-protocols');if(!root||!root.classList.contains('active')||root.dataset.protocolOnly==='1')return;
  const previous=$('#abaProtocolOnlySearch')?.value||'';
  root.dataset.protocolOnly='1';
  root.innerHTML=`<div class="aba-card"><div class="aba-section-head"><div><h3>Protocolos</h3><p>Somente instrumentos de avaliação. Habilidades, programas clínicos, preferência, FBA genérica e matrizes operacionais não são listados como protocolos.</p></div></div><div class="aba-toolbar"><div class="aba-field"><label>Buscar protocolo</label><input id="abaProtocolOnlySearch" placeholder="VB-MAPP, ABLLS-R, AFLS, Socially Savvy…" value="${esc(previous)}"></div></div><div class="aba-protocol-only-note"><b>Regra do catálogo:</b> um instrumento aparece uma vez. Níveis, domínios, áreas e módulos aparecem dentro do protocolo ao qual pertencem, e não como novos protocolos.</div><div class="aba-protocol-only-grid" id="abaProtocolOnlyGrid"></div></div>`;
  drawCards(previous);
  $('#abaProtocolOnlySearch').addEventListener('input',e=>drawCards(e.target.value));
  patchHeader();
}
function drawCards(q=''){
  const host=$('#abaProtocolOnlyGrid');if(!host)return;const term=String(q||'').trim().toLowerCase();
  const list=FAMILIES.filter(f=>`${f.title} ${f.description} ${f.structure} ${f.parts.join(' ')}`.toLowerCase().includes(term));
  host.innerHTML=list.map(f=>{const [label,cls]=stateFor(f);return `<article class="aba-protocol-only" data-family="${f.key}"><h4>${esc(f.title)}</h4><p>${esc(f.description)}</p><p class="aba-protocol-only-structure">${esc(f.structure)}</p><div class="aba-protocol-only-status"><span class="aba-badge info">protocolo</span><span class="aba-badge ${cls}">${esc(label)}</span></div><div class="aba-protocol-only-parts"><b>Estrutura dentro do protocolo</b>${f.parts.map(x=>`<span>${esc(x)}</span>`).join('')}</div></article>`}).join('')||'<div class="aba-empty">Nenhum protocolo encontrado.</div>';
}
function patchHeader(){
  const title=$('#abaViewTitle'),sub=$('#abaViewSubtitle');if(title&&$('.aba-nav button.active')?.dataset.view==='protocols'){title.textContent='Protocolos';sub.textContent='Instrumentos de avaliação clínica — sem matrizes ou habilidades avulsas no catálogo.'}
}
function patchDashboard(){
  if($('.aba-nav button.active')?.dataset.view!=='dashboard')return;
  $$('#abaView-dashboard .aba-stat').forEach(card=>{if(card.querySelector('span')?.textContent?.trim()==='Protocolos'){const strong=card.querySelector('strong');if(strong&&strong.textContent!==String(FAMILIES.length))strong.textContent=String(FAMILIES.length)}});
}
function patchProtocolSelects(){
  $$('select[name="protocol_id"], #abaModal select').forEach(sel=>{
    const opts=[...sel.options];if(!opts.some(o=>ALLOWED_IDS.has(o.value)))return;
    opts.forEach(o=>{if(!o.value)return;if(!ALLOWED_IDS.has(o.value))o.remove();else if(LABELS[o.value])o.textContent=LABELS[o.value]});
  });
}
function patch(){
  if(!ready)return;
  const active=$('.aba-nav button.active')?.dataset.view;
  if(active==='protocols')renderCatalog();else if(active==='dashboard')patchDashboard();
  patchProtocolSelects();
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;patch()})}

ensureStyle();
load().then(schedule);
$('#abaNav')?.addEventListener('click',()=>setTimeout(schedule,0));
new MutationObserver(schedule).observe($('.aba-main')||document.body,{subtree:true,childList:true});
document.addEventListener('DOMContentLoaded',()=>load().then(schedule),{once:true});
