import * as React from 'react';
import { useEffect, useRef } from 'react';
import type { PanelInfo } from '@deepseek-ai/dsh-client-ui-layout/client';
import type {} from '@deepseek-ai/dsh-client-ui-session/client';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';

type NavigationLocationProps = PropsRuntime<'shell.overlay'> & InjectFace<{
  readonly panelToView: Readonly<Record<string, string>>;
  readonly selectView: (view: string | null) => string | null;
}>;

/** URL stores presentation only, never Session identity or authority. */
export function NavigationLocation({ usePanelInfo, useSessions, panelToView, selectView }: NavigationLocationProps) {
  const active = usePanelInfo((info: PanelInfo) => info.activePanelId);
  // The official initial navigation publishes its Session as the `mainView` retention,
  // so that count tells us whether the one-shot boot restore has already committed.
  const bootNavigated = useSessions(state =>
    Object.values(state.byId).some(row => (row.retainedBy.mainView ?? 0) > 0));
  const initialized = useRef(false);
  const restoring = useRef(false);
  // An explicit `workdsh-view` is a deep link: it must outlive the boot restore below.
  const deepLink = useRef<string | null>(null);
  useEffect(() => {
    const restore = () => {
      restoring.current = true;
      selectView(new URL(window.location.href).searchParams.get('workdsh-view'));
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [selectView]);
  useEffect(() => {
    if (!initialized.current) {
      // Restore after the official Client boot has composed the feature entries,
      // rather than while one feature's apply is still awaiting its services.
      const url = new URL(window.location.href);
      const deep = url.searchParams.get('workdsh-view');
      const requested = deep ?? (url.searchParams.get('diagnostics') === '1' ? 'diagnostics' : null);
      const selected = selectView(requested);
      initialized.current = true;
      restoring.current = true;
      deepLink.current = deep !== null && selected !== null ? deep : null;
      if (selected !== active) return;
    } else if (deepLink.current !== null) {
      // The official boot restores the last Workspace/Session once the feature slots are
      // composed, and that restore ends by clearing the main panel — a few frames after a
      // cold deep link selected one. Re-apply the deep link over that one-shot clear and
      // stop watching as soon as the restore has committed.
      if (active === null) {
        const replayed = selectView(deepLink.current);
        deepLink.current = null;
        if (replayed !== null) {
          restoring.current = true;
          return;
        }
      } else if (bootNavigated) deepLink.current = null;
    }
    if (active !== null && !(active in panelToView)) return;
    const url = new URL(window.location.href);
    const view = active === null ? 'conversation' : panelToView[active];
    if (url.searchParams.get('workdsh-view') !== view) {
      url.searchParams.set('workdsh-view', view);
      if (!initialized.current || restoring.current) window.history.replaceState(window.history.state, '', url);
      else window.history.pushState(window.history.state, '', url);
    }
    initialized.current = true;
    restoring.current = false;
  }, [active, bootNavigated, panelToView, selectView]);
  return null;
}
