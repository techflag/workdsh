import { controlsCss, modalCss } from 'workdsh-ui';

export const skillsCss = `${modalCss}
@layer workdsh-business {


.wd-skills{overflow:auto;box-sizing:border-box}.wd-skills{height:100%;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:14px/22px "PingFang SC","Microsoft YaHei",sans-serif;padding:24px}.wd-skills *{box-sizing:border-box}.wd-skills .nav-toggle{display:none}.wd-skills button,.wd-skills input{font:inherit;color:inherit;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-2);min-height:36px;padding:6px 12px}.wd-skills button{cursor:pointer}.wd-skills button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.wd-skills button:disabled{cursor:not-allowed}.wd-skills button:disabled{color:var(--dsw-alias-label-dimmed)}.wd-skills :focus-visible{outline-offset:3px}.wd-skills :focus-visible{outline:2px solid var(--dsw-alias-brand-primary)}.wd-skills .cap-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:28px}.wd-skills .cap-tab{display:flex;align-items:center;gap:7px;white-space:nowrap}.wd-skills .cap-tab{border:0;background:transparent}.wd-skills .cap-tab.active{background:var(--dsw-alias-interactive-bg-hover)}.wd-skills .cap-tab:disabled{cursor:default}.wd-skills .cap-tab:disabled{color:var(--dsw-alias-label-tertiary)}.wd-skills .search{margin-left:auto;width:250px;min-width:150px}.wd-skills .installed-count,.wd-skills .add-skill{white-space:nowrap}.wd-skills .installed-count{display:inline-flex;align-items:center}.wd-skills .installed-count{min-height:36px;padding:6px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}.wd-skills .add-menu-wrap,.wd-skills .card-actions{position:relative}.wd-skills .add-skill,.wd-skills .try{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted);border-color:var(--dsw-alias-border-l2);font-weight:600}.wd-skills .add-menu,.wd-skills .card-menu{position:absolute;z-index:20;right:0;top:calc(100% + 8px);width:164px}.wd-skills .add-menu,.wd-skills .card-menu{padding:8px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;box-shadow:0 14px 36px var(--dsw-alias-bg-mask-2)}.wd-skills .add-menu button,.wd-skills .card-menu button{display:block;width:100%;text-align:left}.wd-skills .add-menu button,.wd-skills .card-menu button{border:0;background:transparent;min-height:40px;padding:8px 12px}.wd-skills .card-menu .danger{color:var(--dsw-alias-state-error-primary)}.wd-skills .section-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px;border-bottom:1px solid var(--dsw-alias-border-l2)}.wd-skills .section-head{padding-bottom:18px}.wd-skills h1{margin:0}.wd-skills h1{font-size:25px;line-height:34px;font-weight:600}.wd-skills .muted{color:var(--dsw-alias-label-tertiary)}.wd-skills .counts{margin:0 0 16px}.wd-skills .counts{font-size:12px}.wd-skills .counts:not(.error):not(.notice){position:absolute;width:1px;overflow:hidden;clip-path:inset(50%)}.wd-skills .counts:not(.error):not(.notice){height:1px}.wd-skills .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px}.wd-skills .card{position:relative;min-width:0;display:flex;flex-direction:column}.wd-skills .card{border-radius:18px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);min-height:128px;padding:14px}.wd-skills .card:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}.wd-skills .card-top{display:flex;align-items:center;gap:14px;min-width:0}.wd-skills .card-open{display:flex;align-items:center;gap:14px;min-width:0;flex:1;text-align:left}.wd-skills .card-open{padding:0;border:0;background:transparent}.wd-skills .card-open:hover:not(:disabled){background:transparent}.wd-skills .card-open strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wd-skills .card-open strong{font-weight:600;font-size:15px}.wd-skills .card p{overflow:hidden;margin:6px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.wd-skills .card p{font-size:15px;line-height:24px;height:48px}.wd-skills .skill-mark{display:inline-grid;place-items:center;width:46px;flex:none;text-transform:uppercase}.wd-skills .skill-mark{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-brand-text);border-radius:50%;height:46px;font-weight:700;font-size:19px}.wd-skills .more-button{width:36px}.wd-skills .more-button{padding:0;border:0;font-size:20px}.wd-skills .switch{width:34px;flex:none}.wd-skills .switch{min-height:20px;height:20px;padding:2px;border:0;border-radius:999px;background:var(--dsw-alias-state-success-primary)}.wd-skills .switch::after{content:"";display:block;width:16px;margin-left:14px}.wd-skills .switch::after{height:16px;border-radius:50%;background:white}.wd-skills .empty{text-align:center}.wd-skills .empty{padding:64px 20px}.wd-skills .empty strong{display:block;margin-bottom:8px}.wd-skills .empty strong{font-size:16px}.skill-detail-dialog{padding:24px}.skill-detail-dialog .detail-hero{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:16px;align-items:center}.skill-detail-dialog .detail-hero{padding-right:64px}.skill-detail-dialog .skill-mark{display:inline-grid;place-items:center;width:48px;text-transform:uppercase}.skill-detail-dialog .skill-mark{height:48px;border-radius:12px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-brand-text);font-size:22px;font-weight:700}.skill-detail-dialog .detail-title h1{margin:0 0 10px;overflow-wrap:anywhere}.skill-detail-dialog .detail-title h1{font-size:20px;line-height:28px}.skill-detail-dialog .detail-title p{margin:16px 0 0}.skill-detail-dialog .detail-title p{font-size:14px;line-height:23px;color:var(--dsw-alias-label-primary)}.skill-detail-dialog .detail-actions{display:flex;gap:9px;align-items:center}.skill-detail-dialog button{cursor:pointer}.skill-detail-dialog button{font:inherit;min-height:36px;padding:6px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.skill-detail-dialog .try{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted);border-color:var(--dsw-alias-border-l2);font-weight:600}.skill-detail-dialog .detail-section-title{display:flex;align-items:center;gap:9px;margin:24px 0 12px}.skill-detail-dialog .detail-section-title{font-size:15px}.skill-detail-dialog .detail-body{white-space:normal;overflow-wrap:anywhere}.skill-detail-dialog .detail-body{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:16px}.skill-detail-dialog .detail-body dl{display:grid;grid-template-columns:80px minmax(0,1fr);gap:12px;margin:0}.skill-detail-dialog .detail-body dt{margin:0}.skill-detail-dialog .detail-body dt{color:var(--dsw-alias-label-tertiary)}.skill-detail-dialog .detail-body dd{margin:0;min-width:0}.skill-detail-dialog .command{display:block;overflow-wrap:anywhere}.skill-detail-dialog .command{padding:12px;background:var(--dsw-alias-bg-layer-1);border-radius:8px}.wd-skills svg,.skill-detail-dialog svg{width:20px;stroke:currentColor;stroke-width:1.7;fill:none;stroke-linecap:round}.wd-skills svg,.skill-detail-dialog svg{height:20px}.wd-skills .error,.skill-detail-dialog .error{color:var(--dsw-alias-state-error-primary)}@media(max-width:1400px){.wd-skills .grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:900px){.wd-skills .grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wd-skills .search{order:2;margin-left:0;flex:1}.skill-detail-dialog .detail-hero{grid-template-columns:48px minmax(0,1fr)}.skill-detail-dialog .skill-mark{width:48px}.skill-detail-dialog .skill-mark{height:48px;font-size:22px}.skill-detail-dialog .detail-actions{grid-column:1/-1}}@media(max-width:560px){.wd-skills{padding:16px}.wd-skills .nav-toggle{display:block}.wd-skills .grid{grid-template-columns:1fr}.wd-skills .add-menu{right:auto;left:0}.skill-detail-dialog{padding:24px 20px}.skill-detail-dialog .detail-body{padding:16px}.skill-detail-dialog button{min-height:44px}.skill-detail-dialog .detail-actions{flex-wrap:wrap}.skill-detail-dialog .detail-title h1{font-size:20px}}
}
${controlsCss}
.wd-form-textarea.skill-editor{min-height:430px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
`;

export const skillsActionsCss = `${modalCss}
@layer workdsh-business {

.wd-skills .category-tabs{display:flex;gap:7px;align-items:center;overflow:auto;scrollbar-width:none;margin:0 0 22px}

.wd-skills .category-tabs{padding:0 0 2px}.wd-skills .category-tabs::-webkit-scrollbar{display:none}.wd-skills .category-tabs button{white-space:nowrap}.wd-skills .category-tabs button{border:0;background:transparent}.wd-skills .category-tabs button.active{background:var(--dsw-alias-interactive-bg-hover)}.wd-skills .category-tabs button:disabled{color:var(--dsw-alias-label-dimmed)}
.wd-skills .batch-toggle.active{background:var(--dsw-alias-interactive-bg-hover)}.wd-skills .batch-bar{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin:0 0 16px}.wd-skills .batch-bar{padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}.wd-skills .batch-bar span{margin-right:auto}.wd-skills .batch-bar span{color:var(--dsw-alias-label-secondary)}.wd-skills .batch-check{display:grid;place-items:center;width:24px}.wd-skills .batch-check{min-height:24px;height:24px;padding:0;border-radius:6px;background:var(--dsw-alias-bg-layer-1)}.wd-skills .batch-check[aria-checked="true"]{background:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-label-primary-inverted);border-color:var(--dsw-alias-state-success-primary);font-weight:700}
.wd-skills .refresh{margin-left:auto}.wd-skills .card.disabled{opacity:.56}.wd-skills .card.invalid{border-color:var(--dsw-alias-state-warn-primary)}.wd-skills .diagnostic{display:block;margin-top:10px}.wd-skills .diagnostic{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}.wd-skills .switch[aria-checked="false"]{background:var(--dsw-alias-interactive-bg-hover)}.wd-skills .switch[aria-checked="false"]::after{margin-left:0}.wd-skills .switch:disabled{opacity:.38}.wd-skills .danger,.skill-detail-dialog .danger{color:var(--dsw-alias-state-error-primary)}.skill-detail-dialog .validation-errors{margin:0 0 24px}.skill-detail-dialog .validation-errors{padding:18px;border:1px solid var(--dsw-alias-state-warn-primary);border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,var(--dsw-alias-bg-layer-1))}.skill-detail-dialog .validation-errors h3{margin:0 0 8px}.skill-detail-dialog .validation-errors h3{color:var(--dsw-alias-state-error-primary)}.skill-detail-dialog .validation-errors ul{margin:0 0 14px}.skill-detail-dialog .validation-errors ul{padding-left:20px}.skill-detail-dialog .skill-document{margin:20px 0 0;border-top:1px solid var(--dsw-alias-border-l2);white-space:pre-wrap}.skill-detail-dialog .skill-document{padding:16px 0;font:13px/21px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dsw-alias-label-primary)}.skill-detail-dialog .editor-label{display:block;margin-bottom:10px}.skill-detail-dialog .editor-label{font-weight:600}.skill-detail-dialog .skill-editor{display:block;width:100%;resize:vertical}.skill-detail-dialog .skill-editor{min-height:430px;padding:18px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:13px/21px ui-monospace,SFMono-Regular,Menlo,monospace}.skill-detail-dialog .editor-actions,.confirm-dialog .confirm-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}.skill-detail-dialog .save{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted)}.confirm-dialog{width:min(480px,calc(100vw - 32px))}.confirm-dialog{padding:24px}.confirm-dialog h2{margin:0 52px 12px 0}.confirm-dialog p{color:var(--dsw-alias-label-tertiary);line-height:1.7}.confirm-dialog button{cursor:pointer}.confirm-dialog button{min-height:40px;padding:8px 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.confirm-dialog .danger.solid{background:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary-foreground)}
.wd-skills .card.menu-open{z-index:25}
.confirm-dialog .dependency-impact{margin:18px 0}
.confirm-dialog .dependency-impact{padding:14px 16px;border:1px solid var(--dsw-alias-state-warn-primary);border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,var(--dsw-alias-bg-layer-1))}.confirm-dialog .dependency-impact ul{margin:8px 0 0}.confirm-dialog .dependency-impact ul{padding-left:20px}.confirm-dialog .dependency-clear{padding:12px 14px;border-radius:9px;background:var(--dsw-alias-bg-layer-2)}.confirm-dialog .danger.solid:disabled{cursor:not-allowed}.confirm-dialog .danger.solid:disabled{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,var(--dsw-alias-bg-layer-1));border-color:var(--dsw-alias-state-error-secondary);color:var(--dsw-alias-label-tertiary)}
.skill-detail-dialog .resource-section{margin:20px 0;border-top:1px solid var(--dsw-alias-border-l2)}
.skill-detail-dialog .resource-section{padding:16px 0;border:0;border-radius:0}.skill-detail-dialog .resource-section h3{margin:0 0 12px}.skill-detail-dialog .resource-list{display:grid;grid-template-columns:minmax(0,1fr);gap:4px}.skill-detail-dialog .resource-list button{text-align:left;white-space:normal;overflow-wrap:anywhere;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.skill-detail-dialog .resource-list button{min-height:32px;padding:6px 10px;border:0;background:transparent;font-size:12px}.skill-detail-dialog .new-resource{display:flex;gap:8px;margin-top:14px}.skill-detail-dialog .new-resource :is(input,.wd-form-input){flex:1;min-width:0}.skill-detail-dialog .new-resource input{padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}.skill-detail-dialog .resource-editor-head{display:flex;align-items:center;gap:14px;margin-bottom:20px}.skill-detail-dialog .resource-editor-head strong{overflow-wrap:anywhere}.trash-dialog{width:min(600px,calc(100vw - 32px))}.trash-dialog{padding:24px}.trash-dialog h2{margin:0 52px 20px 0}.trash-dialog .trash-list{display:grid;gap:10px}.trash-dialog .trash-list>div{display:flex;align-items:center;justify-content:space-between;gap:18px}.trash-dialog .trash-list>div{padding:14px 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-2)}.trash-dialog small{display:block;margin-top:4px}.trash-dialog small{color:var(--dsw-alias-label-tertiary)}.trash-dialog button{cursor:pointer}.trash-dialog button{min-height:36px;padding:6px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
/* Import dialog: one bounded content scroller, compact neutral visual hierarchy. */
.wd-dialog.import-skill-dialog{width:min(600px,calc(100vw - 32px));display:flex;flex-direction:column;overflow:hidden}
/* Import dialog: one bounded content scroller, compact neutral visual hierarchy. */
.wd-dialog.import-skill-dialog{max-height:calc(100dvh - 48px);height:auto;padding:0;border-radius:16px;background:var(--dsw-alias-bg-layer-1);font:14px/22px "PingFang SC","Microsoft YaHei",sans-serif}
.import-skill-dialog *{box-sizing:border-box}
.wd-dialog.import-skill-dialog:focus-visible{outline:none}
.import-skill-dialog .wd-dialog-close{top:16px;right:16px;width:32px;flex:none}
.import-skill-dialog .wd-dialog-close{height:32px;min-height:0;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary)}
.import-skill-dialog .wd-dialog-close span{font-size:25px;line-height:1}
.import-skill-dialog .wd-dialog-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.import-skill-dialog .import-header{flex:none}
.import-skill-dialog .import-header{padding:24px 64px 20px 24px}
.import-skill-dialog .import-header h2{margin:0 0 4px}
.import-skill-dialog .import-header h2{font-size:20px;line-height:28px;font-weight:600}
.import-skill-dialog .import-header p{margin:0}
.import-skill-dialog .import-header p{font-size:13px;color:var(--dsw-alias-label-tertiary)}
.import-skill-dialog .import-content{overflow:auto;scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l2) transparent}
.import-skill-dialog .import-content{min-height:0;padding:0 24px 24px}
.import-skill-dialog button,.import-skill-dialog select{font:inherit;color:inherit}
.import-skill-dialog .import-dropzone{width:100%;display:grid;place-content:center;justify-items:center;gap:8px;cursor:pointer}
.import-skill-dialog .import-dropzone{min-height:170px;border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.import-skill-dialog .import-dropzone:hover,.import-skill-dialog .import-dropzone.dragging{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.import-skill-dialog .import-dropzone:disabled{cursor:wait}
.import-skill-dialog .import-dropzone:disabled{opacity:.7}
.import-skill-dialog .upload-glyph{font-size:26px;color:var(--dsw-alias-label-tertiary)}
.import-skill-dialog .import-dropzone strong{font-size:15px;font-weight:500}
.import-skill-dialog .import-dropzone small{color:var(--dsw-alias-label-tertiary);font-size:12px}
.import-skill-dialog .folder-picker{display:block;margin:12px auto 0;cursor:pointer}
.import-skill-dialog .folder-picker{min-height:36px;padding:6px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent}
.import-skill-dialog .visually-hidden{position:absolute;width:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
.import-skill-dialog .visually-hidden{height:1px;padding:0;border:0}
.import-skill-dialog .import-requirements{margin-top:24px}
.import-skill-dialog .import-requirements h3{margin:0 0 8px}
.import-skill-dialog .import-requirements h3{font-size:14px;font-weight:500}
.import-skill-dialog .import-requirements ul{margin:0}
.import-skill-dialog .import-requirements ul{padding-left:20px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:22px}
.import-skill-dialog .import-review-title{display:flex;gap:12px;align-items:flex-start}
.import-skill-dialog .import-review-title{padding:16px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2)}
.import-skill-dialog .skill-mark{width:40px;display:grid;place-items:center;text-transform:uppercase;flex:none}
.import-skill-dialog .skill-mark{height:40px;border-radius:10px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-size:18px;font-weight:500}
.import-skill-dialog .import-review-title>div{min-width:0}
.import-skill-dialog .import-review-title h3{margin:0 0 6px;overflow-wrap:anywhere}
.import-skill-dialog .import-review-title h3{font-size:15px;line-height:22px;font-weight:600}
.import-skill-dialog .import-review-title p{margin:0;overflow-wrap:anywhere}
.import-skill-dialog .import-review-title p{font-size:13px;line-height:21px;color:var(--dsw-alias-label-tertiary)}
.import-skill-dialog dl{display:grid;grid-template-columns:80px minmax(0,1fr);gap:12px 16px;margin:20px 0}
.import-skill-dialog dt{color:var(--dsw-alias-label-tertiary);font-size:13px}
.import-skill-dialog dd{margin:0;min-width:0;overflow-wrap:anywhere}
.import-skill-dialog dd{font-size:13px}
.import-skill-dialog select{width:100%}
.import-skill-dialog select{min-height:36px;padding:6px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-2);font-size:13px}
.import-skill-dialog details{border-top:1px solid var(--dsw-alias-border-l2)}
.import-skill-dialog details{padding-top:12px}
.import-skill-dialog summary{cursor:pointer}
.import-skill-dialog summary{font-size:13px;color:var(--dsw-alias-label-secondary)}
.import-skill-dialog .import-file-list{margin:12px 0 0;overflow-wrap:anywhere}
.import-skill-dialog .import-file-list{padding-left:20px;font:12px/22px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dsw-alias-label-tertiary)}
.import-skill-dialog .import-note{margin:16px 0 0}
.import-skill-dialog .import-note{font-size:12px;line-height:20px;color:var(--dsw-alias-label-tertiary)}
.import-skill-dialog .import-footer{flex:none;border-top:1px solid var(--dsw-alias-border-l2)}
.import-skill-dialog .import-footer{padding:16px 24px;background:var(--dsw-alias-bg-layer-1)}
.import-skill-dialog .import-actions{display:flex;justify-content:flex-end;gap:8px}
.import-skill-dialog .import-actions button{width:auto;min-width:96px;flex:0 0 auto;white-space:nowrap;cursor:pointer}
.import-skill-dialog .import-actions button{height:36px;min-height:36px;padding:0 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-2);font-size:13px;line-height:20px;font-weight:500}
.import-skill-dialog .import-actions .install{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted);border-color:var(--dsw-alias-border-l2)}
.import-skill-dialog button:disabled{cursor:default}
.import-skill-dialog button:disabled{opacity:.5}
.import-skill-dialog button:focus-visible,.import-skill-dialog select:focus-visible,.import-skill-dialog summary:focus-visible{outline-offset:2px}
.import-skill-dialog button:focus-visible,.import-skill-dialog select:focus-visible,.import-skill-dialog summary:focus-visible{outline:2px solid var(--dsw-alias-brand-primary)}
.import-skill-dialog .error{margin:16px 0 0}
.import-skill-dialog .error{color:var(--dsw-alias-state-error-primary);font-size:13px}
@media(max-width:640px){.wd-dialog.import-skill-dialog{width:calc(100vw - 24px)}.wd-dialog.import-skill-dialog{max-height:calc(100dvh - 24px);height:auto;border:1px solid var(--dsw-alias-border-l2);border-radius:12px}.import-skill-dialog .import-header{padding:20px 64px 16px 20px}.import-skill-dialog .import-content{padding:0 20px 20px}.import-skill-dialog .import-footer{padding:16px 20px}.import-skill-dialog .wd-dialog-close{width:44px;top:8px;right:8px}.import-skill-dialog .wd-dialog-close{height:44px}.import-skill-dialog dl{grid-template-columns:1fr;gap:4px}.import-skill-dialog dd{margin-bottom:8px}.import-skill-dialog .import-actions button{height:44px;min-height:44px}}



}
${controlsCss}
`;

export const skillsMarketCss = `${modalCss}
@layer workdsh-business {

.wd-skills .section-head:has(+ .skill-source-tabs){margin-bottom:0;border-bottom:0}
.wd-skills .skill-source-tabs{display:flex;gap:24px;margin:0 0 20px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.wd-skills .skill-source-tabs button{padding:10px 2px;border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit}
.wd-skills .skill-source-tabs button:hover:not(:disabled){background:transparent;color:var(--dsw-alias-label-primary)}
.wd-skills .skill-source-tabs button.active{border-bottom-color:var(--dsw-alias-brand-primary);background:transparent;color:var(--dsw-alias-label-primary);font-weight:600}
.wd-skills .skillhub-market .card-open{text-decoration:none;color:inherit}
.wd-skills .skillhub-icon{position:relative;display:grid;place-items:center;width:46px;height:46px;flex:none;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-brand-text);font-weight:700;font-size:19px}
.wd-skills .skillhub-icon img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:var(--dsw-alias-bg-layer-2)}
.wd-skills .skillhub-icon img[hidden]{display:none}
.wd-skills .skillhub-meta{display:block;margin-top:8px;color:var(--dsw-alias-label-tertiary);font-size:11px}
.wd-skills .skillhub-market .install.is-status{width:auto;min-width:58px;padding:0 8px;border-radius:8px;font-size:12px}
.wd-skills .skillhub-market .install.is-installed:disabled{color:var(--dsw-alias-state-success-primary);opacity:1}
.wd-skills .skillhub-success{display:flex;align-items:center;gap:12px;margin:0 0 18px;padding:10px 14px;border:1px solid var(--dsw-alias-state-success-primary);border-radius:10px;background:var(--dsw-alias-bg-layer-2);font-size:13px}
.wd-skills .skillhub-success span{flex:1}
.wd-skills .skillhub-success .skillhub-dismiss{border:0;background:transparent;font-size:18px}
.wd-skills .skillhub-pagination{display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap;margin:28px 0 12px}
.wd-skills .skillhub-pagination button{min-width:36px;background:transparent}
.wd-skills .skillhub-pagination button.active{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-text);font-weight:600}

.wd-skills .skill-icon{width:46px;flex:none;object-fit:cover}




.wd-skills .skill-icon{height:46px;border-radius:12px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2)}
.wd-skills .skill-icon.large,.skill-detail-dialog .skill-icon.large{width:48px}
.wd-skills .skill-icon.large,.skill-detail-dialog .skill-icon.large{height:48px;border-radius:12px}
.wd-skills .skill-mark.large{width:48px}
.wd-skills .skill-mark.large{height:48px;border-radius:12px;font-size:44px}
.wd-skills .card-title{display:flex;flex-direction:column;gap:3px;min-width:0}
.wd-skills .card-title strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-skills .card-title strong{font-weight:600;font-size:17px}
.wd-skills .card-title small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-skills .card-title small{color:var(--dsw-alias-label-tertiary);font-size:12px}
.wd-skills .card-title small.slug{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.wd-skills .card-title small.slug{font-size:11px;color:var(--dsw-alias-label-dimmed)}
.wd-skills .install{display:grid;place-items:center;width:40px}
.wd-skills .install{min-height:40px;height:40px;padding:0;border-radius:50%;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);font-size:20px;line-height:1}
.wd-skills .install:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l2)}
.wd-skills .install:disabled{opacity:.45}
.wd-skills .market-section{margin:0 0 30px}
.wd-skills .market-head{display:flex;align-items:baseline;gap:10px;margin:0 0 14px;flex-wrap:wrap}
.wd-skills .market-head h2{display:flex;align-items:center;gap:8px;margin:0}
.wd-skills .market-head h2{font-size:17px;font-weight:600}
.wd-skills .market-count{display:inline-grid;place-items:center;min-width:26px}
.wd-skills .market-count{height:22px;padding:0 8px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500}
.wd-skills .market-head .muted{font-size:12px}
.wd-skills .market-card{border-style:dashed}
.wd-skills .market-card:hover{border-style:solid}
.wd-skills .catalog-note{margin:0 0 16px}
.wd-skills .catalog-note{padding:10px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px}
.wd-skills .notice{color:var(--dsw-alias-state-success-primary)}
.wd-skills .empty .muted{display:block;margin-top:6px}
.wd-skills .empty .muted{font-size:12px}
/* 我安装的页面视图：从市场头部「我安装的」入口进入，返回链接回到市场。 */
.wd-skills .installed-back-row{display:flex;align-items:center;gap:6px;margin:0 0 10px}
.wd-skills .back-to-market{display:inline-flex;align-items:center;gap:5px;margin-left:-10px}
.wd-skills .back-to-market{border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:6px 10px}
.wd-skills .back-to-market:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.wd-skills .back-to-market svg{width:18px}
.wd-skills .back-to-market svg{height:18px}
.wd-skills .installed-head{flex-wrap:wrap;row-gap:12px}
.wd-skills .installed-head h1{display:flex;align-items:center;gap:10px}
.wd-skills .installed-tools{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;min-width:0}
.wd-skills .installed-tools .search{margin-left:0;width:250px;min-width:150px}
@media(max-width:900px){.wd-skills .installed-tools{width:100%;justify-content:flex-start}.wd-skills .installed-tools .search{width:100%}}
.skill-detail-dialog .detail-title .slug,.catalog-dialog .detail-title .slug{margin:0 0 12px}
.skill-detail-dialog .detail-title .slug,.catalog-dialog .detail-title .slug{font:13px/20px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dsw-alias-label-tertiary)}
/* 技能弹框沿用公共 Modal（.wd-dialog）外壳；用更高特异性只收窄技能相关弹框并紧凑化内部，不改公共默认值。 */
.wd-dialog.skill-detail-dialog{width:min(820px,calc(100vw - 40px))}
.wd-dialog.catalog-dialog{width:min(720px,calc(100vw - 40px))}
.wd-dialog.confirm-dialog{width:min(480px,calc(100vw - 40px))}
.wd-dialog.trash-dialog{width:min(560px,calc(100vw - 40px))}

.skill-detail-dialog .detail-summary{margin:20px 0 0}

.skill-detail-dialog .detail-summary{color:var(--dsw-alias-label-secondary);font-size:14px;line-height:23px}
.catalog-dialog .install.solid{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:auto}
.catalog-dialog .install.solid{height:auto;min-height:36px;padding:7px 16px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted);font-weight:600;font-size:14px;line-height:1}
.catalog-dialog .install.solid:disabled{opacity:.5}
.catalog-dialog .example-list{margin:0}
.catalog-dialog .example-list{padding-left:22px;color:var(--dsw-alias-label-secondary);line-height:1.9}
.catalog-dialog .validation-errors .muted{margin:0}
.catalog-dialog .validation-errors .muted{color:var(--dsw-alias-label-tertiary)}
@media(max-width:1400px){.wd-skills .market-card .muted{font-size:12px}}




}
${controlsCss}
`;
