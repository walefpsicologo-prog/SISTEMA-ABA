import { sb } from './config.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let summaries=[];
let loaded=false;
let patchQueued=false;

async function load(){
  if(loaded)return;
  const {data,error}=await sb.from('aba_protocol_catalog_summary').select('*');
  if(error){console.error('clinical integrity load',error);return}
  summaries=data||[];
  loaded=true;
}
function byName(name){return summaries.find(x=>String(x.name||'').trim()===String(name||'').trim())}
function setText(el,value){if(el&&el.textContent!==value)el.textContent=value}

function patchProtocols(){
  const v=$('#abaView-protocols');if(!v)return;
  const p=v.querySelector('.aba-card>.aba-section-head p');
  setText(p,'Catálogo integrado: fontes documentais enviadas, estrutura verificada e matrizes operacionais complementares. A origem de cada protocolo fica identificada na própria tela.');
  v.querySelectorAll('.aba-protocol').forEach(card=>{
    const name=card.querySelector('h4')?.textContent?.trim(),meta=byName(name);if(!meta)return;
    const licensing=[...card.querySelectorAll('.aba-badge')].find(b=>/licença oficial|operacional|fonte enviada|mapa da fonte|matriz operacional extensa|módulo operacional/i.test(b.textContent||''));
    if(!licensing)return;
    let text=licensing.textContent||'',cls=licensing.className;
    if(meta.source_status==='user_provided_source'){
      text=meta.protocol_kind==='source_protocol_map'?'mapa da fonte':'fonte enviada';
      cls='aba-badge ok';
    }else if(meta.source_status==='operational_complete'){
      text='matriz operacional extensa';cls='aba-badge info';
    }else if(meta.source_status==='operational_focused'){
      text='módulo operacional';cls='aba-badge info';
    }
    if(licensing.textContent!==text)licensing.textContent=text;
    if(licensing.className!==cls)licensing.className=cls;
  });
}

function patchAssessmentList(){
  const v=$('#abaView-assessments');if(!v)return;
  const table=v.querySelector(':scope > .aba-card .aba-table');
  if(table){
    const ths=[...table.querySelectorAll('thead th')];
    const idx=ths.findIndex(th=>['Soma','Pontuação'].includes(th.textContent.trim()));
    if(idx>=0){
      setText(ths[idx],'Pontuação');
      table.querySelectorAll('tbody tr').forEach(tr=>{
        const cells=tr.children;
        if(cells[idx]&&!/Nenhuma avaliação/.test(tr.textContent||'')){
          setText(cells[idx],'por item');
          cells[idx].title='Os critérios podem usar escalas diferentes. Não é calculada soma global artificial.';
        }
      });
    }
    const info=v.querySelector(':scope > .aba-card .aba-section-head p');
    if(info&&!info.dataset.integrity){
      info.dataset.integrity='1';
      setText(info,'Aplicação por critério, preservando a escala e a regra de pontuação de cada item; não se somam escalas heterogêneas.');
    }
  }
  $$('[data-result-new]').forEach(btn=>{
    if(btn.parentElement?.querySelector('[data-matrix-open]')){
      setText(btn,'Registro avulso');
      btn.classList.add('ghost');
      btn.title='Use preferencialmente Aplicar matriz completa. Registro avulso é reservado para complementos específicos.';
    }
  });
}

function patchReport(){
  const r=$('#abaPrintableReport');if(!r||r.querySelector('.aba-integrity-note'))return;
  const p=document.createElement('p');p.className='aba-integrity-note';
  p.innerHTML='<b>Integridade de pontuação:</b> os resultados são interpretados por critério, domínio e protocolo. O sistema não converte automaticamente escalas diferentes em um escore global único.';
  const h=r.querySelector('.aba-report');if(h)h.insertBefore(p,h.children[2]||null);
}

function patch(){if(!loaded)return;patchProtocols();patchAssessmentList();patchReport()}
function schedulePatch(){
  if(patchQueued)return;
  patchQueued=true;
  requestAnimationFrame(()=>{patchQueued=false;patch()});
}

load().then(schedulePatch);
new MutationObserver(schedulePatch).observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('DOMContentLoaded',()=>load().then(schedulePatch),{once:true});
