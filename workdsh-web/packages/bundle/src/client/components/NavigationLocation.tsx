import * as React from 'react';
import { useEffect, useRef } from 'react';
import type { PanelInfo } from '@deepseek-ai/dsh-client-ui-layout/client';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';

type NavigationLocationProps = PropsRuntime<'shell.overlay'> & InjectFace<{
  readonly panelToView: Readonly<Record<string, string>>;
  readonly selectView: (view: string | null) => string | null;
}>;

/** URL stores presentation only, never Session identity or authority. */
export function NavigationLocation({ usePanelInfo, panelToView, selectView }: NavigationLocationProps) {
  const active = usePanelInfo((info: PanelInfo) => info.activePanelId);
  const initialized = useRef(false);
  const restoring = useRef(false);
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
      const requested = url.searchParams.get('workdsh-view') ?? (url.searchParams.get('diagnostics') === '1' ? 'diagnostics' : null);
      const selected = selectView(requested);
      initialized.current = true;
      restoring.current = true;
      if (selected !== active) return;
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
  }, [active, panelToView, selectView]);
  return null;
}
