import React from 'react';
import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client';
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type {} from '@deepseek-ai/dsh-client-ui-session/client';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type {} from '@deepseek-ai/dsh-client-ui-chat/client';
import type {} from '@deepseek-ai/dsh-tool-todo/client';

/** Presentation only: the official Session and todo projection remain authoritative. */
export function taskExecutionNotice(running: boolean, unfinished: number, reason?: string, error?: string | null): string | null {
  if (running || !unfinished) return null;
  const state = error || reason === 'error' ? '执行失败' : reason === 'interrupted' || reason === 'aborted' ? '已中断' : '已停止';
  return `${state} · ${unfinished} 项任务尚未确认完成。任务列表保留上次记录，不代表仍在执行。${error ? ` 原因：${error}` : ''}`;
}

export function TaskExecutionNotice({ useSession, useProjection, useConversation }: PropsRuntime<'conversation.input.dock'>) {
  const running = useSession((s: SessionSnapshot) => s.running);
  const error = useSession((s: SessionSnapshot) => s.lastAgentError);
  const unfinished = useProjection('todos', todos => todos?.filter(item => item.status !== 'completed').length ?? 0);
  const reason = useConversation((s: ConversationSnapshot) => {
    const turns = s.views.get('chat')?.timeline.turns;
    if (!turns?.size) return undefined;
    const latest = turns.get(Math.max(...turns.keys()));
    return latest?.end?.data.reason.kind;
  });
  const text = taskExecutionNotice(running, unfinished, reason, error);
  if (!text) return null;
  return <div role="status" data-testid="workdsh-task-execution-notice" style={{ padding: '6px 10px', fontSize: 12, color: 'var(--dsw-alias-label-secondary, #a5a5a5)', lineHeight: 1.5 }}>{text}</div>;
}
