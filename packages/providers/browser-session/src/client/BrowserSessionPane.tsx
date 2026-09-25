import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type {} from '@deepseek-ai/dsh-client-ui-session/client';
import type { BrowserFrame } from '../index.js';
import { browserSessionClient as api } from './api.js';

type Props = PropsRuntime<'sidebar.right.pane.tab'>;

/** A session-bound visual controller; every image and input targets the Agent's page. */
export function BrowserSessionPane({ sessionId, useTabInfo }: Props) {
  const info = useTabInfo();
  const [frame, setFrame] = useState<BrowserFrame>();
  const [address, setAddress] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const session = String(sessionId);

  useEffect(() => {
    if (!info.tab.visible) return;
    const controller = new AbortController();
    let timer: number | undefined;
    const poll = async () => {
      if (!busyRef.current) {
        try {
          const next = await api.capture(session, controller.signal);
          if (!controller.signal.aborted) { setFrame(next); setAddress(next.url); setError(''); }
        } catch (cause) {
          if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '浏览器画面不可用。');
        }
      }
      if (!controller.signal.aborted) timer = window.setTimeout(() => void poll(), 1_200);
    };
    void poll();
    return () => { controller.abort(); if (timer !== undefined) window.clearTimeout(timer); };
  }, [session, info.tab.visible]);

  const run = async (operation: () => Promise<BrowserFrame>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const next = await operation();
      setFrame(next); setAddress(next.url); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '浏览器操作失败。'); }
    finally { busyRef.current = false; setBusy(false); }
  };

  const click = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!frame) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const x = Math.max(0, Math.min(frame.width - 1, (event.clientX - bounds.left) * frame.width / bounds.width));
    const y = Math.max(0, Math.min(frame.height - 1, (event.clientY - bounds.top) * frame.height / bounds.height));
    void run(() => api.click(session, x, y)).then(() => imageRef.current?.focus());
  };
  const keyDown = (event: React.KeyboardEvent<HTMLImageElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return;
    if (event.key.length === 1) {
      event.preventDefault();
      void run(() => api.type(session, event.key));
    } else if (['Enter', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      void run(() => api.press(session, event.key));
    }
  };

  return <section className="wd-browser-session" aria-label="任务浏览器">
    <form className="wd-browser-session-toolbar" onSubmit={event => { event.preventDefault(); void run(() => api.navigate(session, address)); }}>
      <input aria-label="网页地址" value={address} onChange={event => setAddress(event.target.value)} placeholder="https://" />
      <button type="submit" disabled={busy || !/^https?:\/\//iu.test(address)}>前往</button>
      <button type="button" disabled={busy} onClick={() => void run(() => api.capture(session))}>刷新画面</button>
    </form>
    {error && <p className="wd-browser-session-error" role="status">{error}</p>}
    <div className="wd-browser-session-viewport">
      {frame
        ? <img ref={imageRef} src={`data:image/jpeg;base64,${frame.jpegBase64}`} alt={frame.title || '浏览器页面'} draggable={false} tabIndex={0} onClick={click} onKeyDown={keyDown} onWheel={event => { if (!busyRef.current) void run(() => api.scroll(session, event.deltaX, event.deltaY)); }} />
        : <p className="wd-browser-session-empty">正在连接当前任务的浏览器…</p>}
    </div>
    <form className="wd-browser-session-input" onSubmit={event => { event.preventDefault(); if (!text) return; void run(() => api.type(session, text)).then(() => setText('')); }}>
      <input aria-label="向网页输入文字" value={text} onChange={event => setText(event.target.value)} placeholder="点击网页输入框后，在此输入文字" />
      <button type="submit" disabled={busy || !text}>输入</button>
    </form>
    <p className="wd-browser-session-hint">画面与此任务的浏览器同步；点击画面可操作，聚焦后可使用键盘。</p>
  </section>;
}
