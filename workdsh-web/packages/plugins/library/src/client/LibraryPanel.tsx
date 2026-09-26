import { Button, Textarea, Input, Select } from 'workdsh-ui';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { LibraryAsset, LibraryAssetKind, LibraryDraft, LibraryOriginalPreviewInput, LibraryOriginalPreviewRegistry, LibrarySearchHit, LibraryTreeEntry } from 'workdsh-contracts/library';
import { Modal } from 'workdsh-ui';
import type { LibraryClient } from './management.js';
import { libraryCss } from './styles.js';

type Props = PropsRuntime<'main'> & InjectFace<{ management: LibraryClient; previewRegistry: LibraryOriginalPreviewRegistry; toggleNavigation: () => void; startConversation: (entry: LibraryTreeEntry) => Promise<void> }>;
type TreeRow = LibraryTreeEntry & { children?: TreeRow[] };
type MenuState = { entry?: LibraryTreeEntry; x: number; y: number; create?: boolean; parentId?: string };
type View = 'library' | 'search' | 'recent' | 'outputs';
type FolderTarget = { id?: string; label: string };
type ActionDialog = { kind: 'create-markdown' | 'create-text' | 'create-folder'; parentId?: string; value: string } | { kind: 'rename' | 'remove' | 'status'; entry: LibraryTreeEntry; value: string };

const icon = (entry: LibraryTreeEntry) => entry.kind === 'folder' ? '📁' : entry.asset?.kind === 'pdf' ? 'PDF' : entry.asset?.kind === 'docx' ? 'W' : entry.asset?.kind === 'pptx' ? 'P' : entry.asset?.kind === 'html' ? '</>' : entry.asset?.kind === 'text' ? 'T' : 'M';

export function LibraryPanel({ management, previewRegistry, toggleNavigation, startConversation }: Props) {
  const [tree, setTree] = useState<readonly TreeRow[]>([]);
  const [selected, setSelected] = useState<LibraryTreeEntry>();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [view, setView] = useState<View>('library');
  const [query, setQuery] = useState('');
  const [searchKind, setSearchKind] = useState<LibraryAssetKind | ''>('');
  const [searchSource, setSearchSource] = useState<LibraryAsset['source'] | ''>('');
  const [searchAfter, setSearchAfter] = useState('');
  const [hits, setHits] = useState<readonly LibrarySearchHit[]>([]);
  const [content, setContent] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [officePreview, setOfficePreview] = useState<LibraryOriginalPreviewInput>();
  const [htmlPreview, setHtmlPreview] = useState('');
  const [draft, setDraft] = useState<LibraryDraft>();
  const [draftContent, setDraftContent] = useState('');
  const [menu, setMenu] = useState<MenuState>();
  const [moving, setMoving] = useState<LibraryTreeEntry>();
  const [dialog, setDialog] = useState<ActionDialog>();
  const [folderTargets, setFolderTargets] = useState<readonly FolderTarget[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const upload = useRef<HTMLInputElement>(null);
  const uploadParent = useRef<string | undefined>(undefined);
  const officeHost = useRef<HTMLDivElement>(null);

  const clearOriginal = useCallback(() => setOriginalUrl(old => { if (old) URL.revokeObjectURL(old); return ''; }), []);
  useEffect(() => () => { if (originalUrl) URL.revokeObjectURL(originalUrl); }, [originalUrl]);
  useEffect(() => { const close = () => setMenu(undefined); window.addEventListener('click', close); return () => window.removeEventListener('click', close); }, []);
  useEffect(() => { if (!officePreview || !officeHost.current) return; let dispose: () => void = () => {}; let cancelled = false; void previewRegistry.mount(officeHost.current, officePreview).then(next => { if (cancelled) next(); else dispose = next; }).catch(cause => setError(cause instanceof Error ? cause.message : '原件预览失败。')); return () => { cancelled = true; dispose(); }; }, [officePreview, previewRegistry]);

  const loadTree = useCallback(async () => {
    const walk = async (parentId?: string): Promise<TreeRow[]> => Promise.all((await management.list(parentId)).map(async row => row.kind === 'folder' ? { ...row, children: await walk(row.id) } : row));
    setBusy(true); setError('');
    try { setTree(await walk()); } catch (cause) { setError(cause instanceof Error ? cause.message : '读取资料失败。'); } finally { setBusy(false); }
  }, [management]);
  useEffect(() => { void loadTree(); }, [loadTree]);

  const flatten = (rows: readonly TreeRow[]): LibraryTreeEntry[] => rows.flatMap(row => [row, ...(row.children ? flatten(row.children) : [])]);
  const allEntries = flatten(tree);
  const findById = (id: string) => allEntries.find(row => row.id === id);
  const open = async (entry: LibraryTreeEntry) => {
    setMenu(undefined); setError(''); setNotice(''); setDraft(undefined); setOfficePreview(undefined); setHtmlPreview(''); clearOriginal();
    if (entry.kind === 'folder') { setExpanded(old => { const next = new Set(old); next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id); return next; }); return; }
    setSelected(entry); setView('library'); setContent('');
    if (entry.asset?.status === 'disabled') return;
    try {
      const revisionId = entry.revision?.id ?? hits.find(hit => hit.nodeId === entry.id)?.revisionId;
      if (entry.revision?.conversionStatus === 'ready') setContent(await management.readText(entry.asset!.id, revisionId));
      if (entry.asset?.kind === 'pdf') { const bytes = await management.readOriginal(entry.asset.id, revisionId); setOriginalUrl(URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))); }
      if (entry.asset?.kind === 'html') { const bytes = await management.readOriginal(entry.asset.id, revisionId); setHtmlPreview(new TextDecoder().decode(bytes)); }
      if ((entry.asset?.kind === 'docx' || entry.asset?.kind === 'pptx') && previewRegistry.canOpen(entry.asset.kind)) { const bytes = await management.readOriginal(entry.asset.id, revisionId); setOfficePreview({ name: entry.name, kind: entry.asset.kind, bytes }); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : '读取资料失败。'); }
  };
  const runSearch = async (nextView: View = 'search', nextQuery = query) => {
    setView(nextView); setSelected(undefined); clearOriginal(); setBusy(true); setError('');
    try { setHits(await management.search(nextQuery, nextView === 'outputs' ? { sources: ['task'] } : nextView === 'search' ? { ...(searchKind ? { kinds: [searchKind] } : {}), ...(searchSource ? { sources: [searchSource] } : {}), ...(searchAfter ? { updatedAfter: new Date(`${searchAfter}T00:00:00`).toISOString() } : {}) } : {})); } catch (cause) { setError(cause instanceof Error ? cause.message : '搜索失败。'); } finally { setBusy(false); }
  };
  const createFolder = async (name: string, parentId?: string) => { try { await management.createFolder(name, parentId); await loadTree(); } catch (cause) { setError(cause instanceof Error ? cause.message : '新建文件夹失败。'); } };
  const createText = async (kind: 'markdown' | 'text', name: string, parentId?: string) => { const extension = kind === 'markdown' ? '.md' : '.txt'; const finalName = name.toLowerCase().endsWith(extension) ? name : `${name}${extension}`; try { await management.importFile(new File([kind === 'markdown' ? `# ${finalName.slice(0, -extension.length)}\n` : '\n'], finalName, { type: kind === 'markdown' ? 'text/markdown' : 'text/plain' }), parentId); await loadTree(); } catch (cause) { setError(cause instanceof Error ? cause.message : '新建资料失败。'); } };
  const files = async (list: FileList | null) => { if (!list?.length) return; setBusy(true); try { for (const file of list) await management.importFile(file, uploadParent.current); await loadTree(); } catch (cause) { setError(cause instanceof Error ? cause.message : '导入文件失败。'); } finally { setBusy(false); uploadParent.current = undefined; if (upload.current) upload.current.value = ''; } };
  const remove = async (entry: LibraryTreeEntry) => { try { await management.remove(entry.id); if (selected?.id === entry.id) setSelected(undefined); await loadTree(); } catch (cause) { setError(cause instanceof Error ? cause.message : '删除失败。'); } };
  const rename = async (entry: LibraryTreeEntry, name: string) => { try { await management.rename(entry.id, name); if (selected?.id === entry.id) setSelected({ ...selected, name }); await loadTree(); } catch (cause) { setError(cause instanceof Error ? cause.message : '重命名失败。'); } };
  const addToTask = async (entry: LibraryTreeEntry) => { setMenu(undefined); setError(''); try { await startConversation(entry); } catch (cause) { setError(cause instanceof Error ? cause.message : '新建对话失败。'); } };
  const setStatus = async (entry: LibraryTreeEntry) => { if (!entry.asset) return; const status = entry.asset.status === 'disabled' ? 'active' : 'disabled'; try { const next = await management.setAssetStatus(entry.asset.id, status); if (selected?.id === entry.id) setSelected(next); await loadTree(); } catch (cause) { setError(cause instanceof Error ? cause.message : '更新状态失败。'); } };
  const entryPath = (entry: LibraryTreeEntry): string => { const names = [entry.name]; let parentId = entry.parentId; const seen = new Set<string>(); while (parentId && !seen.has(parentId)) { seen.add(parentId); const parent = findById(parentId); if (!parent) break; names.unshift(parent.name); parentId = parent.parentId; } return `我的资料 / ${names.join(' / ')}`; };
  const beginMove = (entry: LibraryTreeEntry) => { setMoving(entry); setFolderTargets([{ label: '我的资料（根目录）' }, ...allEntries.filter(row => row.kind === 'folder').map(row => ({ id: row.id, label: entryPath(row) }))]); };
  const move = async (parentId?: string) => { if (!moving) return; try { await management.move(moving.id, parentId); setMoving(undefined); await loadTree(); } catch (cause) { setError(cause instanceof Error ? cause.message : '移动失败。'); } };
  const beginEdit = async () => { if (!selected?.asset) return; try { const next = await management.createDraft(selected.asset.id, selected.revision?.id); setDraft(next); setDraftContent(next.content); } catch (cause) { setError(cause instanceof Error ? cause.message : '创建草稿失败。'); } };
  const publishDraft = async () => { if (!draft) return; try { const saved = draftContent === draft.content ? draft : await management.updateDraft(draft.id, draftContent, draft.revision); const next = await management.publishDraft(saved.id, saved.revision); setSelected(next); setContent(draftContent); setDraft(undefined); await loadTree(); } catch (cause) { setError(cause instanceof Error ? cause.message : '发布失败。'); } };
  const downloadOriginal = async () => { if (!selected?.asset) return; try { const bytes = await management.readOriginal(selected.asset.id, selected.revision?.id); const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: selected.asset.mediaType })); const link = document.createElement('a'); link.href = url; link.download = selected.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (cause) { setError(cause instanceof Error ? cause.message : '读取原件失败。'); } };
  const showMenu = (event: React.MouseEvent, state: Omit<MenuState, 'x' | 'y'>) => { event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setMenu({ ...state, x: Math.max(8, Math.min(rect.left, window.innerWidth - 204)), y: Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - (state.create ? 198 : 246))) }); };
  const submitDialog = async () => {
    if (!dialog) return;
    const current = dialog;
    const value = current.value.trim();
    if ((current.kind === 'create-markdown' || current.kind === 'create-text' || current.kind === 'create-folder' || current.kind === 'rename') && !value) return;
    setDialog(undefined);
    switch (current.kind) {
      case 'create-markdown': await createText('markdown', value, current.parentId); break;
      case 'create-text': await createText('text', value, current.parentId); break;
      case 'create-folder': await createFolder(value, current.parentId); break;
      case 'rename': await rename(current.entry, value); break;
      case 'remove': await remove(current.entry); break;
      case 'status': await setStatus(current.entry); break;
    }
  };

  const Tree = ({ rows, depth = 0 }: { rows: readonly TreeRow[]; depth?: number }) => <>{rows.map(row => <React.Fragment key={row.id}><div className={`wd-library-tree-row${selected?.id === row.id ? ' selected' : ''}${row.asset?.status === 'disabled' ? ' disabled' : ''}`} style={{ paddingLeft: 12 + depth * 16 }} onClick={() => void open(row)}><button className="wd-library-disclosure" tabIndex={-1}>{row.kind === 'folder' ? (expanded.has(row.id) ? '⌄' : '›') : ''}</button><span className={`wd-library-kind kind-${row.asset?.kind ?? 'folder'}`}>{icon(row)}</span><span className="wd-library-name">{row.name}</span><button className="wd-library-more" aria-label={`${row.name} 更多操作`} onClick={event => showMenu(event, { entry: row })}>•••</button></div>{row.kind === 'folder' && expanded.has(row.id) ? <Tree rows={row.children ?? []} depth={depth + 1} /> : null}</React.Fragment>)}</>;
  const resultEntries = hits.map(hit => findById(hit.nodeId)).filter((row): row is LibraryTreeEntry => Boolean(row));

  return <section className="wd-library"><style>{libraryCss}</style>
    <aside className="wd-library-sidebar"><header><button className="wd-library-nav-toggle" onClick={toggleNavigation}>☰</button><h1>资料库</h1></header><nav className="wd-library-nav"><button className={view === 'search' ? 'active' : ''} onClick={() => { setView('search'); setSelected(undefined); }}>⌕ <span>搜索</span></button><button className={view === 'recent' ? 'active' : ''} onClick={() => void runSearch('recent', '')}>◷ <span>最近</span></button><button className={view === 'outputs' ? 'active' : ''} onClick={() => void runSearch('outputs', '')}>▱ <span>本地产物</span></button></nav><div className="wd-library-section-title"><span>我的资料</span><button aria-label="新建或导入" onClick={event => showMenu(event, { create: true })}>＋</button></div><div className="wd-library-tree" onClick={() => setView('library')}><Tree rows={tree} /></div><footer>本地资料库 · 仅当前设备</footer><input ref={upload} className="wd-library-upload" type="file" multiple accept=".md,.markdown,.txt,.html,.htm,.pdf,.docx,.pptx" onChange={event => void files(event.currentTarget.files)} /></aside>
    <main className="wd-library-content">{notice ? <div className="wd-library-toast success">{notice}</div> : null}{error ? <div className="wd-library-toast error">{error}</div> : null}
      {selected ? <><header className="wd-library-document-header"><div><span>{entryPath(selected).replace(` / ${selected.name}`, '')}</span><b>/</b><strong>{selected.name}</strong>{selected.asset?.status === 'disabled' ? <em>已停用</em> : selected.revision?.conversionStatus === 'failed' ? <em>转换失败</em> : selected.revision?.conversionStatus === 'pending' ? <em>转换中</em> : null}</div><div className="wd-library-head-actions">{isEditable(selected) ? <Button onClick={() => void beginEdit()}>编辑</Button> : null}<button type="button" onClick={() => void downloadOriginal()}>下载</button><button type="button" aria-label="更多操作" onClick={event => showMenu(event, { entry: selected })}>•••</button></div></header><div className="wd-library-document-body" data-kind={selected.asset?.kind}>{selected.revision?.conversionStatus === 'failed' ? <div className="wd-library-conversion-warning">原件已安全保存，但检索文本转换失败，因此暂不可搜索。仍可预览或下载原件。</div> : null}{draft ? <div className="wd-library-editor"><div className="wd-library-editor-bar"><strong>编辑草稿</strong><span>发布后生成新的只读修订</span><Button onClick={() => setDraft(undefined)}>取消</Button><Button variant="primary" className="primary" onClick={() => void publishDraft()}>发布新版本</Button></div><div className="wd-library-diff"><section><b>当前修订</b><pre>{draft.content}</pre></section><section><b>草稿预览</b><pre>{draftContent}</pre></section></div><Textarea aria-label="草稿内容" value={draftContent} onChange={event => setDraftContent(event.currentTarget.value)} /></div> : selected.asset?.status === 'disabled' ? <div className="wd-library-state">这份资料已停用。重新启用后才能查看或用于任务。</div> : originalUrl ? <iframe className="wd-library-pdf" title={selected.name} src={originalUrl} /> : htmlPreview ? <iframe className="wd-library-html" title={selected.name} sandbox="allow-scripts" srcDoc={isolatedHtml(htmlPreview)} /> : officePreview ? <div ref={officeHost} className="wd-library-office-preview" /> : <article className={`wd-library-original ${selected.asset?.kind ?? ''}`}><div className="wd-library-meta">修订 {selected.revision?.number ?? 1} · {selected.asset?.kind === 'docx' || selected.asset?.kind === 'pptx' ? 'Office 原始预览不可用，显示检索文本' : '原始内容'}</div>{selected.asset?.kind === 'markdown' ? <MarkdownDocument content={content} /> : <pre>{content}</pre>}</article>}</div></>
      : view === 'search' ? <div className="wd-library-list-view"><h2>搜索</h2><form onSubmit={event => { event.preventDefault(); void runSearch('search'); }}><Input autoFocus value={query} onChange={event => setQuery(event.currentTarget.value)} placeholder="搜索资料名称和内容"/><Button type="submit">搜索</Button></form><div className="wd-library-filters"><Select aria-label="资料类型" value={searchKind} onChange={event => setSearchKind(event.currentTarget.value as LibraryAssetKind | '')}><option value="">全部类型</option><option value="markdown">Markdown</option><option value="text">TXT</option><option value="html">HTML</option><option value="pdf">PDF</option><option value="docx">Word</option><option value="pptx">PowerPoint</option></Select><Select aria-label="资料来源" value={searchSource} onChange={event => setSearchSource(event.currentTarget.value as LibraryAsset['source'] | '')}><option value="">全部来源</option><option value="upload">上传导入</option><option value="created">新建资料</option><option value="task">本地产物</option></Select><label>更新日期从 <Input type="date" value={searchAfter} onChange={event => setSearchAfter(event.currentTarget.value)} /></label></div>{busy ? <div className="wd-library-state">正在搜索…</div> : <ResultList rows={resultEntries} hits={hits} open={open} />}</div>
      : view === 'recent' || view === 'outputs' ? <div className="wd-library-list-view"><h2>{view === 'recent' ? '最近' : '本地产物'}</h2>{busy ? <div className="wd-library-state">正在读取…</div> : <ResultList rows={resultEntries} hits={hits} open={open} />}</div>
      : <div className="wd-library-welcome"><div className="wd-library-welcome-icon">▤</div><h2>我的资料</h2><p>从左侧选择资料，在这里查看原始内容。</p><Button onClick={event => showMenu(event, { create: true })}>新建或导入资料</Button></div>}
    </main>
    {menu ? <div className="wd-library-popover" style={{ left: menu.x, top: menu.y }} onClick={event => event.stopPropagation()}>{menu.create ? <><button type="button" onClick={() => { setDialog({ kind: 'create-markdown', parentId: menu.parentId, value: '未命名文档.md' }); setMenu(undefined); }}>新建文档（.md）</button><button type="button" onClick={() => { setDialog({ kind: 'create-text', parentId: menu.parentId, value: '未命名文本.txt' }); setMenu(undefined); }}>新建文本（.txt）</button><button type="button" onClick={() => { setDialog({ kind: 'create-folder', parentId: menu.parentId, value: '新建文件夹' }); setMenu(undefined); }}>新建文件夹</button><hr/><button type="button" onClick={() => { uploadParent.current = menu.parentId; upload.current?.click(); setMenu(undefined); }}>上传和导入</button></> : menu.entry ? <>{menu.entry.kind === 'folder' ? <><button type="button" onClick={event => showMenu(event, { create: true, parentId: menu.entry!.id })}>在此新建或导入</button><hr/></> : null}<button type="button" onClick={() => void addToTask(menu.entry!)}>添加到新对话</button><hr/><button type="button" onClick={() => { beginMove(menu.entry!); setMenu(undefined); }}>移动到…</button><button type="button" onClick={() => { setDialog({ kind: 'rename', entry: menu.entry!, value: menu.entry!.name }); setMenu(undefined); }}>重命名</button>{menu.entry.asset ? <button type="button" onClick={() => { menu.entry!.asset?.status === 'disabled' ? void setStatus(menu.entry!) : setDialog({ kind: 'status', entry: menu.entry!, value: '' }); setMenu(undefined); }}>{menu.entry.asset.status === 'disabled' ? '重新启用' : '停用'}</button> : null}<button type="button" className="danger" onClick={() => { setDialog({ kind: 'remove', entry: menu.entry!, value: '' }); setMenu(undefined); }}>删除</button></> : null}</div> : null}
    <ActionModal dialog={dialog} setDialog={setDialog} submit={() => void submitDialog()} />
    <Modal open={Boolean(moving)} label={moving ? `移动“${moving.name}”` : '移动资料'} className="library-move-dialog" onClose={() => setMoving(undefined)}><h2>移动“{moving?.name}”</h2><p>选择新的保存位置</p><div className="library-move-targets">{moving ? folderTargets.filter(target => target.id !== moving.id).map(target => <Button key={target.id ?? 'root'} onClick={() => void move(target.id)}>📁 <span>{target.label}</span><i>›</i></Button>) : null}</div><div className="library-dialog-actions"><Button onClick={() => setMoving(undefined)}>取消</Button></div></Modal>
  </section>;
}

const isEditable = (entry?: LibraryTreeEntry) => entry?.asset?.status !== 'disabled' && (entry?.asset?.kind === 'markdown' || entry?.asset?.kind === 'text');
function ResultList({ rows, hits, open }: { rows: readonly LibraryTreeEntry[]; hits: readonly LibrarySearchHit[]; open: (row: LibraryTreeEntry) => Promise<void> }) {
  const typeName = { markdown: 'Markdown', text: 'TXT', html: 'HTML', pdf: 'PDF', docx: 'Word', pptx: 'PowerPoint' } as const;
  return rows.length ? <div className="wd-library-results">{rows.map(row => { const hit = hits.find(value => value.nodeId === row.id); return <button type="button" key={row.id} onClick={() => void open(row)}><span className={`wd-library-kind kind-${row.asset?.kind ?? 'folder'}`}>{icon(row)}</span><span><strong>{row.name}</strong><small>{row.asset ? typeName[row.asset.kind] : '文件夹'} · {hit?.folderPath ?? '我的资料'} · 修订 {row.revision?.number ?? 1} · {row.revision?.conversionStatus === 'ready' ? '可搜索' : row.revision?.conversionStatus === 'failed' ? '转换失败' : '转换中'}</small><small>{row.asset?.source === 'task' ? '本地产物' : row.asset?.source === 'created' ? '新建资料' : '上传导入'} · {new Date(row.updatedAt).toLocaleString()}{hit?.location ? ` · ${hit.location}` : ''}</small>{hit?.excerpt ? <span className="wd-library-excerpt">{hit.excerpt}</span> : null}</span><i>›</i></button>; })}</div> : <div className="wd-library-state">没有找到资料。</div>;
}

function ActionModal({ dialog, setDialog, submit }: { dialog?: ActionDialog; setDialog: (value?: ActionDialog) => void; submit: () => void }) {
  const input = dialog && ['create-markdown', 'create-text', 'create-folder', 'rename'].includes(dialog.kind);
  const title = !dialog ? '' : dialog.kind === 'create-markdown' ? '新建 Markdown 文档' : dialog.kind === 'create-text' ? '新建 TXT 文本' : dialog.kind === 'create-folder' ? '新建文件夹' : dialog.kind === 'rename' ? '重命名' : dialog.kind === 'remove' ? '删除资料' : '停用资料';
  const entry = dialog && 'entry' in dialog ? dialog.entry : undefined;
  return <Modal open={Boolean(dialog)} label={title || '资料操作'} className="library-action-dialog" onClose={() => setDialog(undefined)}><form onSubmit={event => { event.preventDefault(); submit(); }}><h2>{title}</h2>{input && dialog ? <label>名称<Input autoFocus value={dialog.value} onChange={event => setDialog({ ...dialog, value: event.currentTarget.value })} /></label> : <p>{dialog?.kind === 'remove' ? `删除“${entry?.name}”及其本地修订？此操作无法撤销。` : `停用“${entry?.name}”后，它将不再参与搜索和任务引用。`}</p>}<div className="library-dialog-actions"><Button type="button" onClick={() => setDialog(undefined)}>取消</Button><Button variant="primary" tone={dialog?.kind === 'remove' ? 'danger' : undefined} className={dialog?.kind === 'remove' ? 'danger' : 'primary'} type="submit">{dialog?.kind === 'remove' ? '删除' : dialog?.kind === 'status' ? '停用' : '确定'}</Button></div></form></Modal>;
}

function MarkdownDocument({ content }: { content: string }) {
  const rows = content.replace(/\r\n?/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let code: string[] | undefined;
  let list: string[] = [];
  const flushList = () => { if (list.length) { blocks.push(<ul key={`list-${blocks.length}`}>{list.map((item, index) => <li key={index}>{inlineMarkdown(item)}</li>)}</ul>); list = []; } };
  rows.forEach((row, index) => {
    if (/^```/.test(row)) { if (code) { blocks.push(<pre className="md-code" key={`code-${index}`}><code>{code.join('\n')}</code></pre>); code = undefined; } else { flushList(); code = []; } return; }
    if (code) { code.push(row); return; }
    const heading = /^(#{1,6})\s+(.+)$/.exec(row);
    if (heading) { flushList(); const level = heading[1].length; blocks.push(React.createElement(`h${level}`, { key: `h-${index}` }, inlineMarkdown(heading[2]))); return; }
    const bullet = /^[-*+]\s+(.+)$/.exec(row);
    if (bullet) { list.push(bullet[1]); return; }
    flushList();
    if (/^---+$/.test(row.trim())) blocks.push(<hr key={`hr-${index}`} />);
    else if (row.trim()) blocks.push(<p key={`p-${index}`}>{inlineMarkdown(row)}</p>);
  });
  flushList();
  if (code) blocks.push(<pre className="md-code" key="code-last"><code>{code.join('\n')}</code></pre>);
  return <div className="wd-library-markdown">{blocks}</div>;
}

function inlineMarkdown(value: string) {
  const parts = value.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => part.startsWith('`') ? <code key={index}>{part.slice(1, -1)}</code> : part.startsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part);
}

function isolatedHtml(source: string) {
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; media-src data: blob:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; frame-src 'none';">`;
  return /<head(?:\s[^>]*)?>/i.test(source) ? source.replace(/<head(?:\s[^>]*)?>/i, match => `${match}${policy}`) : `${policy}${source}`;
}
