/** Shared presentation tokens. Domain and runtime state do not belong here. */
export const tokens = {
  canvas: '#121212',
  sidebar: '#202020',
  card: '#242424',
  selected: '#3a3a3a',
  border: '#343434',
  text: '#e7e7e7',
  secondary: '#a5a5a5',
} as const;

export type WorkdshTokens = typeof tokens;
