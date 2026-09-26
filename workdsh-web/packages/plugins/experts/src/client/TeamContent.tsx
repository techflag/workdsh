import { Textarea } from 'workdsh-ui';
import * as React from 'react';
import type { ExpertTeamDefinition } from '../shared.js';

/** One whole-work preview, shared by the draft, publication and use surfaces. */
export function TeamContent({ team, onChange }: { team?: ExpertTeamDefinition; onChange?: (team: ExpertTeamDefinition) => void }) {
  if (!team) return null;
  const fields = { role: '专业职责', methodology: '专业方法', boundaries: '协作边界', deliverables: '交付标准' } as const;
  return <section className="team-content" aria-label="专家团内容">
    <h3>团队成员 · {team.members.length}</h3>
    <p>主理人负责理解需求与整合交付；以下成员承担独立专业工作。整套内容统一保存、发布。</p>
    {team.members.map((member, index) => <details key={member.key} className="preview-settings">
      <summary>{member.definition.name} · {member.definition.description}</summary>
      {Object.entries(fields).map(([key, title]) => <div className="prose-block" key={key}><h4>{title}</h4>{onChange
        ? <Textarea aria-label={`${member.definition.name} ${title}`} className="prose" style={{ width: '100%', minHeight: 120 }} value={member.definition[key as keyof typeof fields]} onChange={event => onChange({ ...team, members: team.members.map((item, i) => i === index ? { ...item, definition: { ...item.definition, [key]: event.currentTarget.value } } : item) })} />
        : <p style={{ whiteSpace: 'pre-wrap' }}>{member.definition[key as keyof typeof fields]}</p>}</div>)}
      <p>配备技能：{member.definition.skillRequirements.map(skill => skill.name).join('、') || '未单独配备'}</p>
    </details>)}
    <h3>协作场景</h3>
    {team.workflows.map(workflow => <article key={workflow.id} className="preview-example"><h4>{workflow.title}</h4><p>{workflow.trigger}</p><p>交付：{workflow.deliverable}</p>
      {workflow.stages.length ? <ul>{workflow.stages.map(stage => <li key={stage.id}>{team.members.find(member => member.key === stage.worker)?.definition.name}执行，{stage.reviewer ? `${team.members.find(member => member.key === stage.reviewer)?.definition.name}核验` : '按成果要求完成后回传主理人'}{stage.dependsOn.length ? `；在 ${stage.dependsOn.join('、')} 完成后进行` : '；可先开始'}</li>)}</ul> : <p>主理人直接处理</p>}
    </article>)}
  </section>;
}
