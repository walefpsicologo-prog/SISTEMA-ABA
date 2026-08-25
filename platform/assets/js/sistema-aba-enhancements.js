import { sb } from './config.js';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
let protocols=[];
let criteria=[];
let loaded=false;
let activeProtocolId='';
let enhancing=false;

function scoreGuideText(guide){
  if(!guide||typeof guide!=='object')return '0–4 · NE · NA';
  const order=['0','1','2','3','4','NE','NA'];
  return order.filter(k=>guide[k]!=null).map(k=>`${k} = ${guide[k]}`).join(' · ');
}

async function loadCatalog(){
  if(loaded)return true;
  const [{data:p,error:pe},{data:c,error:ce}]=await Promise.all([
    sb.from('aba_protocols').select('id,name,category,description,official_license_required,position').eq('active',true).order('position'),
    sb.from('aba_protocol_criteria').select('id,protocol_id,criterion_code,domain,title,operational_definition,measure,score_guide,source_type,position').eq('active',true).order('position')
  ]);
  if(pe||ce)throw pe||ce;
  protocols=p||[];criteria=c||[];loaded=true;return true;
}

function renderRows(protocolId){
  const host=$('#abaCriteriaRows');if(!host)return;
  const search=($('#abaCriteriaSearch')?.value||'').trim().toLowerCase();
  const domain=$('#abaCriteriaDomain')?.value||'';
  const rows=criteria.filter(c=>c.protocol_id===protocolId)
    .filter(c=>!domain||c.domain===domain)
    .filter(c=>!search||`${c.criterion_code||''} ${c.domain||''} ${c.title||''} ${c.operational_definition||''}`.toLowerCase().includes(search));
  const visible=$('#abaCriteriaVisible');if(visible)visible.textContent=`${rows.length} visíveis`;
  host.innerHTML=rows.map(c=>`<tr>
    <td><b>${esc(c.criterion_code||'—')}</b></td>
    <td>${esc(c.domain||'—')}</td>
    <td><div class="aba-criterion-title">${esc(c.title||'—')}</div><div class="aba-criterion-definition">${esc(c.operational_definition||'—')}</div></td>
    <td>${esc(c.measure||'—')}</td>
    <td><div class="aba-score-guide">${esc(scoreGuideText(c.score_guide))}</div></td>
  </tr>`).join('')||'<tr><td colspan="5"><div class="aba-empty">Nenhum critério encontrado com este filtro.</div></td></tr>';
}

function openProtocol(protocolId){
  activeProtocolId=protocolId;
  const p=protocols.find(x=>x.id===protocolId);if(!p)return;
  const pc=criteria.filter(c=>c.protocol_id===protocolId);
  const domains=[...new Set(pc.map(c=>c.domain).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const detail=$('#abaProtocolDetail');if(!detail)return;
  detail.innerHTML=`<div class="aba-card aba-criteria-panel">
    <div class="aba-section-head"><div><span class="aba-product-kicker">Matriz operacional</span><h3>${esc(p.name)}</h3><p>${esc(p.description||'')}</p></div><button class="aba-btn ghost small" id="abaCloseProtocolCriteria">Fechar</button></div>
    <div class="aba-criteria-summary"><span class="aba-badge info">${pc.length} critérios</span><span class="aba-badge purple">${domains.length} domínios</span>${p.official_license_required?'<span class="aba-badge warn">instrumento oficial/licenciado quando aplicável</span>':'<span class="aba-badge ok">matriz operacional original</span>'}<span class="aba-badge info" id="abaCriteriaVisible">${pc.length} visíveis</span></div>
    <div class="aba-alert ok">Escala operacional: 0 = não demonstrado; 1 = emergente com alto suporte; 2 = parcial/inconsistente; 3 = independente no contexto treinado; 4 = generalizado/manutenção; NE = não elegível; NA = não avaliado.</div>
    <div class="aba-criteria-toolbar"><div class="aba-field"><label>Buscar nos critérios</label><input id="abaCriteriaSearch" placeholder="Código, domínio, habilidade ou definição operacional"></div><div class="aba-field"><label>Domínio</label><select id="abaCriteriaDomain"><option value="">Todos os domínios</option>${domains.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('')}</select></div></div>
    <div class="aba-table-wrap"><table class="aba-table"><thead><tr><th>Código</th><th>Domínio</th><th>Critério e definição operacional</th><th>Medida</th><th>Escala</th></tr></thead><tbody id="abaCriteriaRows"></tbody></table></div>
  </div>`;
  renderRows(protocolId);
  $('#abaCriteriaSearch')?.addEventListener('input',()=>renderRows(protocolId));
  $('#abaCriteriaDomain')?.addEventListener('change',()=>renderRows(protocolId));
  $('#abaCloseProtocolCriteria')?.addEventListener('click',()=>{detail.innerHTML='';activeProtocolId=''});
  detail.scrollIntoView({behavior:'smooth',block:'start'});
}

async function enhanceProtocols(){
  if(enhancing)return;const view=$('#abaView-protocols');if(!view||!view.classList.contains('active'))return;
  const grid=view.querySelector('.aba-protocol-grid');if(!grid)return;
  enhancing=true;
  try{
    await loadCatalog();
    const cards=[...grid.querySelectorAll('.aba-protocol')];
    for(const card of cards){
      const name=card.querySelector('h4')?.textContent?.trim();
      const p=protocols.find(x=>x.name===name);if(!p)continue;
      let actions=card.querySelector('.aba-protocol-actions');
      if(!actions){actions=document.createElement('div');actions.className='aba-protocol-actions';card.appendChild(actions)}
      if(!actions.querySelector('[data-enhanced-protocol]')){
        const b=document.createElement('button');b.type='button';b.className='aba-btn small';b.dataset.enhancedProtocol=p.id;b.textContent=`Abrir ${criteria.filter(c=>c.protocol_id===p.id).length} critérios`;b.onclick=()=>openProtocol(p.id);actions.prepend(b);
      }
    }
    if(!view.querySelector('#abaProtocolDetail')){const d=document.createElement('div');d.id='abaProtocolDetail';view.appendChild(d)}
  }catch(err){console.error('Falha ao carregar matriz de critérios',err)}finally{enhancing=false}
}

const observer=new MutationObserver(()=>queueMicrotask(enhanceProtocols));
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
document.addEventListener('DOMContentLoaded',enhanceProtocols,{once:true});
setTimeout(enhanceProtocols,700);
