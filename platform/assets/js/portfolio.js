import { sb } from './config.js';
import { esc, q } from './api.js';

const byType=(items,type)=>items.filter(x=>x.item_type===type);
const safeUrl=v=>{const s=String(v||'').trim();if(!s)return'';if(s.startsWith('/')||/^https:\/\//i.test(s))return s;return''};
const arr=v=>Array.isArray(v)?v.filter(Boolean):[];
const linkButton=(href,label,secondary=false)=>{const u=safeUrl(href);return u?`<a class="btn${secondary?' secondary':''}" href="${esc(u)}"${u.startsWith('https://')?' target="_blank" rel="noopener"':''}>${esc(label)}</a>`:''};

function refineProfessionalIntro(){
 document.querySelector('.professional-nav a[href="#linha-tempo"]')?.remove();
 q('#linha-tempo')?.remove();
 const intro=q('#trajetoria .professional-intro');
 if(!intro)return;
 intro.innerHTML=`<span class="kicker">Trajetória</span><h2>Psicologia, ciência e tecnologia aplicada.</h2><p class="professional-name"><strong>Walef Lincoln de Souza Teixeira</strong></p><p class="professional-reg">Psicólogo — CRP 05/85580</p><p>Atua na interface entre Psicologia, Análise do Comportamento, formação e tecnologia aplicada. Desenvolve projetos, conteúdos e sistemas voltados à organização de dados, mensuração, supervisão e qualificação de processos profissionais.</p><p>Seu trabalho reúne prática, método científico e desenvolvimento de ferramentas digitais, com foco em precisão, análise de dados e decisões orientadas por evidências.</p><div class="actions"><a class="btn" href="#curriculo">Currículo e produção</a><a class="btn secondary" href="https://www.linkedin.com/in/walef-teixeira-psicol%C3%B3go-4b319a3ab" target="_blank" rel="noopener">LinkedIn</a></div>`;
}

function renderCredentials(items){
 const host=q('#credentialList'); if(!host)return;
 const rows=items.filter(x=>['credential','education','experience'].includes(x.item_type)).sort((a,b)=>(a.position||0)-(b.position||0));
 host.innerHTML=rows.length?rows.map(x=>`<article class="credential-card"><span class="kicker">${esc(x.category||x.item_type)}</span><h3>${esc(x.title)}</h3>${x.subtitle?`<p><strong>${esc(x.subtitle)}</strong></p>`:''}${x.description?`<p>${esc(x.description)}</p>`:''}${x.institution?`<p>${esc(x.institution)}</p>`:''}${x.period_label?`<p>${esc(x.period_label)}</p>`:''}${x.file_url||x.external_url?`<div class="actions">${linkButton(x.file_url,'Ver documento',true)}${linkButton(x.external_url,'Ver referência',true)}</div>`:''}</article>`).join(''):'<div class="portfolio-empty">Formações acadêmicas e experiências detalhadas ainda não foram publicadas porque não há documentação suficiente cadastrada no projeto.</div>';
}

function renderAreas(items){
 const host=q('#areaList'); if(!host)return;
 const rows=byType(items,'area').sort((a,b)=>(a.position||0)-(b.position||0));
 host.innerHTML=rows.length?rows.map(x=>`<article class="area-card"><h3>${esc(x.title)}</h3>${x.description?`<p>${esc(x.description)}</p>`:''}</article>`).join(''):'<div class="portfolio-empty">Nenhuma área publicada.</div>';
}

function detail(label,value){return value?`<div><b>${esc(label)}</b><span>${esc(value)}</span></div>`:''}
function tags(values){return arr(values).map(v=>`<span class="tag">${esc(v)}</span>`).join('')}

function renderProjects(items){
 const host=q('#projectList'); if(!host)return;
 const rows=byType(items,'project').sort((a,b)=>(a.position||0)-(b.position||0));
 host.innerHTML=rows.length?rows.map(x=>`<article class="portfolio-card"><span class="kicker">${esc(x.category||'Projeto')}</span><h3>${esc(x.title)}</h3>${x.subtitle?`<div class="meta-line"><span>${esc(x.subtitle)}</span>${x.period_label?`<span>${esc(x.period_label)}</span>`:''}</div>`:''}${x.description?`<p>${esc(x.description)}</p>`:''}<div class="detail-list">${detail('Objetivo',x.objective)}${detail('Participação',x.participation)}${detail('Resultados / produtos',x.results)}</div>${x.external_url||x.file_url?`<div class="card-actions">${linkButton(x.external_url,'Conhecer projeto')}${linkButton(x.file_url,'Documento',true)}</div>`:''}</article>`).join(''):'<div class="portfolio-empty">Nenhum projeto adicional foi publicado sem evidência documental.</div>';
}

function renderSoftware(items){
 const host=q('#softwareList'); if(!host)return;
 const rows=byType(items,'software').sort((a,b)=>(a.position||0)-(b.position||0));
 host.innerHTML=rows.length?rows.map(x=>`<article class="software-card"><span class="kicker">${esc(x.category||'Tecnologia aplicada')}</span><h3>${esc(x.title)}</h3>${x.subtitle?`<div class="meta-line"><span class="tag">${esc(x.subtitle)}</span>${x.period_label?`<span class="tag">${esc(x.period_label)}</span>`:''}</div>`:''}${x.description?`<p>${esc(x.description)}</p>`:''}${arr(x.tech_stack).length?`<div class="meta-line">${tags(x.tech_stack)}</div>`:''}<div class="detail-list">${detail('Problema',x.problem)}${detail('Finalidade',x.objective)}${detail('Público',x.audience)}${detail('Participação',x.participation)}${detail('Situação / resultados',x.results)}</div>${x.external_url||x.file_url?`<div class="card-actions">${linkButton(x.external_url,x.external_url?.includes('github.com')?'Abrir repositório':'Abrir aplicativo')}${linkButton(x.file_url,'Documentação',true)}</div>`:''}</article>`).join(''):'<div class="portfolio-empty">Nenhum sistema foi publicado.</div>';
}

function renderTechnical(items){
 const host=q('#technicalList'); if(!host)return;
 const rows=byType(items,'technical').sort((a,b)=>(a.position||0)-(b.position||0));
 host.innerHTML=rows.length?rows.map(x=>`<article class="portfolio-card"><span class="kicker">${esc(x.category||'Produção técnica')}</span><h3>${esc(x.title)}</h3>${x.subtitle?`<div class="meta-line"><span>${esc(x.subtitle)}</span></div>`:''}${x.description?`<p>${esc(x.description)}</p>`:''}${x.objective?`<div class="detail-list">${detail('Objetivo',x.objective)}${detail('Público',x.audience)}</div>`:''}${x.external_url||x.file_url?`<div class="card-actions">${linkButton(x.external_url,'Abrir')}${linkButton(x.file_url,'Documento',true)}</div>`:''}</article>`).join(''):'<div class="portfolio-empty">Nenhuma produção técnica adicional foi publicada.</div>';
}

function pubCard(x){const author=arr(x.authors).join('; ');return `<article class="portfolio-card"><span class="kicker">${esc(x.category||'Publicação')}</span><h3>${esc(x.title)}</h3>${author?`<p><strong>${esc(author)}</strong></p>`:''}${x.summary||x.description?`<p>${esc(x.summary||x.description)}</p>`:''}<div class="meta-line">${x.year?`<span>${esc(x.year)}</span>`:''}${x.venue?`<span>${esc(x.venue)}</span>`:''}${x.doi?`<span>DOI ${esc(x.doi)}</span>`:''}</div>${arr(x.keywords).length?`<div class="meta-line">${tags(x.keywords)}</div>`:''}${x.reference_text?`<p class="source-note">Referência: ${esc(x.reference_text)}</p>`:''}<div class="card-actions">${linkButton(x.external_url,'Ler publicação')}${linkButton(x.file_url,'Ver PDF',true)}</div></article>`}
function renderPortfolioPublications(items){
 const host=q('#portfolioPublicationList'); if(!host)return;
 const rows=byType(items,'publication').sort((a,b)=>(b.year||0)-(a.year||0)||(a.position||0)-(b.position||0));
 const yearSel=q('#publicationYear'),catSel=q('#publicationCategory');
 const years=[...new Set(rows.map(x=>x.year).filter(Boolean))].sort((a,b)=>b-a); const cats=[...new Set(rows.map(x=>x.category).filter(Boolean))].sort();
 if(yearSel)yearSel.innerHTML='<option value="">Todos os anos</option>'+years.map(y=>`<option value="${esc(y)}">${esc(y)}</option>`).join('');
 if(catSel)catSel.innerHTML='<option value="">Todas as categorias</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
 const paint=()=>{const y=yearSel?.value||'',c=catSel?.value||'';const filtered=rows.filter(x=>(!y||String(x.year)===y)&&(!c||x.category===c));host.innerHTML=filtered.length?filtered.map(pubCard).join(''):'<div class="portfolio-empty">Nenhuma produção científica/técnica com referência bibliográfica foi cadastrada nesta categoria. Os conteúdos editoriais públicos aparecem logo abaixo.</div>'};
 yearSel?.addEventListener('change',paint);catSel?.addEventListener('change',paint);paint();
}

function renderEvidence(items){
 const host=q('#evidenceSummary');if(!host)return;
 const published=items.length;
 const systems=byType(items,'software').length,projects=byType(items,'project').length,technical=byType(items,'technical').length;
 if(!published){host.hidden=true;return}
 host.hidden=false;host.innerHTML=`<div><b>${systems}</b><span>Sistemas documentados</span></div><div><b>${projects}</b><span>Projetos documentados</span></div><div><b>${technical}</b><span>Produções técnicas cadastradas</span></div>`;
}

async function bootPortfolio(){
 refineProfessionalIntro();
 const roots=['#credentialList','#areaList','#projectList','#softwareList','#technicalList','#portfolioPublicationList'];
 if(!roots.some(s=>q(s)))return;
 try{
  const {data,error}=await sb.from('professional_portfolio').select('*').eq('status','published').order('position',{ascending:true});
  if(error)throw error;const items=data||[];
  renderCredentials(items);renderAreas(items);renderProjects(items);renderSoftware(items);renderTechnical(items);renderPortfolioPublications(items);renderEvidence(items);
 }catch(err){
  console.error('professional_portfolio_load_failed',err);
  roots.forEach(s=>{const el=q(s);if(el)el.innerHTML='<div class="portfolio-empty">Não foi possível carregar esta parte do portfólio agora.</div>'});
 }
}
bootPortfolio();
