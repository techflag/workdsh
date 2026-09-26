import { Button, Select } from 'workdsh-ui';
import { Modal } from 'workdsh-ui';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { zipSync } from 'fflate';
import type { SkillInstallScope, StagedSkillImport } from '../shared.js';
import type { SkillManagementClient } from './management.js';

type ImportSkillModalProps = {
  readonly open: boolean;
  readonly management: SkillManagementClient;
  readonly onClose: () => void;
  readonly onInstalled: (name: string) => Promise<void> | void;
};

const maximumBytes = 50 * 1024 * 1024;
function messageOf(cause: unknown): string { return cause instanceof Error ? cause.message : '技能导入失败，请重试。'; }
function sizeOf(bytes: number): string { return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KiB` : `${(bytes / 1024 / 1024).toFixed(1)} MiB`; }

async function packageSelection(files: FileList | readonly File[], signal: AbortSignal): Promise<File> {
  signal.throwIfAborted();
  const selected = [...files];
  if (!selected.length) throw new Error('请选择技能文件。');
  if (selected.length === 1 && !selected[0].webkitRelativePath) return selected[0];
  if (selected.length > 400) throw new Error('技能目录最多包含 400 个文件。');
  const total = selected.reduce((sum, file) => sum + file.size, 0);
  if (total > maximumBytes) throw new Error('技能目录不得超过 50 MiB。');
  const entries: Record<string, Uint8Array> = {};
  for (const file of selected) {
    signal.throwIfAborted();
    const path = file.webkitRelativePath || file.name;
    entries[path] = new Uint8Array(await file.arrayBuffer());
  }
  signal.throwIfAborted();
  return new File([zipSync(entries, { level: 6 })], 'skill-directory.zip', { type: 'application/zip' });
}

export function ImportSkillModal({ open, management, onClose, onInstalled }: ImportSkillModalProps) {
  const [staged, setStaged] = useState<StagedSkillImport>();
  const [scope, setScope] = useState<SkillInstallScope>('shared-agents');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const operationAbort = useRef<AbortController | undefined>(undefined);

  const discard = async () => {
    const current = staged;
    setStaged(undefined); setError(''); setBusy(false); setDragging(false); setScope('shared-agents');
    if (current) await management.discardImport(current.id).catch(() => {});
  };
  const close = () => { operationAbort.current?.abort(); void discard(); onClose(); };
  useEffect(() => () => { operationAbort.current?.abort(); if (staged) void management.discardImport(staged.id).catch(() => {}); }, [management, staged]);

  const inspect = async (files: FileList | readonly File[]) => {
    setBusy(true); setError('');
    const controller = new AbortController(); operationAbort.current?.abort(); operationAbort.current = controller;
    try {
      if (staged) await management.discardImport(staged.id).catch(() => {});
      const upload = await packageSelection(files, controller.signal);
      if (upload.size > maximumBytes) throw new Error('技能包不得超过 50 MiB。');
      setStaged(await management.stageImport(upload, controller.signal));
    } catch (cause) { setStaged(undefined); if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError(messageOf(cause)); }
    finally { if (operationAbort.current === controller) operationAbort.current = undefined; setBusy(false); }
  };
  const install = async () => {
    if (!staged) return;
    setBusy(true); setError('');
    const controller = new AbortController(); operationAbort.current?.abort(); operationAbort.current = controller;
    try {
      const receipt = await management.commitImport(staged.id, scope, controller.signal);
      setStaged(undefined);
      // Close the import layer before opening the installed skill detail. This
      // preserves one modal at a time and prevents the hidden import backdrop
      // from intercepting the next page action after detail is closed.
      onClose();
      await onInstalled(receipt.name);
    }
    catch (cause) { setError(messageOf(cause)); }
    finally { if (operationAbort.current === controller) operationAbort.current = undefined; setBusy(false); }
  };

  return <Modal open={open} label="导入技能" className="import-skill-dialog" onClose={close}>
    <header className="import-header"><h2>导入技能</h2><p>添加技能包，扩展你的工作能力。</p></header>
    <div className="import-content">
    {!staged ? <>
      <button type="button" className={`import-dropzone${dragging ? ' dragging' : ''}`} disabled={busy}
        onClick={() => fileInput.current?.click()}
        onDragEnter={event => { event.preventDefault(); setDragging(true); }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={event => { if (event.currentTarget === event.target) setDragging(false); }}
        onDrop={event => { event.preventDefault(); setDragging(false); void inspect(event.dataTransfer.files); }}>
        <span className="upload-glyph" aria-hidden>↥</span>
        <strong>{busy ? '正在上传并预检…' : '拖拽文件或点击上传'}</strong>
        <small>.zip 技能包或 SKILL.md</small>
      </button>
      {busy && <Button type="button" className="folder-picker" onClick={() => operationAbort.current?.abort()}>取消上传</Button>}
      <input ref={fileInput} className="visually-hidden" type="file" accept=".zip,.md,text/markdown,application/zip" onChange={event => { if (event.currentTarget.files) void inspect(event.currentTarget.files); event.currentTarget.value = ''; }} />
      <input ref={folderInput} className="visually-hidden" type="file" multiple {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)} onChange={event => { if (event.currentTarget.files) void inspect(event.currentTarget.files); event.currentTarget.value = ''; }} />
      <Button type="button" className="folder-picker" disabled={busy} onClick={() => folderInput.current?.click()}>选择技能文件夹</Button>
      <section className="import-requirements"><h3>文件要求</h3><ul><li>压缩包或文件夹内必须且只能包含一个 SKILL.md</li><li>SKILL.md 的 YAML frontmatter 必须包含合法的 name 和 description</li><li>最多 50 MiB、400 个文件、6 层资源目录</li><li>路径穿越和符号链接会被拒绝；脚本仅作为资源保存，不会在导入时执行</li></ul></section>
    </> : <section className="import-review" data-testid="skill-import-review">
      <div className="import-review-title"><span className="skill-mark" aria-hidden>{staged.inspection.name[0]}</span><div><h3>{staged.inspection.name}</h3><p>{staged.inspection.description}</p></div></div>
      <dl><dt>来源文件</dt><dd>{staged.fileName}</dd><dt>文件</dt><dd>{staged.inspection.files.length} 个，{sizeOf(staged.inspection.totalBytes)}</dd><dt>安装范围</dt><dd><Select value={scope} onChange={event => setScope(event.currentTarget.value as SkillInstallScope)}><option value="shared-agents">所有 WorkDSH 任务（共享）</option><option value="profile">当前 Harness Profile</option></Select></dd></dl>
      <details><summary>查看文件清单</summary><ul className="import-file-list">{staged.inspection.files.map(path => <li key={path}>{path}</li>)}</ul></details>
      <p className="import-note">预检已通过。确认后才会写入 Harness 官方技能目录；若已存在同名技能，安装会停止且不会覆盖。</p>

    </section>}
    {error && <p className="error" role="alert">{error}</p>}
    </div>
    {staged && <footer className="import-footer"><div className="import-actions"><Button type="button" onClick={() => busy ? operationAbort.current?.abort() : void discard()}>{busy ? '取消安装' : '重新选择'}</Button><Button variant="primary" type="button" className="install" disabled={busy} onClick={() => void install()}>{busy ? '正在安装…' : '确认安装'}</Button></div></footer>}
  </Modal>;
}
