import { invokeMaterial, flash, userError } from './api.js';

let dialog=null, frame=null, titleEl=null;
function ensureDialog(){
  if(dialog)return;
  const style=document.createElement('style');
  style.textContent=`.wt-embed{width:min(1180px,96vw);height:min(920px,94vh);max-width:none;max-height:none;border:0;padding:0;background:#fff;box-shadow:0 24px 80px rgba(0,0,0,.28)}.wt-embed::backdrop{background:rgba(10,10,10,.78)}.wt-embed-shell{display:grid;grid-template-rows:auto minmax(0,1fr);height:100%}.wt-embed-head{display:flex;align-items:center;gap:12px;padding:11px 14px;border-bottom:1px solid #ddd;background:#fff}.wt-embed-head strong{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:700 14px Arial}.wt-embed-head button{border:1px solid #aaa;background:#fff;padding:8px 11px;cursor:pointer;font:700 11px Arial}.wt-embed-frame{width:100%;height:100%;border:0;background:#f1f1ed}@media(max-width:720px){.wt-embed{width:100vw;height:100dvh;margin:0}.wt-embed-head{padding:9px 10px}}`;
  document.head.append(style);
  dialog=document.createElement('dialog');dialog.className='wt-embed';dialog.id='wtMaterialEmbed';
  dialog.innerHTML='<div class="wt-embed-shell"><header class="wt-embed-head"><strong id="wtEmbedTitle">Material</strong><button type="button" id="wtEmbedClose">Voltar ao curso</button></header><iframe class="wt-embed-frame" id="wtEmbedFrame" title="Material do curso" loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
  document.body.append(dialog);frame=dialog.querySelector('#wtEmbedFrame');titleEl=dialog.querySelector('#wtEmbedTitle');
  dialog.querySelector('#wtEmbedClose').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{if(frame)frame.src='about:blank'});
}
function previewUrl(url=''){
  const s=String(url||'').trim();
  const m=s.match(/^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)\/(?:view|preview)/i);
  if(m)return `https://drive.google.com/file/d/${m[1]}/preview`;
  return s;
}
async function openEmbedded(btn){
  ensureDialog();
  const old=btn.textContent;btn.disabled=true;btn.textContent='Preparando…';
  try{
    const data=await invokeMaterial(btn.dataset.material);
    const url=previewUrl(data?.url);
    if(!url)throw new Error('material_not_available');
    const row=btn.closest('.resource-row');titleEl.textContent=row?.querySelector('strong')?.textContent?.trim()||data?.title||'Material';
    frame.src=url;
    if(!dialog.open)dialog.showModal();
  }catch(err){flash(userError(err),'bad')}
  finally{btn.disabled=false;btn.textContent=old}
}

document.addEventListener('click',(event)=>{
  const btn=event.target.closest?.('[data-material]');
  if(!btn||!btn.dataset.material)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openEmbedded(btn);
},true);
