import { sb } from './config.js';
import { esc, q } from './api.js';

const byType=(items,type)=>items.filter(x=>x.item_type===type);
const safeUrl=v=>{const s=String(v||'').trim();if(!s)return'';if(s.startsWith('/')||/^https:\/\//i.test(s))return s;return''};
const arr=v=>Array.isArray(v)?v.filter(Boolean):[];
const linkButton=(href,label,secondary=false)=>{const u=safeUrl(href);return u?`<a class="btn${secondary?' secondary':''}" href="${esc(u)}"${u.startsWith('https://')?' target="_blank" rel="noopener"':''}>${esc(label)}</a>`:''};

function refineProfessionalIntro(){
 document.querySelector('.professional-nav a[href="#linha-tempo"]')?.remove();
 document.querySelectorAll('a[href="#tecnologia"],a[href="#producao-tecnica"]').forEach(el=>el.remove());
 q('#linha-tempo')?.remove();
 q('#tecnologia')?.remove();
 q('#producao-tecnica')?.remove();
 const intro=q('#trajetoria .professional-intro');
 if(!intro)return;
 intro.innerHTML=`<span class="kicker">Trajetória</span><h2>Psicologia, ciência e prática baseada em dados.</h2><p class="professional-name"><strong>Walef Lincoln de Souza Teixeira</strong></p><p class="professional-reg">Psicólogo — CRP 05/85580</p><p>Atuação em Análise do Comportamento Aplicada desde 2021, com experiência em diferentes serviços, contextos clínicos e funções de responsabilidade técnica, supervisão e formação profissional.</p><p>A trajetória também inclui produção acadêmica em Psicometria, pesquisa, avaliação comportamental, análise de dados e desenvolvimento de projetos voltados à qualificação da prática profissional.</p><div class="actions"><a class="btn" href="#curriculo">Ver currículo</a><a class="btn secondary" href="https://www.linkedin.com/in/walef-teixeira-psicol%C3%B3go-4b319a3ab" target="_blank" rel="noopener">LinkedIn</a></div>`;
}

function refineCurriculum(){
 const host=q('#curriculo .wrap');
 if(!host)return;
 host.innerHTML=`
 <div class="section-head"><div><span class="kicker">Currículo</span><h2>Formação, experiência e produção acadêmica.</h2></div><p>Resumo baseado no currículo profissional documentado.</p></div>
 <div class="method-copy" style="max-width:1020px"><p><strong>Walef Lincoln de Souza Teixeira</strong> é Psicólogo — CRP 05/85580 — com atuação em Análise do Comportamento Aplicada (ABA), avaliação comportamental, coleta e análise de dados, orientação parental e escolar, supervisão, responsabilidade técnica e formação de profissionais. Atua em ABA desde 2021 e possui duas pós-graduações concluídas.</p></div>
 <div class="curriculum-columns">
  <article class="curriculum-box"><span class="kicker">Formação</span><h3>Graduação e pós-graduações</h3><p><strong>Universidade Estácio de Sá (UNESA)</strong><br>Psicologia — graduação, média 9,0<br>01/2019 — 01/2026</p><p><strong>Universidade Líbano</strong><br>Neuropsicologia — pós-graduação<br><strong>Finalizada</strong></p><p><strong>Universidade Líbano</strong><br>Análise do Comportamento Aplicada — pós-graduação<br><strong>Finalizada</strong></p></article>
  <article class="curriculum-box"><span class="kicker">Experiência ABA</span><h3>Mais de 5 anos de atuação em ABA</h3><p>Atuação contínua desde 2021 em contextos clínicos e terapêuticos, com experiência como Acompanhante Terapêutico e Aplicador ABA.</p><p>Experiência em aplicação e acompanhamento de programas individualizados, manejo comportamental, coleta e análise de dados, avaliação de repertórios e acompanhamento sistemático de metas.</p></article>
  <article class="curriculum-box"><span class="kicker">Responsabilidade técnica e formação</span><h3>Supervisão, equipe e ensino</h3><p><strong>CORE Terapias Integradas</strong><br>Responsável Técnico e Monitor de Formação ABA — 2025 até o presente.</p><p><strong>Autts & Cia</strong><br>Responsável Técnico e Instrutor ABA — 2025.</p><p><strong>CBI of Miami</strong> — Acompanhante Terapêutico, 01/2021 a 12/2021.<br><strong>Academia do Autismo</strong> — Aplicador ABA, 07/2023 até o presente.</p></article>
  <article class="curriculum-box"><span class="kicker">Pesquisa e produção acadêmica</span><h3>Psicometria e TCC</h3><p><strong>Dois artigos em Psicometria</strong> desenvolvidos na Universidade Estácio de Sá, sob supervisão de Alexandre Marques.</p><p>Participação em <strong>PIBIC em Psicometria</strong> e atuação como <strong>monitor de Psicologia Experimental</strong>.</p><p><strong>Trabalho de Conclusão de Curso:</strong> Mulheres em vulnerabilidade e o acesso à saúde mental.</p></article>
 </div>
 <p class="portfolio-note"><strong>Competências:</strong> manejo comportamental, coleta e análise de dados, avaliação de protocolos, delineamento de casos, orientação parental e escolar e formação de equipes ABA.</p>`;
}

function addPsychometricsProduction(){
 const section=q('#producao .wrap');
 if(!section||q('#psychometricsProduction'))return;
 const head=section.querySelector('.section-head');
 const block=document.createElement('div');
 block.id='psychometricsProduction';
 block.className='portfolio-grid';
 block.innerHTML=`<article class="portfolio-card"><span class="kicker">Psicometria · produção acadêmica</span><h3>Dois artigos em Psicometria</h3><p>Produção desenvolvida na Universidade Estácio de Sá, sob supervisão de Alexandre Marques, associada à participação em PIBIC em Psicometria e à monitoria em Psicologia Experimental.</p><div class="meta-line"><span>Universidade Estácio de Sá</span><span>Psicometria</span><span>PIBIC</span></div></article><article class="portfolio-card"><span class="kicker">Trabalho de Conclusão de Curso</span><h3>Mulheres em vulnerabilidade e o acesso à saúde mental</h3><p>Trabalho de conclusão de curso desenvolvido na graduação em Psicologia.</p><div class="meta-line"><span>Psicologia</span><span>Saúde mental</span><span>Vulnerabilidade</span></div></article>`;
 head?.insertAdjacentElement('afterend',block);
}

function renderAreas(items){
 const host=q('#areaList'); if(!host)return;
 const rows=byType(items,'area').filter(x=>String(x.title||'').trim().toLowerCase()!=='tecnologia aplicada').sort((a,b)=>(a.position||0)-(b.position||0));
 const base=rows.map(x=>`<article class="area-card"><h3>${esc(x.title)}</h3>${x.description?`<p>${esc(x.description)}</p>`:''}</article>`).join('');
 const extras=`<article class="area-card"><h3>Psicometria e pesquisa</h3><p>PIBIC em Psicometria, dois artigos desenvolvidos na Universidade Estácio de Sá e monitoria em Psicologia Experimental.</p></article><article class="area-card"><h3>Supervisão e formação ABA</h3><p>Responsabilidade técnica, monitoria, instrutoria e formação de aplicadores, com organização de registros e suporte a equipes.</p></article>`;
 host.innerHTML=base+extras;
}

function detail(label,value){return value?`<div><b>${esc(label)}</b><span>${esc(value)}</span></div>`:''}
function tags(values){return arr(values).map(v=>`<span class="tag">${esc(v)}</span>`).join('')}

function renderProjects(items){
 const host=q('#projectList'); if(!host)return;
 const rows=byType(items,'project').sort((a,b)=>(a.position||0)-(b.position||0));
 host.innerHTML=rows.length?rows.map(x=>`<article class="portfolio-card"><span class="kicker">${esc(x.category||'Projeto')}</span><h3>${esc(x.title)}</h3>${x.subtitle?`<div class="meta-line"><span>${esc(x.subtitle)}</span>${x.period_label?`<span>${esc(x.period_label)}</span>`:''}</div>`:''}${x.description?`<p>${esc(x.description)}</p>`:''}<div class="detail-list">${detail('Objetivo',x.objective)}${detail('Participação',x.participation)}${detail('Resultados / produtos',x.results)}</div>${x.external_url||x.file_url?`<div class="card-actions">${linkButton(x.external_url,'Conhecer projeto')}${linkButton(x.file_url,'Documento',true)}</div>`:''}</article>`).join(''):'<div class="portfolio-empty">Nenhum projeto adicional foi publicado sem evidência documental.</div>';
}

function pubCard(x){const author=arr(x.authors).join('; ');return `<article class="portfolio-card"><span class="kicker">${esc(x.category||'Publicação')}</span><h3>${esc(x.title)}</h3>${author?`<p><strong>${esc(author)}</strong></p>`:''}${x.summary||x.description?`<p>${esc(x.summary||x.description)}</p>`:''}<div class="meta-line">${x.year?`<span>${esc(x.year)}</span>`:''}${x.venue?`<span>${esc(x.venue)}</span>`:''}${x.doi?`<span>DOI ${esc(x.doi)}</span>`:''}</div>${arr(x.keywords).length?`<div class="meta-line">${tags(x.keywords)}</div>`:''}${x.reference_text?`<p class="source-note">Referência: ${esc(x.reference_text)}</p>`:''}<div class="card-actions">${linkButton(x.external_url,'Ler publicação')}${linkButton(x.file_url,'Ver PDF',true)}</div></article>`}
function renderPortfolioPublications(items){
 const host=q('#portfolioPublicationList'); if(!host)return;
 const rows=byType(items,'publication').sort((a,b)=>(b.year||0)-(a.year||0)||(a.position||0)-(b.position||0));
 const yearSel=q('#publicationYear'),catSel=q('#publicationCategory'),filters=document.querySelector('.publication-filters');
 if(!rows.length){if(filters)filters.style.display='none';host.innerHTML='';return}
 if(filters)filters.style.display='flex';
 const years=[...new Set(rows.map(x=>x.year).filter(Boolean))].sort((a,b)=>b-a); const cats=[...new Set(rows.map(x=>x.category).filter(Boolean))].sort();
 if(yearSel)yearSel.innerHTML='<option value="">Todos os anos</option>'+years.map(y=>`<option value="${esc(y)}">${esc(y)}</option>`).join('');
 if(catSel)catSel.innerHTML='<option value="">Todas as categorias</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
 const paint=()=>{const y=yearSel?.value||'',c=catSel?.value||'';const filtered=rows.filter(x=>(!y||String(x.year)===y)&&(!c||x.category===c));host.innerHTML=filtered.length?filtered.map(pubCard).join(''):''};
 yearSel?.addEventListener('change',paint);catSel?.addEventListener('change',paint);paint();
}

function renderEvidence(items){
 const host=q('#evidenceSummary');if(!host)return;
 const published=items.length;
 const projects=byType(items,'project').length;
 if(!published){host.hidden=true;return}
 host.hidden=false;host.innerHTML=`<div><b>${projects}</b><span>Projetos documentados</span></div>`;
}

async function bootPortfolio(){
 refineProfessionalIntro();
 refineCurriculum();
 addPsychometricsProduction();
 const roots=['#areaList','#projectList','#portfolioPublicationList'];
 if(!roots.some(s=>q(s)))return;
 try{
  const {data,error}=await sb.from('professional_portfolio').select('*').eq('status','published').order('position',{ascending:true});
  if(error)throw error;const items=data||[];
  renderAreas(items);renderProjects(items);renderPortfolioPublications(items);renderEvidence(items);
 }catch(err){
  console.error('professional_portfolio_load_failed',err);
  roots.forEach(s=>{const el=q(s);if(el)el.innerHTML='<div class="portfolio-empty">Não foi possível carregar esta parte do portfólio agora.</div>'});
 }
}
bootPortfolio();
