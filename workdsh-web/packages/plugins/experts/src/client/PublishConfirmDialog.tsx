import { Button } from 'workdsh-ui';
import * as React from 'react';
import { useState } from 'react';
import { Modal } from 'workdsh-ui';
import type { ExpertDefinition, PublishReceipt, SkillRevisionRef } from '../shared.js';
import type { ExpertManagementClient } from './management.js';
import { ExpertUsagePreview } from './ExpertUsagePreview.js';

export type PublishConfirmDialogProps = {
  readonly expertId: string;
  readonly draftRevision: string;
  readonly definition: ExpertDefinition;
  readonly definitionDigest: string;
  readonly dependencyLockDigest: string;
  readonly dependencyLock: readonly SkillRevisionRef[];
  readonly management: ExpertManagementClient;
  readonly onClose: () => void;
  readonly onPublished: () => void;
  readonly onSummon: (expertId: string, revisionId: string | undefined, draftText: string | undefined) => void;
};

function messageOf(cause: unknown): string { return cause instanceof Error ? cause.message : '发布失败，请重试。'; }

/**
 * Trusted-UI publish gate. The three-step exchange (request confirmation → confirm →
 * publish) runs only from this real user click; a model or prompt text can never reach
 * `confirm-publish`. The displayed digests are the exact content the Host re-derives and
 * binds the one-time proof to, so what the user reviews is what gets frozen.
 */
export function PublishConfirmDialog({ expertId, draftRevision, definition, definitionDigest, dependencyLockDigest, dependencyLock, management, onClose, onPublished, onSummon }: PublishConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<PublishReceipt>();

  const confirm = async () => {
    setBusy(true); setError('');
    try {
      const request = await management.requestPublishConfirmation(expertId, draftRevision);
      if (request.expertId !== expertId || request.draftRevision !== draftRevision || request.definitionDigest !== definitionDigest || request.dependencyLockDigest !== dependencyLockDigest) {
        throw new Error('待发布内容或技能版本已变化，请返回草稿重新预览。');
      }
      const proof = await management.confirmPublish(request.confirmationToken);
      const result = await management.publish(expertId, draftRevision, dependencyLockDigest, proof.token, management.newOperationId('publish'));
      setReceipt(result);
    } catch (cause) { setError(messageOf(cause)); }
    finally { setBusy(false); }
  };

  if (receipt) {
    return <Modal open label="发布成功" className="confirm-dialog" onClose={onPublished}>
      <h2>发布成功</h2>
      <p>已发布「{definition.name || '该专家'}」。已有任务保持原版本；新召唤将使用此版本。</p>
      <p className="digest">修订 {receipt.revision.revisionId}</p>
      <div className="confirm-actions">
        <Button onClick={onPublished}>返回我的专家</Button>
        <Button variant="primary" className="primary" onClick={() => onSummon(expertId, receipt.revision.revisionId, undefined)}>去试试</Button>
      </div>
    </Modal>;
  }

  return <Modal open label="确认发布专家" className="confirm-dialog publish-dialog" onClose={() => { if (!busy) onClose(); }}>
    <h2>确认发布此版本</h2>
    <p>请审阅下方专家内容和配备技能。确认后，新召唤的任务使用此版本；以后编辑需重新发布，已有任务保持原版本。</p>
    <div className="publish-scroll">
      <ExpertUsagePreview definition={definition} dependencyLock={dependencyLock} />
      <details className="preview-digests"><summary>版本校验信息</summary><p className="digest">定义摘要 {definitionDigest}</p><p className="digest">依赖锁定摘要 {dependencyLockDigest}</p></details>
    </div>
    {error && <p className="error-text" role="alert" style={{ marginTop: 12 }}>{error}</p>}
    <div className="confirm-actions">
      <Button onClick={onClose} disabled={busy}>取消</Button>
      <Button variant="primary" className="primary" onClick={() => void confirm()} disabled={busy}>{busy ? '正在发布…' : '确认发布此版本'}</Button>
    </div>
  </Modal>;
}
