import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type {} from '@deepseek-ai/dsh-experimental-agent-team';
import * as Persona from '@deepseek-ai/dsh-persona';
import * as SkillFiles from '@deepseek-ai/dsh-skill-filesystem';
import { expertPresetDir, readExpertPreset } from './preset-compiler.js';
import { join } from 'node:path';
import { ExpertsError } from '../domain/values.js';
import { expertPersonaConfig } from './preset-compiler.js';

/** Asset admission and role composition only. No child driver, mailbox or Team state. */
export function registerExpertExecutionGuard(ctx: Context): void {
  const installed = new WeakMap<Agent, string>();

  async function prepare(agent: Agent, signal: AbortSignal | undefined, creating: boolean): Promise<void> {
    const membership = ctx.agentTeams.tryMembership(agent);
    const root = membership?.root ?? agent;
    const header = agent.session.header;
    const actor = await ctx.workdshIdentity.resolve({ sessionId: String(root.id) }, signal);
    let role;
    try {
      role = await ctx.workdshExperts.resolveNativeRole(actor, String(root.id), membership?.role === 'teammate' ? membership.name : undefined, signal);
    } catch (error) {
      const unbound = error instanceof ExpertsError && error.code === 'experts/not-found' && error.details?.reason === 'unbound';
      // The trusted create endpoint stores a Lead asset binding after Agent creation.
      // Its first pre-step must still verify the binding before reaching the model.
      // A resumed official Team child is announced before Team's own serial
      // recovery listener may have restored its runtime membership. Defer only
      // this creation edge; agent/pre-step below still requires the recovered
      // root binding and rejects a genuinely unbound expert child.
      if (unbound && creating && !membership && header.parentSession) return;
      if (unbound && (!header.agentPreset?.startsWith('wd-exp-') || creating && root === agent && !header.parentSession)) return;
      throw error;
    }
    if (role.binding.presetRevisionRef !== header.agentPreset) throw new ExpertsError('experts/conflict', '原生任务 preset 与固定专家组合不一致。');
    if (membership?.role === 'teammate') {
      if (header.parentSession !== root.id || header.cwd !== root.session.header.cwd) throw new ExpertsError('experts/conflict', '官方成员与主任务的父关系或工作区不一致。');
      const childActor = await ctx.workdshIdentity.resolve({ sessionId: String(agent.id) }, signal);
      if (childActor.principalId !== actor.principalId || childActor.organizationId !== actor.organizationId) throw new ExpertsError('experts/forbidden', '成员和主任务不属于同一授权主体。');
    }
    const { revision } = role;
    if (root === agent && !revision.definition.team) return;
    if (installed.get(agent) === revision.compositionDigest) return;
    signal?.throwIfAborted();
    // Read only our already verified immutable composition, not arbitrary plugins.
    const rows = (JSON.parse(await readExpertPreset(revision.presetRevisionRef)) as { plugins: { name?: string; config?: SkillFiles.Config }[] }).plugins;
    const skills = rows.find(row => row.name === '@deepseek-ai/dsh-skill-filesystem')?.config;
    if (!skills) throw new ExpertsError('experts/dependency-missing', '固定专家组合缺少技能目录。');
    const definition = revision.definition;
    const packageRoot = definition.packageDocuments ? join(expertPresetDir(revision.presetRevisionRef), 'expert-package') : undefined;
    // The official Agent scope owns these providers and their disposal.
    const persona = agent.ctx.plugin(Persona, expertPersonaConfig({ definition, packageRoot, teamMembers: revision.teamMembers }));
    ctx.effect(() => () => persona.dispose());
    await persona;
    const skillFiles = agent.ctx.plugin(SkillFiles, skills);
    ctx.effect(() => () => skillFiles.dispose());
    await skillFiles;
    signal?.throwIfAborted();
    installed.set(agent, revision.compositionDigest);
  }

  ctx.on('agent/created', async ({ agent, signal }) => { await prepare(agent, signal, true); });
  ctx.on('agent/pre-step', async ({ agent, signal }, next) => {
    await prepare(agent, signal, false);
    return next();
  });
}
