import * as React from 'react';
import { useEffect, useState } from 'react';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { InputState } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client';

/**
 * One-shot native-input draft hand-off for the expert Client.
 *
 * The summon / create / handoff flows stage a draft here (sessionStorage) bound to a
 * target Session, then the official `conversation.input.overlay` applies it exactly once
 * when the native Lexical editor mounts. Nothing is auto-sent: `/`, `@`, attachments,
 * model, reasoning effort and the send button stay native, and a refresh or repeat mount
 * finds the key already cleared.
 */
export const pendingExpertDraftKey = 'workdsh.pending-expert-task-draft';
export const pendingExpertDraftEvent = 'workdsh:expert-draft-staged';

/** Fixed guide text seeded when the user chooses “制作专家” (UX §4). Never auto-sent. */
export const expertManagerGuide =
  '/workdsh-expert-manager 帮我创建一个 XXX 专家，擅长 XXXXX。我的经验是：[请补充你的行业背景、相关经验]';
export const expertTeamManagerGuide =
  '/workdsh-expert-manager 帮我创建一个 XXX 专家团，团队成员包括[请补充成员角色]，共同擅长 XXXXX。我的经验是：[请补充你的行业背景、相关经验]';

export function PendingExpertDraft({ inputActions, useSession, useInput }: PropsRuntime<'conversation.input.overlay'>) {
  const sessionId = useSession((session: SessionSnapshot) => session.sessionId);
  const input = useInput((state: InputState) => state);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const staged = () => setGeneration(value => value + 1);
    window.addEventListener(pendingExpertDraftEvent, staged);
    return () => window.removeEventListener(pendingExpertDraftEvent, staged);
  }, []);
  useEffect(() => {
    const serialized = window.sessionStorage.getItem(pendingExpertDraftKey);
    if (!serialized) return;
    let pending: { sessionId: string; text: string; expiresAt: number };
    try { pending = JSON.parse(serialized); }
    catch { window.sessionStorage.removeItem(pendingExpertDraftKey); return; }
    if (!pending || typeof pending.text !== 'string' || typeof pending.expiresAt !== 'number' || pending.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(pendingExpertDraftKey); return;
    }
    if (pending.sessionId !== sessionId) return;
    // Consume before mutating. Existing text/attachments belong to the user.
    window.sessionStorage.removeItem(pendingExpertDraftKey);
    if (input.draft.length === 0 && input.attachmentIds.length === 0 && input.phase === 'plain') inputActions.setDraft(pending.text);
  }, [sessionId, input, inputActions, generation]);
  return null;
}
