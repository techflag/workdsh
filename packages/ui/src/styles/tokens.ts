/**
 * Shared presentation tokens. Domain and runtime state do not belong here.
 *
 * Values resolve to the official `--dsw-*` semantic aliases owned by
 * `@deepseek-ai/dsh-client-ui-theme`; the prototype greys remain as fallbacks so a
 * missing alias degrades to the original neutral surface instead of an unstyled one.
 * Appearance is driven by the official ThemeRuntime, which applies
 * `[data-ds-dark-theme]` and `prefers-color-scheme`; feature components must never
 * branch on the theme themselves (see docs/UI-DESIGN.md 15/17).
 */
export const tokens = {
  canvas: 'var(--dsw-alias-bg-base,#121212)',
  sidebar: 'var(--dsw-specific-sidebar-fill,#202020)',
  card: 'var(--dsw-alias-bg-layer-2,#242424)',
  selected: 'var(--dsw-alias-interactive-bg-active,#3a3a3a)',
  border: 'var(--dsw-alias-border-l2,#343434)',
  text: 'var(--dsw-alias-label-primary,#e7e7e7)',
  secondary: 'var(--dsw-alias-label-secondary,#a5a5a5)',
} as const;

export type WorkdshTokens = typeof tokens;
