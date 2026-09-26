import { Button } from 'workdsh-ui';
import * as React from 'react';
import { useRef, useState } from 'react';
import type { ImportPreview } from '../shared.js';
import type { ExpertManagementClient } from './management.js';

export type ImportExpertModalProps = {
  readonly management: ExpertManagementClient;
  readonly onClose: () => void;
  readonly onImported: (expertId: string) => void;
};

function messageOf(cause: unknown): string { return cause instanceof Error ? cause.message : '导入失败，请重试。'; }

/**
 * Local import: stage the uploaded package, preview the candidate definition with its
 * issues and missing dependencies, then commit into a new editable draft. Nothing is
 * published here — the user reviews and publishes from the editor afterwards.
 */
export function ImportExpertModal({ management, onClose, onImported }: ImportExpertModalProps) {
  const [preview, setPreview] = useState<ImportPreview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const ingest = async (file: File) => {
    setBusy(true); setError(''); setPreview(undefined); setFileName(file.name);
    try {
      const staged = await management.stageImport(file);
      const result = await management.previewImport(staged.uploadedArtifactRef);
      setPreview(result);
    } catch (cause) { setError(messageOf(cause)); }
    finally { setBusy(false); }
  };

  const commit = async () => {
    if (!preview) return;
    setBusy(true); setError('');
    try {
      const draft = await management.commitImport(preview.importPlanId, preview.previewDigest, management.newOperationId('commit-import'));
      onImported(draft.expertId);
    } catch (cause) { setError(messageOf(cause)); setBusy(false); }
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault(); setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void ingest(file);
  };

  if (preview) {
    const blocking = preview.issues.length > 0;
    return <>
      <h2>导入预览</h2>
      <div className="review">
        <h3>{preview.candidate.name || '（未命名专家）'}</h3>
        <dl>
          <dt>简介</dt><dd>{preview.candidate.description || '—'}</dd>
          <dt>来源文件</dt><dd>{fileName || '—'}</dd>
          <dt>预览摘要</dt><dd className="digest">{preview.previewDigest}</dd>
          <dt>Skill 依赖</dt><dd>{preview.candidate.skillRequirements.length > 0 ? preview.candidate.skillRequirements.map(req => req.name).join('、') : '无'}</dd>
        </dl>
        {preview.missingDependencies.length > 0 && <>
          <h4 className="error-text">缺失依赖（{preview.missingDependencies.length}）</h4>
          <ul className="issue-list">{preview.missingDependencies.map((issue, index) => <li key={index}>{issue.message}</li>)}</ul>
        </>}
        {preview.issues.length > 0 && <>
          <h4 className="error-text">校验问题（{preview.issues.length}）</h4>
          <ul className="issue-list">{preview.issues.map((issue, index) => <li key={index}>{issue.message}{issue.path ? `（${issue.path}）` : ''}</li>)}</ul>
        </>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      <div className="import-actions">
        <Button onClick={() => { setPreview(undefined); setFileName(''); setError(''); }} disabled={busy}>重新选择</Button>
        <Button variant="primary" className="install" onClick={() => void commit()} disabled={busy || blocking}>{busy ? '正在导入…' : blocking ? '存在校验问题，无法导入' : '导入为我的草稿'}</Button>
      </div>
    </>;
  }

  return <>
    <h2>导入专家</h2>
    <p className="muted" style={{ margin: '0 0 16px' }}>选择此前导出的专家包（.zip）。导入后会创建为可编辑草稿，需你确认后再发布。</p>
    <button type="button" className={`dropzone ${dragging ? 'dragging' : ''}`} disabled={busy}
      onClick={() => input.current?.click()}
      onDragOver={event => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}>
      <span className="upload-glyph" aria-hidden>↑</span>
      <strong>{busy ? '正在解析…' : '点击选择或拖拽专家包到此处'}</strong>
      <small>{fileName || '仅支持本地导出的 .zip 专家包'}</small>
    </button>
    <input ref={input} type="file" accept=".zip,application/zip" className="visually-hidden" aria-label="选择专家包"
      onChange={event => { const file = event.currentTarget.files?.[0]; if (file) void ingest(file); event.currentTarget.value = ''; }} />
    {error && <p className="error" role="alert">{error}</p>}
    <div className="import-actions">
      <Button onClick={onClose} disabled={busy}>取消</Button>
    </div>
  </>;
}
