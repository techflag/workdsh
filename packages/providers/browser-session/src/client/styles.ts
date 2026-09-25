export const browserSessionStyles = `
.wd-browser-session{display:flex;flex-direction:column;min-width:0;height:100%;background:var(--dsw-alias-bg-base,#121212);color:var(--dsw-alias-label-primary,#e7e7e7);font-family:PingFang SC,Microsoft YaHei,sans-serif;font-size:14px}
.wd-browser-session *{box-sizing:border-box}
.wd-browser-session-toolbar,.wd-browser-session-input{display:flex;gap:8px;padding:12px;border-bottom:1px solid var(--dsw-alias-border-l2,#343434)}
.wd-browser-session-input{border-top:1px solid var(--dsw-alias-border-l2,#343434);border-bottom:0}
.wd-browser-session-toolbar input,.wd-browser-session-input input{flex:1;min-width:0;height:34px;border:1px solid var(--dsw-alias-border-l2,#343434);border-radius:8px;background:var(--dsw-alias-bg-layer-1,#242424);color:inherit;padding:0 10px;font:inherit}
.wd-browser-session button{height:34px;white-space:nowrap;border:1px solid var(--dsw-alias-border-l2,#343434);border-radius:8px;background:var(--dsw-alias-bg-layer-1,#242424);color:inherit;padding:0 10px;font:inherit;cursor:pointer}
.wd-browser-session button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#383838)}
.wd-browser-session button:disabled{opacity:.45;cursor:not-allowed}
.wd-browser-session :is(button,input,img):focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#e5e5e5);outline-offset:2px}
.wd-browser-session-viewport{flex:1;min-height:0;overflow:hidden;background:#202020;text-align:center}
.wd-browser-session-viewport img{display:block;width:100%;height:auto;cursor:crosshair;background:#fff}
.wd-browser-session-empty,.wd-browser-session-hint{color:var(--dsw-alias-label-secondary,#a5a5a5);padding:12px;margin:0;line-height:1.5}
.wd-browser-session-error{margin:0;padding:8px 12px;color:var(--dsw-alias-state-error-primary,#f28b82);border-bottom:1px solid var(--dsw-alias-border-l2,#343434)}
.wd-browser-session-hint{font-size:12px;border-top:1px solid var(--dsw-alias-border-l2,#343434)}
`;
