import * as React from 'react';

/** Presentation-only adapter for the pinned Harness layout. Never changes hit areas. */
export function ShellAppearance() {
  return <style>{`
    [class$="_sidebarCol"] { border-right-color: transparent; }
    [data-platform="darwin"] [class$="_centerCol"] { border-left-color: transparent; }
    [data-side="sidebar"]:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent); }
    [data-side="sidebar"][data-dragging] { background: color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent); }
  `}</style>;
}
