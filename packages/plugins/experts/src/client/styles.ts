import { controlsCss, modalCss } from 'workdsh-ui';

export const expertsCss = `${modalCss}
@layer workdsh-business {

.wd-experts{overflow:auto;box-sizing:border-box}
.wd-experts{height:100%;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:14px/22px "PingFang SC","Microsoft YaHei",sans-serif;padding:24px}
.wd-experts *{box-sizing:border-box}
.wd-experts .nav-toggle{display:none}
.wd-experts button,.wd-experts input,.wd-experts select,.wd-experts textarea{font:inherit;color:inherit}
.wd-experts button{cursor:pointer}
.wd-experts button{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-2);min-height:36px;padding:6px 12px}
.wd-experts button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.wd-experts button:disabled{cursor:not-allowed}
.wd-experts button:disabled{color:var(--dsw-alias-label-dimmed)}
.wd-experts input,.wd-experts select,.wd-experts textarea{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);min-height:36px;padding:6px 12px}
.wd-experts :focus-visible{outline-offset:3px}
.wd-experts :focus-visible{outline:2px solid var(--dsw-alias-brand-primary)}
.wd-experts .muted{color:var(--dsw-alias-label-tertiary)}
.wd-experts .cap-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:24px}
.wd-experts .cap-tab{display:flex;align-items:center;gap:7px;white-space:nowrap}
.wd-experts .cap-tab{border:0;background:transparent;min-height:38px;padding:6px 14px;border-radius:8px}
.wd-experts .cap-tab.active{background:var(--dsw-alias-interactive-bg-hover)}
.wd-experts .cap-tab:disabled{cursor:default}
.wd-experts .cap-tab:disabled{color:var(--dsw-alias-label-tertiary)}
.wd-experts .search{margin-left:auto;width:250px;min-width:150px}
.wd-experts .mine-toggle,.wd-experts .create-expert{white-space:nowrap}
.wd-experts .mine-toggle.active{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l2)}
.wd-experts .create-expert{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted);border-color:var(--dsw-alias-border-l2);font-weight:600}
.wd-experts .section-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.wd-experts .section-head{padding-bottom:16px}
.wd-experts .section-head h1{margin:0}
.wd-experts .section-head h1{font-size:25px;line-height:34px;font-weight:600}
.wd-experts .section-actions{display:flex;gap:8px;align-items:center}
.wd-experts .back-center{margin:0 0 20px}
.wd-experts .back-center{border:0;background:transparent;color:var(--dsw-alias-label-tertiary);padding-left:0}
.wd-experts .work-types{display:flex;gap:24px}
.wd-experts .work-types button{background:transparent;border:0;padding:0;color:var(--dsw-alias-label-tertiary);font-size:22px;font-weight:600}
.wd-experts .work-types button.active{color:var(--dsw-alias-label-primary)}
.wd-experts .work-types span{margin-left:10px}
.wd-experts .work-types span{font-size:12px;color:var(--dsw-alias-label-tertiary);font-weight:400}
.wd-experts .create-menu{position:relative}
.wd-experts .create-menu summary{list-style:none;cursor:pointer}
.wd-experts .create-menu summary{border-radius:8px;padding:9px 14px}
.wd-experts .create-menu summary::-webkit-details-marker{display:none}
.wd-experts .create-menu>div{position:absolute;right:0;top:calc(100% + 8px);width:180px;z-index:20}
.wd-experts .create-menu>div{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:8px;box-shadow:0 12px 28px var(--dsw-alias-bg-mask-2)}
.wd-experts .create-menu button{display:block;width:100%;text-align:left}
.wd-experts .create-menu button{border:0;background:transparent}
.wd-experts .domain-tags{display:flex;gap:6px;flex-wrap:wrap}
.wd-experts .domain-tags span{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary);font-size:11px;border-radius:4px;padding:3px 7px}
.wd-experts .create-card{display:flex;align-items:center;justify-content:center;gap:12px}
.wd-experts .create-card{min-height:220px;color:var(--dsw-alias-label-tertiary);font-size:14px}
.wd-experts .create-card>span{font-size:46px;font-weight:400;line-height:1}
.wd-experts .filter-tabs{display:flex;gap:7px;align-items:center;overflow:auto;margin:0 0 18px}
.wd-experts .filter-tabs{padding:0 0 2px}
.wd-experts .filter-tabs button{white-space:nowrap}
.wd-experts .filter-tabs button{border:0;background:transparent}
.wd-experts .filter-tabs button.active{background:var(--dsw-alias-interactive-bg-hover)}
.wd-experts .filter-tabs button:disabled{color:var(--dsw-alias-label-dimmed)}
.wd-experts .counts{margin:0 0 16px}
.wd-experts .counts{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.wd-experts .counts.error{color:var(--dsw-alias-state-error-primary)}
.wd-experts .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.wd-experts .card{position:relative;min-width:0;display:flex;flex-direction:column;gap:12px}
.wd-experts .card{border-radius:17px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);min-height:150px;padding:24px}
.wd-experts .card:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.wd-experts .card.draft{border-style:dashed}
.wd-experts .card.unavailable{opacity:.62}
.wd-experts .card-top{display:flex;align-items:flex-start;gap:12px;min-width:0}
.wd-experts .card-open{display:flex;align-items:flex-start;gap:12px;min-width:0;flex:1;text-align:left}
.wd-experts .card-open{padding:0;border:0;background:transparent}
.wd-experts .card-open:hover:not(:disabled){background:transparent}
.wd-experts .avatar{display:inline-grid;place-items:center;width:46px;flex:none;overflow:hidden}
.wd-experts .avatar{height:46px;border-radius:50%;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:700;font-size:18px}
.wd-experts .avatar img{width:100%;object-fit:cover}
.wd-experts .avatar img{height:100%}
.wd-experts .card-title{min-width:0;flex:1}
.wd-experts .card-title strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-experts .card-title strong{font-weight:600;font-size:15px}
.wd-experts .card-meta{display:block;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-experts .card-meta{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.wd-experts .card p.desc{margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.wd-experts .card p.desc{font-size:12px;line-height:20px;color:var(--dsw-alias-label-secondary)}
.wd-experts .card-foot{display:flex;align-items:center;gap:8px;margin-top:auto;flex-wrap:wrap}
.wd-experts .badge{white-space:nowrap}
.wd-experts .badge{font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary)}
.wd-experts .badge.ready{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}
.wd-experts .badge.warn{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}
.wd-experts .badge.bad{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-warn-primary)}
.wd-experts .pin{margin-left:auto}
.wd-experts .pin{background:transparent;border:0;min-height:28px;padding:2px 6px;font-size:15px;color:var(--dsw-alias-label-dimmed)}
.wd-experts .pin.on{color:var(--dsw-alias-state-warn-primary)}
.wd-experts .more-button{width:34px}
.wd-experts .more-button{min-height:30px;padding:0;border:0;font-size:18px;background:transparent;color:var(--dsw-alias-label-secondary)}
.wd-experts .card-actions{position:relative}
.wd-experts .card-menu{position:absolute;z-index:20;right:0;top:calc(100% + 6px);width:172px}
.wd-experts .card-menu{padding:8px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;box-shadow:0 14px 36px var(--dsw-alias-bg-mask-2)}
.wd-experts .card-menu button{display:block;width:100%;text-align:left}
.wd-experts .card-menu button{border:0;background:transparent;min-height:40px;padding:8px 12px;border-radius:8px}
.wd-experts .card-menu button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.wd-experts .card-menu .danger{color:var(--dsw-alias-state-error-primary)}
.wd-experts .card.menu-open{z-index:25}
.wd-experts .empty{text-align:center}
.wd-experts .empty{padding:64px 20px}
.wd-experts .empty strong{display:block;margin-bottom:8px}
.wd-experts .empty strong{font-size:16px}
.wd-experts .empty .empty-actions{display:flex;gap:10px;justify-content:center;margin-top:18px}
.wd-experts .skeleton{background-size:200% 100%;animation:wd-shimmer 1.3s infinite}
.wd-experts .skeleton{border-radius:17px;border:1px solid var(--dsw-alias-border-l2);background:linear-gradient(100deg,var(--dsw-alias-bg-layer-1) 30%,var(--dsw-alias-bg-layer-2) 50%,var(--dsw-alias-bg-layer-1) 70%);min-height:150px}
@keyframes wd-shimmer{to{background-position:-200% 0}}
.wd-experts .notice{display:flex;gap:10px;align-items:flex-start;margin:0 0 16px}
.wd-experts .notice{padding:12px 14px;border-radius:12px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.wd-experts .notice.error{border-color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,var(--dsw-alias-bg-layer-1))}
.wd-experts .notice.warn{border-color:var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-state-warn-tertiary)}
.wd-experts .notice.info{border-color:var(--dsw-alias-state-success-primary);background:var(--dsw-alias-state-success-tertiary)}
.wd-experts .notice .notice-body{flex:1;min-width:0}
.wd-experts .notice .notice-body strong{display:block;margin-bottom:2px}
.wd-experts .notice button{min-height:30px;padding:2px 10px}
.expert-dialog{width:min(800px,calc(100vw - 56px));display:flex;flex-direction:column;overflow:hidden}
.expert-dialog{max-height:min(820px,calc(100dvh - 80px));padding:0}
.wd-dialog.expert-dialog,.wd-dialog.editor-dialog{box-sizing:border-box}
.wd-dialog.editor-dialog>.wd-dialog-close{top:16px;right:16px}
.expert-dialog :focus-visible{outline-offset:3px}
.expert-dialog :focus-visible{outline:2px solid var(--dsw-alias-brand-text)}
.expert-dialog .notice.info{border:0;padding:0;background:transparent;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.expert-dialog .notice.info strong{display:none}
.expert-dialog .dialog-scroll{overflow:auto}
.expert-dialog .dialog-scroll{padding:24px}
.expert-dialog .detail-header{display:grid;grid-template-columns:48px minmax(0,1fr);gap:16px;align-items:start}
.expert-dialog .detail-header{padding-right:52px}
.wd-dialog.expert-dialog .detail-avatar{width:48px;display:grid;place-items:center;overflow:hidden}
.wd-dialog.expert-dialog .detail-avatar{height:48px;border-radius:50%;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-size:22px;font-weight:600}
.expert-dialog .detail-avatar img{width:100%;object-fit:cover}
.expert-dialog .detail-avatar img{height:100%}
.expert-dialog .detail-title h1{margin:0;overflow-wrap:anywhere}
.expert-dialog .detail-title h1{font-size:20px;line-height:28px}
.expert-dialog .detail-subtitle{margin:6px 0 0}
.expert-dialog .detail-subtitle{color:var(--dsw-alias-label-tertiary);font-size:13px}
.expert-dialog .detail-title>.detail-head-actions{margin-top:14px;justify-content:flex-start}
.expert-dialog .detail-head-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.expert-dialog .summon{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted);border-color:var(--dsw-alias-border-l2);font-weight:600}
.expert-dialog button{cursor:pointer}
.expert-dialog button{font:inherit;min-height:38px;padding:7px 15px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.expert-dialog button:disabled{cursor:not-allowed}
.expert-dialog button:disabled{opacity:.5}
.expert-dialog .detail-section-title{display:flex;align-items:center;gap:9px;margin:30px 0 12px}
.expert-dialog .detail-section-title{font-size:17px;font-weight:600}
.expert-dialog .detail-desc{white-space:pre-wrap;overflow-wrap:anywhere;margin:0}
.expert-dialog .detail-desc{color:var(--dsw-alias-label-primary);line-height:1.7}
.expert-dialog .tag-row{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 0}
.expert-dialog .tag{font-size:12px;padding:3px 10px;border-radius:999px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.expert-dialog .example-list{display:grid;gap:10px}
.expert-dialog .example{display:flex;align-items:center;gap:12px;width:100%;text-align:left}
.expert-dialog .example{padding:14px 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}
.expert-dialog .example:disabled{color:var(--dsw-alias-label-secondary);opacity:.7}
.expert-dialog .example:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}
.expert-dialog .example .example-text{flex:1;min-width:0}
.expert-dialog .example .example-text strong{display:block;margin-bottom:2px}
.expert-dialog .example .example-text span{white-space:pre-wrap;overflow-wrap:anywhere}
.expert-dialog .example .example-text span{color:var(--dsw-alias-label-tertiary);font-size:14px;line-height:1.65}
.expert-dialog .cap-list{display:grid;gap:8px}
.expert-dialog .cap-row{display:flex;align-items:center;gap:10px}
.expert-dialog .cap-row{padding:10px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
.expert-dialog .cap-row .cap-state{margin-left:auto;white-space:nowrap}
.expert-dialog .cap-row .cap-state{font-size:12px}
.expert-dialog .cap-row.ok .cap-state{color:var(--dsw-alias-state-success-primary)}
.expert-dialog .cap-row.missing{border-color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,var(--dsw-alias-bg-layer-1))}
.expert-dialog .cap-row.missing .cap-state{color:var(--dsw-alias-state-error-primary)}
 .expert-dialog .team-member-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px 16px;margin:16px 0 24px}
.expert-dialog .team-person{min-width:0}
.expert-dialog .team-person summary{display:flex;align-items:center;gap:10px;cursor:pointer;list-style:none}
.expert-dialog .team-person summary::-webkit-details-marker{display:none}
.expert-dialog .member-avatar{width:38px;flex-shrink:0;display:grid;place-items:center;overflow:hidden}
.expert-dialog .member-avatar{height:38px;border-radius:50%;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.expert-dialog .member-avatar img{width:100%;object-fit:cover}
.expert-dialog .member-avatar img{height:100%}
.expert-dialog .member-identity{display:grid;gap:4px;min-width:0}
.expert-dialog .member-identity{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.expert-dialog .member-identity strong{overflow-wrap:anywhere}
.expert-dialog .member-identity strong{font-size:14px;font-weight:500;color:var(--dsw-alias-label-primary)}
.expert-dialog .member-lead{margin-left:6px;white-space:nowrap}
.expert-dialog .member-lead{font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover);border-radius:4px;padding:2px 5px}
.expert-dialog .team-person p{overflow-wrap:anywhere}
.expert-dialog .team-person p{font-size:12px;line-height:1.7}
.expert-dialog .member-responsibility{white-space:pre-wrap;overflow:auto}
.expert-dialog .member-responsibility{max-height:300px}
.expert-dialog .team-workflows article{border-bottom:1px solid var(--dsw-alias-border-l2)}
.expert-dialog .team-workflows article{padding:12px 0}
@media(max-width:900px){.expert-dialog .team-member-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.expert-dialog .team-member-grid{grid-template-columns:1fr}}
.expert-dialog .expert-settings summary{cursor:pointer;list-style-position:inside;margin:24px 0 12px}
.expert-dialog .expert-settings summary{font-size:16px;font-weight:600}
.expert-work-summary{display:grid;gap:12px;margin:20px 0}
.expert-work-summary>section{border-left:3px solid var(--dsw-alias-brand-text);min-width:0}
.expert-work-summary>section{padding:2px 0 2px 14px}
.expert-dialog .expert-work-summary h3{margin:0 0 6px}
.expert-dialog .expert-work-summary h3{font-size:15px;color:var(--dsw-alias-label-primary)}
.expert-work-summary p{white-space:pre-wrap;overflow-wrap:anywhere;margin:0}
.expert-work-summary p{line-height:1.7;color:var(--dsw-alias-label-secondary)}
.expert-dialog .prose-block{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 12px}
.expert-dialog .prose-block{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:16px 18px;color:var(--dsw-alias-label-primary);line-height:1.7}
.expert-dialog .prose-block h4{margin:0 0 6px}
.expert-dialog .prose-block h4{font-size:13px;color:var(--dsw-alias-label-tertiary);font-weight:600}
.confirm-dialog{width:min(560px,calc(100vw - 40px))}
.confirm-dialog{padding:24px}
.confirm-dialog h2{margin:0 52px 14px 0}
.confirm-dialog h2{font-size:21px}
.confirm-dialog p{margin:0 0 14px}
.confirm-dialog p{color:var(--dsw-alias-label-tertiary);line-height:1.7}
.confirm-dialog button{cursor:pointer}
.confirm-dialog button{min-height:40px;padding:8px 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.confirm-dialog .confirm-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
.confirm-dialog .primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted);border-color:var(--dsw-alias-border-l2);font-weight:600}
.confirm-dialog .danger.solid{background:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary-foreground)}
.confirm-dialog .danger.solid:disabled{cursor:not-allowed}
.confirm-dialog .danger.solid:disabled{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,var(--dsw-alias-bg-layer-1));border-color:var(--dsw-alias-state-error-secondary);color:var(--dsw-alias-label-tertiary)}
.confirm-dialog .digest{word-break:break-all}
.confirm-dialog .digest{font:12px/18px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dsw-alias-label-tertiary)}
.confirm-dialog .diff-list{margin:0}
.confirm-dialog .diff-list{padding-left:20px;color:var(--dsw-alias-label-secondary);line-height:1.9}
.wd-dialog.publish-dialog{width:min(760px,calc(100vw - 40px));display:flex;flex-direction:column;overflow:hidden}
.wd-dialog.publish-dialog{max-height:min(820px,calc(100vh - 56px));padding:28px}
.publish-dialog .publish-scroll{overflow:auto;overflow-wrap:anywhere}
.publish-dialog .publish-scroll{min-height:0;padding-right:4px}
.publish-dialog .confirm-actions{flex-shrink:0;border-top:1px solid var(--dsw-alias-border-l2)}
.publish-dialog .confirm-actions{padding-top:16px}
.publish-dialog .confirm-actions .primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted);border-color:var(--dsw-alias-border-l2)}
.publish-dialog .confirm-actions .primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted)}
.publish-dialog .usage-preview{font-size:14px;line-height:1.7}
.publish-dialog .usage-preview header{display:flex;align-items:flex-start;gap:16px}
.publish-dialog .usage-preview header>div{min-width:0}
.publish-dialog .preview-avatar{flex-shrink:0;display:grid;place-items:center;width:56px}
.publish-dialog .preview-avatar{height:56px;border-radius:50%;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-brand-text);font-size:24px}
.publish-dialog .usage-preview h3{margin:20px 0 8px}
.publish-dialog .usage-preview h3{font-size:15px;color:var(--dsw-alias-label-primary)}
.publish-dialog .usage-preview header h3{margin:0 0 8px}
.publish-dialog .usage-preview header h3{font-size:20px}
.publish-dialog .usage-preview p{white-space:pre-wrap;overflow-wrap:anywhere}
.publish-dialog .preview-tags{display:flex;flex-wrap:wrap;gap:8px}
.publish-dialog .preview-tags span{border:1px solid var(--dsw-alias-border-l2);border-radius:16px;padding:3px 10px;color:var(--dsw-alias-label-tertiary);font-size:12px}
.publish-dialog .preview-example{margin:10px 0}
.publish-dialog .preview-example{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:12px 14px;background:var(--dsw-alias-bg-layer-2)}
.publish-dialog .preview-example p{margin:4px 0 0}
.publish-dialog .usage-preview ul{margin:8px 0}
.publish-dialog .usage-preview ul{padding-left:20px;color:var(--dsw-alias-label-secondary)}
.publish-dialog .usage-preview li{margin:8px 0}
.publish-dialog .usage-preview small{display:block;overflow-wrap:anywhere}
.publish-dialog .usage-preview small{color:var(--dsw-alias-label-tertiary);font-size:12px}
.publish-dialog .preview-settings,.publish-dialog .preview-digests{margin:20px 0 12px;border-top:1px solid var(--dsw-alias-border-l2)}
.publish-dialog .preview-settings,.publish-dialog .preview-digests{padding-top:12px}
.publish-dialog summary{cursor:pointer}
.publish-dialog summary{color:var(--dsw-alias-label-primary)}
@media(max-width:640px){.wd-dialog.publish-dialog{width:calc(100vw - 24px)}.wd-dialog.publish-dialog{max-height:calc(100dvh - 24px);height:auto;padding:20px 16px}.publish-dialog h2{font-size:18px}.publish-dialog .confirm-actions button{min-height:44px}}

.editor-dialog{width:min(760px,calc(100vw - 56px));display:flex;flex-direction:column;overflow:hidden}

.editor-dialog{max-height:min(820px,calc(100dvh - 80px));padding:0}
.editor-dialog .editor-head{display:flex;align-items:center;gap:14px;flex-shrink:0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.editor-dialog .editor-head{padding:24px 84px 24px 28px}
.editor-dialog .editor-head h2{margin:0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.editor-dialog .editor-head h2{font-size:20px}
.editor-dialog .editor-scroll{overflow:auto}
.editor-dialog .editor-scroll{min-height:0;padding:22px 28px 28px}
.editor-dialog .editor-foot{display:flex;align-items:center;gap:12px;flex-shrink:0;border-top:1px solid var(--dsw-alias-border-l2)}
.editor-dialog .editor-foot{padding:16px 28px;background:var(--dsw-alias-bg-layer-1)}
.editor-dialog .editor-foot .saved-at{margin-right:auto}
.editor-dialog .editor-foot .saved-at{color:var(--dsw-alias-label-tertiary);font-size:12px}
.editor-dialog .group{margin-bottom:18px}
.editor-dialog .group{border:1px solid var(--dsw-alias-border-l2);border-radius:14px;padding:20px 22px;background:var(--dsw-alias-bg-layer-1)}
.editor-dialog .group>h3{margin:0 0 16px;display:flex;align-items:center;gap:8px}
.editor-dialog .group>h3{font-size:15px}
.editor-dialog .field{margin-bottom:16px}
.editor-dialog .field:last-child{margin-bottom:0}
.editor-dialog .field label{display:block;margin-bottom:6px}
.editor-dialog .field label{font-weight:600;font-size:13px}
.editor-dialog .field .hint{margin-top:4px}
.editor-dialog .field .hint{color:var(--dsw-alias-label-dimmed);font-size:12px}
.editor-dialog .field .field-error{margin-top:4px}
.editor-dialog .field .field-error{color:var(--dsw-alias-state-error-primary);font-size:12px}
.editor-dialog :is(input,.wd-form-input),.editor-dialog textarea{box-sizing:border-box;width:100%;min-width:0}
.editor-dialog input,.editor-dialog textarea{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:10px 12px;font:inherit}
.editor-dialog :is(input,.wd-form-input):focus-visible,.editor-dialog textarea:focus-visible{outline-offset:2px}
.editor-dialog input:focus-visible,.editor-dialog textarea:focus-visible{outline:2px solid var(--dsw-alias-brand-text)}
.editor-dialog .tag-editor{grid-template-columns:repeat(2,minmax(0,1fr))}
.editor-dialog .example-editor-row{display:grid;gap:10px}
.editor-dialog .example-editor-row{padding:16px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}
.editor-dialog .example-editor-row textarea{resize:vertical}
.editor-dialog .example-editor-row textarea{min-height:100px;line-height:1.65}
.editor-dialog .example-editor-row .remove{justify-self:end}
.editor-dialog .example-editor-row .remove{color:var(--dsw-alias-state-error-primary)}

.editor-dialog .field textarea{resize:vertical}

.editor-dialog .field textarea{min-height:88px;line-height:1.7;font:13px/22px "PingFang SC","Microsoft YaHei",sans-serif}
.editor-dialog .field textarea.prose{min-height:120px}
.editor-dialog .field .counter{float:right}
.editor-dialog .field .counter{color:var(--dsw-alias-label-dimmed);font-size:12px;font-weight:400}
.editor-dialog .field.invalid input,.editor-dialog .field.invalid textarea{border-color:var(--dsw-alias-state-error-primary)}
.editor-dialog .list-editor{display:grid;gap:10px}
.editor-dialog .list-row{display:flex;gap:8px;align-items:flex-start}
.editor-dialog .list-row input,.editor-dialog .list-row textarea{flex:1;min-width:0}
.editor-dialog .list-row .remove{flex:none}
.editor-dialog .list-row .remove{min-height:36px;padding:0 12px;color:var(--dsw-alias-state-error-primary)}
.editor-dialog .add-row{justify-self:start}
.editor-dialog .add-row{background:transparent;border:1px dashed var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.editor-dialog button{cursor:pointer}
.editor-dialog button{font:inherit;min-height:38px;padding:7px 15px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.editor-dialog button:disabled{cursor:not-allowed}
.editor-dialog button:disabled{opacity:.5}
.editor-dialog .primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted);border-color:var(--dsw-alias-border-l2);font-weight:600}
.editor-dialog .conflict{margin-bottom:18px}
.editor-dialog .conflict{border:1px solid var(--dsw-alias-state-warn-primary);background:var(--dsw-alias-state-warn-tertiary);border-radius:12px;padding:16px 18px}
.editor-dialog .conflict h4{margin:0 0 8px}
.editor-dialog .conflict h4{color:var(--dsw-alias-state-warn-primary)}
.editor-dialog .conflict .conflict-actions{display:flex;gap:10px;margin-top:12px}
.editor-dialog .issues{margin-bottom:18px}
.editor-dialog .issues{border:1px solid var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,var(--dsw-alias-bg-layer-1));border-radius:12px;padding:14px 18px}
.editor-dialog .issues h4{margin:0 0 8px}
.editor-dialog .issues h4{color:var(--dsw-alias-state-error-primary)}
.editor-dialog .issues ul{margin:0}
.editor-dialog .issues ul{padding-left:20px;color:var(--dsw-alias-label-primary);line-height:1.9}
.editor-dialog .equipped-row{display:flex;align-items:center;gap:12px}
.editor-dialog .equipped-row{padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2)}
.editor-dialog .equipped-row strong{flex:1;min-width:0;overflow-wrap:anywhere}
.editor-dialog .equipped-row .remove{color:var(--dsw-alias-state-error-primary)}
.editor-dialog .skill-picker{margin-top:16px}
.editor-dialog .skill-picker{padding:16px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-2)}
.editor-dialog .skill-picker h4{margin:0 0 12px}
.editor-dialog .skill-picker-list{overflow:auto;margin-top:12px;display:grid;gap:8px}
.editor-dialog .skill-picker-list{max-height:300px}
.editor-dialog .skill-choice{display:flex;align-items:flex-start;gap:12px;cursor:pointer}
.editor-dialog .skill-choice{padding:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px}
.editor-dialog .skill-choice :is(input,.wd-form-input){width:18px;flex:none;margin:3px 0;accent-color:var(--dsw-alias-state-success-primary)}
.editor-dialog .skill-choice input{height:18px;padding:0}
.editor-dialog .skill-choice>span{flex:1;min-width:0;overflow-wrap:anywhere}
.editor-dialog .skill-choice small,.expert-dialog .skill-copy small{display:block;margin-top:4px}
.editor-dialog .skill-choice small,.expert-dialog .skill-copy small{color:var(--dsw-alias-label-tertiary);line-height:1.6}
.editor-dialog .skill-choice>small{flex:none}
.editor-dialog .skill-choice>small{font-size:12px}
.editor-dialog .picker-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
.expert-dialog .skill-copy{flex:1;min-width:0;overflow-wrap:anywhere}
.import-dialog{width:min(720px,calc(100vw - 40px))}
.import-dialog{padding:24px}
.import-dialog h2{margin:0 56px 20px 0}
.import-dialog h2{font-size:23px}
.import-dialog button,.import-dialog select{font:inherit;color:inherit}
.import-dialog .dropzone{width:100%;display:grid;place-content:center;justify-items:center;gap:10px;cursor:pointer}
.import-dialog .dropzone{min-height:200px;border:1px dashed var(--dsw-alias-border-l2);border-radius:18px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.import-dialog .dropzone:hover,.import-dialog .dropzone.dragging{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.import-dialog .dropzone:disabled{cursor:wait}
.import-dialog .dropzone:disabled{opacity:.7}
.import-dialog .upload-glyph{width:50px;display:grid;place-items:center}
.import-dialog .upload-glyph{height:42px;border:2px solid var(--dsw-alias-border-l2);border-radius:8px;font-size:24px;color:var(--dsw-alias-label-tertiary)}
.import-dialog .dropzone strong{font-size:17px;font-weight:500}
.import-dialog .dropzone small{color:var(--dsw-alias-label-tertiary)}
.import-dialog .visually-hidden{position:absolute;width:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
.import-dialog .visually-hidden{height:1px;padding:0;border:0}
.import-dialog .review{margin-top:24px}
.import-dialog .review h3{margin:0 0 12px}
.import-dialog .review h3{font-size:17px}
.import-dialog dl{display:grid;grid-template-columns:110px 1fr;gap:10px;margin:16px 0}
.import-dialog dt{color:var(--dsw-alias-label-tertiary)}
.import-dialog dd{margin:0;overflow-wrap:anywhere}
.import-dialog .issue-list{margin:8px 0 0}
.import-dialog .issue-list{padding-left:20px;color:var(--dsw-alias-state-error-primary);line-height:1.9}
.import-dialog .import-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}
.import-dialog .import-actions button{cursor:pointer}
.import-dialog .import-actions button{min-height:42px;padding:8px 18px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2)}
.import-dialog .import-actions .install{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-inverted);border-color:var(--dsw-alias-border-l2);font-weight:600}
.import-dialog .error{margin:16px 0 0}
.import-dialog .error{color:var(--dsw-alias-state-error-primary)}
.wd-experts svg,.expert-dialog svg,.editor-dialog svg,.confirm-dialog svg,.import-dialog svg{width:20px;stroke:currentColor;stroke-width:1.7;fill:none;stroke-linecap:round}
.wd-experts svg,.expert-dialog svg,.editor-dialog svg,.confirm-dialog svg,.import-dialog svg{height:20px}
.wd-experts .error-text{color:var(--dsw-alias-state-error-primary)}
@media(max-width:1400px){.wd-experts .grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:1100px){.wd-experts .grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){.wd-experts .search{order:2;margin-left:0;flex:1}.expert-dialog .detail-header{grid-template-columns:48px minmax(0,1fr)}.wd-dialog.expert-dialog .detail-avatar{width:48px}.wd-dialog.expert-dialog .detail-avatar{height:48px;font-size:22px}.expert-dialog .detail-title>.detail-head-actions{justify-content:flex-start}}
@media(max-width:600px){.wd-experts{padding:16px}.wd-experts .nav-toggle{display:block}.wd-experts .grid{grid-template-columns:1fr}.wd-experts .card-menu{right:auto;left:0}.expert-dialog{width:calc(100vw - 24px)}.expert-dialog{max-height:calc(100dvh - 24px);height:auto;border-radius:12px}.wd-dialog.expert-dialog,.wd-dialog.editor-dialog{box-sizing:border-box}
.wd-dialog.editor-dialog>.wd-dialog-close{top:16px;right:16px}
.expert-dialog :focus-visible{outline-offset:3px}
.expert-dialog :focus-visible{outline:2px solid var(--dsw-alias-brand-text)}
.expert-dialog .notice.info{border:0;padding:0;background:transparent;font-size:12px;color:var(--dsw-alias-label-tertiary)}
.expert-dialog .notice.info strong{display:none}
.expert-dialog .dialog-scroll{padding:24px 18px}.editor-dialog{width:calc(100vw - 24px)}.editor-dialog{max-height:calc(100dvh - 24px);height:auto;border-radius:12px}.editor-dialog .editor-scroll{padding:18px}.editor-dialog .editor-head{padding-left:18px;padding-right:72px}.editor-dialog .editor-foot{gap:8px;flex-wrap:wrap}.editor-dialog .editor-foot{padding:12px 18px}.editor-dialog .editor-foot .saved-at{flex-basis:100%}.editor-dialog .tag-editor{grid-template-columns:1fr}.import-dialog{padding:24px 18px}.import-dialog dl{grid-template-columns:1fr;gap:4px}.import-dialog dd{margin-bottom:8px}}
@media(prefers-reduced-motion:reduce){.wd-experts .skeleton{animation:none}}


}
/* The shared Modal rules are unlayered; sizing must use the same cascade layer. */
.wd-dialog.editor-dialog{width:min(760px,calc(100vw - 56px));max-height:min(820px,calc(100dvh - 80px))}
@media(max-width:640px){.wd-dialog.editor-dialog{width:calc(100vw - 24px);max-height:calc(100dvh - 24px)}}
${controlsCss}
`;
