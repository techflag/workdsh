import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { Icon, Modal, modalCss } from 'workdsh-ui';
import type { ConnectorSummary } from '../shared.js';
import type { ConnectorManagementClient } from './management.js';

const labels = { ready: '已连接', discovering: '连接中', offline: '连接异常', disabled: '未连接' } as const;
const css = `${modalCss}
.wd-connector-picker{position:relative;display:flex;align-items:center}.wd-connector-trigger{display:flex;align-items:center;gap:7px;max-width:190px;height:36px;padding:0 9px;border:0;border-radius:10px;background:transparent;color:var(--dsw-alias-label-secondary,#aaa);font-size:13px;cursor:pointer}.wd-connector-trigger:hover,.wd-connector-trigger[aria-expanded="true"]{background:var(--dsw-alias-bg-layer-3,#363636);color:var(--dsw-alias-label-primary,#eee)}.wd-connector-trigger .trigger-icon{display:grid;place-items:center;width:22px;height:22px;flex:none;border-radius:7px;background:var(--dsw-alias-bg-layer-3,#303030);color:var(--dsw-alias-label-secondary,#d8d8d8)}.wd-connector-trigger .trigger-icon.connected{background:linear-gradient(145deg,#146c7c,#11b7c8);color:white;font-weight:700}.wd-connector-trigger .trigger-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}.wd-connector-trigger .trigger-count{color:var(--dsw-alias-label-caption,#8f8f8f);font-size:11px}
.wd-connector-popover{position:absolute;z-index:90;left:0;bottom:calc(100% + 10px);width:336px;max-height:min(430px,60vh);overflow:auto;padding:8px;border:0;border-radius:15px;background:var(--dsw-alias-bg-layer-2,#242424);color:var(--dsw-alias-label-primary,#ededed);box-shadow:var(--dsw-elevation-prominent,0 18px 52px #000a);font:14px/20px "PingFang SC","Microsoft YaHei",sans-serif}.wd-connector-popover *{box-sizing:border-box}.wd-connector-popover .picker-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;width:100%;min-height:54px;padding:5px;border-radius:10px}.wd-connector-popover .picker-row:hover{background:var(--dsw-alias-interactive-bg-hover-solid,#303030)}.wd-connector-popover .picker-main{display:grid;grid-template-columns:38px minmax(0,1fr);align-items:center;gap:10px;min-width:0;padding:3px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.wd-connector-popover .picker-mark,.connector-picker-detail .picker-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:linear-gradient(145deg,#146c7c,#11b7c8);color:#fff;font-weight:700;text-transform:uppercase}.wd-connector-popover .picker-copy{min-width:0}.wd-connector-popover .picker-copy strong,.wd-connector-popover .picker-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wd-connector-popover .picker-copy strong{font-size:14px;font-weight:600}.wd-connector-popover .picker-copy small{margin-top:2px;color:var(--dsw-alias-label-caption,#929292);font-size:11px}.wd-connector-popover .picker-action{min-width:52px;padding:6px 8px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#aaa);cursor:pointer}.wd-connector-popover .picker-action:hover{background:var(--dsw-alias-interactive-bg-hover-solid,#414141);color:var(--dsw-alias-label-primary,#fff)}.wd-connector-popover .picker-action.ready{color:var(--dsw-alias-state-success-primary,#67d276)}.wd-connector-popover .picker-action.offline{color:var(--dsw-alias-state-error-primary,#ff8f89)}.wd-connector-popover .picker-action.discovering{color:var(--dsw-alias-state-warn-primary,#eab755)}.wd-connector-popover .picker-empty{padding:28px 12px;text-align:center;color:var(--dsw-alias-label-caption,#999)}.wd-connector-popover .manage{display:flex;align-items:center;gap:8px;width:100%;margin-top:6px;padding:10px 9px 5px;border:0;border-top:.5px solid var(--dsw-alias-border-l1,#3a3a3a);background:transparent;color:var(--dsw-alias-label-secondary,#ccc);text-align:left;cursor:pointer}.wd-connector-popover .manage:hover{color:var(--dsw-alias-label-primary,#fff)}
.wd-dialog.connector-picker-detail{width:min(620px,calc(100vw - 48px));padding:26px}.connector-picker-detail .picker-detail-hero{display:grid;grid-template-columns:52px minmax(0,1fr);gap:15px;align-items:center;padding-right:44px}.connector-picker-detail .picker-mark{width:52px;height:52px;border-radius:14px;font-size:21px}.connector-picker-detail h2{margin:0 0 3px;font-size:21px}.connector-picker-detail .detail-state{color:var(--dsw-alias-label-caption,#999);font-size:12px}.connector-picker-detail .detail-description{margin:20px 0;color:var(--dsw-alias-label-secondary,#ccc);line-height:1.7}.connector-picker-detail .detail-tools{max-height:210px;overflow:auto;padding:15px;border:.5px solid var(--dsw-alias-border-l2,#383838);border-radius:11px;background:var(--dsw-alias-bg-layer-1,#191919)}.connector-picker-detail .detail-tools strong{display:block;margin-bottom:8px}.connector-picker-detail code{display:block;margin:5px 0;overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-primary-bluish,#a8c9ff);font:12px/18px ui-monospace,SFMono-Regular,Menlo,monospace}.connector-picker-detail .detail-error{margin:12px 0 0;color:var(--dsw-alias-state-error-primary,#ffaaa5);font-size:12px}.connector-picker-detail .detail-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.connector-picker-detail .detail-actions button{min-height:38px;padding:7px 14px;border:.5px solid var(--dsw-alias-border-l3,#414141);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#292929);color:var(--dsw-alias-label-primary,#eee);cursor:pointer}.connector-picker-detail .detail-actions .primary{background:var(--dsw-alias-button-primary-fill,#eee);border-color:var(--dsw-alias-button-primary-fill,#eee);color:var(--dsw-alias-label-primary-inverted,#171717);font-weight:600}
@media(max-width:560px){.wd-connector-popover{position:fixed;left:12px;right:12px;bottom:86px;width:auto}.wd-connector-trigger .trigger-name{display:none}}
`;

type Props = PropsRuntime<'conversation.input.left'> & { management: ConnectorManagementClient; openManagement: () => void };

export function ConnectorPicker({ management, openManagement, sessionId, useSession }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const initializedBlankSession = useRef<string | undefined>(undefined);
  const blankSession = useSession(snapshot => snapshot.blank);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<readonly ConnectorSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [detail, setDetail] = useState<ConnectorSummary>();
  const [changing, setChanging] = useState<string>();
  const refresh = useCallback(async () => {
    const [nextRows, nextSelection] = await Promise.all([
      management.list().catch(() => []),
      management.selection(String(sessionId)).catch(() => []),
    ]);
    setRows(nextRows); setSelectedIds(nextSelection);
  }, [management, sessionId]);
  useEffect(() => {
    const initialize = async () => {
      if (blankSession && initializedBlankSession.current !== String(sessionId)) {
        initializedBlankSession.current = String(sessionId);
        setSelectedIds([]);
        await management.setSelection(String(sessionId), []).catch(() => []);
      }
      await refresh();
    };
    void initialize();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 5_000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [blankSession, management, refresh, sessionId]);
  useEffect(() => { if (open) void refresh(); }, [open, refresh]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const selected = rows.filter(row => selectedIds.includes(row.id));
  const primary = selected[0];
  const changeSelection = async (row: ConnectorSummary) => {
    if (row.state !== 'ready') { setDetail(row); setOpen(false); return; }
    setChanging(row.id);
    try {
      const next = selectedIds.includes(row.id) ? selectedIds.filter(id => id !== row.id) : [...selectedIds, row.id];
      setSelectedIds(await management.setSelection(String(sessionId), next));
    } finally { setChanging(undefined); }
  };

  return <>
    <style>{css}</style>
    <div className="wd-connector-picker" ref={root}>
      <button className="wd-connector-trigger" type="button" aria-label={primary ? `连接器：${primary.title}` : '连接器'} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <span className={`trigger-icon${primary ? ' connected' : ''}`}>{primary ? primary.title.charAt(0).toUpperCase() : <Icon name="connectors" />}</span>
        {primary ? <span className="trigger-name">{primary.title}</span> : null}
        {selected.length > 1 ? <span className="trigger-count">+{selected.length - 1}</span> : null}
      </button>
      {open ? <div className="wd-connector-popover" role="menu" aria-label="连接器">
        {rows.map(row => <div key={row.id} className="picker-row" role="none">
          <button className="picker-main" type="button" role="menuitem" onClick={() => { setDetail(row); setOpen(false); }}>
            <span className="picker-mark">{row.title.charAt(0).toUpperCase()}</span>
            <span className="picker-copy"><strong>{row.title}</strong><small>{row.description || row.serverName}</small></span>
          </button>
          <button className={`picker-action ${selectedIds.includes(row.id) ? 'ready' : row.state}`} type="button" disabled={changing === row.id || row.state === 'discovering'} aria-pressed={selectedIds.includes(row.id)} aria-label={`${selectedIds.includes(row.id) ? '从本次对话移除' : '用于本次对话'} ${row.title}`} onClick={() => void changeSelection(row)}>{changing === row.id ? '处理中' : selectedIds.includes(row.id) ? '已选' : row.state === 'ready' ? '使用' : labels[row.state]}</button>
        </div>)}
        {!rows.length ? <div className="picker-empty">尚未添加连接器</div> : null}
        <button className="manage" type="button" onClick={() => { setOpen(false); openManagement(); }}><span aria-hidden="true">↗</span> 管理连接器</button>
      </div> : null}
    </div>
    <Modal open={Boolean(detail)} label="连接器详情" className="connector-picker-detail" onClose={() => setDetail(undefined)}>{detail ? <>
      <div className="picker-detail-hero"><span className="picker-mark">{detail.title.charAt(0).toUpperCase()}</span><div><h2>{detail.title}</h2><span className="detail-state">{labels[detail.state]} · {detail.transport} · {detail.serverName}</span></div></div>
      <p className="detail-description">{detail.description || 'MCP 服务'}</p>
      <div className="detail-tools"><strong>可用能力</strong>{detail.toolNames.length ? detail.toolNames.map(name => <code key={name}>{name}</code>) : <span>连接成功后显示 MCP 工具。</span>}</div>
      {detail.diagnostic ? <p className="detail-error">{detail.diagnostic}</p> : null}
      <div className="detail-actions">{detail.state === 'ready' ? <button type="button" onClick={() => { void changeSelection(detail).then(() => setDetail(undefined)); }}>{selectedIds.includes(detail.id) ? '从本次对话移除' : '用于本次对话'}</button> : null}<button type="button" className="primary" onClick={() => { setDetail(undefined); openManagement(); }}>管理连接器</button></div>
    </> : null}</Modal>
  </>;
}
