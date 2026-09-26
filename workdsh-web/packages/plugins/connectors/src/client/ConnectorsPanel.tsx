import { Button, Input, Select, Textarea } from 'workdsh-ui';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { Icon, Modal } from 'workdsh-ui';
import type { ConnectorConfigView, ConnectorInput, ConnectorSummary } from '../shared.js';
import type { ConnectorManagementClient } from './management.js';
import { connectorCss } from './styles.js';

type Injected = { toggleNavigation: () => void; management: ConnectorManagementClient; openCapability: (key: string) => void; hasCapability: (key: string) => boolean };
type Props = PropsRuntime<'main'> & InjectFace<Injected>;
type Draft = { id?: string; title: string; description: string; serverName: string; transport: 'stdio' | 'streamable-http'; command: string; argsText: string; url: string; authorizationToken: string; authorizationConfigured: boolean };
const blank = (): Draft => ({ title: '', description: '', serverName: '', transport: 'stdio', command: '', argsText: '', url: '', authorizationToken: '', authorizationConfigured: false });
const labels = { ready: '已连接', discovering: '正在连接', offline: '连接异常', disabled: '已停用' } as const;
const fromConfig = (row: ConnectorConfigView): Draft => ({ id: row.id, title: row.title, description: row.description, serverName: row.serverName, transport: row.transport, command: row.command ?? '', argsText: (row.args ?? []).join('\n'), url: row.url ?? '', authorizationToken: '', authorizationConfigured: row.authorizationConfigured });

export function ConnectorsPanel({ toggleNavigation, management, openCapability, hasCapability }: Props) {
  const [rows, setRows] = useState<readonly ConnectorSummary[]>([]); const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(true); const [error, setError] = useState(''); const [expanded, setExpanded] = useState<string>();
  const [draft, setDraft] = useState<Draft>(); const [removeTarget, setRemoveTarget] = useState<ConnectorSummary>();
  const refresh = useCallback(async () => { setBusy(true); setError(''); try { setRows(await management.list()); } catch (cause) { setError(cause instanceof Error ? cause.message : '读取连接器失败。'); } finally { setBusy(false); } }, [management]);
  useEffect(() => { void refresh(); }, [refresh]);
  const toggle = async (row: ConnectorSummary, enabled: boolean) => { setBusy(true); setError(''); try { await management.setEnabled(row.id, enabled); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : '连接器启停失败。'); setBusy(false); } };
  const edit = async (id: string) => { setError(''); try { setDraft(fromConfig(await management.config(id))); } catch (cause) { setError(cause instanceof Error ? cause.message : '无法读取 MCP 配置。'); } };
  const save = async () => {
    if (!draft) return; setBusy(true); setError('');
    const input: ConnectorInput = { title: draft.title, description: draft.description, serverName: draft.serverName, transport: draft.transport,
      ...(draft.transport === 'stdio' ? { command: draft.command, args: draft.argsText.split('\n').map(value => value.trim()).filter(Boolean) } : { url: draft.url, ...(draft.authorizationToken.trim() ? { authorizationToken: draft.authorizationToken } : {}) }) };
    try { if (draft.id) await management.update(draft.id, input); else await management.create(input); setDraft(undefined); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '保存连接器失败。'); setBusy(false); }
  };
  const remove = async () => { if (!removeTarget) return; setBusy(true); setError(''); try { await management.remove(removeTarget.id); setRemoveTarget(undefined); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : '删除连接器失败。'); setBusy(false); } };
  const normalized = query.trim().toLowerCase(); const filtered = rows.filter(row => `${row.title} ${row.description} ${row.serverName} ${row.toolNames.join(' ')}`.toLowerCase().includes(normalized));
  const detail = rows.find(row => row.id === expanded);
  const capabilityTabs = [['experts', '专家'], ['skills', '技能'], ['connectors', '连接器']] as const;
  const capabilityKey: Record<string, string> = { experts: 'workdsh-experts', skills: 'workdsh-skills', connectors: 'workdsh-connectors' };
  return <section className="wd-connectors" data-testid="workdsh-connectors"><style>{connectorCss}</style>
    <header className="cap-header"><button className="nav-toggle" onClick={toggleNavigation} aria-label="切换导航">导航</button>
      {capabilityTabs.map(([key, label]) => { const active = key === 'connectors'; const target = capabilityKey[key]; const enabled = active || Boolean(target && hasCapability(target)); return <button key={key} className={`cap-tab ${active ? 'active' : ''}`} disabled={!enabled} aria-current={active ? 'page' : undefined} onClick={() => { if (!active && target) openCapability(target); }}><Icon name={key} />{label}</button>; })}
      <Input className="search" aria-label="搜索 MCP" placeholder="搜索 MCP" value={query} onChange={event => setQuery(event.currentTarget.value)} />
    </header>
    <div className="connector-head"><span className="title-icon"><Icon name="connectors" /></span><div><h1>MCP 服务管理</h1><p>每个连接器都是独立 MCP 实例，由 DSH 官方客户端建立连接</p></div>
      <div className="head-actions"><Button className="secondary" onClick={() => void refresh()} disabled={busy}>刷新状态</Button><Button variant="primary" className="primary" onClick={() => setDraft(blank())}>＋ 添加 MCP</Button></div></div>
    <div className="list-meta"><strong>我的 MCP <span className="count">{rows.length}</span></strong><span className="muted">{rows.filter(row => row.enabled && row.state === 'ready').length} 已连接</span></div>
    {error ? <p className="error" role="alert">{error}</p> : null}
    {!busy && !filtered.length ? <div className="empty">{rows.length ? '没有匹配的 MCP 服务。' : '尚未配置 MCP 服务，点击“添加 MCP”创建第一个连接。'}</div> : null}
    {filtered.length ? <div className="connector-grid">{filtered.map(row => <article key={row.id} className={`connector-card ${!row.enabled ? 'disabled' : ''}`}>
      <div className="card-top"><button className="card-open" aria-label={`查看连接器 ${row.title}`} onClick={() => setExpanded(row.id)}><span className="connector-mark" aria-hidden>{row.title.charAt(0).toUpperCase()}</span><span className="card-title"><strong title={row.title}>{row.title}</strong><small>{row.transport} · {row.serverName}</small></span></button><button className="switch" role="switch" aria-label={`${row.enabled ? '停用' : '启用'} ${row.title}`} aria-checked={row.enabled} disabled={busy} onClick={() => void toggle(row, !row.enabled)} /></div>
      <button className="card-body" onClick={() => setExpanded(row.id)}>{row.description || 'MCP 服务'}</button><div className="card-foot"><span className="status-line"><i className={`status-dot ${row.state}`} />{labels[row.state]}</span><span>{row.toolNames.length} 个工具</span></div>
    </article>)}</div> : null}
    <Modal open={Boolean(detail)} label="MCP 详情" className="connector-detail-dialog" onClose={() => setExpanded(undefined)}>{detail ? <><div className="detail-hero"><span className="connector-mark" aria-hidden>{detail.title.charAt(0).toUpperCase()}</span><div className="detail-title"><h1>{detail.title}</h1><span className="status-line"><i className={`status-dot ${detail.state}`} />{labels[detail.state]} · {detail.transport} · {detail.serverName}</span></div><div className="detail-actions"><Button variant="primary" className="primary" onClick={() => { setExpanded(undefined); void edit(detail.id); }}>编辑</Button><button className="switch" role="switch" aria-label={`${detail.enabled ? '停用' : '启用'} ${detail.title}`} aria-checked={detail.enabled} disabled={busy} onClick={() => void toggle(detail, !detail.enabled)} /></div></div><p className="detail-summary">{detail.description}</p><div className="connector-detail"><div className="metric"><small>真实状态</small><strong>{labels[detail.state]}</strong></div><div className="metric"><small>MCP 工具</small><strong>{detail.toolNames.length}</strong></div><div className="metric"><small>资源</small><strong>{detail.resourceCount}</strong></div><div className="metric"><small>URI 模板</small><strong>{detail.resourceTemplateCount}</strong></div><div className="tool-list">会话可调用：{detail.toolNames.length ? detail.toolNames.map(name => <React.Fragment key={name}><code>{name}</code>{' '}</React.Fragment>) : '停用后工具已从官方目录移除'}{detail.diagnostic ? <div className="error">{detail.diagnostic}</div> : null}</div></div><Button variant="ghost" size="sm" tone="danger" className="danger-link" onClick={() => { setExpanded(undefined); setRemoveTarget(detail); }}>删除此 MCP</Button></> : null}</Modal>
    <Modal open={Boolean(draft)} label={draft?.id ? '编辑 MCP' : '添加 MCP'} className="connector-config-dialog" onClose={() => setDraft(undefined)}>
      <h1>{draft?.id ? '编辑 MCP' : '添加 MCP'}</h1><p>{draft?.id ? '只修改当前连接实例；保存后会重新连接。' : '可以继续添加多个 MCP 服务，每个服务使用独立命名空间。'}</p>
      {draft ? <div className="connector-form"><label>显示名称<Input value={draft.title} onChange={e => setDraft({ ...draft, title: e.currentTarget.value })} /></label><label>服务标识<Input value={draft.serverName} placeholder="例如 github" onChange={e => setDraft({ ...draft, serverName: e.currentTarget.value })} /></label>
        <label className="wide">说明<Input value={draft.description} onChange={e => setDraft({ ...draft, description: e.currentTarget.value })} /></label><label>传输方式<Select value={draft.transport} onChange={e => setDraft({ ...draft, transport: e.currentTarget.value as Draft['transport'] })}><option value="stdio">stdio 本地进程</option><option value="streamable-http">Streamable HTTP</option></Select></label>
        {draft.transport === 'stdio' ? <><label className="wide">启动命令<Input value={draft.command} placeholder="node / python3 / npx" onChange={e => setDraft({ ...draft, command: e.currentTarget.value })} /></label><label className="wide">参数（每行一个）<Textarea value={draft.argsText} onChange={e => setDraft({ ...draft, argsText: e.currentTarget.value })} /></label></> : <><label className="wide">MCP URL<Input value={draft.url} placeholder="https://example.com/mcp" onChange={e => setDraft({ ...draft, url: e.currentTarget.value })} /></label><label className="wide">访问令牌<Input type="password" autoComplete="new-password" value={draft.authorizationToken} placeholder={draft.authorizationConfigured ? '已安全保存；留空表示保持不变' : '需要 Authorization 的服务在此填写'} onChange={e => setDraft({ ...draft, authorizationToken: e.currentTarget.value })} /></label></>}
        <div className="form-note wide">访问令牌写入 DSH 官方凭据服务；连接器只保存引用，列表、详情和诊断不会返回令牌。</div><div className="form-actions wide"><Button className="secondary" onClick={() => setDraft(undefined)}>取消</Button><Button variant="primary" className="primary" disabled={busy || !draft.title.trim() || !draft.serverName.trim()} onClick={() => void save()}>保存并连接</Button></div></div> : null}
    </Modal>
    <Modal open={Boolean(removeTarget)} label="删除 MCP" className="connector-config-dialog small" onClose={() => setRemoveTarget(undefined)}><h1>删除“{removeTarget?.title}”?</h1><p>删除后会立即断开该服务，并从 AI 工具目录移除它的工具和资源。</p><div className="form-actions"><Button className="secondary" onClick={() => setRemoveTarget(undefined)}>取消</Button><Button tone="danger" className="danger-button" onClick={() => void remove()}>删除</Button></div></Modal>
  </section>;
}
