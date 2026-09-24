import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { BrowserViewFrame } from '../../browser-view.js';

export const agentBrowserKind = 'workdsh-agent-browser';
const buttonStyle: React.CSSProperties = { border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 6, padding: '6px 9px', background: 'var(--dsw-alias-interactive-bg-hover)', color: 'var(--dsw-alias-label-primary)', cursor: 'pointer' };

type BrowserAction =
  | { kind: 'click'; x: number; y: number }
  | { kind: 'scroll'; deltaY: number }
  | { kind: 'key'; key: string }
  | { kind: 'type'; text: string };

export async function sendAgentBrowserAction(sessionId: string, action: BrowserAction): Promise<void> {
  const response = await fetch('/api/workdsh-agent-browser', {
    method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId, action }),
  });
  if (!response.ok) throw new Error('浏览器操作失败');
}

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
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [fit, setFit] = useState(true);
  const revision = useRef<number | undefined>(undefined);
  const send = async (action: BrowserAction) => {
    if (sending) return;
    setSending(true);
    try { await sendAgentBrowserAction(String(sessionId), action); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSending(false); }
  };
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
    <header style={{ padding: '8px 12px', borderBottom: '1px solid var(--dsw-alias-border-l2)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={frame?.url}>{frame?.url ?? '智能体浏览器'}</span>
      {frame?.image ? <button type="button" style={buttonStyle} onClick={() => setFit(value => !value)} aria-label={fit ? '查看原始大小' : '适应侧栏宽度'}>{fit ? '原始大小' : '适应宽度'}</button> : null}
    </header>
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'grid', placeItems: frame?.image ? fit ? 'start stretch' : 'start start' : 'center' }}>
      {frame?.image ? <img src={frame.image} alt="智能体当前浏览器画面" draggable={false} style={{ width: fit ? '100%' : 'auto', maxWidth: fit ? '100%' : 'none', height: 'auto', display: 'block', cursor: sending ? 'wait' : 'pointer' }}
        onClick={event => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - bounds.left) * event.currentTarget.naturalWidth / bounds.width;
          const y = (event.clientY - bounds.top) * event.currentTarget.naturalHeight / bounds.height;
          void send({ kind: 'click', x, y });
        }}
        onWheel={event => { void send({ kind: 'scroll', deltaY: event.deltaY }); }}
      /> : <span style={{ color: 'var(--dsw-alias-label-tertiary)', padding: 20 }}>{error || frame?.error || '等待智能体打开网页…'}</span>}
    </div>
    {frame?.image ? <form onSubmit={event => { event.preventDefault(); if (input) { void send({ kind: 'type', text: input }); setInput(''); } }}
      style={{ display: 'flex', gap: 6, padding: '8px 10px', borderTop: '1px solid var(--dsw-alias-border-l2)' }}>
      <input aria-label="向网页输入文本" placeholder="点击网页输入框后，在此输入文本" value={input} onChange={event => setInput(event.target.value)}
        style={{ flex: 1, minWidth: 0, border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 6, padding: '6px 8px', background: 'transparent', color: 'inherit' }} />
      <button type="submit" style={buttonStyle} disabled={sending || !input}>输入</button>
      <button type="button" style={buttonStyle} disabled={sending} onClick={() => { void send({ kind: 'key', key: 'Enter' }); }}>回车</button>
      <button type="button" style={buttonStyle} disabled={sending} onClick={() => { void send({ kind: 'key', key: 'Backspace' }); }}>删除</button>
    </form> : null}
    {frame?.error && frame?.image ? <footer style={{ padding: '8px 14px', color: 'var(--dsw-alias-state-error-primary)' }}>{frame.error}</footer> : null}
  </section>;
}
