import { modalCss } from 'workdsh-ui';

/**
 * Expert capability-center styles (D04 / P1-02). Scoped under `.wd-experts` and the
 * expert dialog classes so they never leak into the native Sidebar/Conversation or the
 * sibling Skill panel. Colours use the official `--dsw-*` semantic aliases so the panel follows
 * the official ThemeRuntime; the prototype greys remain only as fallbacks, so a missing alias
 * degrades to the original neutral surface instead of an unstyled one.
 * Responsive: 4 columns → 3 → 2 → 1; detail dialog capped at 800px, editor at 760px,
 * `max-height: min(820px, 100dvh - 80px)`, full-screen panel under 600px.
 */
export const expertsCss = `${modalCss}
.wd-experts{height:100%;overflow:auto;background:var(--dsw-alias-bg-base,#121212);color:var(--dsw-alias-label-primary,#e7e7e7);font:14px/22px "PingFang SC","Microsoft YaHei",sans-serif;padding:24px;box-sizing:border-box}
.wd-experts *{box-sizing:border-box}
.wd-experts .nav-toggle{display:none}
.wd-experts button,.wd-experts input,.wd-experts select,.wd-experts textarea{font:inherit;color:inherit}
.wd-experts button{cursor:pointer;border:.5px solid var(--dsw-alias-border-l2,#343434);border-radius:8px;background:var(--dsw-alias-bg-layer-2,#242424);min-height:36px;padding:6px 12px}
.wd-experts button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#383838)}
.wd-experts button:disabled{cursor:not-allowed;color:var(--dsw-alias-label-caption,#777)}
.wd-experts input,.wd-experts select,.wd-experts textarea{border:.5px solid var(--dsw-alias-border-l2,#343434);border-radius:8px;background:var(--dsw-specific-input-major,#1b1b1b);min-height:36px;padding:6px 12px}
.wd-experts :focus-visible{outline:2px solid var(--dsw-alias-label-primary,#ddd);outline-offset:3px}
.wd-experts .muted{color:var(--dsw-alias-label-secondary,#a5a5a5)}
.wd-experts .cap-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:24px}
.wd-experts .cap-tab{display:flex;align-items:center;gap:7px;border:0;background:transparent;white-space:nowrap;min-height:38px;padding:6px 14px;border-radius:8px}
.wd-experts .cap-tab.active{background:var(--dsw-alias-interactive-bg-active,#343434)}
.wd-experts .cap-tab:disabled{cursor:default;color:var(--dsw-alias-label-secondary,#aaa)}
.wd-experts .search{margin-left:auto;width:250px;min-width:150px}
.wd-experts .mine-toggle,.wd-experts .create-expert{white-space:nowrap}
.wd-experts .mine-toggle.active{background:var(--dsw-alias-interactive-bg-active,#343434);border-color:var(--dsw-alias-border-l3,#4a4a4a)}
.wd-experts .create-expert{background:var(--dsw-alias-button-primary-fill,#eeeeee);color:var(--dsw-alias-label-primary-inverted,#171717);border-color:var(--dsw-alias-button-primary-fill,#eeeeee);font-weight:600}
.wd-experts .section-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px;padding-bottom:16px;border-bottom:.5px solid var(--dsw-alias-border-l2,#303030)}
.wd-experts .section-head h1{font-size:25px;line-height:34px;margin:0;font-weight:600}
.wd-experts .section-actions{display:flex;gap:8px;align-items:center}
.wd-experts .back-center{border:0;background:transparent;color:var(--dsw-alias-label-secondary,#a5a5a5);margin:0 0 20px;padding-left:0}
.wd-experts .work-types{display:flex;gap:24px}
.wd-experts .work-types button{background:transparent;border:0;padding:0;color:var(--dsw-alias-label-caption,#909090);font-size:22px;font-weight:600}
.wd-experts .work-types button.active{color:var(--dsw-alias-label-primary,#e7e7e7)}
.wd-experts .work-types span{font-size:12px;margin-left:10px;color:var(--dsw-alias-label-secondary,#a5a5a5);font-weight:400}
.wd-experts .create-menu{position:relative}
.wd-experts .create-menu summary{list-style:none;cursor:pointer;border-radius:8px;padding:9px 14px}
.wd-experts .create-menu summary::-webkit-details-marker{display:none}
.wd-experts .create-menu>div{position:absolute;right:0;top:calc(100% + 8px);width:180px;background:var(--dsw-specific-menu,#242424);border:0;border-radius:12px;padding:8px;z-index:20;box-shadow:var(--dsw-elevation-panel,0 12px 28px #0005)}
.wd-experts .create-menu button{display:block;width:100%;text-align:left;border:0;background:transparent}
.wd-experts .domain-tags{display:flex;gap:6px;flex-wrap:wrap}
.wd-experts .domain-tags span{background:var(--dsw-specific-selector,#343434);color:var(--dsw-alias-label-secondary,#b0b0b0);font-size:11px;border-radius:4px;padding:3px 7px}
.wd-experts .create-card{display:flex;align-items:center;justify-content:center;min-height:220px;gap:12px;color:var(--dsw-alias-label-secondary,#a5a5a5);font-size:14px}
.wd-experts .create-card>span{font-size:46px;font-weight:400;line-height:1}
.wd-experts .filter-tabs{display:flex;gap:7px;align-items:center;overflow:auto;margin:0 0 18px;padding:0 0 2px}
.wd-experts .filter-tabs button{border:0;background:transparent;white-space:nowrap}
.wd-experts .filter-tabs button.active{background:var(--dsw-alias-interactive-bg-active,#343434)}
.wd-experts .filter-tabs button:disabled{color:var(--dsw-alias-label-caption,#666)}
.wd-experts .counts{font-size:12px;margin:0 0 16px;color:var(--dsw-alias-label-secondary,#a5a5a5)}
.wd-experts .counts.error{color:var(--dsw-alias-state-error-primary,#ffb4ab)}
.wd-experts .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.wd-experts .card{position:relative;min-width:0;border-radius:17px;border:.5px solid var(--dsw-alias-border-l2,#292929);background:var(--dsw-alias-bg-layer-2,#242424);min-height:150px;padding:24px;display:flex;flex-direction:column;gap:12px}
.wd-experts .card:hover{border-color:var(--dsw-alias-border-l2,#3b3b3b);background:var(--dsw-alias-interactive-bg-hover,#282828)}
.wd-experts .card.draft{border-style:dashed}
.wd-experts .card.unavailable{opacity:.62}
.wd-experts .card-top{display:flex;align-items:flex-start;gap:12px;min-width:0}
.wd-experts .card-open{display:flex;align-items:flex-start;gap:12px;min-width:0;flex:1;padding:0;border:0;background:transparent;text-align:left}
.wd-experts .card-open:hover:not(:disabled){background:transparent}
.wd-experts .avatar{display:inline-grid;place-items:center;width:46px;height:46px;flex:none;border-radius:50%;corner-shape:round;background:#3b3b3b;color:#e7e7e7;font-weight:700;font-size:18px;overflow:hidden}
.wd-experts .avatar img{width:100%;height:100%;object-fit:cover}
.wd-experts .card-title{min-width:0;flex:1}
.wd-experts .card-title strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;font-size:15px}
.wd-experts .card-meta{display:block;font-size:12px;color:var(--dsw-alias-label-secondary,#a5a5a5);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-experts .card p.desc{font-size:12px;line-height:20px;margin:0;color:var(--dsw-alias-label-secondary,#cfcfcf);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.wd-experts .card-foot{display:flex;align-items:center;gap:8px;margin-top:auto;flex-wrap:wrap}
.wd-experts .badge{font-size:11px;padding:2px 8px;border-radius:999px;corner-shape:round;border:.5px solid var(--dsw-alias-border-l2,#3a3a3a);background:var(--dsw-alias-bg-layer-1,#1d1d1d);color:var(--dsw-alias-label-secondary,#bdbdbd);white-space:nowrap}
.wd-experts .badge.ready{color:var(--dsw-alias-state-success-primary,#7fe3d0);border-color:var(--dsw-alias-state-success-secondary,#2c5b53)}
.wd-experts .badge.warn{color:var(--dsw-alias-state-warn-primary,#ffcf8f);border-color:var(--dsw-alias-state-warn-secondary,#5b4a2c)}
.wd-experts .badge.bad{color:var(--dsw-alias-state-error-primary,#ff9b95);border-color:var(--dsw-alias-state-error-secondary,#765349)}
.wd-experts .pin{margin-left:auto;background:transparent;border:0;min-height:28px;padding:2px 6px;font-size:15px;color:var(--dsw-alias-label-caption,#888)}
.wd-experts .pin.on{color:var(--dsw-alias-state-warn-primary,#ffd479)}
.wd-experts .more-button{width:34px;min-height:30px;padding:0;border:0;font-size:18px;background:transparent;color:var(--dsw-alias-label-secondary,#bbb)}
.wd-experts .card-actions{position:relative}
.wd-experts .card-menu{position:absolute;z-index:20;right:0;top:calc(100% + 6px);width:172px;padding:8px;background:var(--dsw-specific-menu,#242424);border:0;border-radius:14px;box-shadow:var(--dsw-elevation-panel,0 14px 36px #0008)}
.wd-experts .card-menu button{display:block;width:100%;border:0;background:transparent;text-align:left;min-height:40px;padding:8px 12px;border-radius:8px}
.wd-experts .card-menu button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#333)}
.wd-experts .card-menu .danger{color:var(--dsw-alias-state-error-primary,#ff8f8f)}
.wd-experts .card.menu-open{z-index:25}
.wd-experts .empty{padding:64px 20px;text-align:center}
.wd-experts .empty strong{display:block;font-size:16px;margin-bottom:8px}
.wd-experts .empty .empty-actions{display:flex;gap:10px;justify-content:center;margin-top:18px}
.wd-experts .skeleton{border-radius:17px;border:.5px solid var(--dsw-alias-border-l2,#292929);background:linear-gradient(100deg,var(--dsw-alias-bg-layer-1,#1e1e1e) 30%,var(--dsw-alias-bg-layer-2,#262626) 50%,var(--dsw-alias-bg-layer-1,#1e1e1e) 70%);background-size:200% 100%;animation:wd-shimmer 1.3s infinite;min-height:150px}
@keyframes wd-shimmer{to{background-position:-200% 0}}
.wd-experts .notice{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:12px;border:.5px solid var(--dsw-alias-border-l2,#343434);background:var(--dsw-alias-bg-layer-1,#1d1d1d);margin:0 0 16px}
.wd-experts .notice.error{border-color:var(--dsw-alias-state-error-secondary,#765349);background:var(--dsw-alias-interactive-bg-hover-danger,#2a211f)}
.wd-experts .notice.warn{border-color:var(--dsw-alias-state-warn-secondary,#5b4a2c);background:var(--dsw-alias-state-warn-tertiary,#241f16)}
.wd-experts .notice.info{border-color:var(--dsw-alias-state-success-secondary,#2c5b53);background:var(--dsw-alias-state-success-tertiary,#182422)}
.wd-experts .notice .notice-body{flex:1;min-width:0}
.wd-experts .notice .notice-body strong{display:block;margin-bottom:2px}
.wd-experts .notice button{min-height:30px;padding:2px 10px}
.expert-dialog{width:min(800px,calc(100vw - 56px));max-height:min(820px,calc(100dvh - 80px));padding:0;display:flex;flex-direction:column;overflow:hidden}
.wd-dialog.expert-dialog,.wd-dialog.editor-dialog{box-sizing:border-box}
.wd-dialog.editor-dialog>.wd-dialog-close{top:16px;right:16px}
.expert-dialog :focus-visible{outline:2px solid var(--dsw-alias-link,#8ab4ff);outline-offset:3px}
.expert-dialog .notice.info{border:0;padding:0;background:transparent;font-size:12px;color:var(--dsw-alias-label-secondary,#aaa)}
.expert-dialog .notice.info strong{display:none}
.expert-dialog .dialog-scroll{overflow:auto;padding:24px}
.expert-dialog .detail-header{display:grid;grid-template-columns:48px minmax(0,1fr);gap:16px;align-items:start;padding-right:52px}
.wd-dialog.expert-dialog .detail-avatar{width:48px;height:48px;border-radius:50%;corner-shape:round;display:grid;place-items:center;background:#3b3b3b;color:#e7e7e7;font-size:22px;font-weight:600;overflow:hidden}
.expert-dialog .detail-avatar img{width:100%;height:100%;object-fit:cover}
.expert-dialog .detail-title h1{font-size:20px;line-height:28px;margin:0;overflow-wrap:anywhere}
.expert-dialog .detail-subtitle{color:var(--dsw-alias-label-secondary,#a5a5a5);margin:6px 0 0;font-size:13px}
.expert-dialog .detail-title>.detail-head-actions{margin-top:14px;justify-content:flex-start}
.expert-dialog .detail-head-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.expert-dialog .summon{background:var(--dsw-alias-button-primary-fill,#eeeeee);color:var(--dsw-alias-label-primary-inverted,#171717);border-color:var(--dsw-alias-button-primary-fill,#eeeeee);font-weight:600}
.expert-dialog button{font:inherit;cursor:pointer;min-height:38px;padding:7px 15px;border:.5px solid var(--dsw-alias-border-l3,#414141);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#2b2b2b);color:var(--dsw-alias-label-primary,#e8e8e8)}
.expert-dialog button:disabled{cursor:not-allowed;opacity:.5}
.expert-dialog .detail-section-title{display:flex;align-items:center;gap:9px;margin:30px 0 12px;font-size:17px;font-weight:600}
.expert-dialog .detail-desc{white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary,#ddd);line-height:1.7;margin:0}
.expert-dialog .tag-row{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 0}
.expert-dialog .tag{font-size:12px;padding:3px 10px;border-radius:999px;corner-shape:round;background:var(--dsw-alias-bg-layer-1,#1d1d1d);border:.5px solid var(--dsw-alias-border-l2,#3a3a3a);color:var(--dsw-alias-label-secondary,#cfcfcf)}
.expert-dialog .example-list{display:grid;gap:10px}
.expert-dialog .example{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px 16px;border:.5px solid var(--dsw-alias-border-l2,#343434);border-radius:12px;background:var(--dsw-alias-bg-layer-2,#1e1e1e)}
.expert-dialog .example:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#262626);border-color:var(--dsw-alias-border-l3,#454545)}
.expert-dialog .example .example-text{flex:1;min-width:0}
.expert-dialog .example .example-text strong{display:block;margin-bottom:2px}
.expert-dialog .example .example-text span{color:var(--dsw-alias-label-secondary,#a5a5a5);font-size:14px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}
.expert-dialog .cap-list{display:grid;gap:8px}
.expert-dialog .cap-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border:.5px solid var(--dsw-alias-border-l2,#303030);border-radius:10px;background:var(--dsw-alias-bg-layer-2,#1c1c1c)}
.expert-dialog .cap-row .cap-state{margin-left:auto;font-size:12px;white-space:nowrap}
.expert-dialog .cap-row.ok .cap-state{color:var(--dsw-alias-state-success-primary,#7fe3d0)}
.expert-dialog .cap-row.missing{border-color:var(--dsw-alias-state-error-secondary,#765349);background:var(--dsw-alias-interactive-bg-hover-danger,#2a211f)}
.expert-dialog .cap-row.missing .cap-state{color:var(--dsw-alias-state-error-primary,#ff9b95)}
 .expert-dialog .team-member-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px 16px;margin:16px 0 24px}
.expert-dialog .team-person{min-width:0}
.expert-dialog .team-person summary{display:flex;align-items:center;gap:10px;cursor:pointer;list-style:none}
.expert-dialog .team-person summary::-webkit-details-marker{display:none}
.expert-dialog .member-avatar{width:38px;height:38px;flex-shrink:0;border-radius:50%;corner-shape:round;background:#383838;display:grid;place-items:center;overflow:hidden;color:#e7e7e7}
.expert-dialog .member-avatar img{width:100%;height:100%;object-fit:cover}
.expert-dialog .member-identity{display:grid;gap:4px;min-width:0;font-size:12px;color:var(--dsw-alias-label-secondary,#a5a5a5)}
.expert-dialog .member-identity strong{font-size:14px;font-weight:500;color:var(--dsw-alias-label-primary,#e7e7e7);overflow-wrap:anywhere}
.expert-dialog .member-lead{font-size:11px;color:var(--dsw-alias-label-secondary,#bdbdbd);background:var(--dsw-alias-interactive-bg-hover-solid,#383838);border-radius:4px;margin-left:6px;padding:2px 5px;white-space:nowrap}
.expert-dialog .team-person p{font-size:12px;line-height:1.7;overflow-wrap:anywhere}
.expert-dialog .member-responsibility{white-space:pre-wrap;max-height:300px;overflow:auto}
.expert-dialog .team-workflows article{padding:12px 0;border-bottom:.5px solid var(--dsw-alias-border-l2,#343434)}
@media(max-width:900px){.expert-dialog .team-member-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.expert-dialog .team-member-grid{grid-template-columns:1fr}}
.expert-dialog .expert-settings summary{cursor:pointer;list-style-position:inside;margin:24px 0 12px;font-size:16px;font-weight:600}
.expert-work-summary{display:grid;gap:12px;margin:20px 0}
.expert-work-summary>section{border-left:3px solid var(--dsw-alias-state-business-primary,#3b82f6);padding:2px 0 2px 14px;min-width:0}
.expert-dialog .expert-work-summary h3{font-size:15px;margin:0 0 6px;color:var(--dsw-alias-label-primary,#e7e7e7)}
.expert-work-summary p{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7;margin:0;color:var(--dsw-alias-label-secondary,#bbb)}
.expert-dialog .prose-block{background:var(--dsw-alias-bg-layer-2,#1c1c1c);border:.5px solid var(--dsw-alias-border-l1,#2c2c2c);border-radius:12px;padding:16px 18px;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary,#ddd);line-height:1.7;margin:0 0 12px}
.expert-dialog .prose-block h4{margin:0 0 6px;font-size:13px;color:var(--dsw-alias-label-secondary,#a5a5a5);font-weight:600}
.confirm-dialog{width:min(560px,calc(100vw - 40px));padding:24px}
.confirm-dialog h2{margin:0 52px 14px 0;font-size:21px}
.confirm-dialog p{color:var(--dsw-alias-label-secondary,#aaa);line-height:1.7;margin:0 0 14px}
.confirm-dialog button{min-height:40px;padding:8px 16px;border:.5px solid var(--dsw-alias-border-l3,#444);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#292929);color:var(--dsw-alias-label-primary,#eee);cursor:pointer}
.confirm-dialog .confirm-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
.confirm-dialog .primary{background:var(--dsw-alias-button-primary-fill,#eee);color:var(--dsw-alias-label-primary-inverted,#171717);border-color:var(--dsw-alias-button-primary-fill,#eee);font-weight:600}
.confirm-dialog .danger.solid{background:var(--dsw-alias-state-error-primary,#d94b4b);border-color:var(--dsw-alias-state-error-primary,#d94b4b);color:var(--dsw-alias-label-primary-foreground,#fff)}
.confirm-dialog .danger.solid:disabled{background:var(--dsw-alias-button-primary-dimmed,#633b3b);border-color:var(--dsw-alias-button-primary-dimmed,#633b3b);color:var(--dsw-alias-label-secondary,#aaa);cursor:not-allowed}
.confirm-dialog .digest{font:12px/18px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dsw-alias-label-caption,#9aa);word-break:break-all}
.confirm-dialog .diff-list{margin:0;padding-left:20px;color:var(--dsw-alias-label-secondary,#ccc);line-height:1.9}
.wd-dialog.publish-dialog{width:min(760px,calc(100vw - 40px));max-height:min(820px,calc(100vh - 56px));display:flex;flex-direction:column;overflow:hidden;padding:28px}
.publish-dialog .publish-scroll{min-height:0;overflow:auto;padding-right:4px;overflow-wrap:anywhere}
.publish-dialog .confirm-actions{flex-shrink:0;padding-top:16px;border-top:.5px solid var(--dsw-alias-border-l2,#343434)}
.publish-dialog .confirm-actions .primary{background:var(--dsw-alias-button-primary-fill,#e5e5e5);color:var(--dsw-alias-label-primary-inverted,#202020);border-color:var(--dsw-alias-button-primary-fill,#e5e5e5)}
.publish-dialog .confirm-actions .primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,#d5d5d5);color:var(--dsw-alias-label-primary-inverted,#202020)}
.publish-dialog .usage-preview{font-size:14px;line-height:1.7}
.publish-dialog .usage-preview header{display:flex;align-items:flex-start;gap:16px}
.publish-dialog .usage-preview header>div{min-width:0}
.publish-dialog .preview-avatar{flex-shrink:0;display:grid;place-items:center;width:56px;height:56px;border-radius:50%;corner-shape:round;background:#413653;color:#d2c1ec;font-size:24px}
.publish-dialog .usage-preview h3{font-size:15px;margin:20px 0 8px;color:var(--dsw-alias-label-primary,#e7e7e7)}
.publish-dialog .usage-preview header h3{margin:0 0 8px;font-size:20px}
.publish-dialog .usage-preview p{white-space:pre-wrap;overflow-wrap:anywhere}
.publish-dialog .preview-tags{display:flex;flex-wrap:wrap;gap:8px}
.publish-dialog .preview-tags span{border:.5px solid var(--dsw-alias-border-l2,#343434);border-radius:16px;corner-shape:round;padding:3px 10px;color:var(--dsw-alias-label-secondary,#a5a5a5);font-size:12px}
.publish-dialog .preview-example{border:.5px solid var(--dsw-alias-border-l2,#343434);border-radius:12px;padding:12px 14px;margin:10px 0;background:var(--dsw-alias-bg-layer-2,#242424)}
.publish-dialog .preview-example p{margin:4px 0 0}
.publish-dialog .usage-preview ul{margin:8px 0;padding-left:20px;color:var(--dsw-alias-label-secondary,#ccc)}
.publish-dialog .usage-preview li{margin:8px 0}
.publish-dialog .usage-preview small{display:block;overflow-wrap:anywhere;color:var(--dsw-alias-label-secondary,#a5a5a5);font-size:12px}
.publish-dialog .preview-settings,.publish-dialog .preview-digests{margin:20px 0 12px;padding-top:12px;border-top:.5px solid var(--dsw-alias-border-l2,#343434)}
.publish-dialog summary{cursor:pointer;color:var(--dsw-alias-label-primary,#ddd)}
@media(max-width:640px){.wd-dialog.publish-dialog{width:calc(100vw - 24px);max-height:calc(100dvh - 24px);height:auto;padding:20px 16px}.publish-dialog h2{font-size:18px}.publish-dialog .confirm-actions button{min-height:44px}}

.editor-dialog{width:min(760px,calc(100vw - 56px));max-height:min(820px,calc(100dvh - 80px));padding:0;display:flex;flex-direction:column;overflow:hidden}
.editor-dialog .editor-head{display:flex;align-items:center;gap:14px;padding:24px 84px 24px 28px;flex-shrink:0;border-bottom:.5px solid var(--dsw-alias-border-l1,#2c2c2c)}
.editor-dialog .editor-head h2{margin:0;font-size:20px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.editor-dialog .editor-scroll{overflow:auto;min-height:0;padding:22px 28px 28px}
.editor-dialog .editor-foot{display:flex;align-items:center;gap:12px;padding:16px 28px;flex-shrink:0;border-top:.5px solid var(--dsw-alias-border-l1,#2c2c2c);background:var(--dsw-alias-bg-layer-1,#1a1a1a)}
.editor-dialog .editor-foot .saved-at{color:var(--dsw-alias-label-secondary,#a5a5a5);font-size:12px;margin-right:auto}
.editor-dialog .group{border:.5px solid var(--dsw-alias-border-l1,#2c2c2c);border-radius:14px;padding:20px 22px;margin-bottom:18px;background:var(--dsw-alias-bg-layer-1,#1a1a1a)}
.editor-dialog .group>h3{margin:0 0 16px;font-size:15px;display:flex;align-items:center;gap:8px}
.editor-dialog .field{margin-bottom:16px}
.editor-dialog .field:last-child{margin-bottom:0}
.editor-dialog .field label{display:block;font-weight:600;margin-bottom:6px;font-size:13px}
.editor-dialog .field .hint{color:var(--dsw-alias-label-caption,#888);font-size:12px;margin-top:4px}
.editor-dialog .field .field-error{color:var(--dsw-alias-state-error-primary,#ff9b95);font-size:12px;margin-top:4px}
.editor-dialog input,.editor-dialog textarea{box-sizing:border-box;width:100%;min-width:0;background:var(--dsw-specific-input-major,#242424);color:var(--dsw-alias-label-primary,#eee);border:.5px solid var(--dsw-alias-border-l3,#414141);border-radius:9px;padding:10px 12px;font:inherit}
.editor-dialog input:focus-visible,.editor-dialog textarea:focus-visible{outline:2px solid var(--dsw-alias-link,#8ab4ff);outline-offset:2px}
.editor-dialog .tag-editor{grid-template-columns:repeat(2,minmax(0,1fr))}
.editor-dialog .example-editor-row{display:grid;gap:10px;padding:16px;border:.5px solid var(--dsw-alias-border-l2,#353535);border-radius:12px;background:var(--dsw-alias-bg-layer-2,#212121)}
.editor-dialog .example-editor-row textarea{min-height:100px;resize:vertical;line-height:1.65}
.editor-dialog .example-editor-row .remove{justify-self:end;color:var(--dsw-alias-state-error-primary,#ff9b95)}

.editor-dialog .field textarea{min-height:88px;resize:vertical;line-height:1.7;font:13px/22px "PingFang SC","Microsoft YaHei",sans-serif}
.editor-dialog .field textarea.prose{min-height:120px}
.editor-dialog .field .counter{float:right;color:var(--dsw-alias-label-caption,#777);font-size:12px;font-weight:400}
.editor-dialog .field.invalid input,.editor-dialog .field.invalid textarea{border-color:var(--dsw-alias-state-error-primary,#a5564f)}
.editor-dialog .list-editor{display:grid;gap:10px}
.editor-dialog .list-row{display:flex;gap:8px;align-items:flex-start}
.editor-dialog .list-row input,.editor-dialog .list-row textarea{flex:1;min-width:0}
.editor-dialog .list-row .remove{flex:none;min-height:36px;padding:0 12px;color:var(--dsw-alias-state-error-primary,#ff9b95)}
.editor-dialog .add-row{justify-self:start;background:transparent;border:1px dashed var(--dsw-alias-border-l3,#4a4a4a);color:var(--dsw-alias-label-secondary,#ccc)}
.editor-dialog button{font:inherit;cursor:pointer;min-height:38px;padding:7px 15px;border:.5px solid var(--dsw-alias-border-l3,#414141);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#2b2b2b);color:var(--dsw-alias-label-primary,#e8e8e8)}
.editor-dialog button:disabled{cursor:not-allowed;opacity:.5}
.editor-dialog .primary{background:var(--dsw-alias-button-primary-fill,#eee);color:var(--dsw-alias-label-primary-inverted,#171717);border-color:var(--dsw-alias-button-primary-fill,#eee);font-weight:600}
.editor-dialog .conflict{border:1px solid var(--dsw-alias-state-warn-secondary,#5b4a2c);background:var(--dsw-alias-state-warn-tertiary,#241f16);border-radius:12px;padding:16px 18px;margin-bottom:18px}
.editor-dialog .conflict h4{margin:0 0 8px;color:var(--dsw-alias-state-warn-primary,#ffcf8f)}
.editor-dialog .conflict .conflict-actions{display:flex;gap:10px;margin-top:12px}
.editor-dialog .issues{border:1px solid var(--dsw-alias-state-error-secondary,#765349);background:var(--dsw-alias-interactive-bg-hover-danger,#2a211f);border-radius:12px;padding:14px 18px;margin-bottom:18px}
.editor-dialog .issues h4{margin:0 0 8px;color:var(--dsw-alias-state-error-primary,#ffb4ab)}
.editor-dialog .issues ul{margin:0;padding-left:20px;color:var(--dsw-alias-label-primary,#ddd);line-height:1.9}
.editor-dialog .equipped-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border:.5px solid var(--dsw-alias-border-l2,#353535);border-radius:10px;background:var(--dsw-alias-bg-layer-2,#242424)}
.editor-dialog .equipped-row strong{flex:1;min-width:0;overflow-wrap:anywhere}
.editor-dialog .equipped-row .remove{color:var(--dsw-alias-state-error-primary,#ff9b95)}
.editor-dialog .skill-picker{margin-top:16px;padding:16px;border:.5px solid var(--dsw-alias-border-l3,#494949);border-radius:12px;background:var(--dsw-alias-bg-layer-2,#242424)}
.editor-dialog .skill-picker h4{margin:0 0 12px}
.editor-dialog .skill-picker-list{max-height:300px;overflow:auto;margin-top:12px;display:grid;gap:8px}
.editor-dialog .skill-choice{display:flex;align-items:flex-start;gap:12px;padding:12px;border:.5px solid var(--dsw-alias-border-l3,#414141);border-radius:10px;cursor:pointer}
.editor-dialog .skill-choice input{width:18px;height:18px;flex:none;padding:0;margin:3px 0;accent-color:var(--dsw-alias-state-success-primary,#20bba6)}
.editor-dialog .skill-choice>span{flex:1;min-width:0;overflow-wrap:anywhere}
.editor-dialog .skill-choice small,.expert-dialog .skill-copy small{display:block;color:var(--dsw-alias-label-secondary,#aaa);line-height:1.6;margin-top:4px}
.editor-dialog .skill-choice>small{flex:none;font-size:12px}
.editor-dialog .picker-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
.expert-dialog .skill-copy{flex:1;min-width:0;overflow-wrap:anywhere}
.import-dialog{width:min(720px,calc(100vw - 40px));padding:24px}
.import-dialog h2{margin:0 56px 20px 0;font-size:23px}
.import-dialog button,.import-dialog select{font:inherit;color:inherit}
.import-dialog .dropzone{width:100%;min-height:200px;display:grid;place-content:center;justify-items:center;gap:10px;border:1px dashed var(--dsw-alias-border-l3,#4a4a4a);border-radius:18px;background:var(--dsw-alias-bg-layer-2,#1e1e1e);color:var(--dsw-alias-label-primary,#e8e8e8);cursor:pointer}
.import-dialog .dropzone:hover,.import-dialog .dropzone.dragging{border-color:var(--dsw-alias-border-l4,#9a9a9a);background:var(--dsw-alias-interactive-bg-hover,#262626)}
.import-dialog .dropzone:disabled{cursor:wait;opacity:.7}
.import-dialog .upload-glyph{width:50px;height:42px;display:grid;place-items:center;border:2px solid var(--dsw-alias-label-caption,#8e8e8e);border-radius:8px;font-size:24px;color:var(--dsw-alias-label-secondary,#aaa)}
.import-dialog .dropzone strong{font-size:17px;font-weight:500}
.import-dialog .dropzone small{color:var(--dsw-alias-label-caption,#999)}
.import-dialog .visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.import-dialog .review{margin-top:24px}
.import-dialog .review h3{margin:0 0 12px;font-size:17px}
.import-dialog dl{display:grid;grid-template-columns:110px 1fr;gap:10px;margin:16px 0}
.import-dialog dt{color:var(--dsw-alias-label-caption,#929292)}
.import-dialog dd{margin:0;overflow-wrap:anywhere}
.import-dialog .issue-list{margin:8px 0 0;padding-left:20px;color:var(--dsw-alias-state-error-primary,#ffb4ab);line-height:1.9}
.import-dialog .import-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}
.import-dialog .import-actions button{min-height:42px;padding:8px 18px;border:.5px solid var(--dsw-alias-border-l3,#454545);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#292929);cursor:pointer}
.import-dialog .import-actions .install{background:var(--dsw-alias-button-primary-fill,#eee);color:var(--dsw-alias-label-primary-inverted,#171717);border-color:var(--dsw-alias-button-primary-fill,#eee);font-weight:600}
.import-dialog .error{color:var(--dsw-alias-state-error-primary,#ffb4ab);margin:16px 0 0}
.wd-experts svg,.expert-dialog svg,.editor-dialog svg,.confirm-dialog svg,.import-dialog svg{width:20px;height:20px;stroke:currentColor;stroke-width:1.7;fill:none;stroke-linecap:round}
.wd-experts .error-text{color:var(--dsw-alias-state-error-primary,#ffb4ab)}
@media(max-width:1400px){.wd-experts .grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:1100px){.wd-experts .grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){.wd-experts .search{order:2;margin-left:0;flex:1}.expert-dialog .detail-header{grid-template-columns:48px minmax(0,1fr)}.wd-dialog.expert-dialog .detail-avatar{width:48px;height:48px;font-size:22px}.expert-dialog .detail-title>.detail-head-actions{justify-content:flex-start}}
@media(max-width:600px){.wd-experts{padding:16px}.wd-experts .nav-toggle{display:block}.wd-experts .grid{grid-template-columns:1fr}.wd-experts .card-menu{right:auto;left:0}.expert-dialog{width:calc(100vw - 24px);max-height:calc(100dvh - 24px);height:auto;border-radius:12px}.wd-dialog.expert-dialog,.wd-dialog.editor-dialog{box-sizing:border-box}
.wd-dialog.editor-dialog>.wd-dialog-close{top:16px;right:16px}
.expert-dialog :focus-visible{outline:2px solid var(--dsw-alias-link,#8ab4ff);outline-offset:3px}
.expert-dialog .notice.info{border:0;padding:0;background:transparent;font-size:12px;color:var(--dsw-alias-label-secondary,#aaa)}
.expert-dialog .notice.info strong{display:none}
.expert-dialog .dialog-scroll{padding:24px 18px}.editor-dialog{width:calc(100vw - 24px);max-height:calc(100dvh - 24px);height:auto;border-radius:12px}.editor-dialog .editor-scroll{padding:18px}.editor-dialog .editor-head{padding-left:18px;padding-right:72px}.editor-dialog .editor-foot{padding:12px 18px;gap:8px;flex-wrap:wrap}.editor-dialog .editor-foot .saved-at{flex-basis:100%}.editor-dialog .tag-editor{grid-template-columns:1fr}.import-dialog{padding:24px 18px}.import-dialog dl{grid-template-columns:1fr;gap:4px}.import-dialog dd{margin-bottom:8px}}
@media(prefers-reduced-motion:reduce){.wd-experts .skeleton{animation:none}}`;
