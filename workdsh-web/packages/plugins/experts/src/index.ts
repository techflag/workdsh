import { fileURLToPath } from 'node:url';
import { expertManagerSkillContent, expertManagerSkillMeta } from './authoring/guide.js';
import { Context } from '@deepseek-ai/cordis';
// Load the official Context augmentations this entry references (ctx.skills) and
// the carriers its wire layer uses (connection, tools), mirroring the skills plugin.
import type {} from '@deepseek-ai/dsh-skill';
import type {} from '@deepseek-ai/dsh-client-connection';
import type {} from '@deepseek-ai/dsh-tools';
import { ExpertsManager } from './services/experts-manager.js';
import { registerExpertsConnection } from './services/connection-api.js';
import { registerExpertManagementTools } from './tools/management-tools.js';
import { registerExpertExecutionGuard } from './runtime/execution-guard.js';

export * from './services/experts-manager.js';
export * from './services/connection-api.js';
export * from './tools/management-tools.js';

/**
 * Host plugin entry for WorkDSH experts (D04 / P1-02, expert module 0.1).
 *
 * This is an independent, Loader-recognised entry: `cordis.patch.yml` inserts
 * `workdsh-plugin-experts`, and the official Loader calls `apply(ctx)` after the
 * injected services resolve. It does NOT rely on the bundle calling a shared
 * helper, so experts owns its own service, transport, tools and bundled skill and
 * can be disposed completely without touching other plugins.
 */

export const name = 'workdsh-plugin-experts';

/** Every service `apply` and `ExpertsManager` require, resolved before load. */
export const inject = [
  'loader', 'storageDomain', 'agentPresets', 'sessionController',
  'workdshIdentity', 'workdshAccess', 'workdshAudit', 'workdshSessionAccess', 'workdshSkills',
  'connection', 'tools', 'skills', 'agents', 'agentTeams', 'sessionQuery', 'fs',
];

/**
 * The bundled `expert-manager` skill: conversational authoring guidance over the
 * SAME Host tools the UI uses. It can only prepare drafts and request a publish
 * confirmation; the trusted confirm + publish and every task summon/handoff stay
 * user-driven, so the skill never claims a publish or an auto-sent task.
 *
 * The wording is owned by `resources/skills/workdsh-expert-manager/SKILL.md`; this module shape
 * only re-exports the parsed body for consumers that referenced it before the
 * move, and registers it below.
 */
export { expertManagerSkillContent } from './authoring/guide.js';

/**
 * Register the bundled authoring skill into the official registry. Routing and
 * body come from the packaged SKILL.md, so editing that one Markdown file is the
 * only way to change what the model reads. Registration only files the skill
 * into the catalog — its body loads on demand and is never injected into an
 * ordinary task by this plugin.
 */
export function registerExpertManagerSkill(ctx: Context): () => void {
  return ctx.skills.register({
    ...expertManagerSkillMeta,
    source: 'bundled',
    content: expertManagerSkillContent,
    resourceBase: { kind: 'directory', path: fileURLToPath(new URL('../resources/skills/workdsh-expert-manager/', import.meta.url)) },
  });
}

/** Independent Host apply: own service, transport, tools and bundled skill. */
export async function applyExpertsHost(ctx: Context): Promise<void> {
  await ctx.plugin(ExpertsManager);
  await ctx.plugin({ name: 'workdsh-experts-integration', inject: [...inject, 'workdshExperts'], apply: applyIntegration });
}

/** The consumer declares the services provided by the manager child Fibers. */
function applyIntegration(ctx: Context): void {
  registerExpertExecutionGuard(ctx);
  registerExpertsConnection(ctx);
  registerExpertManagementTools(ctx);
  ctx.effect(() => registerExpertManagerSkill(ctx));
}

/** Official Loader entry point (see cordis.patch.yml). Not a bundle-only helper. */
export const apply = applyExpertsHost;
