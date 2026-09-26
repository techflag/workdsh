import * as React from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type {} from '@deepseek-ai/dsh-client-ui-session/client';
import { Icon } from 'workdsh-ui';
import type { ProjectTaskContext } from 'workdsh-contracts/projects';
import type { ProjectClient } from '../../management.js';

/** Visually matches the official title-adjacent chip (22px, 6px radius, 12px text). */
const chipCss = '.wd-pl-chip{display:inline-flex;align-items:center;gap:4px;height:22px;max-width:180px;padding:0 8px 0 6px;border:0;border-radius:6px;background:var(--dsw-alias-fill-tsp-secondary);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:22px;cursor:pointer;overflow:hidden}'
  + '.wd-pl-chip:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}'
  + '.wd-pl-chip svg{flex:none;opacity:.7}'
  + '.wd-pl-chip-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';

type ProjectLineageChipProps = PropsRuntime<'conversation.session.header.actions'> & {
  readonly management: ProjectClient;
  readonly focusProject: (projectId: string) => void;
};

/**
 * Per-Session verdict cache for the chip. The header slot remounts whenever the conversation
 * header re-renders, so only the first mount issues the RPC; misses are cached too (a new
 * Session can only gain a task at creation time), while failures are not, so a transient
 * RPC error does not permanently hide the chip.
 */
const lineageCache = new Map<string, ProjectTaskContext | null>();

/**
 * Project lineage chip for the Session header: shows which project owns the current task
 * session and opens it on click. Plain sessions and other actors get no chip at all.
 */
export function ProjectLineageChip({ sessionId, management, focusProject }: ProjectLineageChipProps) {
  const key = String(sessionId);
  const [context, setContext] = React.useState<ProjectTaskContext | null | undefined>(() => lineageCache.get(key));
  React.useEffect(() => {
    if (lineageCache.has(key)) { setContext(lineageCache.get(key)); return; }
    let cancelled = false;
    management.taskContext(key)
      .then(next => { lineageCache.set(key, next); if (!cancelled) setContext(next); })
      .catch(() => { if (!cancelled) setContext(null); });
    return () => { cancelled = true; };
  }, [management, key]);
  if (!context) return null;
  return <>
    <style>{chipCss}</style>
    <button type="button" className="wd-pl-chip" title={`打开项目：${context.project.name}`} aria-label={`打开项目 ${context.project.name}`} onClick={() => focusProject(context.project.id)}>
      <Icon name="folder" size={14} />
      <span className="wd-pl-chip-text">项目 / {context.project.name}</span>
    </button>
  </>;
}
