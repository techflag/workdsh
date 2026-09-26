import { Button, Input } from 'workdsh-ui';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// The `main` slot PropsRuntime is augmented by the official layout client module;
// without this side-effect type import the slot name resolves to `never`.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { Icon, Modal, type IconName } from 'workdsh-ui';
import type { ExpertAvailability, ExpertSummary } from '../shared.js';
import type { ExpertManagementClient } from './management.js';
import { ExpertDetailModal } from './ExpertDetailModal.js';
import { expertDraftId } from '../domain/navigation.js';
import { ExpertDraftEditor } from './ExpertDraftEditor.js';
import { ImportExpertModal } from './ImportExportModals.js';
import { expertsCss } from './styles.js';

type ExpertsPanelInjected = {
  toggleNavigation: () => void;
  management: ExpertManagementClient;
  /** Switch the shared capability center to another registered panel (e.g. Skill). */
  openCapability: (key: string) => void;
  hasCapability: (key: string) => boolean;
  /** Summon a published expert into a fresh bound native Session; never auto-sends. */
  summon: (expertId: string, revisionId: string | undefined, draftText: string | undefined) => Promise<void>;
  /** Open a new native task seeded with the `/workdsh-expert-manager` guide draft. */
  createExpertTask: (kind?: 'agent' | 'team') => Promise<void>;
  editExpertTask: (expertId: string) => Promise<void>;
};
export type ExpertsPanelProps = PropsRuntime<'main'> & InjectFace<ExpertsPanelInjected>;

type View = 'center' | 'mine';
type OriginFilter = 'all' | 'default' | 'personal';
type StateFilter = 'all' | 'draft' | 'published' | 'disabled' | 'archived';
type Notice = { kind: 'info' | 'warn' | 'error'; text: string };

function messageOf(cause: unknown): string { return cause instanceof Error ? cause.message : '专家操作失败，请重试。'; }
function codeOf(cause: unknown): string { const code = (cause as unknown as { code?: unknown })?.code; return typeof code === 'string' ? code : ''; }
function icon(name: string) { return <Icon name={name as IconName} />; }

const ORIGIN_LABEL: Record<string, string> = { default: '默认模板', personal: '我的专家', organization: '组织' };
const AVAILABILITY_LABEL: Record<ExpertAvailability, string> = { enabled: '已启用', disabled: '已停用', archived: '已归档' };
const READINESS: Record<string, { label: string; cls: string }> = {
  ready: { label: '可用', cls: 'ready' },
  'missing-dependency': { label: '依赖缺失', cls: 'bad' },
  'unsupported-capability': { label: '能力未满足', cls: 'warn' },
  broken: { label: 'preset 异常', cls: 'bad' },
  unknown: { label: '未发布', cls: '' },
};

function Avatar({ summary }: { summary: ExpertSummary }) {
  return <span className="avatar" aria-hidden>{summary.avatarRef?.startsWith('data:image/') ? <img src={summary.avatarRef} alt="" /> : summary.name.trim().charAt(0) || '专'}</span>;
}

export function ExpertsPanel({ toggleNavigation, management, openCapability, hasCapability, summon, createExpertTask, editExpertTask }: ExpertsPanelProps) {
  const [view, setView] = useState<View>(() => expertDraftId(window.location.search) || new URLSearchParams(window.location.search).get('expert-library') === 'mine' ? 'mine' : 'center');
  const [kind, setKind] = useState<'agent' | 'team'>(() => new URLSearchParams(window.location.search).get('expert-kind') === 'team' ? 'team' : 'agent');
  const [typeCounts, setTypeCounts] = useState({ agent: 0, team: 0 });
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const [items, setItems] = useState<readonly ExpertSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [busy, setBusy] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<Notice | undefined>();
  const [mineCount, setMineCount] = useState(0);
  const [detailId, setDetailId] = useState<string>();
  const [editorId, setEditorId] = useState<string | undefined>(() => expertDraftId(window.location.search));
  const [importOpen, setImportOpen] = useState(false);
  const [actionMenu, setActionMenu] = useState<string>();
  const [acting, setActing] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const loadSequence = useRef(0);
  const kindLabel = kind === 'team' ? '专家团' : '专家';

  useEffect(() => {
    const url = new URL(window.location.href);
    if (view === 'mine') { url.searchParams.set('expert-library', 'mine'); url.searchParams.set('expert-kind', kind); }
    else { url.searchParams.delete('expert-library'); url.searchParams.set('expert-kind', kind); }
    window.history.replaceState(window.history.state, '', url);
  }, [view, kind]);

  useEffect(() => { const timer = window.setTimeout(() => setDebounced(query.trim()), 300); return () => window.clearTimeout(timer); }, [query]);

  const buildQuery = useCallback(() => {
    const search_ = debounced || undefined;
    if (view === 'center') {
      return { expertType: kind, ...(search_ ? { search: search_ } : {}), ...(originFilter === 'all' ? {} : { origin: originFilter as 'default' | 'personal' }), availability: 'enabled' as const, limit: 100 };
    }
    const availability = stateFilter === 'disabled' || stateFilter === 'archived' || stateFilter === 'published'
      ? (stateFilter === 'published' ? 'enabled' : stateFilter) as ExpertAvailability : undefined;
    return { expertType: kind, ...(search_ ? { search: search_ } : {}), origin: 'personal' as const, ...(availability ? { availability } : {}), limit: 100 };
  }, [view, kind, debounced, originFilter, stateFilter]);

  const load = useCallback(async (cursor?: string) => {
    const sequence = ++loadSequence.current;
    const appending = cursor !== undefined;
    if (appending) setLoadingMore(true); else { setBusy(true); setNotice(undefined); }
    setError('');
    try {
      const base = buildQuery();
      const result = await management.list(cursor ? { ...base, cursor } : base);
      if (sequence !== loadSequence.current) return;
      setItems(prev => (appending ? [...prev, ...result.items] : result.items));
      setTotal(result.total);
      setNextCursor(result.nextCursor);
    } catch (cause) {
      if (sequence !== loadSequence.current) return;
      if (codeOf(cause) === 'experts/cursor-stale') {
        setNotice({ kind: 'warn', text: '目录已变化，分页游标失效，已为你重新加载第一页。' });
        setItems([]); setNextCursor(undefined);
        try { const fresh = await management.list(buildQuery()); setItems(fresh.items); setTotal(fresh.total); setNextCursor(fresh.nextCursor); } catch { /* surfaced below */ }
      } else setError(messageOf(cause));
    } finally { if (sequence === loadSequence.current) { setBusy(false); setLoadingMore(false); } }
  }, [buildQuery, management]);

  const loadMineCount = useCallback(async () => {
    try { const [agent, team] = await Promise.all([management.list({ origin: 'personal', expertType: 'agent', limit: 1 }), management.list({ origin: 'personal', expertType: 'team', limit: 1 })]); setTypeCounts({ agent: agent.total, team: team.total }); setMineCount(agent.total + team.total); } catch { /* non-fatal badge */ }
  }, [management]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadMineCount(); }, [loadMineCount, items]);
  useEffect(() => {
    const revalidate = () => { if (document.visibilityState === 'visible') { void load(); void loadMineCount(); } };
    window.addEventListener('focus', revalidate); document.addEventListener('visibilitychange', revalidate);
    return () => { window.removeEventListener('focus', revalidate); document.removeEventListener('visibilitychange', revalidate); };
  }, [load, loadMineCount]);
  useEffect(() => {
    if (!actionMenu) return;
    const outside = (event: PointerEvent) => { if (!(event.target instanceof Element) || !event.target.closest('.card-actions')) setActionMenu(undefined); };
    document.addEventListener('pointerdown', outside); return () => document.removeEventListener('pointerdown', outside);
  }, [actionMenu]);

  const visible = useMemo(() => {
    if (view === 'center') return items.filter(item => item.publishedRevisionRef !== undefined);
    if (stateFilter === 'draft') return items.filter(item => item.publishedRevisionRef === undefined);
    if (stateFilter === 'published') return items.filter(item => item.publishedRevisionRef !== undefined);
    return items;
  }, [items, view, stateFilter]);

  const refresh = useCallback(() => { void load(); void loadMineCount(); }, [load, loadMineCount]);
  const closeEditor = () => {
    setEditorId(undefined);
    const url = new URL(window.location.href);
    url.searchParams.delete('expert-draft');
    window.history.replaceState(window.history.state, '', url);
  };

  const runSummon = async (expertId: string, revisionId: string | undefined, draftText: string | undefined) => {
    setActing(true); setError('');
    try { await summon(expertId, revisionId, draftText); setDetailId(undefined); }
    catch (cause) { setError(messageOf(cause)); }
    finally { setActing(false); }
  };
  const createExpert = async (type: 'agent' | 'team' = kind) => {
    setActing(true); setError('');
    try { await createExpertTask(type); } catch (cause) { setError(messageOf(cause)); } finally { setActing(false); }
  };
  const setPreference = async (summary: ExpertSummary, pinned: boolean) => {
    setActionMenu(undefined);
    try { await management.setPreference(summary.id, pinned); refresh(); } catch (cause) { setError(messageOf(cause)); }
  };
  const copyToMine = async (summary: ExpertSummary) => {
    setActionMenu(undefined); setActing(true); setError('');
    try {
      const draft = await management.copy(summary.id, summary.publishedRevisionRef?.revisionId, management.newOperationId('copy'));
      refresh(); setEditorId(draft.expertId);
    } catch (cause) { setError(messageOf(cause)); } finally { setActing(false); }
  };
  const setAvailability = async (summary: ExpertSummary, availability: ExpertAvailability) => {
    setActionMenu(undefined); setActing(true); setError('');
    try { await management.setAvailability(summary.id, availability, management.newOperationId('availability')); refresh(); if (detailId === summary.id) setDetailId(undefined); }
    catch (cause) { setError(messageOf(cause)); } finally { setActing(false); }
  };
  const exportExpert = async (summary: ExpertSummary) => {
    setActionMenu(undefined); setActing(true); setError('');
    try { const result = await management.downloadExport(summary.id, summary.publishedRevisionRef?.revisionId); setNotice({ kind: 'info', text: `已导出「${result.fileName}」（${result.bytes} 字节，摘要 ${result.digest.slice(0, 12)}…）。` }); }
    catch (cause) { setError(messageOf(cause)); } finally { setActing(false); }
  };

  const capabilityTabs = [['experts', '专家'], ['skills', '技能'], ['connectors', '连接器']] as const;
  const capabilityKey: Record<string, string> = { experts: 'workdsh-experts', skills: 'workdsh-skills', connectors: 'workdsh-connectors' };
  const isDraft = (summary: ExpertSummary) => summary.publishedRevisionRef === undefined;
  const stateLabel = (summary: ExpertSummary) => isDraft(summary) ? '草稿' : AVAILABILITY_LABEL[summary.availability];

  const editInConversation = async (id: string) => {
    setActing(true); setActionMenu(undefined);
    try { await editExpertTask(id); setDetailId(undefined); }
    catch (cause) { setError(messageOf(cause)); }
    finally { setActing(false); }
  };

  return <section className="wd-experts" data-testid="workdsh-experts">
    <style>{expertsCss}</style>
    <header className="cap-header">
      <button className="nav-toggle" onClick={toggleNavigation} aria-label="切换导航">导航</button>
      {capabilityTabs.map(([key, label]) => {
        const active = key === 'experts';
        const target = capabilityKey[key];
        const enabled = active || (target !== undefined && hasCapability(target));
        return <button key={key} className={`cap-tab ${active ? 'active' : ''}`} disabled={!enabled}
          aria-current={active ? 'page' : undefined}
          onClick={() => { if (!active && target) openCapability(target); }}>{icon(key)}{label}</button>;
      })}
      <Input ref={search} className="search" aria-label="搜索专家" placeholder={view === 'mine' ? `搜索我创建的${kind === 'team' ? '专家团' : '专家'}` : `搜索${kindLabel}`} value={query}
        onChange={event => setQuery(event.currentTarget.value)} />
      <Button className={`mine-toggle ${view === 'mine' ? 'active' : ''}`} aria-pressed={view === 'mine'}
        onClick={() => { setView('mine'); setQuery(''); }}>我的专家 {mineCount}</Button>
      <details className="create-menu"><summary className="create-expert">制作专家</summary><div role="menu">
        <button role="menuitem" disabled={acting} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); void createExpert('agent'); }}>创建专家</button>
        <button role="menuitem" disabled={acting} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); void createExpert('team'); }}>创建专家团</button>
      </div></details>
    </header>

    {view === 'mine' && <Button variant="ghost" size="sm" className="back-center" onClick={() => { setView('center'); setQuery(''); setStateFilter('all'); }}>‹ 全部专家</Button>}
    <div className="section-head">
      <nav className="work-types" aria-label={view === 'mine' ? '我的作品类型' : '专家中心类型'}>{([['agent', '专家'], ['team', '专家团']] as const).map(([type, label]) => <button key={type} className={kind === type ? 'active' : ''} aria-pressed={kind === type} onClick={() => { setKind(type); setQuery(''); }}>{label}{view === 'mine' && <span>{typeCounts[type]}</span>}</button>)}</nav>
      <div className="section-actions">
        <Button onClick={() => setImportOpen(true)}>导入</Button>
        <Button onClick={refresh} disabled={busy}>刷新</Button>
      </div>
    </div>

    {view === 'center'
      ? <nav className="filter-tabs" aria-label="来源过滤">
        {([['all', '全部'], ['default', '默认'], ['personal', '我的']] as const).map(([key, label]) =>
          <Button key={key} className={originFilter === key ? 'active' : ''} aria-current={originFilter === key ? 'page' : undefined}
            onClick={() => setOriginFilter(key)}>{label}</Button>)}
      </nav>
      : <nav className="filter-tabs" aria-label="状态过滤">
        {([['all', '全部'], ['draft', '草稿'], ['published', '已发布'], ['disabled', '已停用'], ['archived', '已归档']] as const).map(([key, label]) =>
          <Button key={key} className={stateFilter === key ? 'active' : ''} aria-current={stateFilter === key ? 'page' : undefined}
            onClick={() => setStateFilter(key)}>{label}</Button>)}
      </nav>}

    {notice && <div className={`notice ${notice.kind}`} role="status"><div className="notice-body"><span>{notice.text}</span></div><Button onClick={() => setNotice(undefined)} aria-label="关闭提示">×</Button></div>}
    <div role="status" aria-live="polite" className={error ? 'error counts' : 'counts'}>
      {busy ? '正在读取专家目录…' : error || `目录共 ${total} 个${kindLabel} · 当前显示 ${visible.length} 个${debounced ? `（搜索“${debounced}”）` : ''}`}
    </div>

    {busy
      ? <div className="grid" aria-hidden>{Array.from({ length: 8 }, (_, index) => <div className="skeleton" key={index} />)}</div>
      : !error && !visible.length
        ? <div className="empty">
          <strong>{debounced ? `没有匹配的${kindLabel}` : view === 'mine' ? `还没有自己的${kind === 'team' ? '专家团' : '专家'}` : `暂无可用${kindLabel}`}</strong>
          <span className="muted">{debounced ? '保留搜索词，可清除后重试。' : view === 'mine' ? '从默认模板复制，或直接制作一个属于你的专家。' : '默认模板尚未就绪，请稍后重试或制作专家。'}</span>
          <div className="empty-actions">
            {debounced && <Button onClick={() => { setQuery(''); search.current?.focus(); }}>清除搜索</Button>}
            <Button variant="primary" className="create-expert" disabled={acting} onClick={() => void createExpert()}>创建{kindLabel}</Button>
            {view === 'mine' && <Button onClick={() => setView('center')}>浏览专家中心</Button>}
          </div>
        </div>
        : <div className="grid">{visible.map(summary => {
          const readiness = READINESS[summary.readiness] ?? READINESS.unknown;
          const draft = isDraft(summary);
          const usable = summary.canUse && !draft && summary.availability === 'enabled' && summary.readiness === 'ready';
          return <article className={`card ${draft ? 'draft' : ''} ${summary.availability !== 'enabled' ? 'unavailable' : ''} ${actionMenu === summary.id ? 'menu-open' : ''}`} key={summary.id}>
            <div className="card-top">
              <button className="card-open" aria-label={`查看专家 ${summary.name}`} onClick={() => setDetailId(summary.id)}>
                <Avatar summary={summary} />
                <span className="card-title"><strong title={summary.name}>{summary.name}</strong>
                  <span className="card-meta">{summary.profession || (summary.expertType === 'team' ? '专家团' : '专家')}{view === 'mine' && <span> · {stateLabel(summary)}</span>}</span></span>
              </button>
              {summary.canManage && <div className="card-actions">
                <Button variant="ghost" size="sm" className="more-button" aria-label={`管理专家 ${summary.name}`} aria-haspopup="menu" aria-expanded={actionMenu === summary.id}
                  onClick={() => setActionMenu(current => (current === summary.id ? undefined : summary.id))}>•••</Button>
                {actionMenu === summary.id && <div className="card-menu" role="menu">
                  {draft
                    ? <button role="menuitem" onClick={() => { void editInConversation(summary.id); }}>继续编辑</button>
                    : <button role="menuitem" disabled={!usable || acting} onClick={() => void runSummon(summary.id, summary.publishedRevisionRef?.revisionId, undefined)}>召唤专家</button>}
                  {summary.canEdit && !draft && <button role="menuitem" onClick={() => { void editInConversation(summary.id); }}>编辑</button>}
                  <button role="menuitem" disabled={acting} onClick={() => void copyToMine(summary)}>复制到我的专家</button>
                  <button role="menuitem" disabled={acting} onClick={() => void exportExpert(summary)}>导出</button>
                  {summary.canManage && !draft && summary.availability === 'enabled' && <button role="menuitem" disabled={acting} onClick={() => void setAvailability(summary, 'disabled')}>停用</button>}
                  {summary.canManage && summary.availability === 'disabled' && <button role="menuitem" disabled={acting} onClick={() => void setAvailability(summary, 'enabled')}>启用</button>}
                  {summary.canManage && summary.availability !== 'archived' && <button className="danger" role="menuitem" disabled={acting} onClick={() => void setAvailability(summary, 'archived')}>归档</button>}
                </div>}
              </div>}
            </div>
            <p className="desc">{summary.description || <span className="muted">（暂无简介）</span>}</p>
            <div className="domain-tags">{(summary.tags ?? []).slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div>
            <div className="card-foot">
              <span className="badge">{summary.expertType === 'team' ? '专家团' : '专家'}</span>
              {!draft && <span className={`badge ${readiness.cls}`}>{readiness.label}</span>}
              {draft && <span className="badge">未发布</span>}
              {summary.origin === 'default' && <span className="badge">默认</span>}
              <button className={`pin ${summary.pinned ? 'on' : ''}`} role="switch" aria-checked={summary.pinned}
                aria-label={`${summary.pinned ? '取消置顶' : '置顶'}专家 ${summary.name}`}
                onClick={() => void setPreference(summary, !summary.pinned)}>★</button>
            </div>
          </article>;
        })}{view === 'mine' && <button className="card create-card" disabled={acting} onClick={() => void createExpert()}><span aria-hidden>＋</span>创建{kind === 'team' ? '专家团' : '专家'}</button>}</div>}

    {nextCursor && !busy && <div className="empty-actions" style={{ justifyContent: 'center', marginTop: 18 }}>
      <Button disabled={loadingMore} onClick={() => void load(nextCursor)}>{loadingMore ? '正在加载…' : '加载更多'}</Button>
    </div>}

    <Modal open={Boolean(detailId)} label={detailId ? '专家详情' : '专家详情'} className="expert-dialog" onClose={() => setDetailId(undefined)}>
      {detailId && <ExpertDetailModal expertId={detailId} management={management} acting={acting}
        onClose={() => setDetailId(undefined)}
        onSummon={(expertId, revisionId, draftText) => void runSummon(expertId, revisionId, draftText)}
        onEditTask={id => void editInConversation(id)}
        onEditDraft={id => { setDetailId(undefined); setEditorId(id); }}
        onCopy={async (expertId, revisionId) => {
          setActing(true);
          try { const draft = await management.copy(expertId, revisionId, management.newOperationId('copy')); setDetailId(undefined); refresh(); setEditorId(draft.expertId); }
          catch (cause) { setError(messageOf(cause)); } finally { setActing(false); }
        }}
        onAvailability={async (expertId, availability) => {
          setActing(true);
          try { await management.setAvailability(expertId, availability, management.newOperationId('availability')); setDetailId(undefined); refresh(); }
          catch (cause) { setError(messageOf(cause)); } finally { setActing(false); }
        }}
        onExport={async expertId => {
          setActing(true);
          try { const result = await management.downloadExport(expertId, undefined); setNotice({ kind: 'info', text: `已导出「${result.fileName}」。` }); }
          catch (cause) { setError(messageOf(cause)); } finally { setActing(false); }
        }}
        onChanged={refresh} />}
    </Modal>

    {editorId && <ExpertDraftEditor expertId={editorId} management={management}
      onClose={closeEditor}
      onSaved={refresh}
      onPublished={() => { closeEditor(); refresh(); }}
      onSummon={(id, revisionId, text) => { closeEditor(); void runSummon(id, revisionId, text); }} />}

    <Modal open={importOpen} label="导入专家" className="import-dialog" onClose={() => setImportOpen(false)}>
      {importOpen && <ImportExpertModal management={management} onClose={() => setImportOpen(false)}
        onImported={id => { setImportOpen(false); refresh(); setEditorId(id); }} />}
    </Modal>
  </section>;
}
