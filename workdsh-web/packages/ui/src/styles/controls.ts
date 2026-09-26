/** Scoped companions for native Input and the missing native Select/Textarea primitives. */
export const controlsCss = `
[data-wd-control="button"]{box-sizing:border-box;height:36px;min-height:36px;white-space:nowrap;flex-shrink:0}
[data-wd-control="button"][data-size="sm"]{height:28px;min-height:28px}


[data-wd-control="button"][data-tone="danger"]{color:var(--dsw-alias-state-error-primary)}
.wd-form-input{min-width:0;max-width:100%;box-sizing:border-box;height:36px}
.wd-form-input input{box-sizing:border-box;min-width:0;height:100%;min-height:0;font-size:14px;line-height:20px}
.wd-form-select,.wd-form-textarea{box-sizing:border-box;max-width:100%;min-width:0;border:0;border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-elevation-soft);font:inherit;font-size:14px;line-height:20px}
.wd-form-select{height:36px;min-height:36px;padding:0 12px;cursor:pointer;color-scheme:inherit}
.wd-form-textarea{display:block;width:100%;min-height:100px;padding:10px 12px;resize:vertical}
.wd-form-textarea::placeholder{color:var(--dsw-alias-label-tertiary)}
.wd-form-select:focus-visible,.wd-form-textarea:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.wd-form-select:disabled,.wd-form-textarea:disabled{opacity:.5;cursor:not-allowed}
.wd-form-select[aria-invalid=true],.wd-form-textarea[aria-invalid=true]{outline:1px solid var(--dsw-alias-state-error-primary)}
`;
