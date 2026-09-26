import { fileURLToPath } from 'node:url';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-skill';
import type {} from '@deepseek-ai/dsh-client-connection';
import type {} from '@deepseek-ai/dsh-tools';
import { professionalAuthoringSkills, skillCreatorContent, skillCreatorMeta } from './authoring/professional.js';
import { SkillManager } from './services/manager.js';
import { registerSkillManagementConnection } from './services/connection-api.js';
import { registerSkillLifecycleTools } from './services/lifecycle-tools.js';

export * from './services/manager.js';
export * from './shared.js';

export const name = 'workdsh-plugin-skills';
export const inject = ['skills', 'connection', 'tools'];

export { skillCreatorContent } from './authoring/professional.js';

export function applySkillsHost(ctx: Context): void {
  new SkillManager(ctx);
  for (const skill of professionalAuthoringSkills) {
    ctx.effect(() => ctx.skills.register({
      ...skill,
      source: 'bundled',
      resourceBase: { kind: 'directory', path: fileURLToPath(new URL(`../resources/skills/${skill.name}/`, import.meta.url)) },
    }));
  }
  registerSkillManagementConnection(ctx);
  registerSkillLifecycleTools(ctx);
  ctx.effect(() => ctx.skills.register({
    ...skillCreatorMeta,
    source: 'bundled',
    content: skillCreatorContent,
    resourceBase: { kind: 'directory', path: fileURLToPath(new URL('../resources/skills/workdsh-skill-creator/', import.meta.url)) },
  }));
}

export const apply = applySkillsHost;
