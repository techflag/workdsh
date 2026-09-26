import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { LibraryOriginalPreviewInput, LibraryOriginalPreviewRegistry } from 'workdsh-contracts/library';
import type { LibraryClient } from './management.js';

type Params = { assetId?: string; revisionId?: string; name?: string; kind?: string };
type Props = PropsRuntime<'sidebar.right.pane.tab'> & { management: LibraryClient; previewRegistry: LibraryOriginalPreviewRegistry };

export function LibraryReferencePage({ management, previewRegistry, useTabInfo }: Props) {
  const info = useTabInfo();
  const params = info.tab.navigation.params as Params | undefined;
  const [html, setHtml] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [office, setOffice] = useState<LibraryOriginalPreviewInput>();
  const [error, setError] = useState('');
  const officeHost = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setHtml(''); setText(''); setOffice(undefined); setError('');
    setUrl(old => { if (old) URL.revokeObjectURL(old); return ''; });
    if (!params?.assetId || !params.revisionId) { setError('资料引用不完整。'); return; }
    let active = true;
    const run = async () => {
      try {
        if (params.kind === 'html' || params.kind === 'pdf' || params.kind === 'docx' || params.kind === 'pptx') {
          const bytes = await management.readOriginal(params.assetId!, params.revisionId);
          if (!active) return;
          if (params.kind === 'html') setHtml(new TextDecoder().decode(bytes));
          else if (params.kind === 'pdf') setUrl(URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' })));
          else setOffice({ name: params.name ?? '资料', kind: params.kind, bytes } as LibraryOriginalPreviewInput);
        } else setText(await management.readText(params.assetId!, params.revisionId));
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : '资料读取失败。'); }
    };
    void run();
    return () => { active = false; };
  }, [management, params?.assetId, params?.revisionId, params?.kind, params?.name, info.tab.navigation.revision]);
  useEffect(() => {
    if (!office || !officeHost.current) return;
    let dispose = () => {};
    let active = true;
    void previewRegistry.mount(officeHost.current, office).then(next => { if (active) dispose = next; else next(); }).catch(cause => setError(cause instanceof Error ? cause.message : '原件预览失败。'));
    return () => { active = false; dispose(); };
  }, [office, previewRegistry]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return <section aria-label="资料引用预览" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-primary)' }}>
    <header style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--dsw-alias-border-l2)', fontWeight: 600 }}>{params?.name ?? '资料预览'}</header>
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{error ? <div style={{ padding: 24, color: 'var(--dsw-alias-state-error-primary)' }}>{error}</div> : html ? <iframe title={params?.name} sandbox="allow-scripts" srcDoc={isolateHtml(html)} style={{ width: '100%', height: '100%', border: 0, background: '#fff' }} /> : url ? <iframe title={params?.name} src={url} style={{ width: '100%', height: '100%', border: 0 }} /> : office ? <div ref={officeHost} style={{ height: '100%' }} /> : text ? <pre style={{ margin: 0, padding: 24, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'inherit', lineHeight: 1.7 }}>{text}</pre> : <div style={{ padding: 24, color: 'var(--dsw-alias-label-tertiary)' }}>正在读取资料…</div>}</div>
  </section>;
}

function isolateHtml(source: string) {
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; media-src data: blob:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; frame-src 'none';">`;
  return /<head(?:\s[^>]*)?>/i.test(source) ? source.replace(/<head(?:\s[^>]*)?>/i, match => `${match}${policy}`) : `${policy}${source}`;
}
