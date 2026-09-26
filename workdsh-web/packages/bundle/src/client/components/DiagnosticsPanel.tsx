import * as React from 'react';
import { useEffect, useState } from 'react';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { diagnosticsCss } from '../styles/diagnostics.js';

export type Inventory = {
  readonly total: number;
  readonly modules: readonly { readonly module: string; readonly phase: string | null }[];
};

type DiagnosticsPanelProps = PropsRuntime<'main'> & InjectFace<{
  readonly inspect: () => Promise<Inventory>;
  readonly returnToConversation: () => void;
}>;

/** Development-only diagnostic view. It does not own business or Session data. */
export function DiagnosticsPanel({ inspect, returnToConversation }: DiagnosticsPanelProps) {
  const [state, setState] = useState<{ result?: Inventory; error?: string; busy: boolean }>({ busy: false });
  const [request, setRequest] = useState(0);
  useEffect(() => {
    if (!request) return;
    let current = true;
    setState({ busy: true });
    inspect().then(
      result => { if (current) setState({ busy: false, result }); },
      (error: unknown) => {
        console.error('[workdsh:diagnostics] Remote failed', error instanceof Error ? error.message : 'unknown');
        if (current) setState({ busy: false, error: '读取失败，请检查 Host 连接后重试。' });
      },
    );
    return () => { current = false; };
  }, [inspect, request]);

  return (
    <section className="wd-diagnostics" data-testid="workdsh-probe">
      <style>{diagnosticsCss}</style>
      <p className="wd-diagnostics-eyebrow">WORKDSH / DIAGNOSTICS</p>
      <h1>接入验证</h1>
      <button type="button" onClick={returnToConversation}>返回 Harness 会话</button>
      <p>此开发页面验证官方 Client 插件与 Host 的通信，不属于普通产品导航。</p>
      <div className="wd-diagnostics-inventory">
        <h2>Host 插件清单</h2>
        <p>通过官方 Remote 读取当前实例的真实加载状态。</p>
        <button type="button" disabled={state.busy} onClick={() => setRequest(value => value + 1)}>
          {state.busy ? '正在读取…' : '读取 Host 状态'}
        </button>
        <div role="status" aria-live="polite">
          {state.error ?? (state.result ? `Remote 已返回 · 共 ${state.result.total} 个 Host 条目` : '尚未发起查询')}
        </div>
        {state.result && <ul>{state.result.modules.map(row => <li key={row.module}>{row.module} · {row.phase ?? '未激活'}</li>)}</ul>}
      </div>
    </section>
  );
}
