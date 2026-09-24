import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { BrowserViewFrame } from '../../browser-view.js';

export const agentBrowserKind = 'workdsh-agent-browser';

export async function readAgentBrowserFrame(sessionId: string, signal?: AbortSignal, afterRevision?: number): Promise<{ frame: BrowserViewFrame | null; unchanged: boolean }> {
  const response = await fetch('/api/workdsh-agent-browser', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId, afterRevision }),
    signal,
  });
  if (!response.ok) throw new Error('无法读取浏览器画面');
  const payload = await response.json() as { frame?: BrowserViewFrame | null; unchanged?: boolean };
  return { frame: payload.frame ?? null, unchanged: payload.unchanged === true };
}

export function AgentBrowserPage({ sessionId }: PropsRuntime<'sidebar.right.pane.tab'>) {
  const [frame, setFrame] = useState<BrowserViewFrame | null>(null);
  const [error, setError] = useState('');
  const revision = useRef<number | undefined>(undefined);
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const poll = () => {
      void readAgentBrowserFrame(String(sessionId), controller.signal, revision.current).then(next => {
        if (!disposed) { if (!next.unchanged) { setFrame(next.frame); revision.current = next.frame?.revision; } setError(''); }
      }).catch(cause => {
        if (!disposed && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause));
      });
    };
    poll();
    const timer = window.setInterval(poll, 900);
    return () => { disposed = true; controller.abort(); window.clearInterval(timer); };
  }, [sessionId]);
  return <section aria-label="智能体浏览器" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-primary)' }}>
    <header style={{ padding: '10px 14px', borderBottom: '1px solid var(--dsw-alias-border-l2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={frame?.url}>
      {frame?.url ?? '智能体浏览器'}
    </header>
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'grid', placeItems: frame?.image ? 'start stretch' : 'center' }}>
      {frame?.image ? <img src={frame.image} alt="智能体当前浏览器画面" style={{ width: '100%', height: 'auto', display: 'block' }} /> : <span style={{ color: 'var(--dsw-alias-label-tertiary)', padding: 20 }}>{error || frame?.error || '等待智能体打开网页…'}</span>}
    </div>
    {frame?.error && frame?.image ? <footer style={{ padding: '8px 14px', color: 'var(--dsw-alias-state-error-primary)' }}>{frame.error}</footer> : null}
  </section>;
}
