import { CONFIG, sb } from './config.js';
import { esc, flash, setBusy } from './api.js';

const PDFJS_VERSION = '5.7.284';
const PDFJS_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`;
let pdfjsPromise = null;
let active = null;

function ensureViewer() {
  if (document.querySelector('#wtMaterialViewer')) return;
  const style = document.createElement('style');
  style.textContent = `
    .wt-material-viewer{width:min(1180px,96vw);height:min(920px,94vh);max-width:none;max-height:none;border:0;padding:0;background:#fff;color:#111;box-shadow:0 24px 80px rgba(0,0,0,.24)}
    .wt-material-viewer::backdrop{background:rgba(12,12,12,.78)}
    .wt-material-shell{display:grid;grid-template-rows:auto auto minmax(0,1fr);height:100%;background:#fff}
    .wt-material-head{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid #ddd;background:#fff}
    .wt-material-title{min-width:0;flex:1}.wt-material-title strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:700 14px Arial}.wt-material-title small{display:block;margin-top:3px;color:#666;font:11px Arial}
    .wt-material-close{border:1px solid #bbb;background:#fff;border-radius:4px;padding:8px 11px;font:700 12px Arial;cursor:pointer}
    .wt-material-toolbar{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:8px 12px;border-bottom:1px solid #ddd;background:#f7f7f5}
    .wt-material-toolbar button,.wt-material-toolbar input{min-height:34px;border:1px solid #bbb;background:#fff;color:#111;border-radius:4px;font:700 11px Arial}
    .wt-material-toolbar button{padding:7px 10px;cursor:pointer}.wt-material-toolbar button:disabled{opacity:.45;cursor:not-allowed}
    .wt-material-page{display:flex;align-items:center;gap:5px;font:11px Arial}.wt-material-page input{width:54px;padding:4px;text-align:center}
    .wt-material-search{display:flex;align-items:center;gap:5px;margin-left:auto}.wt-material-search input{width:min(220px,30vw);padding:5px 8px;font-weight:400}
    .wt-material-stage{position:relative;overflow:auto;overscroll-behavior:contain;background:#ececea;min-height:0;padding:20px}
    .wt-material-canvas-wrap{min-height:100%;display:flex;align-items:flex-start;justify-content:center}
    .wt-material-canvas{display:block;background:#fff;box-shadow:0 2px 18px rgba(0,0,0,.16);max-width:none}
    .wt-material-loading,.wt-material-error,.wt-material-unsupported{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:28px;text-align:center;background:#fff;font:13px Arial;z-index:3}
    .wt-material-error strong{font-size:18px}.wt-material-error p{max-width:600px;color:#666;line-height:1.5}.wt-material-error button{border:1px solid #222;background:#111;color:#fff;padding:9px 14px;cursor:pointer}
    .wt-material-spinner{width:28px;height:28px;border:3px solid #ddd;border-top-color:#111;border-radius:50%;animation:wtspin .75s linear infinite}@keyframes wtspin{to{transform:rotate(360deg)}}
    .wt-media-preview{display:block;max-width:100%;max-height:100%;margin:auto;background:#fff}.wt-media-video{width:min(100%,980px);max-height:100%;margin:auto;display:block;background:#000}.wt-media-audio{width:min(720px,100%);margin:auto;display:block}
    @media(max-width:720px){.wt-material-viewer{width:100vw;height:100dvh;margin:0}.wt-material-head{padding:9px 10px}.wt-material-toolbar{padding:7px;gap:5px}.wt-material-toolbar button{padding:6px 8px}.wt-material-search{order:4;width:100%;margin-left:0}.wt-material-search input{width:100%;flex:1}.wt-material-stage{padding:10px}.wt-material-title small{display:none}}
    @media print{.wt-material-viewer{display:none!important}}
  `;
  document.head.append(style);

  const dialog = document.createElement('dialog');
  dialog.id = 'wtMaterialViewer';
  dialog.className = 'wt-material-viewer';
  dialog.innerHTML = `
    <div class="wt-material-shell">
      <header class="wt-material-head">
        <div class="wt-material-title"><strong id="wtMaterialTitle">Material</strong><small id="wtMaterialMeta">Plataforma Walef Teixeira</small></div>
        <button class="wt-material-close" id="wtMaterialClose" type="button">Voltar à aula</button>
      </header>
      <div class="wt-material-toolbar" id="wtPdfToolbar" hidden>
        <button type="button" id="wtPdfPrev" aria-label="Página anterior">← Anterior</button>
        <span class="wt-material-page">Página <input id="wtPdfPage" inputmode="numeric" type="number" min="1" value="1" aria-label="Número da página"> de <b id="wtPdfTotal">1</b></span>
        <button type="button" id="wtPdfNext" aria-label="Próxima página">Próxima →</button>
        <button type="button" id="wtPdfZoomOut" aria-label="Diminuir zoom">−</button>
        <button type="button" id="wtPdfZoomIn" aria-label="Aumentar zoom">+</button>
        <button type="button" id="wtPdfFitWidth">Ajustar largura</button>
        <button type="button" id="wtPdfFitPage">Ajustar página</button>
        <button type="button" id="wtPdfPrint">Imprimir / Salvar PDF</button>
        <div class="wt-material-search"><input id="wtPdfSearch" type="search" placeholder="Buscar no PDF" aria-label="Buscar texto no PDF"><button type="button" id="wtPdfSearchBtn">Buscar</button></div>
      </div>
      <main class="wt-material-stage" id="wtMaterialStage">
        <div class="wt-material-canvas-wrap" id="wtCanvasWrap"><canvas class="wt-material-canvas" id="wtPdfCanvas" hidden></canvas></div>
        <div class="wt-material-loading" id="wtMaterialLoading" hidden><span class="wt-material-spinner"></span><strong>Carregando material…</strong><span id="wtMaterialProgress"></span></div>
        <div class="wt-material-error" id="wtMaterialError" hidden><strong>Não foi possível abrir este material.</strong><p id="wtMaterialErrorText"></p><button type="button" id="wtMaterialRetry">Tentar novamente</button></div>
      </main>
    </div>`;
  document.body.append(dialog);

  dialog.querySelector('#wtMaterialClose').addEventListener('click', closeViewer);
  dialog.addEventListener('close', cleanup);
  dialog.querySelector('#wtPdfPrev').addEventListener('click', () => goPage((active?.page || 1) - 1));
  dialog.querySelector('#wtPdfNext').addEventListener('click', () => goPage((active?.page || 1) + 1));
  dialog.querySelector('#wtPdfPage').addEventListener('change', (e) => goPage(Number(e.currentTarget.value)));
  dialog.querySelector('#wtPdfZoomOut').addEventListener('click', () => changeZoom(-0.15));
  dialog.querySelector('#wtPdfZoomIn').addEventListener('click', () => changeZoom(0.15));
  dialog.querySelector('#wtPdfFitWidth').addEventListener('click', () => setFit('width'));
  dialog.querySelector('#wtPdfFitPage').addEventListener('click', () => setFit('page'));
  dialog.querySelector('#wtPdfPrint').addEventListener('click', printPdf);
  dialog.querySelector('#wtPdfSearchBtn').addEventListener('click', searchPdf);
  dialog.querySelector('#wtPdfSearch').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchPdf(); } });
  dialog.querySelector('#wtMaterialRetry').addEventListener('click', () => active?.materialId && loadMaterial(active.materialId, active.title));
  window.addEventListener('resize', debounce(() => { if (active?.pdf && active.fit) renderPage(); }, 180));
}

function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }
function el(id) { return document.querySelector(id); }
function show(node, on) { if (node) node.hidden = !on; }

async function pdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(`${PDFJS_BASE}/pdf.min.mjs`).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.mjs`;
      return lib;
    });
  }
  return pdfjsPromise;
}

function errorText(code) {
  const map = {
    unauthorized: 'Sua sessão expirou. Entre novamente na Área do Aluno.',
    material_not_available: 'Este material não está liberado para sua conta ou matrícula.',
    material_file_pending: 'O material está cadastrado, mas o arquivo físico ainda não foi anexado.',
    material_file_missing: 'O registro existe, mas o arquivo não foi localizado no armazenamento.',
    material_integrity_error: 'O arquivo falhou na verificação de integridade e não será exibido.',
    material_render_failed: 'O documento dinâmico não pôde ser gerado agora.',
    material_empty: 'O arquivo retornado está vazio.'
  };
  return map[code] || 'O servidor não conseguiu entregar o arquivo. Tente novamente; se persistir, informe o administrador.';
}

async function fetchBytes(materialId, onProgress) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.access_token) throw Object.assign(new Error('unauthorized'), { code: 'unauthorized' });
  const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/material-content`, {
    method: 'POST',
    headers: { apikey: CONFIG.SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ material_id: materialId })
  });
  if (!response.ok) {
    let code = `http_${response.status}`;
    try { const body = await response.json(); code = body?.error || code; } catch {}
    throw Object.assign(new Error(code), { code, status: response.status });
  }
  const mime = (response.headers.get('content-type') || 'application/octet-stream').split(';')[0].toLowerCase();
  const disposition = response.headers.get('content-disposition') || '';
  const nameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i) || disposition.match(/filename="([^"]+)"/i);
  let fileName = nameMatch ? decodeURIComponent(nameMatch[1]) : 'material';
  const total = Number(response.headers.get('content-length')) || 0;
  if (!response.body?.getReader) return { bytes: new Uint8Array(await response.arrayBuffer()), mime, fileName };
  const reader = response.body.getReader(); const chunks = []; let received = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    chunks.push(value); received += value.byteLength; onProgress?.(received, total);
  }
  const bytes = new Uint8Array(received); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return { bytes, mime, fileName };
}

async function loadMaterial(materialId, title = 'Material') {
  ensureViewer();
  cleanup(false);
  active = { materialId, title, page: 1, scale: 1, fit: 'width', textCache: new Map(), renderTask: null };
  el('#wtMaterialTitle').textContent = title;
  el('#wtMaterialMeta').textContent = 'Acesso protegido · Plataforma Walef Teixeira';
  show(el('#wtMaterialLoading'), true); show(el('#wtMaterialError'), false); show(el('#wtPdfToolbar'), false); show(el('#wtPdfCanvas'), false);
  el('#wtCanvasWrap').querySelectorAll('.wt-media-preview,.wt-media-video,.wt-media-audio,.wt-material-unsupported').forEach((x) => x.remove());
  const dialog = el('#wtMaterialViewer'); if (!dialog.open) dialog.showModal();
  try {
    const file = await fetchBytes(materialId, (received, total) => { el('#wtMaterialProgress').textContent = total ? `${Math.round(received / total * 100)}%` : `${Math.round(received / 1024)} KB`; });
    if (!active || active.materialId !== materialId) return;
    active.bytes = file.bytes; active.mime = file.mime; active.fileName = file.fileName;
    active.blobUrl = URL.createObjectURL(new Blob([file.bytes], { type: file.mime }));
    el('#wtMaterialMeta').textContent = `${file.fileName} · ${Math.max(1, Math.round(file.bytes.byteLength / 1024))} KB`;
    show(el('#wtMaterialLoading'), false);
    if (file.mime === 'application/pdf' || file.fileName.toLowerCase().endsWith('.pdf')) await openPdf(file.bytes);
    else if (file.mime.startsWith('image/')) openImage();
    else if (file.mime.startsWith('video/')) openVideo();
    else if (file.mime.startsWith('audio/')) openAudio();
    else openUnsupported();
  } catch (err) {
    console.error('material_viewer', err);
    if (!active || active.materialId !== materialId) return;
    show(el('#wtMaterialLoading'), false); show(el('#wtMaterialError'), true);
    el('#wtMaterialErrorText').textContent = errorText(err?.code || err?.message);
  }
}

async function openPdf(bytes) {
  const lib = await pdfjs();
  if (!active) return;
  const loadingTask = lib.getDocument({ data: bytes.slice(), isEvalSupported: false });
  active.loadingTask = loadingTask;
  active.pdf = await loadingTask.promise;
  el('#wtPdfTotal').textContent = String(active.pdf.numPages);
  el('#wtPdfPage').max = String(active.pdf.numPages);
  show(el('#wtPdfToolbar'), true); show(el('#wtPdfCanvas'), true);
  await renderPage();
}

async function renderPage() {
  if (!active?.pdf) return;
  const seq = (active.renderSeq || 0) + 1; active.renderSeq = seq;
  const page = await active.pdf.getPage(active.page); if (!active || active.renderSeq !== seq) return;
  const stage = el('#wtMaterialStage'); const base = page.getViewport({ scale: 1 });
  let scale = active.scale || 1;
  if (active.fit === 'width') scale = Math.max(.35, (stage.clientWidth - 42) / base.width);
  if (active.fit === 'page') scale = Math.max(.35, Math.min((stage.clientWidth - 42) / base.width, (stage.clientHeight - 42) / base.height));
  scale = Math.min(3.5, Math.max(.35, scale)); active.scale = scale;
  const viewport = page.getViewport({ scale }); const canvas = el('#wtPdfCanvas'); const ctx = canvas.getContext('2d', { alpha: false });
  const outputScale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewport.width * outputScale); canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${Math.floor(viewport.width)}px`; canvas.style.height = `${Math.floor(viewport.height)}px`;
  ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, viewport.width, viewport.height);
  if (active.renderTask) { try { active.renderTask.cancel(); } catch {} }
  active.renderTask = page.render({ canvasContext: ctx, viewport, background: 'rgb(255,255,255)' });
  try { await active.renderTask.promise; } catch (e) { if (e?.name !== 'RenderingCancelledException') throw e; }
  if (!active || active.renderSeq !== seq) return;
  el('#wtPdfPage').value = String(active.page); el('#wtPdfPrev').disabled = active.page <= 1; el('#wtPdfNext').disabled = active.page >= active.pdf.numPages;
  stage.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

function goPage(n) { if (!active?.pdf) return; const page = Math.min(active.pdf.numPages, Math.max(1, Math.round(Number(n) || 1))); if (page === active.page) return; active.page = page; renderPage().catch(viewerFailure); }
function changeZoom(delta) { if (!active?.pdf) return; active.fit = null; active.scale = Math.min(3.5, Math.max(.35, (active.scale || 1) + delta)); renderPage().catch(viewerFailure); }
function setFit(mode) { if (!active?.pdf) return; active.fit = mode; renderPage().catch(viewerFailure); }
function viewerFailure(err) { console.error('pdf_render', err); show(el('#wtMaterialError'), true); el('#wtMaterialErrorText').textContent = 'O PDF foi recebido, mas uma página não pôde ser renderizada.'; }

async function searchPdf() {
  if (!active?.pdf) return;
  const query = el('#wtPdfSearch').value.trim().toLocaleLowerCase('pt-BR'); if (!query) return;
  const start = active.page;
  for (let step = 1; step <= active.pdf.numPages; step++) {
    const n = ((start - 1 + step) % active.pdf.numPages) + 1;
    let text = active.textCache.get(n);
    if (text == null) { const p = await active.pdf.getPage(n); const tc = await p.getTextContent(); text = tc.items.map((x) => x.str || '').join(' ').toLocaleLowerCase('pt-BR'); active.textCache.set(n, text); }
    if (text.includes(query)) { active.page = n; await renderPage(); flash(`Texto encontrado na página ${n}.`, 'ok'); return; }
  }
  flash('Texto não encontrado neste PDF.', 'bad');
}

function openImage() { const img = document.createElement('img'); img.className = 'wt-media-preview'; img.alt = active.title || 'Material'; img.src = active.blobUrl; el('#wtCanvasWrap').append(img); }
function openVideo() { const v = document.createElement('video'); v.className = 'wt-media-video'; v.controls = true; v.playsInline = true; v.src = active.blobUrl; el('#wtCanvasWrap').append(v); }
function openAudio() { const a = document.createElement('audio'); a.className = 'wt-media-audio'; a.controls = true; a.src = active.blobUrl; el('#wtCanvasWrap').append(a); }
function openUnsupported() { const d = document.createElement('div'); d.className = 'wt-material-unsupported'; d.innerHTML = `<strong>Formato não visualizável diretamente.</strong><p>${esc(active.mime || 'arquivo')}</p>`; el('#wtCanvasWrap').append(d); }

function printPdf() {
  if (!active?.blobUrl || active.mime !== 'application/pdf') return flash('A impressão direta está disponível para materiais em PDF.', 'bad');
  const frame = document.createElement('iframe'); frame.setAttribute('aria-hidden', 'true'); frame.style.position = 'fixed'; frame.style.width = '1px'; frame.style.height = '1px'; frame.style.opacity = '0'; frame.src = active.blobUrl; document.body.append(frame);
  frame.onload = () => { try { frame.contentWindow?.focus(); frame.contentWindow?.print(); } catch { window.open(active.blobUrl, '_blank', 'noopener'); } setTimeout(() => frame.remove(), 3000); };
}

function closeViewer() { el('#wtMaterialViewer')?.close(); }
async function cleanup(resetActive = true) {
  const old = active;
  if (old?.renderTask) { try { old.renderTask.cancel(); } catch {} }
  if (old?.loadingTask) { try { await old.loadingTask.destroy(); } catch {} }
  else if (old?.pdf) { try { await old.pdf.destroy(); } catch {} }
  if (old?.blobUrl) URL.revokeObjectURL(old.blobUrl);
  const canvas = el('#wtPdfCanvas'); if (canvas) { canvas.width = 1; canvas.height = 1; const ctx = canvas.getContext('2d'); ctx?.clearRect(0, 0, 1, 1); }
  if (resetActive) active = null;
}

ensureViewer();
document.addEventListener('click', (event) => {
  const btn = event.target.closest?.('[data-material]');
  if (!btn || !btn.dataset.material) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const row = btn.closest('.resource-row'); const title = row?.querySelector('strong')?.textContent?.trim() || 'Material';
  setBusy(btn, true, 'Preparando…');
  loadMaterial(btn.dataset.material, title).finally(() => setBusy(btn, false));
}, true);
