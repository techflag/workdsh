import {ImportedPptx} from './presentation/ImportedPptx.js';
import React, { useEffect, useRef, useState } from 'react';
import type { DocumentPreviewProps } from '@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client';
import editorHtml from './editor.html';

function LegacyOfficeDocument({ content, resourceAddress }: DocumentPreviewProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (content.kind !== 'bytes') return;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== 'workdsh-office-ready') return;
      const address = decodeURIComponent(resourceAddress);
      const extension = /\.(xlsx|docx|pptx)(?:$|[?&#/])/i.exec(address)?.[1]?.toLowerCase();
      frame.current.contentWindow?.postMessage({ type: 'workdsh-office-open', extension, bytes: content.data.slice() }, '*');
    };
    window.addEventListener('message', onMessage);
    // Owner changes replace the document. The editor stays isolated from the app's DOM/credentials.
    if (frame.current) frame.current.srcdoc = editorHtml;
    return () => window.removeEventListener('message', onMessage);
  }, [content, resourceAddress]);
  return <iframe ref={frame} title="Office 文档编辑" sandbox="allow-scripts allow-downloads" style={{ width: '100%', height: '100%', minHeight: 480, border: 0 }} />;
}
import { LiveDocument } from './live/DocumentPage.js';
import { importDocx } from './live/import-docx.js';
import { officeCss } from './live/style.js';
import type { OfficeClient } from './live/model.js';
export function OfficeDocument(props: DocumentPreviewProps & {office: OfficeClient}) {
  const docx = /\.docx(?:$|[?&#/])/i.test(decodeURIComponent(props.resourceAddress));
  if (/\.pptx(?:$|[?&#/])/i.test(decodeURIComponent(props.resourceAddress))) return <ImportedPptx key={props.resourceAddress} {...props}/>;
  return docx ? <ImportedDocument key={props.resourceAddress} {...props} /> : <LegacyOfficeDocument {...props} />;
}
function ImportedDocument(props: DocumentPreviewProps & {office: OfficeClient}) {
  const info = props.useTabInfo(), sessionId = String(props.sessionId);
  const [imported, setImported] = useState<{documentId: string; warnings: string[]} | null>(null);
  const [error, setError] = useState(''), [original, setOriginal] = useState(false), [editing, setEditing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const signature = useRef('');
  const contentBytes = props.content.kind === 'bytes' ? props.content.data : null;
  useEffect(() => {
    const abort = new AbortController(), signal = AbortSignal.any([abort.signal, info.tab.signal]);
    setError('');
    if (contentBytes) {
      const bytes = contentBytes.slice();
      void (async () => {
        try {
          const data = await importDocx(bytes, props.resourceAddress);
          signal.throwIfAborted();
          if (signature.current === data.operationId) return;
          if (editing && signature.current) {
            setError('原文件已更新。当前编辑内容已保留，请完成编辑后再加载新的原文件副本。');
            return;
          }
          const title = decodeURIComponent(props.resourceAddress).split('/').pop()?.split(/[?#]/)[0]?.replace(/\.docx$/i,'').slice(0,145) || '导入文档';
          const snapshot = await props.office.importDocument(sessionId, {source: 'import', title: title + ' · 编辑副本', operationId: data.operationId, blocks: data.blocks}, signal);
          if (!signal.aborted) {
            signature.current = data.operationId;
            setImported({documentId: snapshot.documentId, warnings: data.warnings});
          }
        } catch (e) {
          if (!signal.aborted) setError(e instanceof Error ? e.message : String(e));
        }
      })();
    }
    return () => abort.abort();
  }, [contentBytes, props.resourceAddress, props.office, sessionId, info.tab.signal, attempt, editing]);
  const downloadOriginal = () => {
    if (props.content.kind !== 'bytes') return;
    const url = URL.createObjectURL(new Blob([props.content.data.slice()], {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));
    const a = document.createElement('a'); a.href = url;
    a.download = decodeURIComponent(props.resourceAddress).split('/').pop()?.split(/[?#]/)[0] || '原文档.docx';
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="wd-office-live" aria-label="DOCX文档编辑">
    <style>{officeCss}</style>
    <div className="wd-office-toolbar">
      <span>DOCX · {original ? '原始预览' : '编辑副本'}</span>
      <button disabled={editing} onClick={() => setOriginal(!original)}>{original ? '返回编辑器' : '查看原始排版'}</button>
      <button onClick={downloadOriginal} disabled={props.content.kind !== 'bytes'}>下载原文件</button>
    </div>
    <div className="wd-office-import-note" role="note">在副本中编辑文字、表格和嵌入图片，自动保存；下载 Word 导出编辑副本，不覆盖原文件。{imported?.warnings.length ? `原文件含${imported.warnings.join('、')}，这些内容尚未完整导入。请用“查看原始排版”核对，“下载原文件”保留完整原件。` : '原始页面排版可能与编辑器不同。'}</div>
    {error && imported && <div role="alert" className="wd-office-import-note">{error}</div>}
    {original ? <LegacyOfficeDocument {...props} /> : imported ? <LiveDocument key={imported.documentId} documentId={imported.documentId} sessionId={sessionId} office={props.office} visible={info.tab.visible} signal={info.tab.signal} onEditing={setEditing} /> : <div className="wd-office-empty" role={error ? 'alert' : 'status'}>{error || '正在导入DOCX正文…'}{error && <button onClick={() => setAttempt(attempt + 1)}>重试导入</button>}</div>}
  </section>;
}
