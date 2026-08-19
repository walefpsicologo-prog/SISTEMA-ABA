const id='wtEditorialOverridesV3';
if(!document.getElementById(id)){
  const style=document.createElement('style');
  style.id=id;
  style.textContent=`
/* WT Editorial Covers v3 — mobile first / no overlap */
.wt-editorial-cover{position:relative!important;overflow:hidden!important;background:#fbfaf6!important;color:#11110f!important;border-color:#d8d8d1!important;isolation:isolate!important}
.wt-editorial-course{display:grid!important;grid-template-rows:minmax(0,1fr) auto!important;height:auto!important;min-height:360px!important;padding:28px 30px 0!important}
.wt-cover-content{position:relative!important;z-index:3!important;align-self:start!important;padding-bottom:26px!important;min-width:0!important}
.wt-cover-rule{width:118px!important;max-width:34%!important;height:2px!important;margin:0 0 18px!important}
.wt-cover-kicker{max-width:72%!important;font-size:9px!important;line-height:1.4!important;letter-spacing:.14em!important}
.wt-cover-title{max-width:64%!important;margin-top:15px!important;font-size:30px!important;line-height:1.035!important;letter-spacing:-.025em!important;overflow-wrap:break-word!important;word-break:normal!important;hyphens:none!important}
.wt-cover-title--lg{font-size:26px!important;line-height:1.045!important}
.wt-cover-title--xl{font-size:22px!important;line-height:1.055!important}
.wt-cover-subtitle{max-width:58%!important;margin-top:13px!important;font-size:10px!important;line-height:1.45!important}
.wt-cover-motif{position:absolute!important;z-index:1!important;right:-5%!important;bottom:64px!important;width:49%!important;opacity:.48!important;pointer-events:none!important}
.wt-cover-footer{position:static!important;z-index:5!important;align-self:end!important;display:grid!important;gap:3px!important;min-height:64px!important;margin:0 -30px!important;padding:14px 30px 15px!important;background:#f1f1ed!important;border-top:1px solid #d8d8d1!important}
.wt-cover-footer strong{font-size:10.5px!important;line-height:1.25!important;font-weight:400!important}
.wt-cover-footer span{font-size:8.5px!important;line-height:1.3!important}
.course-card{padding:0!important;min-height:0!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;background:#fff!important}
.course-card>.wt-editorial-course{margin:0!important;width:100%!important;border:0!important;border-bottom:1px solid var(--line)!important}
.course-card>.wt-course-card-summary{margin:0!important;padding:20px 24px 24px!important;background:#fff!important}
.wt-course-card-summary .course-meta{margin:0!important;padding:0!important}
.wt-course-card-summary .course-price{margin:17px 0!important}
.wt-course-card-summary .actions{margin-top:0!important}
.student-course-card{padding:0!important;min-height:0!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;background:#fff!important}
.student-course-card>.wt-editorial-course{margin:0!important;width:100%!important;border:0!important;border-bottom:1px solid var(--line)!important}
.student-course-card>.wt-student-summary{padding:18px 22px 22px!important}
.student-course-card>.wt-student-summary .actions{padding-top:0!important;margin-top:14px!important}
/* Material cover: same hierarchy, portrait format */
.wt-editorial-material{display:grid!important;grid-template-rows:minmax(0,1fr) auto!important;height:100%!important;min-height:100%!important;padding:26px 24px 0!important}
.wt-editorial-material .wt-cover-content{padding-bottom:20px!important}
.wt-editorial-material .wt-cover-rule{width:82px!important;margin-bottom:13px!important}
.wt-editorial-material .wt-cover-kicker{max-width:86%!important;font-size:7.5px!important}
.wt-editorial-material .wt-cover-title--material{max-width:80%!important;margin-top:10px!important;font-size:20px!important;line-height:1.055!important}
.wt-editorial-material .wt-cover-title--material.wt-cover-title--lg{font-size:17px!important}
.wt-editorial-material .wt-cover-title--material.wt-cover-title--xl{font-size:15px!important}
.wt-editorial-material .wt-cover-motif{right:-12%!important;bottom:52px!important;width:60%!important;opacity:.34!important}
.wt-editorial-material .wt-cover-footer{min-height:52px!important;margin:0 -24px!important;padding:10px 24px 11px!important}
.wt-editorial-material .wt-cover-footer strong{font-size:8.5px!important}
.wt-editorial-material .wt-cover-footer span{font-size:7px!important}
.wt-resource-cover>.wt-editorial-cover{border:0!important}
@media(max-width:799px){
  .wt-editorial-course{min-height:340px!important;padding:24px 24px 0!important}
  .wt-cover-title{max-width:72%!important;font-size:27px!important}
  .wt-cover-title--lg{font-size:23px!important}
  .wt-cover-title--xl{font-size:20px!important}
  .wt-cover-subtitle{max-width:64%!important;font-size:9.5px!important}
  .wt-cover-motif{right:-9%!important;width:51%!important;opacity:.38!important}
  .wt-cover-footer{margin:0 -24px!important;padding-left:24px!important;padding-right:24px!important}
}
@media(max-width:520px){
  .course-grid{grid-template-columns:1fr!important}
  .wt-editorial-course{min-height:0!important;padding:20px 18px 0!important}
  .wt-cover-content{padding-bottom:22px!important}
  .wt-cover-rule{width:84px!important;max-width:30%!important;margin-bottom:13px!important}
  .wt-cover-kicker{max-width:100%!important;font-size:7.5px!important;line-height:1.4!important;letter-spacing:.12em!important}
  .wt-cover-title,.wt-cover-title--lg,.wt-cover-title--xl{max-width:100%!important;font-size:20px!important;line-height:1.08!important;letter-spacing:-.018em!important}
  .wt-cover-title--xl{font-size:18px!important}
  .wt-cover-subtitle{max-width:100%!important;margin-top:10px!important;font-size:9px!important;line-height:1.4!important}
  .wt-cover-motif{display:none!important}
  .wt-cover-footer{position:static!important;min-height:54px!important;margin:0 -18px!important;padding:11px 18px 12px!important}
  .wt-cover-footer strong{font-size:9px!important}
  .wt-cover-footer span{font-size:7.5px!important}
  .course-card>.wt-course-card-summary{padding:17px 18px 20px!important}
  .wt-course-card-summary .course-price strong{font-size:30px!important}
  .wt-course-card-summary .actions{display:grid!important;grid-template-columns:1fr 1fr!important}
  .wt-course-card-summary .actions .btn{width:100%!important;min-width:0!important;padding-left:8px!important;padding-right:8px!important}
  .student-course-card>.wt-student-summary{padding:16px 18px 20px!important}
  #materialsArea{grid-template-columns:1fr!important;gap:16px!important}
  .wt-resource-card{display:grid!important;grid-template-columns:1fr!important;grid-template-rows:auto auto auto!important;padding:0!important;overflow:hidden!important}
  .wt-resource-cover{grid-row:auto!important;width:100%!important;height:auto!important;aspect-ratio:210/297!important;border-right:0!important;border-bottom:1px solid var(--line)!important}
  .wt-editorial-material{padding:24px 20px 0!important}
  .wt-editorial-material .wt-cover-title--material{max-width:100%!important;font-size:18px!important;line-height:1.07!important}
  .wt-editorial-material .wt-cover-title--material.wt-cover-title--lg{font-size:16px!important}
  .wt-editorial-material .wt-cover-title--material.wt-cover-title--xl{font-size:14px!important}
  .wt-editorial-material .wt-cover-motif{display:none!important}
  .wt-editorial-material .wt-cover-footer{margin:0 -20px!important;padding:10px 20px 11px!important;min-height:50px!important}
  .wt-resource-card>div:nth-child(2){padding:14px 16px 7px!important;min-height:0!important}
  .wt-resource-actions{padding:8px 16px 16px!important;grid-template-columns:1fr 1fr!important}
  .wt-resource-actions [data-material]{grid-column:1/-1!important}
}
`;
  document.head.append(style);
}
