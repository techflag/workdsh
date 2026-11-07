import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Icon } from 'workdsh-ui';
import type { DriveEditorHandle, DriveEditorRegistry, DriveTreeEntry } from 'workdsh-contracts/drive';
import type { DriveClient } from './management.js';
import { driveSizeLabel } from './DriveFileList.js';

/** 预览输入：主区由 DriveTreeEntry 构建，侧栏由 tab params 构建。 */
export interface DrivePreviewInput {
  readonly fileId: string;
  readonly revisionId?: string;
  readonly name: string;
  readonly kind: string;
  readonly mediaType?: string;
  readonly byteLength?: number;
  readonly source?: string;
  readonly sessionId?: string;
  readonly folderPath?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  /** 从文件菜单直接进入在线编辑：挂载后自动打开编辑器。 */
  readonly autoEdit?: boolean;
}

/** 在线预览上限：再大的文件只在浏览器里解码会明显卡顿，改为提示下载。 */
const MAX_PREVIEW_BYTES = 25 * 1024 * 1024;
/** 在线编辑上限：整份文件要进浏览器内存，且保存时会再复制一份用于写回。 */
const MAX_EDIT_BYTES = 25 * 1024 * 1024;
const TEXT_MEDIA = /^text\//i;
const TEXT_LIKE = /^(application\/(json|xml|x-yaml|yaml|javascript|typescript|x-sh|sql|toml)|[a-z]+\/[a-z0-9.+-]*\+(json|xml))\b/i;

/** 只有真正可安全按文本解码的类型才进 <pre>；PDF/DOCX 等按文本解码只会得到乱码。 */
const isTextLike = (input: DrivePreviewInput): boolean => {
  const mediaType = input.mediaType ?? '';
  if (TEXT_MEDIA.test(mediaType) || TEXT_LIKE.test(mediaType)) return true;
  return input.kind === 'document' && Boolean(input.name && /\.[a-z0-9]+$/i.test(input.name) && !mediaType);
};
const isMedia = (kind: string): boolean => kind === 'image' || kind === 'video' || kind === 'audio';

const sourceLabel = (source?: string): string => source === 'ai-generated' || source === 'user-upload' || source === 'tool-output' ? ({ 'ai-generated': 'AI 生成', 'user-upload': '用户上传', 'tool-output': '工具输出' } as const)[source] : source || '未知来源';
const kindLabel = (kind?: string): string => ({ document: '文档', image: '图片', video: '视频', audio: '音频', archive: '压缩包', other: '文件' }[kind ?? ''] ?? kind ?? '文件');

export function DrivePreview({ management, input, editors, onClose, onSaved }: { management: DriveClient; input: DrivePreviewInput; editors?: DriveEditorRegistry; onClose?: () => void; onSaved?: (entry: DriveTreeEntry) => void }) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [editing, setEditing] = useState(false);
  const [writing, setWriting] = useState<'save' | 'exit' | null>(null);
  const [saveNote, setSaveNote] = useState('');
  const [saveError, setSaveError] = useState('');
  const [editorHost, setEditorHost] = useState<HTMLDivElement | null>(null);
  const editorRef = useRef<DriveEditorHandle | null>(null);
  const baseRef = useRef<{ revisionId: string; bytes: Uint8Array } | null>(null);
  const autoEditRef = useRef(Boolean(input.autoEdit));
  const textMode = isTextLike(input);
  const mediaMode = isMedia(input.kind);
  const oversized = input.byteLength != null && input.byteLength > MAX_PREVIEW_BYTES;
  const previewable = (textMode || mediaMode) && !oversized;
  // 编辑能力由编辑类插件注入，可能晚于网盘加载：订阅注册表变更，按钮随能力出现。
  const editable = React.useSyncExternalStore(
    listener => (editors ? editors.subscribe(listener) : () => undefined),
    () => Boolean(editors?.canEdit(input.name)),
    () => false,
  );

  useEffect(() => {
    setError(''); setText(''); setUrl(old => { if (old) URL.revokeObjectURL(old); return ''; });
    // 不可在线预览的格式不下载字节：仅展示元信息，避免为看一眼属性而拉取整份文件。
    if (!previewable) { setBusy(false); return undefined; }
    setBusy(true);
    const controller = new AbortController();
    let objectUrl = '';
    const run = async () => {
      try {
        const blob = await management.download(input.fileId, input.revisionId, controller.signal);
        if (controller.signal.aborted) return;
        if (textMode) setText(await blob.text());
        else {
          objectUrl = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: input.mediaType || 'application/octet-stream' }));
          setUrl(objectUrl);
        }
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '读取文件失败。'); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    };
    void run();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [management, input.fileId, input.revisionId, input.mediaType, previewable, textMode]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  // 编辑器挂载：只把字节与文件名交给编辑类插件，网盘自己不做文档解析。
  useEffect(() => {
    const base = baseRef.current;
    if (!editing || !editorHost || !editors || !base) return undefined;
    const target = editorHost;
    let cancelled = false;
    const mount = async () => {
      try {
        const handle = await editors.mount(target, { fileId: input.fileId, revisionId: base.revisionId, name: input.name, bytes: base.bytes });
        if (cancelled) { handle.dispose(); target.replaceChildren(); return; }
        editorRef.current = handle;
      } catch (cause) {
        if (cancelled) return;
        setEditing(false);
        setError(cause instanceof Error ? cause.message : '打开在线编辑失败。');
      }
    };
    void mount();
    return () => {
      cancelled = true;
      editorRef.current?.dispose();
      editorRef.current = null;
      target.replaceChildren();
    };
  }, [editing, editorHost, editors, input.fileId, input.name]);
  // 切换文件或关闭预览时，编辑基线必须释放，避免旧字节继续占用内存。
  useEffect(() => () => { baseRef.current = null; }, [input.fileId]);

  const download = async () => {
    setError(''); setDownloading(true);
    try {
      const blob = await management.download(input.fileId, input.revisionId);
      const objectUrl = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: input.mediaType || 'application/octet-stream' }));
      const link = document.createElement('a'); link.href = objectUrl; link.download = input.name; link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '下载失败。'); }
    finally { setDownloading(false); }
  };

  /** 打开编辑器前重新取当前修订：并发基线必须是服务端此刻的 currentRevisionId。 */
  const openEditor = async () => {
    if (!editors) return;
    setError(''); setSaveNote(''); setSaveError(''); setOpening(true);
    try {
      const entry = await management.stat(input.fileId);
      if (!entry.file || !entry.revision) throw new Error('该节点不是可编辑文件。');
      if (entry.file.byteLength > MAX_EDIT_BYTES) throw new Error(`文件较大（${driveSizeLabel(entry.file.byteLength)}），暂不支持在线编辑，请下载后处理。`);
      const blob = await management.download(input.fileId);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      baseRef.current = { revisionId: entry.revision.id, bytes };
      setEditing(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '打开在线编辑失败。'); }
    finally { setOpening(false); }
  };

  // 从文件菜单直接进入编辑：编辑能力可能晚于预览加载，等到注册表就绪后只自动打开一次。
  useEffect(() => {
    if (!autoEditRef.current || !editable || editing) return;
    autoEditRef.current = false;
    void openEditor();
  }, [editable, editing]);

  /** 写回网盘：追加新修订，成功后把基线推进到新修订以支持连续保存。 */
  const commit = async (bytes: Uint8Array) => {
    const base = baseRef.current;
    if (!base) throw new Error('缺少编辑基线，请重新打开文件。');
    const entry = await management.appendRevision({ fileId: input.fileId, revisionId: base.revisionId, bytes });
    if (entry.revision) baseRef.current = { ...base, revisionId: entry.revision.id };
    // 写回成功才推进编辑器基线：否则退出编辑会再追加一条同内容修订。
    if (entry.revision) editorRef.current?.acknowledge?.();
    setSaveNote(entry.revision ? `已保存为第 ${entry.revision.number} 版。` : '已保存。');
    onSaved?.(entry);
  };

  const save = async () => {
    const handle = editorRef.current;
    if (!handle || writing) return;
    setWriting('save'); setSaveError(''); setSaveNote('');
    try {
      const bytes = await handle.save();
      if (!bytes) { setSaveNote('没有需要保存的修改。'); return; }
      await commit(bytes);
    } catch (cause) { setSaveError(cause instanceof Error ? cause.message : '保存失败。'); }
    finally { setWriting(null); }
  };

  /** 退出时先尝试写回；保存失败就留在编辑器里，不静默丢弃修改。 */
  const exitEditor = async () => {
    const handle = editorRef.current;
    if (writing) return;
    setSaveError('');
    if (handle) {
      setWriting('exit');
      try {
        const bytes = await handle.save();
        if (bytes) await commit(bytes);
      } catch (cause) {
        setSaveError(cause instanceof Error ? cause.message : '保存失败。');
        setWriting(null);
        return;
      }
      setWriting(null);
    }
    setEditing(false);
    setSaveNote(''); setSaveError(''); baseRef.current = null;
  };

  const meta = <div className="wd-drive-preview-meta">
    <div><span>名称</span><b>{input.name}</b></div>
    <div><span>类型</span><b>{kindLabel(input.kind)}{input.mediaType ? ` · ${input.mediaType}` : ''}</b></div>
    {input.byteLength != null ? <div><span>大小</span><b>{driveSizeLabel(input.byteLength)}</b></div> : null}
    <div><span>位置</span><b>{input.folderPath || '我的网盘'}</b></div>
    <div><span>来源</span><b>{sourceLabel(input.source)}</b></div>
    {input.sessionId ? <div><span>关联会话</span><b>{input.sessionId}</b></div> : null}
    {input.updatedAt ? <div><span>更新时间</span><b>{new Date(input.updatedAt).toLocaleString()}</b></div> : null}
  </div>;
  const notice = oversized ? `文件较大（${driveSizeLabel(input.byteLength ?? 0)}），暂不在线预览，可下载后查看。` : '该格式暂不支持在线预览，可下载后查看。';
  const busyEditing = writing !== null;
  return <section className="wd-drive-preview">
    <header className="wd-drive-preview-header">
      {onClose ? <button onClick={onClose} disabled={busyEditing}><Icon name="back" size={16} /> 返回列表</button> : null}
      <strong>{input.name}</strong>
      <span>{kindLabel(input.kind)} · {sourceLabel(input.source)}</span>
      <span className="spacer" />
      {editable && !editing ? <button onClick={() => void openEditor()} disabled={opening}>{opening ? '打开中…' : '在线编辑'}</button> : null}
      <button onClick={() => void download()} disabled={downloading || busyEditing}><Icon name="download" size={16} /> {downloading ? '下载中…' : '下载'}</button>
    </header>
    <div className={`wd-drive-preview-body${editing ? ' editing' : ''}`}>
      {editing ? <div className="wd-drive-editor">
        <div className="wd-drive-editor-bar">
          <span className={saveError ? 'wd-drive-editor-status error' : 'wd-drive-editor-status'} role="status">{saveError || saveNote || '编辑中的修改需保存才会写回网盘。'}</span>
          <span className="spacer" />
          <button onClick={() => void save()} disabled={busyEditing}>{writing === 'save' ? '保存中…' : '保存到网盘'}</button>
          <button onClick={() => void exitEditor()} disabled={busyEditing}>{writing === 'exit' ? '退出中…' : '退出编辑'}</button>
        </div>
        <div className="wd-drive-editor-host" ref={setEditorHost} />
      </div>
        : error ? <div className="wd-drive-state error">{error}</div>
          : !previewable ? <div className="wd-drive-preview-meta-wrap">{meta}<div className="wd-drive-preview-notice">{notice}</div></div>
            : busy ? <div className="wd-drive-state">正在读取文件…</div>
              : url ? (input.kind === 'image' ? <img src={url} alt={input.name} /> : input.kind === 'video' ? <video src={url} controls /> : <audio src={url} controls />)
                : textMode ? <pre>{text || '（空文件）'}</pre>
                  : <div className="wd-drive-preview-meta-wrap">{meta}</div>}
    </div>
  </section>;
}
