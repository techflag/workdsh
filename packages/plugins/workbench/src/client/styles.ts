export const workbenchPanelCss = `
.wd-workbench-panel{min-height:100%;box-sizing:border-box;padding:40px 48px;background:var(--dsw-alias-bg-base,#121212);color:var(--dsw-alias-label-primary,#e7e7e7);font-family:"PingFang SC","Microsoft YaHei",sans-serif}
.wd-workbench-panel .wd-workbench-eyebrow{margin:0 0 12px;color:var(--dsw-alias-label-caption,#888);font-size:12px;letter-spacing:2px}
.wd-workbench-panel h1{margin:0;font-size:28px;line-height:1.4}
.wd-workbench-panel .wd-workbench-status{display:inline-block;margin:14px 0 0;padding:2px 10px;border:0.5px solid var(--dsw-alias-border-l3,#4a4a4a);border-radius:11px;color:var(--dsw-alias-label-secondary,#c9c9c9);font-size:12px;line-height:20px}
.wd-workbench-panel .wd-workbench-description{max-width:560px;margin-top:18px;color:var(--dsw-alias-label-secondary,#aaa);line-height:1.8}
.wd-workbench-panel .wd-workbench-boundary{max-width:560px;margin-top:28px;padding-top:20px;border-top:0.5px solid var(--dsw-alias-border-l1,#303030);color:var(--dsw-alias-label-caption,#777);line-height:1.8}
@media(max-width:640px){.wd-workbench-panel{padding:28px 24px}.wd-workbench-panel h1{font-size:24px}}
`;

export const newTaskCss = `
.wd-new-task{min-height:100%;box-sizing:border-box;padding:40px 48px;overflow-y:auto;background:var(--dsw-alias-bg-base,#121212);color:var(--dsw-alias-label-primary,#e7e7e7);font-family:"PingFang SC","Microsoft YaHei",sans-serif}
.wd-new-task .wd-new-task-eyebrow{margin:0 0 12px;color:var(--dsw-alias-label-caption,#888);font-size:12px;letter-spacing:2px}
.wd-new-task h1{margin:0;font-size:28px;line-height:1.4}
.wd-new-task .wd-new-task-lede{max-width:720px;margin:14px 0 0;color:var(--dsw-alias-label-secondary,#aaa);line-height:1.8}
.wd-new-task .wd-new-task-error{max-width:720px;margin:16px 0 0;padding:10px 14px;border:0.5px solid var(--dsw-alias-state-error-primary,#c0564f);border-radius:8px;color:var(--dsw-alias-state-error-primary,#e08b85);font-size:13px;line-height:1.7}
.wd-new-task .wd-new-task-grid{display:grid;grid-template-columns:repeat(2,minmax(280px,1fr));gap:20px;max-width:880px;margin:26px 0 0}
.wd-new-task .wd-new-task-field{min-width:0;margin:0;padding:16px 18px;border:0.5px solid var(--dsw-alias-border-l1,#303030);border-radius:10px}
.wd-new-task .wd-new-task-field legend{padding:0 6px;color:var(--dsw-alias-label-secondary,#c9c9c9);font-size:13px}
.wd-new-task .wd-new-task-wide{grid-column:1/-1}
.wd-new-task .wd-new-task-label{display:block;margin:4px 0 6px;color:var(--dsw-alias-label-caption,#888);font-size:12px}
.wd-new-task select,.wd-new-task textarea{box-sizing:border-box;width:100%;padding:8px 10px;border:0.5px solid var(--dsw-alias-border-l2,#3d3d3d);border-radius:8px;background:var(--dsw-alias-bg-layer-1,#1a1a1a);color:var(--dsw-alias-label-primary,#e7e7e7);font-family:inherit;font-size:13px;line-height:1.6}
.wd-new-task textarea{resize:vertical}
.wd-new-task select:disabled,.wd-new-task textarea:disabled{opacity:.6}
.wd-new-task .wd-new-task-hint{margin:8px 0 0;color:var(--dsw-alias-label-caption,#888);font-size:12px;line-height:1.7;word-break:break-all}
.wd-new-task .wd-new-task-checks{display:flex;flex-direction:column;gap:8px;margin-top:4px}
.wd-new-task .wd-new-task-check{display:flex;align-items:center;gap:8px;font-size:13px;line-height:1.6}
.wd-new-task .wd-new-task-check input{width:14px;height:14px;flex:none;accent-color:var(--dsw-alias-brand-primary,#4c8bf5)}
.wd-new-task .wd-new-task-meta{margin-left:auto;color:var(--dsw-alias-label-caption,#888);font-size:12px}
.wd-new-task .wd-new-task-pending ul{margin:8px 0 0;padding-left:18px;color:var(--dsw-alias-label-caption,#888);font-size:12px;line-height:1.9}
.wd-new-task .wd-new-task-pending strong{color:var(--dsw-alias-label-secondary,#c9c9c9);font-weight:500}
.wd-new-task .wd-new-task-actions{display:flex;align-items:center;gap:12px;max-width:880px;margin:26px 0 0;padding-top:20px;border-top:0.5px solid var(--dsw-alias-border-l1,#303030)}
.wd-new-task .wd-new-task-actions button{padding:8px 20px;border:0.5px solid var(--dsw-alias-border-l2,#3d3d3d);border-radius:9px;background:transparent;color:var(--dsw-alias-label-primary,#e7e7e7);font-family:inherit;font-size:13px;line-height:20px;cursor:pointer}
.wd-new-task .wd-new-task-actions .wd-new-task-primary{border-color:transparent;background:var(--dsw-alias-button-primary-fill,#e5e5e5);color:var(--dsw-alias-label-primary-inverted,#202020)}
.wd-new-task .wd-new-task-actions button:disabled{opacity:.5;cursor:not-allowed}
.wd-new-task .wd-new-task-actions button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4c8bf5);outline-offset:2px}
@media(max-width:900px){.wd-new-task{padding:28px 24px}.wd-new-task .wd-new-task-grid{grid-template-columns:minmax(0,1fr)}}
`;
