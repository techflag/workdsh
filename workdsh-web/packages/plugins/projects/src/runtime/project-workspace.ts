import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-api-workspace-controller';
import type { ActorContext } from 'workdsh-contracts';

/** Official registry remains the only workspace identity and persistence owner. */
export async function ensureProjectWorkspace(ctx: Context, actor: ActorContext, projectId: string, signal?: AbortSignal) {
  const { project } = await ctx.workdshProjects.get(actor, projectId, signal);
  signal?.throwIfAborted();
  const key = createHash('sha256').update(JSON.stringify([actor.organizationId, actor.principalId, project.id])).digest('hex');
  const path = join(process.env.DSH_HOME || join(homedir(), '.workdsh'), 'workdsh-projects', key);
  await mkdir(path, { recursive: true });
  signal?.throwIfAborted();
  const { workspace } = await ctx.workspaceController.create({ path });
  if (workspace.title === project.name || workspace.title === `${project.name} · ${key.slice(0, 8)}`) return workspace;
  try {
    return (await ctx.workspaceController.rename({ workspaceId: workspace.workspaceId, title: project.name })).workspace;
  } catch (error) {
    if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'workspace/name-conflict') throw error;
    return (await ctx.workspaceController.rename({ workspaceId: workspace.workspaceId, title: `${project.name} · ${key.slice(0, 8)}` })).workspace;
  }
}
