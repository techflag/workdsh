import * as React from 'react';
import type { ExpertDefinition, SkillRevisionRef } from '../shared.js';
import { ExpertWorkSummary } from './ExpertWorkSummary.js';
import { TeamContent } from './TeamContent.js';

export type ExpertUsagePreviewProps = {
  readonly definition: ExpertDefinition;
  readonly dependencyLock: readonly SkillRevisionRef[];
};

/** Read-only review of the exact saved definition; does not prepare or run a task. */
export function ExpertUsagePreview({ definition, dependencyLock }: ExpertUsagePreviewProps) {
  return <section className="usage-preview" aria-label="专家使用预览">
    <header><span className="preview-avatar" aria-hidden>{definition.avatarRef?.startsWith('data:image/') ? <img src={definition.avatarRef} alt="" /> : definition.name.trim().charAt(0) || '专'}</span><div><h3>{definition.name}</h3><p>{definition.description}</p></div></header>
    {definition.agentDocument ? <div className="prose-block" style={{ whiteSpace: 'pre-wrap' }}>{definition.agentDocument}</div> : <ExpertWorkSummary definition={definition} />}
    <TeamContent team={definition.team} />
    {definition.tags.length > 0 && <><h3>擅长领域</h3><div className="preview-tags">{definition.tags.map(tag => <span key={tag}>{tag}</span>)}</div></>}
    <h3>试试这样问我</h3>
    <p>示例仅供审阅；发布后由你选择试用，不会自动发送任务。</p>
    {definition.examples.length ? definition.examples.map(example => <article className="preview-example" key={example.id}><strong>{example.title || '示例任务'}</strong><p>{example.prompt}</p></article>) : <p>尚未配置示例。</p>}
    <h3>配备技能 · {dependencyLock.length}</h3>
    <p>以下技能将固定为校验通过的版本。</p>
    {dependencyLock.length ? <ul>{dependencyLock.map(skill => <li key={skill.skillId}><strong>{skill.name}</strong><small>固定版本 {skill.revisionId}</small></li>)}</ul> : <p>未显式配备技能，仍受原生任务能力与权限限制。</p>}
    {definition.futureRequirements.length > 0 && <><h3>扩展能力</h3><p>额外能力声明不代表已接入或可调用。</p><ul>{definition.futureRequirements.map(req => <li key={`${req.kind}:${req.key}`}>{req.kind === 'connector' ? '连接器' : req.kind} · {req.key}<small>{req.required ? '必需' : '可选'} · 暂不支持接入</small></li>)}</ul></>}
    <details className="preview-settings"><summary>专业角色与经验</summary><p>{definition.role}</p></details>
  </section>;
}
