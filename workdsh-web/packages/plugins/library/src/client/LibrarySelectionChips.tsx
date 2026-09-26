import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { LibraryAssetKind, LibraryTaskReference } from 'workdsh-contracts/library';
import type { LibraryClient } from './management.js';
import { listenForLibrarySelection, notifyLibrarySelectionChanged, requestLibraryPicker } from './selection-events.js';

type Props = PropsRuntime<'conversation.input.overlay'> & { management: LibraryClient };
const labels: Record<LibraryAssetKind, string> = { markdown: 'M', text: 'T', html: '</>', pdf: 'PDF', docx: 'W', pptx: 'P' };
const css = `
[data-composer-card]:has(.wd-library-selection-chips){padding-top:50px}
.wd-library-selection-chips{box-sizing:border-box;position:absolute;z-index:2;top:9px;left:12px;right:12px;height:34px;display:flex;align-items:center;gap:7px;overflow-x:auto;scrollbar-width:none;pointer-events:auto}
.wd-library-selection-chips::-webkit-scrollbar{display:none}.wd-library-selection-chips button{font:inherit}
.wd-library-selection-source,.wd-library-selection-chip{flex:none;height:30px;border:0;border-radius:10px;display:flex;align-items:center;gap:7px;color:var(--dsw-alias-label-primary,#eee);background:var(--dsw-specific-selector,#303030)}
.wd-library-selection-source{padding:0 11px;cursor:pointer}.wd-library-selection-source:hover{background:var(--dsw-alias-interactive-bg-hover-solid,#3a3a3a)}
.wd-library-selection-source b{font-size:17px;font-weight:500}.wd-library-selection-chip{max-width:240px;padding:0 5px 0 8px}
.wd-library-selection-kind{display:grid;place-items:center;min-width:22px;height:20px;padding:0 3px;border-radius:5px;background:#2869c9;color:#fff;font-size:10px;font-weight:700}
.wd-library-selection-chip[data-kind=pptx] .wd-library-selection-kind{background:#d76a24}.wd-library-selection-chip[data-kind=pdf] .wd-library-selection-kind{background:#c84848}.wd-library-selection-chip[data-kind=html] .wd-library-selection-kind{background:#7659ca}.wd-library-selection-chip[data-kind=text] .wd-library-selection-kind{background:#64748b}
.wd-library-selection-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wd-library-selection-remove{width:22px;height:22px;display:grid;place-items:center;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-caption,#999);cursor:pointer}.wd-library-selection-remove:hover{background:#ffffff16;color:inherit}
`;

export function LibrarySelectionChips({ management, sessionId }: Props) {
  const id = String(sessionId);
  const [refs, setRefs] = useState<readonly LibraryTaskReference[]>([]);
  const refresh = useCallback(() => { void management.taskSelection(id).then(setRefs).catch(() => setRefs([])); }, [id, management]);
  useEffect(() => { refresh(); return listenForLibrarySelection(id, refresh); }, [id, refresh]);
  useEffect(() => { const visible = () => { if (document.visibilityState === 'visible') refresh(); }; window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', visible); return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visible); }; }, [refresh]);
  const remove = async (nodeId: string) => { const next = await management.setTaskSelection(id, refs.filter(row => row.nodeId !== nodeId).map(row => row.nodeId)); setRefs(next); notifyLibrarySelectionChanged(id); };
  if (!refs.length) return null;
  return <><style>{css}</style><div className="wd-library-selection-chips" aria-label="随消息发送的资料"><button type="button" className="wd-library-selection-source" title="这些资料会随消息发送给模型" onClick={requestLibraryPicker}><b>@</b><span>资料库</span></button>{refs.map(reference => <span className="wd-library-selection-chip" data-kind={reference.kind} key={reference.assetId}><span className="wd-library-selection-kind">{labels[reference.kind]}</span><span className="wd-library-selection-name" title={`${reference.name} · 随消息发送`}>{reference.name}</span><button type="button" className="wd-library-selection-remove" aria-label={`移除 ${reference.name}`} onClick={() => void remove(reference.nodeId)}>×</button></span>)}</div></>;
}
