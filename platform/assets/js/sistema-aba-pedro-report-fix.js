import { sb } from './config.js';

const REPORT_PROGRAMS = [
  ['Correspondência dos relatos cotidianos','Comunicação de incerteza e autocorreção'],
  ['Correspondência dos relatos cotidianos','Correspondência entre evento e relato'],
  ['Correspondência dos relatos cotidianos','Discriminação da fonte da informação'],
  ['Correspondência dos relatos cotidianos','Relato de conflitos sem sugestão'],
  ['Correspondência dos relatos cotidianos','Sequenciação de acontecimentos'],
  ['Manutenção da comunicação funcional','Economia de fichas com fading'],
  ['Manutenção da comunicação funcional','Escala visual de estado/necessidade'],
  ['Manutenção da comunicação funcional','Estratégias de regulação funcional'],
  ['Manutenção da comunicação funcional','Pedir ajuda'],
  ['Manutenção da comunicação funcional','Pedir mais tempo/negociar continuidade'],
  ['Manutenção da comunicação funcional','Pedir pausa e retornar à atividade'],
  ['Manutenção da comunicação funcional','Seguimento de instruções de uma etapa'],
  ['Flexibilidade, tolerância e transições','Aceitação de negativa/indisponibilidade'],
  ['Flexibilidade, tolerância e transições','Flexibilidade comportamental'],
  ['Flexibilidade, tolerância e transições','Guardar materiais e encerrar atividade'],
  ['Flexibilidade, tolerância e transições','Primeiro/depois com fading do apoio'],
  ['Flexibilidade, tolerância e transições','Rotina visual diária com flexibilidade'],
  ['Flexibilidade, tolerância e transições','Tolerância à espera com redução progressiva do timer'],
  ['Segurança e respostas de risco','Comunicação de necessidade de privacidade'],
  ['Segurança e respostas de risco','Discriminação público x privado para estimulação genital'],
  ['Segurança e respostas de risco','Estimulação oral - avaliação funcional e respostas concorrentes'],
  ['Segurança e respostas de risco','Mãos seguras'],
  ['Segurança e respostas de risco','Redução de heterolesividade por FCT/DRA'],
  ['Socialização espontânea e reciprocidade','Aceitar perder em jogos'],
  ['Socialização espontânea e reciprocidade','Aproximação e interação com pares'],
  ['Socialização espontânea e reciprocidade','Atividade cooperativa com pares'],
  ['Socialização espontânea e reciprocidade','Brincadeira compartilhada com adulto como ponte para pares'],
  ['Socialização espontânea e reciprocidade','Flexibilidade social e negociação'],
  ['Socialização espontânea e reciprocidade','Iniciação social espontânea'],
  ['Socialização espontânea e reciprocidade','Interação recíproca sustentada'],
  ['Socialização espontânea e reciprocidade','Intraverbais sociais e conversação funcional'],
  ['Socialização espontânea e reciprocidade','Resposta à iniciação de pares'],
  ['Socialização espontânea e reciprocidade','Troca de turnos']
];

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const stage=s=>({baseline:'Linha de base',acquisition:'Aquisição',generalization:'Generalização',maintenance:'Manutenção',acquired:'Adquirido',met:'Adquirido',paused:'Pausado',closed:'Encerrado'}[s]||String(s||'—'));
const measure=s=>({frequency:'Frequência',rate:'Taxa',duration:'Duração',latency:'Latência',percentage:'Porcentagem',trials:'Tentativas',accuracy:'Acerto/erro',occurrence:'Ocorrência/não ocorrência',ordinal:'Escala ordinal',prompt_level:'Nível de ajuda',numeric:'Numérico'}[s]||String(s||'—'));
const isPedro=c=>!!c && (/pedro/i.test(c.full_name||'') || /pedro/i.test(c.preferred_name||''));
let busy=false, observer=null, lastClient='';

async function renderPedro(){
  if(busy)return;
  const picker=document.querySelector('#abaActiveClient');
  const clientId=picker?.value||localStorage.getItem('wt_aba_active_client')||'';
  if(!clientId||clientId===lastClient&&document.querySelector('#abaView-programs [data-pedro-report-root]'))return;
  const {data:c,error:ce}=await sb.from('aba_clients').select('*').eq('id',clientId).maybeSingle();
  if(ce||!isPedro(c))return;
  lastClient=clientId;
  const [{data:programs,error:pe},{data:targets,error:te},{data:goals,error:ge}]=await Promise.all([
    sb.from('aba_programs').select('*').eq('client_id',clientId),
    sb.from('aba_targets').select('*').order('position'),
    sb.from('aba_goals').select('*').eq('client_id',clientId)
  ]);
  if(pe||te||ge)return;
  const names=new Set(REPORT_PROGRAMS.map(x=>x[1]));
  const byName=new Map((programs||[]).map(p=>[String(p.name||'').trim(),p]));
  const goalByTitle=new Map((goals||[]).map(g=>[String(g.title||'').trim(),g]));
  const root=document.querySelector('#abaView-programs');
  if(!root)return;
  busy=true;
  observer?.disconnect();
  const missing=REPORT_PROGRAMS.filter(([,name])=>!byName.has(name));
  const targetByProgram=new Map();
  for(const t of (targets||[])){const a=targetByProgram.get(t.program_id)||[];a.push(t);targetByProgram.set(t.program_id,a)}
  const groups={};
  for(const [goalTitle,name] of REPORT_PROGRAMS){const p=byName.get(name);(groups[goalTitle]??=[]).push({name,p})}
  const cards=Object.entries(groups).map(([goalTitle,items])=>{
    const goal=goalByTitle.get(goalTitle);
    return `<section class="aba-card" data-pedro-report-group><div class="aba-section-head"><div><h3>${esc(goalTitle)}</h3><p>${esc(goal?.description||'Meta terapêutica conforme relatório técnico-clínico atualizado.')}</p></div></div><div class="aba-list">${items.map(({name,p})=>{
      if(!p)return `<article class="aba-list-item"><header><strong>${esc(name)}</strong><span class="aba-badge warn">Não encontrado no prontuário</span></header></article>`;
      const tg=targetByProgram.get(p.id)||[];
      return `<article class="aba-program" style="margin-bottom:10px"><div class="aba-program-head"><div><h4>${esc(name)}</h4><div>${`<span class="aba-badge">${esc(stage(p.status))}</span>`} <span class="aba-badge">${esc(measure(p.measure))}</span></div></div></div><div class="facts"><div class="aba-fact"><b>Objetivo</b><span>${esc(p.objective||'—')}</span></div><div class="aba-fact"><b>Definição operacional</b><span>${esc(p.operational_definition||'—')}</span></div><div class="aba-fact"><b>SD / instrução</b><span>${esc(p.sd_instruction||'—')}</span></div><div class="aba-fact"><b>Resposta esperada</b><span>${esc(p.expected_response||'—')}</span></div><div class="aba-fact"><b>Critério de aquisição</b><span>${esc(p.acquisition_criterion||'—')}</span></div><div class="aba-fact"><b>Critério de generalização</b><span>${esc(p.generalization_criterion||'—')}</span></div><div class="aba-fact"><b>Critério de manutenção</b><span>${esc(p.maintenance_criterion||'—')}</span></div></div><div style="margin-top:9px"><b style="font-size:10px">Alvos (${tg.length})</b><div class="aba-list" style="margin-top:6px">${tg.map(t=>`<div class="aba-list-item"><header><strong>${esc(t.name)}</strong><span class="aba-badge">${esc(stage(t.status))}</span></header><p>${esc(t.mastery_criterion||t.expected_response||'—')}</p></div>`).join('')||'<div class="aba-empty">Sem alvos cadastrados para este programa.</div>'}</div></div></article>`;
    }).join('')}</div></section>`;
  }).join('');
  root.innerHTML=`<div data-pedro-report-root><div class="aba-card"><div class="aba-section-head"><div><h3>Programas ABA — Pedro Mendes Farias</h3><p>Fonte oficial: Relatório Técnico-Clínico Integrado atualizado. Matriz vigente com 33 programas e 33 alvos.</p></div><span class="aba-badge">33 programas</span></div>${missing.length?`<div class="aba-alert warn">${missing.length} programa(s) do relatório não estão gravados no prontuário atual: ${missing.map(x=>esc(x[1])).join(' · ')}</div>`:''}</div>${cards}</div>`;
  busy=false;
  queueMicrotask(()=>{observer=new MutationObserver(()=>{const r=document.querySelector('#abaView-programs');if(r&&!r.querySelector('[data-pedro-report-root]')){lastClient='';renderPedro()}});observer.observe(root,{childList:true,subtree:true});});
}

function hook(){
  const picker=document.querySelector('#abaActiveClient');
  if(!picker)return false;
  picker.addEventListener('change',()=>{lastClient='';setTimeout(renderPedro,60)});
  const view=document.querySelector('#abaView-programs');
  if(view){new MutationObserver(()=>{if(!busy&&document.querySelector('.aba-nav button.active')?.dataset.view==='programs'&&!view.querySelector('[data-pedro-report-root]'))renderPedro()}).observe(view,{childList:true,subtree:true})}
  setTimeout(renderPedro,120);
  return true;
}
if(!hook())window.addEventListener('load',hook,{once:true});
