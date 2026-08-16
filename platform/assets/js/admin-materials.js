import { CONFIG, sb } from './config.js';
import { flash, userError, q } from './api.js';
import { refreshCourseAdmin } from './admin-courses.js';

const ALLOWED = new Set(['application/pdf','video/mp4','video/webm','image/jpeg','image/png','image/webp']);
const MAX_BYTES = 100 * 1024 * 1024;
let state = null;
let fileInput = null;
let auditTimer = null;

function safeName(name) {
  return String(name || 'arquivo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').toLowerCase() || 'arquivo';
}
function scheduleAudit(delay = 250) { clearTimeout(auditTimer); auditTimer = setTimeout(() => refreshMaterialAudit().catch(console.error), delay); }

async function statusRequest(materialId) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.access_token) return { status: 'error', error: 'unauthorized' };
  const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/material-content`, {
    method: 'POST',
    headers: { apikey: CONFIG.SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ material_id: materialId, status_only: true })
  });
  let body = {}; try { body = await response.json(); } catch {}
  return { http: response.status, ...body };
}

function ensureAuditBox() {
  const host = q('#materialsAdmin'); if (!host) return null;
  let box = q('#materialAudit');
  if (!box) {
    box = document.createElement('div'); box.id = 'materialAudit'; box.className = 'panel'; box.style.marginBottom = '12px';
    host.parentElement?.insertBefore(box, host);
  }
  return box;
}

export async function refreshMaterialAudit() {
  if (!state?.course) return;
  const box = ensureAuditBox(); if (!box) return;
  box.innerHTML = '<span class="kicker">Integridade dos materiais</span><p style="font:12px Arial;color:#666">Verificando banco e armazenamento…</p>';
  const { data: materials, error } = await sb.from('materials').select('id,title,file_url,storage_path,mime_type,visibility,published').eq('course_id', state.course.id).order('position');
  if (error) { box.innerHTML = `<span class="kicker">Integridade dos materiais</span><p>Falha ao consultar os registros.</p>`; return; }
  const statuses = new Map();
  for (const m of materials || []) {
    if (String(m.file_url || '').startsWith('dynamic://')) statuses.set(m.id, { status:'ok', source:'dynamic' });
    else statuses.set(m.id, await statusRequest(m.id));
  }
  let ok = 0, missing = 0, errors = 0;
  const problems = [];
  for (const m of materials || []) {
    const s = statuses.get(m.id) || {}; const good = s.status === 'ok';
    if (good) ok++; else if (s.status === 'missing' || s.error === 'material_file_pending' || s.error === 'material_file_missing') { missing++; problems.push(`${m.title}: arquivo ausente`); } else { errors++; problems.push(`${m.title}: erro de verificação`); }
    const edit = document.querySelector(`[data-mm="${CSS.escape(m.id)}"]`); const row = edit?.closest('.admin-list-row'); const kicker = row?.querySelector('.kicker');
    if (kicker) {
      const source = good ? ({dynamic:'GERADO INTERNAMENTE',storage:'ARQUIVO NO STORAGE',binary:'ARQUIVO LEGADO PROTEGIDO'}[s.source] || 'ARQUIVO OK') : 'ARQUIVO AUSENTE / ERRO';
      kicker.textContent = `${m.visibility} · ${source}`;
    }
  }
  box.innerHTML = `<span class="kicker">Integridade dos materiais</span><h3 style="margin:7px 0">${ok} OK · ${missing} ausente${missing===1?'':'s'} · ${errors} erro${errors===1?'':'s'}</h3>${problems.length?`<div class="empty-state error" style="margin-top:8px">${problems.map(x=>`<div>${x.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</div>`).join('')}</div>`:'<p style="font:12px Arial;color:#666">Banco e origem física/dinâmica estão consistentes para os materiais deste curso.</p>'}`;
}

async function confirmedUpload(courseId, file) {
  const path = `${courseId}/${Date.now()}-${crypto.randomUUID().slice(0,8)}-${safeName(file.name)}`;
  const { data, error } = await sb.storage.from('course-materials').upload(path, file, { contentType: file.type, upsert: false, cacheControl: '3600' });
  if (error) throw error;
  const actual = data?.path || path; const parts = actual.split('/'); const name = parts.pop(); const folder = parts.join('/');
  const { data: listed, error: listError } = await sb.storage.from('course-materials').list(folder, { limit: 100, search: name });
  if (listError || !(listed || []).some(x => x.name === name)) { await sb.storage.from('course-materials').remove([actual]); throw new Error('upload_not_confirmed'); }
  return actual;
}

async function saveMaterial(event) {
  const form = event.currentTarget;
  event.preventDefault(); event.stopImmediatePropagation();
  if (!state?.course) return flash('Selecione um curso antes de salvar o material.','bad');
  const submit = form.querySelector('button[type="submit"]'); const oldText = submit?.textContent; if (submit) { submit.disabled = true; submit.textContent = 'Salvando…'; }
  let uploadedPath = null;
  try {
    const id = form.material_id.value || null;
    let existing = null;
    if (id) { const { data, error } = await sb.from('materials').select('*').eq('id', id).single(); if (error) throw error; existing = data; }
    const file = fileInput?.files?.[0] || null;
    if (file) {
      if (!ALLOWED.has(file.type)) throw new Error('unsupported_material_type');
      if (file.size <= 0 || file.size > MAX_BYTES) throw new Error('material_size_invalid');
      uploadedPath = await confirmedUpload(state.course.id, file);
    }
    if (!existing && !uploadedPath) throw new Error('material_file_required');
    const storagePath = uploadedPath || existing?.storage_path || null;
    const mime = file?.type || existing?.mime_type || form.mime_type.value || 'application/octet-stream';
    const fileUrl = uploadedPath ? `storage://course-materials/${uploadedPath}` : (existing?.file_url || (storagePath ? `storage://course-materials/${storagePath}` : null));
    if (!fileUrl) throw new Error('material_reference_required');
    const payload = { course_id: state.course.id, lesson_id: existing?.lesson_id || null, title: form.title.value.trim(), file_url: fileUrl, storage_path: storagePath, mime_type: mime, visibility: form.visibility.value, position: Number(form.position.value) || 0, published: form.published.checked };
    const result = existing ? await sb.from('materials').update(payload).eq('id', existing.id) : await sb.from('materials').insert(payload);
    if (result.error) throw result.error;
    if (uploadedPath && existing?.storage_path && existing.storage_path !== uploadedPath) {
      const cleanup = await sb.storage.from('course-materials').remove([existing.storage_path]);
      if (cleanup.error) console.warn('old_material_cleanup_failed', existing.storage_path, cleanup.error);
    }
    form.reset(); if (fileInput) fileInput.value = '';
    flash(existing ? 'Material atualizado e arquivo verificado.' : 'Material enviado, verificado e cadastrado.','ok');
    await refreshCourseAdmin(state); scheduleAudit(100);
  } catch (err) {
    if (uploadedPath) { try { await sb.storage.from('course-materials').remove([uploadedPath]); } catch {} }
    const code = String(err?.message || err || '');
    const msg = code.includes('unsupported_material_type') ? 'Formato não permitido. Use PDF, MP4, WebM, JPG, PNG ou WebP.' : code.includes('material_size_invalid') ? 'O arquivo deve ter conteúdo e no máximo 100 MB.' : code.includes('material_file_required') ? 'Selecione um arquivo para cadastrar um novo material.' : code.includes('upload_not_confirmed') ? 'O upload não pôde ser confirmado no Storage; nenhum registro foi criado.' : userError(err);
    flash(msg,'bad'); console.error('material_admin_save', err);
  } finally { if (submit) { submit.disabled = false; submit.textContent = oldText || 'Salvar'; } }
}

async function deleteMaterial(event, button) {
  event.preventDefault(); event.stopImmediatePropagation();
  if (!confirm('Excluir este material? O registro será removido e, se houver arquivo no Storage, ele também será eliminado.')) return;
  try {
    const { data: material, error } = await sb.from('materials').select('id,title,storage_path').eq('id', button.dataset.md).single(); if (error) throw error;
    const del = await sb.from('materials').delete().eq('id', material.id); if (del.error) throw del.error;
    if (material.storage_path) { const cleanup = await sb.storage.from('course-materials').remove([material.storage_path]); if (cleanup.error) flash('Registro excluído, mas o arquivo físico precisa de limpeza administrativa.','bad'); else flash('Material e arquivo físico excluídos.','ok'); }
    else flash('Material excluído.','ok');
    await refreshCourseAdmin(state); scheduleAudit(100);
  } catch (err) { flash(userError(err),'bad'); console.error('material_admin_delete',err); }
}

export function setupMaterialManager(A) {
  state = A; const form = q('#materialForm'); if (!form) return;
  const storageLabel = form.elements.storage_path?.closest('label');
  if (form.elements.storage_path) { form.elements.storage_path.readOnly = true; form.elements.storage_path.placeholder = 'Gerenciado automaticamente'; }
  const label = document.createElement('label'); label.innerHTML = 'Arquivo do material<input id="materialFileManaged" type="file" accept="application/pdf,video/mp4,video/webm,image/jpeg,image/png,image/webp"><small style="display:block;margin-top:6px;color:#777">PDF, MP4, WebM, JPG, PNG ou WebP · até 100 MB. O arquivo só é confirmado após Storage e banco ficarem consistentes.</small>';
  storageLabel?.before(label); fileInput = label.querySelector('input');
  form.addEventListener('submit', saveMaterial, true);
  document.addEventListener('click', (event) => { const b = event.target.closest?.('[data-md]'); if (b) deleteMaterial(event,b); }, true);
  q('#adminCourseSelect')?.addEventListener('change', () => scheduleAudit(500), true);
  scheduleAudit(900);
}
