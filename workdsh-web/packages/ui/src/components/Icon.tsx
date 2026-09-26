import * as React from 'react';

const paths = {
  panel: 'M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM9 4v16',
  search: 'M16 16l5 5M18 10a8 8 0 11-16 0 8 8 0 0116 0',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M7 10l5 5 5-5',
  back: 'M15 19l-7-7 7-7',
  task: 'M6 19l-3 2V9a9 9 0 119 9H6zM12 5v8M8 9h8',
  assistant: 'M9 3h6M12 1v2M7 6h10a3 3 0 013 3v9a3 3 0 01-3 3H7a3 3 0 01-3-3V9a3 3 0 013-3zM9 10h.01M15 10h.01M8 17a4 4 0 018 0',
  project: 'M8 9l8-4M8 12l8 6M8 11a3 3 0 11-6 0 3 3 0 016 0M21 4a3 3 0 11-6 0 3 3 0 016 0M21 19a3 3 0 11-6 0 3 3 0 016 0',
  experts: 'M5 4h12a4 4 0 014 4v6a7 7 0 01-14 0v-3H5a3 3 0 010-6M13 11a2 2 0 11-4 0 2 2 0 014 0M19 11a2 2 0 11-4 0 2 2 0 014 0M11 17h5',
  skills: 'M8 5L2 12l6 7M16 5l6 7-6 7M14 3l-4 18',
  connectors: 'M9 15l6-6M9 6l2-2a4 4 0 016 6l-2 2M15 18l-2 2a4 4 0 01-6-6l2-2',
  library: 'M12 5v16M12 5C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-2-1-6-2-10 1',
  automation: 'M5 3L2 6M19 3l3 3M6 19l-2 3M18 19l2 3M12 8v5l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0',
  apps: 'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z',
  more: 'M3 3h6v6H3zM17 2v8M13 6h8M6 14l4 7H2zM21 18a4 4 0 11-8 0 4 4 0 018 0',
  settings: 'M9 3l1-2h4l1 2 3 2 2 0 2 4-1 2v3l1 2-2 4h-2l-3 2h-6l-3-2H4l-2-4 1-2v-3L2 9l2-4h2zM16 12a4 4 0 11-8 0 4 4 0 018 0',
  folder: 'M3 5h6l2 3h10v12H3z',
  close: 'M6 6l12 12M18 6L6 18',
} as const;

export type IconName = keyof typeof paths;

export type IconProps = {
  readonly name: IconName;
  readonly size?: number;
};

export function Icon({ name, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false}>
      <path d={paths[name]} />
    </svg>
  );
}
