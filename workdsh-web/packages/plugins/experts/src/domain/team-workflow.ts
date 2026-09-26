import type { ExpertTeamDefinition } from 'workdsh-contracts';

/** Validate authored instructions only; runtime tasks and transitions belong to DSH. */
export function validateTeamWorkflow(stages: ExpertTeamDefinition['workflows'][number]['stages']): void {
  const ids = new Set(stages.map(stage => stage.id));
  if (ids.size !== stages.length || [...ids].some(id => !/^[a-z][a-z0-9_-]{0,63}$/.test(id))) throw new Error('团队场景的阶段标识无效或重复。');
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error('团队场景包含循环依赖。');
    const stage = stages.find(stage => stage.id === id);
    if (!stage) throw new Error('团队场景引用了不存在的阶段。');
    if (stage.worker === stage.reviewer) throw new Error('独立评审须指定另一位成员。');
    if (new Set(stage.dependsOn).size !== stage.dependsOn.length) throw new Error('团队场景包含重复依赖。');
    visiting.add(id);
    stage.dependsOn.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  stages.forEach(stage => visit(stage.id));
}
