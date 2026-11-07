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
  drive: 'M17.5 19a4.5 4.5 0 00.4-8.98A6 6 0 006.7 9.5 5 5 0 005 19h12.5zM7.5 14.5h9',
  close: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  ellipsis: 'M5 12h.01M12 12h.01M19 12h.01',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  image: 'M3 5h18v14H3zM8.5 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3M4 17l5-5 4 4 3-3 4 4',
  document: 'M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6',
  video: 'M3 6h13v12H3zM16 10l5-3v10l-5-3',
  audio: 'M9 18V6l10-2v12M9 18a3 3 0 11-6 0 3 3 0 016 0M19 16a3 3 0 11-6 0 3 3 0 016 0',
  archive: 'M3 4h18v5H3zM5 9v11h14V9M10 13h4',
  file: 'M6 3h8l4 4v14H6zM14 3v5h4',
  chat: 'M4 5h16v11H9l-5 4z',
  tag: 'M3 12l9-9h8v8l-9 9zM16 8h.01',
  download: 'M12 4v11M7 10l5 5 5-5M4 20h16',
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
