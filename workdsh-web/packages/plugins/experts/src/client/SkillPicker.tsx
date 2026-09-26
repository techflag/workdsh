import { Input, Button } from 'workdsh-ui';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { EXPERT_LIMITS } from '../shared.js';
import type { ExpertSkillOption, SkillRequirement } from '../shared.js';
import type { ExpertManagementClient } from './management.js';

export const skillStateLabel = (skill: ExpertSkillOption) => skill.selectable ? '可配备' : skill.state === 'missing' ? '未安装' : skill.state === 'disabled' ? '已停用' : skill.state === 'invalid' ? '内容异常' : '不可供模型调用';

/** Embedded selector avoids nested Modal focus/Escape ownership. Changes apply only on confirmation. */
export function SkillPicker({ expertId, management, selected, onConfirm, onCancel }: {
  expertId: string; management: ExpertManagementClient; selected: readonly SkillRequirement[];
  onConfirm: (value: SkillRequirement[]) => void; onCancel: () => void;
}) {
  const [skills, setSkills] = useState<readonly ExpertSkillOption[]>();
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [chosen, setChosen] = useState(() => new Set(selected.map(req => req.skillId ?? req.name)));
  useEffect(() => {
    const controller = new AbortController();
    setSkills(undefined); setError('');
    void management.listSkills(expertId, 'available', controller.signal).then(value => { if (!controller.signal.aborted) setSkills(value); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '读取技能失败'); });
    return () => controller.abort();
  }, [expertId, management, attempt]);
  const visible = skills?.filter(skill => `${skill.name} ${skill.description}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <section className="skill-picker" aria-label="选择配备技能">
    <h4>选择已安装技能</h4>
    <Input aria-label="搜索配备技能" placeholder="搜索名称或简介" value={search} onChange={event => setSearch(event.currentTarget.value)} />
    {error ? <p role="alert">{error} <Button onClick={() => setAttempt(value => value + 1)}>重试</Button></p> : !skills ? <p role="status">正在读取技能…</p> : !skills.length ? <p>尚无已安装技能，请先到技能页面安装。</p> : !visible?.length ? <p>没有匹配的技能。</p> : <div className="skill-picker-list">{visible.map(skill => <label className="skill-choice" key={skill.skillId}>
      <input type="checkbox" aria-label={`配备 ${skill.name}`} checked={chosen.has(skill.skillId)} disabled={!skill.selectable && !chosen.has(skill.skillId)} onChange={event => {
        const next = new Set(chosen); if (event.currentTarget.checked) next.add(skill.skillId); else next.delete(skill.skillId); setChosen(next);
      }} />
      <span><strong>{skill.name}</strong><small>{skill.description}</small></span><small>{skillStateLabel(skill)}</small>
    </label>)}</div>}
    <p className="hint">已选 {chosen.size} 项，最多 {EXPERT_LIMITS.skillRequirementsMax} 项。</p><div className="picker-actions"><Button onClick={onCancel}>取消选择</Button><Button disabled={!skills || !!error || chosen.size > EXPERT_LIMITS.skillRequirementsMax} onClick={() => {
      const retained = selected.filter(req => chosen.has(req.skillId ?? req.name)).map(req => { const match = skills!.find(skill => skill.skillId === (req.skillId ?? req.name)); return match ? { name: match.name, skillId: match.skillId } : { ...req }; });
      const ids = new Set(retained.map(req => req.skillId ?? req.name));
      onConfirm([...retained, ...skills!.filter(skill => chosen.has(skill.skillId) && !ids.has(skill.skillId) && skill.selectable).map(skill => ({ name: skill.name, skillId: skill.skillId }))]);
    }}>确认选择</Button></div>
  </section>;
}
