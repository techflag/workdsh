import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-fs';
import type {} from '@deepseek-ai/dsh-session';
import type { PresentedFile } from '@deepseek-ai/dsh-tool-present/types';
import type { ActorContext, IdentityService, LibraryService, LibraryTreeEntry, ProjectService } from 'workdsh-contracts';
declare module '@deepseek-ai/cordis' { interface Context { workdshLibrary: LibraryService; } }

/**
 * Project deliverable attribution: files the model presents through the official
 * `present` tool inside a project task session are registered in the owning Library
 * (source=task, sourceTaskId=session) and linked to the project as asset references.
 * The Harness session log stays the execution truth; this listener only mirrors the
 * official delivery signal into WorkDSH's object/relation data.
 */

/** Import nothing larger than the Library's own upload limit; oversized deliveries are skipped. */
const MAX_DELIVERABLE_BYTES = 50 * 1024 * 1024;
const NAME_ATTEMPTS = 5;

export interface DeliverableAttributionDeps {
  readonly identity: Pick<IdentityService, 'resolve'>;
  readonly projects: Pick<ProjectService, 'taskContext' | 'addAsset' | 'noteDeliveryGap'>;
  readonly library: Pick<LibraryService, 'importAsset'>;
  readonly readBytes: (path: string, cwd: string, signal?: AbortSignal) => Promise<Uint8Array>;
  readonly warn: (message: string) => void;
  readonly maxNameAttempts?: number;
}

export interface PresentedDeliverables {
  /** Session whose log recorded the delivery event. */
  readonly sessionId: string;
  /** Absolute Session working directory the presented paths resolve against. */
  readonly cwd: string;
  readonly files: readonly PresentedFile[];
}

/** Import either landed in the Library or was skipped library-side with a visible reason. */
export type ImportOutcome =
  | { readonly entry: LibraryTreeEntry }
  | { readonly gap: string };

const messageOf = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

/**
 * Idempotency digest for one delivered file. The Library keys receipts by operationId and
 * rejects a reused operationId whose `parentId + name + content` digest differs, so the
 * digest spans the original name as well; the attempt index is appended per retry so a
 * name occupied by an unrelated import still gets its own receipt slot.
 */
const digestOf = (originalName: string, bytes: Uint8Array): string =>
  createHash('sha256').update(originalName).update('\u0000').update(bytes).digest('hex');

const suffixed = (name: string, attempt: number): string => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? `${name.slice(0, dot)} (${attempt})${name.slice(dot)}` : `${name} (${attempt})`;
};

/**
 * Import one delivered file, retrying only on name conflicts with a " (n)" suffix.
 * Stable per-attempt operationId (session + name + content digest + attempt) makes a
 * repeated delivery resolve to the previously imported entry; a library-side rejection
 * is returned as a gap so the Project activity shows why the delivery did not land.
 */
async function importDeliveredFile(
  deps: DeliverableAttributionDeps,
  actor: ActorContext,
  input: { readonly sessionId: string; readonly digest: string },
  bytes: Uint8Array,
  originalName: string,
  signal?: AbortSignal,
): Promise<ImportOutcome> {
  const attempts = deps.maxNameAttempts ?? NAME_ATTEMPTS;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const name = attempt === 1 ? originalName : suffixed(originalName, attempt);
    try {
      const entry = await deps.library.importAsset(actor, { name, bytes, source: 'task', sourceTaskId: input.sessionId, operationId: `project-deliverable-${input.sessionId}-${input.digest}-${attempt}` }, signal);
      return { entry };
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : '';
      if (code === 'library/name-conflict' && attempt < attempts) continue;
      if (code.startsWith('library/')) {
        const gap = `交付未归属：${name}（${code}）`;
        deps.warn(gap);
        return { gap };
      }
      throw cause;
    }
  }
  // Unreachable: the last attempt always returns or throws above.
  return { gap: `交付未归属：${originalName}（library/name-conflict）` };
}

/**
 * Attribute one `deliverables/presented` batch. Sessions without a linked project task
 * (plain sessions, subagent children, other actors) are skipped; a per-file failure is
 * logged and contained so the remaining files still import.
 */
export async function attributePresentedFiles(
  deps: DeliverableAttributionDeps,
  input: PresentedDeliverables,
  signal?: AbortSignal,
): Promise<void> {
  const actor = await deps.identity.resolve({ sessionId: input.sessionId }, signal);
  const context = await deps.projects.taskContext(actor, input.sessionId, signal);
  if (!context) return;
  const seen = new Set<string>();
  for (let index = 0; index < input.files.length; index++) {
    const file = input.files[index]!;
    if (seen.has(file.path)) continue;
    seen.add(file.path);
    try {
      const bytes = await deps.readBytes(file.path, input.cwd, signal);
      const name = basename(file.path);
      const outcome = await importDeliveredFile(deps, actor, { sessionId: input.sessionId, digest: digestOf(name, bytes) }, bytes, name, signal);
      if ('gap' in outcome) { await deps.projects.noteDeliveryGap(actor, context.project.id, outcome.gap, signal); continue; }
      const entry = outcome.entry;
      if (!entry.asset || !entry.revision) { deps.warn(`项目交付入库结果缺少资产信息：${file.path}`); continue; }
      await deps.projects.addAsset(actor, context.project.id, { nodeId: entry.id, assetId: entry.asset.id, revisionId: entry.revision.id, name: entry.name, kind: entry.asset.kind }, signal);
    } catch (cause) {
      deps.warn(`项目交付归属失败：${file.path}（${messageOf(cause)}）`);
    }
  }
}

/** Subscribe to the official delivery signal on the root context (all Sessions). */
export function registerDeliverableAttribution(ctx: Context): void {
  const logger = ctx.logger('workdsh-projects');
  const deps: DeliverableAttributionDeps = {
    identity: { resolve: (evidence, signal) => ctx.workdshIdentity.resolve(evidence, signal) },
    projects: {
      taskContext: (actor, sessionId, signal) => ctx.workdshProjects.taskContext(actor, sessionId, signal),
      addAsset: (actor, projectId, asset, signal) => ctx.workdshProjects.addAsset(actor, projectId, asset, signal),
      noteDeliveryGap: (actor, projectId, text, signal) => ctx.workdshProjects.noteDeliveryGap(actor, projectId, text, signal),
    },
    library: { importAsset: (actor, input, signal) => ctx.workdshLibrary.importAsset(actor, input, signal) },
    readBytes: async (path, cwd, signal) => ctx.fs.readBytes(await ctx.fs.resolve(path, { cwd, signal }), signal, MAX_DELIVERABLE_BYTES),
    warn: message => { logger.warn(message); },
  };
  // Post-commit fire-and-forget feed: the listener returns immediately and the import
  // work runs detached so a slow conversion never delays the Session append.
  ctx.on('session/event', (session, event) => {
    if (event.type !== 'deliverables/presented') return;
    const cwd = session.header.cwd;
    if (!cwd) { logger.warn('presented without cwd, skipped'); return; }
    void attributePresentedFiles(deps, { sessionId: String(session.id), cwd, files: event.data.files })
      .catch(cause => { logger.warn(`项目交付归属异常：${messageOf(cause)}`); });
  });
}
