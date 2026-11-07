import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DriveEditorRegistry, DriveFileKind, DriveSearchHit, DriveSessionRef, DriveSource, DriveSpace, DriveTreeEntry } from 'workdsh-contracts/drive';
import { Icon, Modal } from 'workdsh-ui';
import type { DriveClient } from './management.js';
import { driveCss } from './styles.js';
import { DriveFileList, driveSizeLabel, kindIcon, type DriveMenuState } from './DriveFileList.js';
import { DriveUploader } from './DriveUploader.js';
import { DrivePreview, type DrivePreviewInput } from './DrivePreview.js';

type FilterState = { kinds?: readonly DriveFileKind[]; sources?: readonly DriveSource[]; sessionId?: string; label: string };
type ActionDialog = { kind: 'rename'; entry: DriveTreeEntry; value: string } | { kind: 'delete'; entry: DriveTreeEntry; value: string } | { kind: 'purge'; entry: DriveTreeEntry; value: string } | { kind: 'create-folder'; value: string };
type FolderTarget = { id?: string; label: string };

const KINDS: readonly { value: DriveFileKind; label: string }[] = [
  { value: 'image', label: '图片' }, { value: 'document', label: '文档' }, { value: 'video', label: '视频' },
  { value: 'audio', label: '音频' }, { value: 'archive', label: '压缩包' },
];
const SOURCES: readonly { value: DriveSource; label: string }[] = [
  { value: 'ai-generated', label: 'AI 生成' }, { value: 'user-upload', label: '用户上传' }, { value: 'tool-output', label: '工具输出' },
];
const sourceLabel = (source?: DriveSource): string => source === 'ai-generated' || source === 'user-upload' || source === 'tool-output' ? ({ 'ai-generated': 'AI 生成', 'user-upload': '用户上传', 'tool-output': '工具输出' } as const)[source] : '未知来源';
/** 会话 ID 统一以 `session-` 开头，截前 8 位会得到同一串；改用尾部片段才能使条目可区分。 */
const shortId = (id: string) => `会话 ${id.replace(/^session-/, '').slice(-8)}`;
/** 服务端对搜索结果与会话归档各截断 50 条，前端必须显式告知，避免误判为“只有这些”。 */
const RESULT_LIMIT = 50;

export function DrivePanel({ management, editors, toggleNavigation }: { management: DriveClient; editors: DriveEditorRegistry; toggleNavigation: () => void }) {
  const [entries, setEntries] = useState<readonly DriveTreeEntry[]>([]);
  const [path, setPath] = useState<readonly { id: string; name: string }[]>([]);
  const [filter, setFilter] = useState<FilterState>();
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [hits, setHits] = useState<readonly DriveSearchHit[]>([]);
  const [sessions, setSessions] = useState<readonly DriveSessionRef[]>([]);
  const [quota, setQuota] = useState<DriveSpace>();
  const [recycle, setRecycle] = useState(false);
  const [archived, setArchived] = useState<readonly DriveTreeEntry[]>([]);
  const [selected, setSelected] = useState<DrivePreviewInput>();
  const [menu, setMenu] = useState<DriveMenuState>();
  const [moving, setMoving] = useState<DriveTreeEntry>();
  const [folderTargets, setFolderTargets] = useState<readonly FolderTarget[]>([]);
  const [dialog, setDialog] = useState<ActionDialog>();
  const [uploadTarget, setUploadTarget] = useState<FolderTarget>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const filterToggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const mobilebarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);

  // 在线编辑能力由 Office 等插件晚到注册：订阅注册表版本，使文件菜单随能力刷新。
  React.useSyncExternalStore(listener => editors.subscribe(listener), () => editors.getRevision(), () => 0);

  const currentParent = path.at(-1)?.id;
  const folderPath = `我的网盘${path.map(row => ` / ${row.name}`).join('')}`;

  const load = useCallback(async (parentId?: string) => {
    setBusy(true); setError(''); setSelected(undefined);
    try { setEntries(await management.list(parentId)); } catch (cause) { setError(cause instanceof Error ? cause.message : '读取网盘失败。'); } finally { setBusy(false); }
  }, [management]);
  const refreshSessions = useCallback(() => { void management.sessions().then(setSessions).catch(() => undefined); }, [management]);
  const refreshQuota = useCallback(() => { void management.space().then(setQuota).catch(() => undefined); }, [management]);
  const loadArchived = useCallback(async () => {
    setBusy(true); setError('');
    try { setArchived(await management.listArchived()); } catch (cause) { setError(cause instanceof Error ? cause.message : '读取回收站失败。'); } finally { setBusy(false); }
  }, [management]);
  useEffect(() => { void load(undefined); refreshSessions(); refreshQuota(); }, [load, refreshSessions, refreshQuota]);
  useEffect(() => {
    // 弹层与移动筛选抽屉都不在 Modal 里，必须共享同一套退出路径：点外部关闭，Esc 也能关闭。
    const close = () => setMenu(undefined);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenu(undefined); setFiltersOpen(false); } };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('click', close); window.removeEventListener('keydown', onKey); };
  }, []);
  useEffect(() => {
    // 抽屉打开：锁住页面滚动、把背景移出焦点与读屏顺序，并将焦点送入抽屉；
    // 关闭后恢复原 overflow 与背景可交互性，焦点回到触发按钮（UI-DESIGN 第 6 节）。
    if (!filtersOpen) return;
    const sidebar = sidebarRef.current;
    const background = [mobilebarRef.current, contentRef.current].filter((node): node is HTMLElement => Boolean(node));
    const previousOverflow = document.body.style.overflow;
    background.forEach(node => node.setAttribute('inert', ''));
    document.body.style.overflow = 'hidden';
    sidebar?.querySelector<HTMLElement>('.wd-drive-drawer-close')?.focus();
    return () => {
      background.forEach(node => node.removeAttribute('inert'));
      document.body.style.overflow = previousOverflow;
      const active = document.activeElement;
      // 仅在焦点仍留在抽屉内或已丢失时回焦，避免抢走用户主动点到的位置。
      if (!active || active === document.body || (sidebar?.contains(active) ?? false)) filterToggleRef.current?.focus();
    };
  }, [filtersOpen]);
  useEffect(() => {
    // 抽屉只在 760px 以下存在；放大到桌面宽度时关闭它，避免锁滚与 inert 残留。
    const mobile = window.matchMedia('(max-width: 760px)');
    const onChange = () => { if (!mobile.matches) setFiltersOpen(false); };
    mobile.addEventListener('change', onChange);
    return () => mobile.removeEventListener('change', onChange);
  }, []);

  const enterRecycle = () => { setSearchMode(false); setSelected(undefined); setFilter(undefined); setQuery(''); setMenu(undefined); setUploadTarget(undefined); setFiltersOpen(false); setRecycle(true); void loadArchived(); };
  const exitRecycle = () => { setRecycle(false); setArchived([]); setSelected(undefined); setFiltersOpen(false); void load(currentParent); };

  const runSearch = useCallback(async (nextQuery = query, nextFilter = filter) => {
    setSearchMode(true); setSelected(undefined); setBusy(true); setError('');
    try { setHits(await management.search(nextQuery.trim(), { kinds: nextFilter?.kinds, sources: nextFilter?.sources, ...(nextFilter?.sessionId ? { sessionId: nextFilter.sessionId } : {}) })); } catch (cause) { setError(cause instanceof Error ? cause.message : '搜索失败。'); } finally { setBusy(false); }
  }, [management, query, filter]);
  const clearFilter = async () => { setFilter(undefined); setQuery(''); setSearchMode(false); setSelected(undefined); setFiltersOpen(false); await load(currentParent); };
  const submitSearch = () => { if (!query.trim() && !filter) { void clearFilter(); return; } void runSearch(); };

  const open = async (entry: DriveTreeEntry, autoEdit = false) => {
    setMenu(undefined); setError(''); setNotice('');
    if (entry.kind === 'folder') {
      if (recycle) { setNotice('文件夹已在回收站中，恢复后才能展开。'); return; }
      setSearchMode(false); setFilter(undefined); setQuery(''); setUploadTarget(undefined); setFiltersOpen(false); setSelected(undefined);
      setPath([...path, { id: entry.id, name: entry.name }]); await load(entry.id); return;
    }
    if (!entry.file) return;
    setSelected({ fileId: entry.file.id, revisionId: entry.revision?.id, name: entry.name, kind: entry.file.kind, mediaType: entry.file.mediaType, byteLength: entry.file.byteLength, source: entry.file.source, ...(entry.file.sessionId ? { sessionId: entry.file.sessionId } : {}), folderPath: recycle ? (entry.folderPath ?? '回收站') : folderPath, createdAt: entry.file.createdAt, updatedAt: entry.file.updatedAt, ...(autoEdit ? { autoEdit: true } : {}) });
  };
  const openHit = (hit: DriveSearchHit) => setSelected({ fileId: hit.fileId, revisionId: hit.revisionId, name: hit.name, kind: hit.kind, source: hit.source, ...(hit.sessionId ? { sessionId: hit.sessionId } : {}), folderPath: hit.folderPath, updatedAt: hit.updatedAt });
  const goTo = async (index: number) => {
    setUploadTarget(undefined);
    if (index === 0) { setPath([]); await load(undefined); return; }
    const target = path[index - 1]; if (!target) return;
    setPath(path.slice(0, index)); await load(target.id);
  };

  const applyFilter = (next: FilterState) => {
    // “全部文件”是浏览根列表，不应退化成一次平铺搜索：搜索会丢层级并被服务端截断。
    if (!next.kinds?.length && !next.sources?.length && !next.sessionId) { void clearFilter(); return; }
    setFilter(next); setQuery(''); setFiltersOpen(false); void runSearch('', next);
  };
  const createFolder = async (name: string) => {
    const value = name.trim(); if (!value) return;
    try { await management.createFolder(value, currentParent); setNotice('文件夹已创建。'); await load(currentParent); } catch (cause) { setError(cause instanceof Error ? cause.message : '新建文件夹失败。'); }
  };
  const uploadFiles = async (files: readonly File[]) => {
    if (!files.length) return;
    const target = uploadTarget;
    setBusy(true); setError('');
    let failed = 0; let reason = '';
    try {
      for (const file of files) {
        // 逐个文件容错：一个失败不应中断其余文件，也不应让已成功的文件从列表里“消失”。
        try { await management.saveFile(file, target?.id); } catch (cause) { failed += 1; reason = cause instanceof Error ? cause.message : '上传失败。'; }
      }
    } finally {
      const done = files.length - failed;
      if (failed) setError(`${failed} 个文件上传失败${done ? `，${done} 个已上传` : ''}：${reason}`);
      else setNotice(`已上传 ${done} 个文件${target ? `到 ${target.label}` : ''}。`);
      setUploadTarget(undefined);
      await load(currentParent); refreshSessions(); refreshQuota(); setBusy(false);
    }
  };
  const rename = async (entry: DriveTreeEntry, name: string) => {
    const value = name.trim(); if (!value) return;
    try { const next = await management.rename(entry.id, value); if (selected && entry.kind === 'file') setSelected({ ...selected, name: value }); setNotice('已重命名。'); await load(currentParent); void next; } catch (cause) { setError(cause instanceof Error ? cause.message : '重命名失败。'); }
  };
  const move = async (parentId?: string) => {
    if (!moving) return;
    try { await management.move(moving.id, parentId); setMoving(undefined); setNotice('已移动。'); await load(currentParent); } catch (cause) { setError(cause instanceof Error ? cause.message : '移动失败。'); }
  };
  const remove = async (entry: DriveTreeEntry) => {
    try { await management.archive(entry.id); if (selected && entry.kind === 'file') setSelected(undefined); setNotice(entry.kind === 'folder' ? '文件夹及其内容已移入回收站。' : '已移入回收站。'); await load(currentParent); refreshSessions(); refreshQuota(); } catch (cause) { setError(cause instanceof Error ? cause.message : '删除失败。'); }
  };
  const restoreEntry = async (entry: DriveTreeEntry) => {
    try { await management.restore(entry.id); if (selected && entry.kind === 'file') setSelected(undefined); setNotice(entry.kind === 'folder' ? '文件夹已恢复。' : '已恢复。'); await loadArchived(); refreshSessions(); refreshQuota(); } catch (cause) { setError(cause instanceof Error ? cause.message : '恢复失败。'); }
  };
  const purgeEntry = async (entry: DriveTreeEntry) => {
    try { await management.purge(entry.id); if (selected && entry.kind === 'file') setSelected(undefined); setNotice('已彻底删除。'); await loadArchived(); refreshSessions(); refreshQuota(); } catch (cause) { setError(cause instanceof Error ? cause.message : '彻底删除失败。'); }
  };
  const download = async (entry: DriveTreeEntry) => {
    if (entry.kind !== 'file' || !entry.file) return;
    try {
      const blob = await management.download(entry.file.id, entry.revision?.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = entry.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '下载失败。'); }
  };
  const beginMove = (entry: DriveTreeEntry) => {
    const targets: FolderTarget[] = [{ label: '我的网盘（根目录）' }];
    const walk = async (parentId?: string, prefix = '我的网盘') => {
      const rows = await management.list(parentId).catch(() => []);
      for (const row of rows) { if (row.kind === 'folder') { targets.push({ id: row.id, label: `${prefix} / ${row.name}` }); await walk(row.id, `${prefix} / ${row.name}`); } }
    };
    void walk().then(() => { setMoving(entry); setFolderTargets(targets); });
  };

  // 写回成功后把预览里的修订/大小/时间推进到新修订，避免头部继续显示旧版本信息。
  const preview = selected ? <DrivePreview
    management={management}
    editors={editors}
    input={selected}
    onClose={() => { setSelected(undefined); if (!recycle && !searchMode) void load(currentParent); }}
    onSaved={entry => setSelected(prev => prev ? { ...prev, revisionId: entry.revision?.id ?? prev.revisionId, byteLength: entry.file?.byteLength ?? prev.byteLength, updatedAt: entry.file?.updatedAt ?? prev.updatedAt } : prev)}
  /> : null;
  const menuFor = (event: React.MouseEvent, entry: DriveTreeEntry) => { event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setMenu({ entry, x: Math.min(rect.left, window.innerWidth - 210), y: rect.bottom + 5 }); };
  const list = (rows: readonly DriveTreeEntry[], mode: 'drive' | 'recycle') => <DriveFileList entries={rows} mode={mode} onOpen={entry => void open(entry)} onMenu={menuFor} />;
  const mainBody = preview ?? (searchMode ? <SearchResultList hits={hits} busy={busy} open={openHit} /> : recycle ? list(archived, 'recycle') : list(entries, 'drive'));

  return <section className="wd-drive"><style>{driveCss}</style>
    <div className="wd-drive-mobilebar" ref={mobilebarRef}>
      <button className="wd-drive-nav-toggle" onClick={toggleNavigation} aria-label="切换主导航"><Icon name="menu" size={20} /></button>
      <span>网盘</span>
      <button ref={filterToggleRef} className={`wd-drive-filter-toggle${filtersOpen ? ' active' : ''}`} onClick={() => setFiltersOpen(open => !open)} aria-expanded={filtersOpen} aria-label="分类与筛选"><Icon name="tag" size={18} /></button>
    </div>
    {filtersOpen ? <div className="wd-drive-backdrop" aria-hidden="true" onClick={() => setFiltersOpen(false)} /> : null}
    <aside
      ref={sidebarRef}
      className={`wd-drive-sidebar${filtersOpen ? ' mobile-open' : ''}`}
      role={filtersOpen ? 'dialog' : undefined}
      aria-modal={filtersOpen ? true : undefined}
      aria-label={filtersOpen ? '分类与筛选' : undefined}
    >
      <header>
        <h1>网盘</h1>
        <span className="wd-drive-drawer-title">分类与筛选</span>
        <button className="wd-drive-drawer-close" onClick={() => setFiltersOpen(false)} aria-label="关闭筛选"><Icon name="close" size={16} /></button>
      </header>
      <nav className="wd-drive-nav">
        <button className={!recycle && !filter ? 'active' : ''} onClick={() => recycle ? exitRecycle() : void clearFilter()}><Icon name="drive" size={18} /><span>全部文件</span></button>
        <button className={recycle ? 'active' : ''} onClick={enterRecycle}><Icon name="trash" size={18} /><span>回收站</span></button>
      </nav>
      <div className="wd-drive-section-title">类型</div>
      <div className="wd-drive-filter-list">{KINDS.map(kind => <button key={kind.value} className={filter?.kinds?.includes(kind.value) ? 'active' : ''} onClick={() => applyFilter(filter?.kinds?.includes(kind.value) ? { label: '全部文件' } : { kinds: [kind.value], label: kind.label })}><Icon name={kindIcon(kind.value)} size={17} /><span>{kind.label}</span></button>)}</div>
      <div className="wd-drive-section-title">来源</div>
      <div className="wd-drive-filter-list">{SOURCES.map(source => <button key={source.value} className={filter?.sources?.includes(source.value) ? 'active' : ''} onClick={() => applyFilter(filter?.sources?.includes(source.value) ? { label: '全部文件' } : { sources: [source.value], label: source.label })}><Icon name="tag" size={17} /><span>{source.label}</span></button>)}</div>
      <div className="wd-drive-section-title">会话</div>
      <div className="wd-drive-filter-list">{sessions.map(session => <button key={session.sessionId} className={filter?.sessionId === session.sessionId ? 'active' : ''} onClick={() => applyFilter({ sessionId: session.sessionId, label: shortId(session.sessionId) })} title={session.sessionId}><Icon name="chat" size={17} /><span>{shortId(session.sessionId)}</span><i className="wd-drive-session-count">{session.fileCount}</i></button>)}
        {!sessions.length ? <div className="wd-drive-session-empty">暂无会话归档</div> : sessions.length >= RESULT_LIMIT ? <div className="wd-drive-session-empty">仅显示最近 {RESULT_LIMIT} 个会话</div> : null}</div>
      <footer>{quota ? `已用 ${driveSizeLabel(quota.usedBytes)} / ${driveSizeLabel(quota.totalBytes)} · ` : ''}对话产物自动归档 · 仅当前账号</footer>
    </aside>
    <main className="wd-drive-content" ref={contentRef}>
      {notice ? <div className="wd-drive-toast">{notice}</div> : null}
      {error ? <div className="wd-drive-toast error">{error}</div> : null}
      {!preview ? <div className="wd-drive-toolbar">
        <nav className="wd-drive-crumbs">{recycle ? <><span className="wd-drive-crumb-current">回收站</span><button onClick={() => void exitRecycle()}>返回网盘</button></> : filter ? <span className="wd-drive-filter-chip">{filter.label}<button onClick={() => void clearFilter()} aria-label="清除筛选"><Icon name="close" size={12} /></button></span> : <><button onClick={() => void goTo(0)}>我的网盘</button>{path.map((row, index) => <React.Fragment key={row.id}><b>/</b><button onClick={() => void goTo(index + 1)}>{row.name}</button></React.Fragment>)}</>}</nav>
        {recycle ? null : <div className="wd-drive-actions">
          <input className="wd-drive-search" value={query} placeholder="搜索网盘文件" onChange={event => { setQuery(event.currentTarget.value); if (!event.currentTarget.value) setSearchMode(false); }} onKeyDown={event => { if (event.key === 'Enter') submitSearch(); }} />
          <DriveUploader onFiles={uploadFiles} busy={busy} />
          <button onClick={() => setDialog({ kind: 'create-folder', value: '新建文件夹' })}><Icon name="plus" size={16} /> 新建文件夹</button>
        </div>}
      </div> : null}
      {!preview && !recycle && uploadTarget ? <div className="wd-drive-upload-target"><span>上传到：{uploadTarget.label}</span><button onClick={() => setUploadTarget(undefined)} aria-label="取消指定上传位置"><Icon name="close" size={12} /></button></div> : null}
      <div className={preview ? 'wd-drive-list is-preview' : 'wd-drive-list'}>{mainBody}</div>
    </main>
    {menu ? <div className="wd-drive-popover" style={{ left: menu.x, top: menu.y }} onClick={event => event.stopPropagation()}>
      {recycle ? <>
        <button onClick={() => { void restoreEntry(menu.entry); setMenu(undefined); }}>恢复</button>
        <button className="danger" onClick={() => { setDialog({ kind: 'purge', entry: menu.entry, value: '' }); setMenu(undefined); }}>彻底删除</button>
      </> : <>
        {menu.entry.kind === 'file' ? <button onClick={() => { void download(menu.entry); setMenu(undefined); }}>下载</button> : <button onClick={() => { setUploadTarget({ id: menu.entry.id, label: menu.entry.name }); setMenu(undefined); }}>上传到此处</button>}
        {menu.entry.kind === 'file' && editors.canEdit(menu.entry.name) ? <button onClick={() => { void open(menu.entry, true); setMenu(undefined); }}>在线编辑</button> : null}
        <hr />
        <button onClick={() => { beginMove(menu.entry); setMenu(undefined); }}>移动到…</button>
        <button onClick={() => { setDialog({ kind: 'rename', entry: menu.entry, value: menu.entry.name }); setMenu(undefined); }}>重命名</button>
        <button className="danger" onClick={() => { setDialog({ kind: 'delete', entry: menu.entry, value: '' }); setMenu(undefined); }}>{menu.entry.kind === 'folder' ? '删除文件夹' : '删除'}</button>
      </>}
    </div> : null}
    <ActionModal dialog={dialog} setDialog={setDialog} createFolder={async (value) => { await createFolder(value); }} rename={async (entry, value) => { await rename(entry, value); }} remove={async (entry) => { await remove(entry); }} purge={async (entry) => { await purgeEntry(entry); }} />
    <Modal open={Boolean(moving)} label={moving ? `移动“${moving.name}”` : '移动文件'} className="drive-move-dialog" onClose={() => setMoving(undefined)}><h2>移动“{moving?.name}”</h2><p>选择新的保存位置</p><div className="drive-move-targets">{moving ? folderTargets.filter(target => target.id !== moving.id).map(target => <button key={target.id ?? 'root'} onClick={() => void move(target.id)}><Icon name="folder" size={16} /><span>{target.label}</span><Icon name="chevron" size={14} /></button>) : null}</div><div className="drive-dialog-actions"><button onClick={() => setMoving(undefined)}>取消</button></div></Modal>
  </section>;
}

function SearchResultList({ hits, busy, open }: { hits: readonly DriveSearchHit[]; busy: boolean; open: (hit: DriveSearchHit) => void }) {
  if (busy) return <div className="wd-drive-state">正在搜索…</div>;
  if (!hits.length) return <div className="wd-drive-empty"><div><h2>没有找到文件</h2><p>换个关键词，或清除筛选条件。</p></div></div>;
  return <>{hits.length >= RESULT_LIMIT ? <div className="wd-drive-result-note">结果较多，仅显示前 {RESULT_LIMIT} 条，请补充关键词缩小范围。</div> : null}
    <div className="wd-drive-result-list">{hits.map(hit => <button key={hit.nodeId} className="wd-drive-result-row" onClick={() => open(hit)}>
      <span className="wd-drive-result-icon"><Icon name={kindIcon(hit.kind)} size={18} /></span>
      <span className="wd-drive-result-main"><strong title={hit.name}>{hit.name}</strong><small>{hit.folderPath} · {sourceLabel(hit.source)}{hit.excerpt ? ` · ${hit.excerpt}` : ''} · {new Date(hit.updatedAt).toLocaleString()}</small></span>
      <i className="wd-drive-result-arrow"><Icon name="chevron" size={14} /></i>
    </button>)}</div></>;
}

function ActionModal({ dialog, setDialog, createFolder, rename, remove, purge }: { dialog?: ActionDialog; setDialog: (value?: ActionDialog) => void; createFolder: (value: string) => Promise<void>; rename: (entry: DriveTreeEntry, value: string) => Promise<void>; remove: (entry: DriveTreeEntry) => Promise<void>; purge: (entry: DriveTreeEntry) => Promise<void> }) {
  const input = dialog && ['rename', 'create-folder'].includes(dialog.kind);
  const title = !dialog ? '' : dialog.kind === 'create-folder' ? '新建文件夹' : dialog.kind === 'rename' ? '重命名' : dialog.kind === 'delete' ? (dialog.entry.kind === 'folder' ? '删除文件夹' : '删除文件') : '彻底删除';
  const submit = async () => {
    if (!dialog) return;
    if ((dialog.kind === 'rename' || dialog.kind === 'create-folder') && !dialog.value.trim()) return;
    const current = dialog; setDialog(undefined);
    if (current.kind === 'create-folder') await createFolder(current.value);
    else if (current.kind === 'rename') await rename(current.entry, current.value);
    else if (current.kind === 'delete') await remove(current.entry);
    else await purge(current.entry);
  };
  return <Modal open={Boolean(dialog)} label={title || '网盘操作'} className="drive-action-dialog" onClose={() => setDialog(undefined)}><form onSubmit={event => { event.preventDefault(); void submit(); }}><h2>{title}</h2>{input && dialog ? <label>名称<input autoFocus value={dialog.value} onChange={event => setDialog({ ...dialog, value: event.currentTarget.value })} /></label> : dialog?.kind === 'delete' ? <p>{dialog.entry.kind === 'folder' ? `删除文件夹“${dialog.entry.name}”？其中的文件会一并移入回收站，可整体恢复。` : `删除“${dialog.entry.name}”？文件将移入回收站，可从回收站恢复。`}</p> : dialog?.kind === 'purge' ? <p>{`彻底删除“${dialog.entry.name}”？该操作不可恢复，文件将从网盘与回收站移除，附件字节由系统保留。`}</p> : null}<div className="drive-dialog-actions"><button type="button" onClick={() => setDialog(undefined)}>取消</button><button className={dialog?.kind === 'delete' || dialog?.kind === 'purge' ? 'danger' : 'primary'} type="submit">{dialog?.kind === 'delete' ? '删除' : dialog?.kind === 'purge' ? '彻底删除' : '确定'}</button></div></form></Modal>;
}
