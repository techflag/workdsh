import { definitionFromDocuments, parseExpertDocument } from '../authoring/documents.js';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { Context, Service } from '@deepseek-ai/cordis';
import type { KvTable } from '@deepseek-ai/dsh-storage-domain';
import type { SessionCreateRequest, SessionCreateValue } from '@deepseek-ai/dsh-api-session-controller';
import { expertPresetDir, readExpertPreset, registerExpertPreset } from '../runtime/preset-compiler.js';
import {
  EXPERT_LIMITS,
  ExpertsError,
  actionAccess,
  assertActorContext,
} from '../domain/values.js';
import type {
  AccessService,
  ActorContext,
  AuditEvent,
  AuditService,
  AvailabilityReceipt,
  ConfirmationProof,
  ConfirmationRequest,
  DomainIssue,
  DraftHandoff,
  ExecutionBinding,
  ExecutionCreation,
  ExecutionPlan,
  Expert,
  ExpertAction,
  ExpertAvailability,
  ExpertDefinition,
  ExpertDetail,
  ExpertDraft,
  ExpertExport,
  ExpertListQuery,
  ExpertListResult,
  ExpertPreference,
  ExpertReadiness,
  ExpertRevision,
  ExpertRevisionRef,
  ExpertSummary,
  ExpertValidation,
  ExpertsService,
  HandoffPlan,
  IdentityService,
  ImportPreview,
  ModelSelectionRequest,
  MutationContext,
  Operation,
  PublishReceipt,
  ResourceOwner,
  SkillRevisionRef,
} from 'workdsh-contracts';
import type { SkillManagementService } from 'workdsh-contracts/skills';
import { expertsDomainSpec, keys } from '../storage/domain.js';
import { COMPILER_VERSION, compileExpertPreset, presetIdFor, verifyPackageFiles } from '../runtime/preset-compiler.js';
import { ConfirmationStore } from '../runtime/confirmation.js';
import { TtlStore } from '../runtime/plans.js';
import { definitionDigest, normalizeDefinition, validateDefinition, teamDefinitionSchema } from '../domain/definition.js';
import { codePointLength, digestOf, shortDigest, sha256 } from '../domain/digest.js';
import { DEFAULT_TEMPLATES } from '../domain/templates.js';
import { assertUploadWithinLimit, buildExport, preflightPackage } from './portability.js';

/**
 * The single Host domain service for experts (D04 / P1-02, expert module 0.1).
 *
 * Pages and Agent management tools call exactly this surface. The transport
 * resolves the actor first, so no method takes an actor/owner/confirmation
 * boolean from the client or model. Every write is serialized on one mutation
 * tail, guarded by optimistic concurrency (`expectedRevision`), made idempotent
 * through the durable `operations` table, authorized through `workdshAccess` and
 * audited through `workdshAudit`. Publishing freezes an immutable revision and
 * compiles a read-only preset; execution reserves a native Session bound to that
 * exact revision and never re-binds it.
 */

/** Brand aliases referenced through the official request type (no extra dependency). */
type SessionId = NonNullable<SessionCreateRequest['sessionId']>;
type WorkspaceId = NonNullable<SessionCreateRequest['workspaceId']>;

/** The minimal Session-ingress surface experts consumes (owned by the access plugin). */
interface SessionAccess {
  create(request: SessionCreateRequest, signal?: AbortSignal): Promise<SessionCreateValue>;
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    workdshIdentity: IdentityService;
    workdshAccess: AccessService;
    workdshAudit: AuditService;
    workdshSessionAccess: SessionAccess;
    workdshSkills: SkillManagementService;
    workdshExperts: ExpertsManager;
  }
}

const EXPERT_DOMAIN = 'workdsh-experts';
const PLAN_TTL_MS = 10 * 60 * 1000;
const HANDOFF_TTL_MS = 10 * 60 * 1000;
const STAGED_IMPORT_PATTERN = /^[a-z0-9-]{1,64}$/;

interface StagedImport {
  readonly fileName: string;
  readonly path: string;
}

interface ImportPreviewRecord {
  readonly preview: ImportPreview;
  readonly candidate: ExpertDefinition;
  readonly sourceAttribution?: string;
}

// ── module helpers ──────────────────────────────────────────────────────────

/** Extract a stable `experts/…` code from an unknown thrown value, else fall back. */
function errorCode(error: unknown, fallback: string): string {
  if (error instanceof ExpertsError && typeof error.code === 'string') return error.code;
  if (error instanceof Error && error.message.startsWith('experts/')) return error.message;
  return fallback;
}

/** Public cause text for a dependency issue; never leaks another owner's paths. */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Map the Skill owner's `skill/revision-*` errors onto expert dependency issue codes. */
function mapSkillDependencyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('disabled')) return 'experts/dependency-disabled';
  if (message.includes('drift')) return 'experts/dependency-drift';
  return 'experts/dependency-missing';
}

/** Deterministic revision id from the frozen definition, dependency lock and compiled preset. */
function revisionIdFor(defDigest: string, dependencyLockDigest: string, presetId: string): string {
  return `rev-${shortDigest({ definitionDigest: defDigest, dependencyLockDigest, presetId, compilerVersion: COMPILER_VERSION })}`;
}

/** Case-insensitive substring match over the searchable text of a definition. */
function matchesSearch(definition: ExpertDefinition, search: string): boolean {
  if (definition.name.toLowerCase().includes(search)) return true;
  if (definition.description.toLowerCase().includes(search)) return true;
  return definition.tags.some((tag) => tag.toLowerCase().includes(search));
}

/** Kebab slug for readable, preset-safe expert ids (`/^[a-z0-9][a-z0-9-]*$/`). */
function slugSegment(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  return slug || 'expert';
}

/** A complete, empty definition used as the base for partial authoring input. */
function emptyDefinition(): ExpertDefinition {
  return {
    name: '', description: '', role: '', methodology: '', boundaries: '', deliverables: '',
    tags: [], examples: [], skillRequirements: [], futureRequirements: [],
  };
}

/** Overlay a partial patch onto a base definition, keeping every required field present. */
function mergeDefinition(base: ExpertDefinition, patch: Partial<ExpertDefinition>): ExpertDefinition {
  if (patch.team && !teamDefinitionSchema.safeParse(patch.team).success) throw new ExpertsError('experts/invalid-definition', '团队成员与场景结构无效。');
  return {
    ...(patch.agentDocument ?? base.agentDocument ? { agentDocument: patch.agentDocument ?? base.agentDocument } : {}),
    ...(patch.packageAssets ?? base.packageAssets ? { packageAssets: patch.packageAssets ?? base.packageAssets } : {}),
    ...(patch.packageDocuments ?? base.packageDocuments ? { packageDocuments: patch.packageDocuments ?? base.packageDocuments } : {}),
    name: patch.name ?? base.name,
    description: patch.description ?? base.description,
    ...(patch.avatarRef !== undefined ? { avatarRef: patch.avatarRef } : base.avatarRef !== undefined ? { avatarRef: base.avatarRef } : {}),
    role: patch.role ?? base.role,
    methodology: patch.methodology ?? base.methodology,
    boundaries: patch.boundaries ?? base.boundaries,
    deliverables: patch.deliverables ?? base.deliverables,
    tags: patch.tags ?? base.tags,
    ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : base.categoryId !== undefined ? { categoryId: base.categoryId } : {}),
    examples: patch.examples ?? base.examples,
    skillRequirements: patch.skillRequirements ?? base.skillRequirements,
    futureRequirements: patch.futureRequirements ?? base.futureRequirements,
    ...((patch.team ?? base.team) ? { team: patch.team ?? base.team } : {}),
  };
}

/** Concatenate streamed upload chunks into one buffer. */
function concatBytes(chunks: readonly Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
  return out;
}

/** Strip path separators from an uploaded file name so it can never escape staging. */
function sanitizeFileName(fileName: string): string {
  const base = fileName.replace(/[/\\]/g, '_').slice(0, 120);
  return base || 'expert.zip';
}

export class ExpertsManager extends Service implements ExpertsService {
  static inject = [
    'loader', 'storageDomain', 'agentPresets', 'sessionController',
    'workdshIdentity', 'workdshAccess', 'workdshAudit', 'workdshSessionAccess', 'workdshSkills',
  ];

  private experts?: KvTable<string, Expert>;
  private drafts?: KvTable<string, ExpertDraft>;
  private revisions?: KvTable<string, ExpertRevision>;
  private bindings?: KvTable<string, ExecutionBinding>;
  private preferences?: KvTable<string, ExpertPreference>;
  private operations?: KvTable<string, Operation>;
  private mutationTail: Promise<void> = Promise.resolve();
  private seeding?: Promise<void>;

  private readonly confirmations = new ConfirmationStore();
  private readonly executionPlans = new TtlStore<ExecutionPlan>(PLAN_TTL_MS);
  private readonly handoffs = new TtlStore<DraftHandoff>(HANDOFF_TTL_MS);
  private readonly handoffPlans = new TtlStore<HandoffPlan>(PLAN_TTL_MS);
  private readonly importPreviews = new TtlStore<ImportPreviewRecord>(PLAN_TTL_MS);
  private readonly stagedImports = new TtlStore<StagedImport>(PLAN_TTL_MS);
  private readonly stagingRoot: string;

  constructor(ctx: Context) {
    super(ctx, 'workdshExperts');
    const agentsHome = resolve(process.env.DSH_AGENTS_HOME ?? join(homedir(), '.agents'));
    this.stagingRoot = join(agentsHome, '.workdsh-state', 'experts', 'staging');
  }

  async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(expertsDomainSpec);
    this.ctx.effect(() => () => domain.close(), 'workdshExperts.domainClose');
    this.experts = domain.table('experts');
    this.drafts = domain.table('drafts');
    this.revisions = domain.table('revisions');
    this.bindings = domain.table('bindings');
    this.preferences = domain.table('preferences');
    this.operations = domain.table('operations');
    for (const [, revision] of this.revisions.entries()) {
      if (revision.compilerVersion === COMPILER_VERSION) await registerExpertPreset(this.ctx, revision.presetRevisionRef, revision.compositionDigest);
    }
    // Staged uploads are transient; best-effort cleanup when the plugin unloads.
    this.ctx.effect(() => () => { void rm(this.stagingRoot, { recursive: true, force: true }); }, 'workdshExperts.stagingCleanup');
  }

  // ── table access ──────────────────────────────────────────────────────────

  private expertsTable(): KvTable<string, Expert> {
    if (!this.experts) throw new ExpertsError('experts/unavailable', '专家服务尚未就绪。');
    return this.experts;
  }
  private draftsTable(): KvTable<string, ExpertDraft> {
    if (!this.drafts) throw new ExpertsError('experts/unavailable', '专家服务尚未就绪。');
    return this.drafts;
  }
  private revisionsTable(): KvTable<string, ExpertRevision> {
    if (!this.revisions) throw new ExpertsError('experts/unavailable', '专家服务尚未就绪。');
    return this.revisions;
  }
  private bindingsTable(): KvTable<string, ExecutionBinding> {
    if (!this.bindings) throw new ExpertsError('experts/unavailable', '专家服务尚未就绪。');
    return this.bindings;
  }
  private preferencesTable(): KvTable<string, ExpertPreference> {
    if (!this.preferences) throw new ExpertsError('experts/unavailable', '专家服务尚未就绪。');
    return this.preferences;
  }
  private operationsTable(): KvTable<string, Operation> {
    if (!this.operations) throw new ExpertsError('experts/unavailable', '专家服务尚未就绪。');
    return this.operations;
  }

  private loadExpert(expertId: string): Expert {
    const expert = this.expertsTable().get(keys.expert(expertId));
    if (!expert) throw new ExpertsError('experts/not-found', '未找到该专家。');
    return expert;
  }

  private loadDraft(expertId: string): ExpertDraft {
    const draft = this.draftsTable().get(keys.draft(expertId));
    if (!draft) throw new ExpertsError('experts/not-found', '未找到该专家的草稿。');
    return draft;
  }

  private loadRevision(expertId: string, revisionId: string): ExpertRevision {
    const revision = this.revisionsTable().get(keys.revision(expertId, revisionId));
    if (!revision) throw new ExpertsError('experts/not-found', '未找到该专家修订。');
    return revision;
  }

  // ── serialization, authorization, audit ───────────────────────────────────

  /** Serialize every cross-record write on one tail so CAS checks never interleave. */
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.mutationTail.then(operation, operation);
    this.mutationTail = run.then(() => undefined, () => undefined);
    return run;
  }

  private async authorize(actor: ActorContext, action: ExpertAction, expert: Expert, signal?: AbortSignal): Promise<void> {
    const decision = await this.ctx.workdshAccess.authorize({
      actor,
      action: actionAccess(action),
      resource: { domain: EXPERT_DOMAIN, id: expert.id, revision: expert.revision },
      owner: expert.owner,
    }, signal);
    if (decision.effect !== 'allow') {
      throw new ExpertsError('experts/forbidden', '没有权限对该专家执行此操作。', { reason: decision.code });
    }
    if (expert.teamParentId) {
      if (['experts.update-draft', 'experts.publish', 'experts.set-availability'].includes(action)) throw new ExpertsError('experts/forbidden', '请通过专家团整体修改或发布成员。');
      const parent = this.loadExpert(expert.teamParentId);
      if (!this.isVisible(actor, parent) || parent.availability !== 'enabled' || !parent.publishedRevisionRef) throw new ExpertsError('experts/disabled', '成员所属专家团未发布、已停用或不可访问。');
      const attached = [...this.revisionsTable().entries()].some(([, revision]) => revision.expertId === parent.id && Object.values(revision.teamMembers ?? {}).some(ref => ref.expertId === expert.id));
      if (!attached) throw new ExpertsError('experts/not-published', '该成员尚未随专家团发布。');
    }
  }

  private async audit(
    actor: ActorContext,
    action: ExpertAction,
    expertId: string | undefined,
    outcome: AuditEvent['outcome'],
    code: string,
    references?: Readonly<Record<string, string>>,
  ): Promise<void> {
    await this.ctx.workdshAudit.append({
      id: randomUUID(),
      occurredAt: new Date().toISOString(),
      requestId: actor.requestId,
      principalId: actor.principalId,
      organizationId: actor.organizationId,
      action,
      ...(expertId === undefined ? {} : { target: { domain: EXPERT_DOMAIN, id: expertId } }),
      outcome,
      code,
      ...(actor.sessionId === undefined ? {} : { sessionId: actor.sessionId }),
      ...(references === undefined ? {} : { references }),
    });
  }

  private newOwner(actor: ActorContext): ResourceOwner {
    return Object.freeze({
      organizationId: actor.organizationId,
      ownerPrincipalId: actor.principalId,
      scope: 'personal' as const,
    });
  }

  private assertContext(context: MutationContext): void {
    if (!context || typeof context.operationId !== 'string' || !context.operationId.trim()) {
      throw new ExpertsError('experts/invalid-request', '缺少有效的 operationId。');
    }
    if (context.expectedRevision !== undefined && typeof context.expectedRevision !== 'string') {
      throw new ExpertsError('experts/invalid-request', 'expectedRevision 无效。');
    }
  }

  // ── default seeding ───────────────────────────────────────────────────────

  /**
   * Seed the three shipped default experts once, the first time the catalog is
   * read in a deployment. They become ordinary personal-owned experts (copyable,
   * disable-able), never a hidden second source of truth. A compilation failure
   * (e.g. no writable preset root) skips that template rather than breaking reads.
   */
  private async ensureSeeded(actor: ActorContext, signal?: AbortSignal): Promise<void> {
    if (this.expertsTable().size > 0) return;
    if (!this.seeding) {
      this.seeding = this.enqueue(async () => {
        if (this.expertsTable().size > 0) return;
        for (const template of DEFAULT_TEMPLATES) {
          try {
            await this.seedTemplate(actor, template.id, template.definition, signal);
          } catch (error) {
            await this.audit(actor, 'experts.create-draft', template.id, 'failed', errorCode(error, 'experts/seed-failed'));
          }
        }
      }).then(() => undefined, () => undefined).finally(() => { this.seeding = undefined; });
    }
    await this.seeding;
  }

  private async seedTemplate(actor: ActorContext, expertId: string, definition: ExpertDefinition, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted();
    const now = new Date().toISOString();
    const normalized = normalizeDefinition(definition);
    const defDigest = definitionDigest(normalized);
    const lockDigest = digestOf([]);
    const draftRevision = shortDigest({ seed: expertId, defDigest });
    const basePresetId = await this.resolveBasePreset(signal);
    const compiled = await compileExpertPreset(this.ctx, { expertId, definition: normalized, snapshotDirs: [], basePresetId });
    const revisionId = revisionIdFor(defDigest, lockDigest, compiled.presetId);
    const revision: ExpertRevision = {
      expertId, revisionId, definition: normalized, definitionDigest: defDigest,
      dependencyLock: [], dependencyLockDigest: lockDigest,
      presetRevisionRef: compiled.presetId, compilerVersion: COMPILER_VERSION,
      compositionDigest: compiled.compositionDigest,
      publishedAt: now, publishedBy: actor.principalId,
    };
    const draft: ExpertDraft = { expertId, revision: draftRevision, definition: normalized, validationIssues: [] };
    const expert: Expert = {
      id: expertId, owner: this.newOwner(actor), origin: 'default', availability: 'enabled',
      revision: `r-${randomUUID()}`, draftRevision,
      publishedRevisionRef: { expertId, revisionId }, createdAt: now, updatedAt: now,
    };
    await this.revisionsTable().put(keys.revision(expertId, revisionId), revision);
    await this.draftsTable().put(keys.draft(expertId), draft);
    await this.expertsTable().put(keys.expert(expertId), expert);
  }

  /** Expert 0.1 uses standard explicitly; never inherit a different execution mode silently. */
  private async resolveBasePreset(signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted();
    try {
      const standard = await this.ctx.agentPresets.resolve('standard');
      signal?.throwIfAborted();
      if (!standard.broken && standard.id === 'standard') return standard.id;
    } catch {
      signal?.throwIfAborted();
    }
    throw new ExpertsError('experts/preset-broken', '专家需要官方标准模式（standard），但当前不可用。请恢复标准模式后重试；不会自动切换到 PTC、创造或其他模式。');
  }

  /**
   * Recompile an older published team for the current runtime without mutating its
   * immutable revision. Existing Sessions keep their old binding; only future
   * executions move to the derived revision. This is intentionally done on use so
   * installations upgraded from an earlier WorkDSH release need no manual republish.
   */
  private async ensureCurrentExecutionRevision(actor: ActorContext, revision: ExpertRevision, signal?: AbortSignal): Promise<ExpertRevision> {
    if (!revision.definition.team || revision.compilerVersion === COMPILER_VERSION) return revision;
    return this.enqueue(async () => {
      // Another concurrent prepare may already have advanced the published pointer.
      const owner = this.loadExpert(revision.expertId);
      const currentRef = owner.publishedRevisionRef;
      if (currentRef && currentRef.revisionId !== revision.revisionId) {
        const current = this.loadRevision(currentRef.expertId, currentRef.revisionId);
        if (current.compilerVersion === COMPILER_VERSION && current.definitionDigest === revision.definitionDigest) return current;
      }

      const basePresetId = await this.resolveBasePreset(signal);
      const upgradedMembers: Record<string, ExpertRevisionRef> = {};
      for (const [memberName, ref] of Object.entries(revision.teamMembers ?? {})) {
        signal?.throwIfAborted();
        const source = this.loadRevision(ref.expertId, ref.revisionId);
        const snapshotDirs: string[] = [];
        for (const skill of source.dependencyLock) {
          snapshotDirs.push((await this.ctx.workdshSkills.retainRevision(skill, { domain: EXPERT_DOMAIN, id: source.expertId }, signal)).snapshotDir);
        }
        const compiled = await compileExpertPreset(this.ctx, {
          expertId: source.expertId,
          definition: source.definition,
          snapshotDirs,
          basePresetId,
        });
        const revisionId = revisionIdFor(source.definitionDigest, source.dependencyLockDigest, compiled.presetId);
        const upgraded: ExpertRevision = {
          ...source,
          revisionId,
          presetRevisionRef: compiled.presetId,
          compilerVersion: COMPILER_VERSION,
          compositionDigest: compiled.compositionDigest,
        };
        if (!this.revisionsTable().get(keys.revision(source.expertId, revisionId))) {
          await this.revisionsTable().put(keys.revision(source.expertId, revisionId), upgraded);
        }
        const member = this.loadExpert(source.expertId);
        if (member.publishedRevisionRef?.revisionId === source.revisionId) {
          await this.expertsTable().update(keys.expert(source.expertId), row => ({
            ...row,
            publishedRevisionRef: { expertId: source.expertId, revisionId },
            revision: `r-${randomUUID()}`,
            updatedAt: new Date().toISOString(),
          }));
        }
        upgradedMembers[memberName] = { expertId: source.expertId, revisionId };
      }

      const snapshotDirs: string[] = [];
      for (const skill of revision.dependencyLock) {
        snapshotDirs.push((await this.ctx.workdshSkills.retainRevision(skill, { domain: EXPERT_DOMAIN, id: revision.expertId }, signal)).snapshotDir);
      }
      const compiled = await compileExpertPreset(this.ctx, {
        expertId: revision.expertId,
        definition: revision.definition,
        snapshotDirs,
        basePresetId,
        teamMembers: upgradedMembers,
      });
      const revisionId = revisionIdFor(revision.definitionDigest, revision.dependencyLockDigest, compiled.presetId);
      const upgraded: ExpertRevision = {
        ...revision,
        revisionId,
        teamMembers: upgradedMembers,
        presetRevisionRef: compiled.presetId,
        compilerVersion: COMPILER_VERSION,
        compositionDigest: compiled.compositionDigest,
      };
      if (!this.revisionsTable().get(keys.revision(revision.expertId, revisionId))) {
        await this.revisionsTable().put(keys.revision(revision.expertId, revisionId), upgraded);
      }
      if (owner.publishedRevisionRef?.revisionId === revision.revisionId) {
        await this.expertsTable().update(keys.expert(revision.expertId), row => ({
          ...row,
          publishedRevisionRef: { expertId: revision.expertId, revisionId },
          revision: `r-${randomUUID()}`,
          updatedAt: new Date().toISOString(),
        }));
      }
      await this.audit(actor, 'experts.prepare-execution', revision.expertId, 'succeeded', 'experts/compiler-migration-succeeded', {
        from: revision.compilerVersion,
        to: COMPILER_VERSION,
        revisionId,
      });
      return upgraded;
    });
  }

  // ── projections ───────────────────────────────────────────────────────────

  /** Cheap, ownership-derived capabilities. Non-owned rows deny by default (org phase deferred). */
  private capabilities(actor: ActorContext, expert: Expert): { canUse: boolean; canEdit: boolean; canManage: boolean } {
    const owned = actor.organizationId === expert.owner.organizationId
      && actor.principalId === expert.owner.ownerPrincipalId;
    if (!owned) return { canUse: false, canEdit: false, canManage: false };
    return {
      canUse: expert.availability === 'enabled' && expert.publishedRevisionRef !== undefined,
      canEdit: expert.origin !== 'default' && !expert.teamParentId,
      canManage: !expert.teamParentId,
    };
  }

  /** A row is visible when it shares the actor's organization and is personal-owned by the actor. */
  private isVisible(actor: ActorContext, expert: Expert): boolean {
    if (actor.organizationId !== expert.owner.organizationId) return false;
    return actor.principalId === expert.owner.ownerPrincipalId || expert.owner.scope !== 'personal';
  }

  private preferenceFor(actor: ActorContext, expertId: string): ExpertPreference | undefined {
    return this.preferencesTable().get(keys.preference(actor.principalId, expertId));
  }

  /**
   * List-view readiness: one roster read gives preset health for every row, and
   * required-but-unsupported future capabilities are in-memory. Per-Skill drift is
   * authoritative only in the detail view, so a 1,000-row list stays cheap (AT-22).
   */
  private async readinessMap(revisions: readonly ExpertRevision[]): Promise<Map<string, ExpertReadiness>> {
    const map = new Map<string, ExpertReadiness>();
    if (revisions.length === 0) return map;
    let health: Map<string, boolean> | undefined;
    try {
      health = new Map((await this.ctx.agentPresets.list()).map((preset) => [preset.id, !preset.broken]));
    } catch {
      health = undefined;
    }
    for (const revision of revisions) {
      if (revision.definition.futureRequirements.some((requirement) => requirement.required)) {
        map.set(revision.revisionId, 'unsupported-capability');
        continue;
      }
      const healthy = health?.get(revision.presetRevisionRef);
      map.set(revision.revisionId, healthy === false || (health !== undefined && healthy === undefined) ? 'broken' : 'ready');
    }
    return map;
  }

  /** Authoritative readiness for one revision: preset health plus every frozen Skill dependency. */
  private async computeReadiness(revision: ExpertRevision | undefined, actor: ActorContext, signal?: AbortSignal): Promise<ExpertReadiness> {
    if (!revision) return 'unknown';
    if (revision.definition.packageDocuments) {
      try { await verifyPackageFiles(expertPresetDir(revision.presetRevisionRef), revision.definition.packageDocuments, revision.definition.packageAssets); }
      catch { return 'missing-dependency'; }
    }
    for (const ref of Object.values(revision.teamMembers ?? {})) {
      const state = await this.computeReadiness(this.loadRevision(ref.expertId, ref.revisionId), actor, signal);
      if (state !== 'ready') return state;
    }
    if (revision.definition.futureRequirements.some((requirement) => requirement.required)) return 'unsupported-capability';
    try {
      const preset = await this.ctx.agentPresets.resolve(revision.presetRevisionRef);
      if (preset.broken) return 'broken';
    } catch {
      return 'broken';
    }
    for (const ref of revision.dependencyLock) {
      signal?.throwIfAborted();
      const check = await this.ctx.workdshSkills.checkRevision(ref, actor, signal);
      if (check.status !== 'intact') return 'missing-dependency';
    }
    return 'ready';
  }

  private toSummary(
    expert: Expert,
    draft: ExpertDraft,
    readiness: ExpertReadiness,
    preference: ExpertPreference | undefined,
    caps: { canUse: boolean; canEdit: boolean; canManage: boolean },
  ): ExpertSummary {
    const definition = draft.definition;
    return {
      id: expert.id,
      expertType: definition.team ? 'team' : 'agent',
      profession: definition.role,
      tags: definition.tags,
      name: definition.name,
      description: definition.description,
      ...(definition.avatarRef === undefined ? {} : { avatarRef: definition.avatarRef }),
      origin: expert.origin,
      availability: expert.availability,
      ...(expert.publishedRevisionRef === undefined ? {} : { publishedRevisionRef: expert.publishedRevisionRef }),
      canUse: caps.canUse,
      canEdit: caps.canEdit,
      canManage: caps.canManage,
      readiness,
      pinned: preference?.pinned ?? false,
      ...(preference?.lastUsedAt === undefined ? {} : { lastUsedAt: preference.lastUsedAt }),
      updatedAt: expert.updatedAt,
    };
  }

  private catalogRevision(rows: readonly Expert[]): string {
    return shortDigest(rows.map((expert) => [expert.id, expert.revision]).sort((a, b) => a[0].localeCompare(b[0])));
  }

  private encodeCursor(catalogRevision: string, offset: number): string {
    return Buffer.from(JSON.stringify({ c: catalogRevision, o: offset }), 'utf8').toString('base64url');
  }

  private decodeCursor(cursor: string, catalogRevision: string): number {
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    } catch {
      throw new ExpertsError('experts/cursor-stale', '分页游标无效，请重新加载列表。');
    }
    const record = parsed as { c?: unknown; o?: unknown };
    if (typeof record.c !== 'string' || record.c !== catalogRevision || typeof record.o !== 'number' || !Number.isInteger(record.o) || record.o < 0) {
      throw new ExpertsError('experts/cursor-stale', '目录已变化，分页游标失效，请重新加载列表。');
    }
    return record.o;
  }

  private sortRows(rows: { expert: Expert; preference?: ExpertPreference }[]): void {
    rows.sort((left, right) => {
      const leftPin = left.preference?.pinned ? 1 : 0;
      const rightPin = right.preference?.pinned ? 1 : 0;
      if (leftPin !== rightPin) return rightPin - leftPin;
      const leftUsed = left.preference?.lastUsedAt ? Date.parse(left.preference.lastUsedAt) : 0;
      const rightUsed = right.preference?.lastUsedAt ? Date.parse(right.preference.lastUsedAt) : 0;
      if (leftUsed !== rightUsed) return rightUsed - leftUsed;
      const leftUpdated = Date.parse(left.expert.updatedAt);
      const rightUpdated = Date.parse(right.expert.updatedAt);
      if (leftUpdated !== rightUpdated) return rightUpdated - leftUpdated;
      return left.expert.id.localeCompare(right.expert.id);
    });
  }

  // ── catalog read ──────────────────────────────────────────────────────────

  /** Local catalog keys are stable skill names, owned by the public Skills service. */
  async listSkills(actor: ActorContext, expertId: string, scope: 'available' | 'equipped', signal?: AbortSignal): Promise<readonly import('../shared.js').ExpertSkillOption[]> {
    const detail = await this.get(actor, expertId, undefined, signal);
    if (scope === 'available' && !detail.canEdit) throw new ExpertsError('experts/forbidden', '没有权限为该专家选择技能。');
    const catalog = (await this.ctx.workdshSkills.list(signal)).map(skill => ({
      skillId: skill.name, name: skill.name, description: skill.description, state: skill.state,
      selectable: skill.modelInvocable && (skill.state === 'enabled' || skill.state === 'readonly'),
    }));
    if (scope === 'available') return catalog;
    const requirements = (detail.revision?.definition ?? detail.draft.definition).skillRequirements;
    return requirements.map(req => catalog.find(skill => skill.skillId === (req.skillId ?? req.name)) ?? {
      skillId: req.skillId ?? req.name, name: req.name, description: '该技能当前不在已安装目录中。', state: 'missing', selectable: false,
    });
  }

  async list(actor: ActorContext, query: ExpertListQuery, signal?: AbortSignal): Promise<ExpertListResult> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    if (query.search !== undefined && codePointLength(query.search) > EXPERT_LIMITS.searchMaxChars) {
      throw new ExpertsError('experts/invalid-request', `搜索词超过 ${EXPERT_LIMITS.searchMaxChars} 字上限。`);
    }
    const limit = query.limit === undefined ? EXPERT_LIMITS.listDefaultLimit : query.limit;
    if (!Number.isInteger(limit) || limit < 1 || limit > EXPERT_LIMITS.listMaxLimit) {
      throw new ExpertsError('experts/invalid-request', `每页数量必须在 1 至 ${EXPERT_LIMITS.listMaxLimit} 之间。`);
    }
    await this.ensureSeeded(actor, signal);
    signal?.throwIfAborted();

    const search = query.search?.trim().toLowerCase();
    const rows: { expert: Expert; draft: ExpertDraft; preference?: ExpertPreference }[] = [];
    for (const [, expert] of this.expertsTable().entries()) {
      if (expert.teamParentId) continue;
      if (!this.isVisible(actor, expert)) continue;
      if (query.origin !== undefined && expert.origin !== query.origin) continue;
      if (query.availability !== undefined && expert.availability !== query.availability) continue;
      const draft = this.draftsTable().get(keys.draft(expert.id));
      if (!draft) continue;
      if (query.expertType !== undefined && (draft.definition.team ? 'team' : 'agent') !== query.expertType) continue;
      if (query.categoryId !== undefined && (draft.definition.categoryId ?? null) !== query.categoryId) continue;
      if (search !== undefined && search.length > 0 && !matchesSearch(draft.definition, search)) continue;
      const preference = this.preferenceFor(actor, expert.id);
      rows.push({ expert, draft, ...(preference === undefined ? {} : { preference }) });
    }
    this.sortRows(rows);

    const visibleExperts = rows.map((row) => row.expert);
    const catalogRevision = this.catalogRevision(visibleExperts);
    const offset = query.cursor === undefined ? 0 : this.decodeCursor(query.cursor, catalogRevision);
    if (offset > rows.length) throw new ExpertsError('experts/cursor-stale', '目录已变化，分页游标失效，请重新加载列表。');

    const page = rows.slice(offset, offset + limit);
    const revisions = page
      .map((row) => (row.expert.publishedRevisionRef ? this.revisionsTable().get(keys.revision(row.expert.id, row.expert.publishedRevisionRef.revisionId)) : undefined))
      .filter((revision): revision is ExpertRevision => revision !== undefined);
    const readiness = await this.readinessMap(revisions);
    const readinessByRevision = new Map(revisions.map((revision) => [revision.revisionId, readiness.get(revision.revisionId) ?? 'unknown']));

    const items = page.map((row) => {
      const caps = this.capabilities(actor, row.expert);
      const revisionId = row.expert.publishedRevisionRef?.revisionId;
      const rowReadiness: ExpertReadiness = revisionId ? (readinessByRevision.get(revisionId) ?? 'unknown') : 'unknown';
      return this.toSummary(row.expert, row.draft, rowReadiness, row.preference, caps);
    });
    const nextOffset = offset + page.length;
    await this.audit(actor, 'experts.list', undefined, 'succeeded', 'experts/list-succeeded', { count: String(items.length), total: String(rows.length) });
    return {
      items,
      total: rows.length,
      ...(nextOffset < rows.length ? { nextCursor: this.encodeCursor(catalogRevision, nextOffset) } : {}),
      catalogRevision,
    };
  }

  async get(actor: ActorContext, expertId: string, revisionId?: string, signal?: AbortSignal): Promise<ExpertDetail> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    await this.ensureSeeded(actor, signal);
    const expert = this.loadExpert(expertId);
    if (!this.isVisible(actor, expert)) throw new ExpertsError('experts/not-found', '未找到该专家。');
    await this.authorize(actor, 'experts.get', expert, signal);
    const draft = this.loadDraft(expertId);
    const targetRevisionId = revisionId ?? expert.publishedRevisionRef?.revisionId;
    const revision = targetRevisionId === undefined ? undefined : this.loadRevision(expertId, targetRevisionId);
    const readiness = await this.computeReadiness(revision, actor, signal);
    const caps = this.capabilities(actor, expert);
    await this.audit(actor, 'experts.get', expertId, 'succeeded', 'experts/get-succeeded');
    return {
      expert, draft,
      ...(revision === undefined ? {} : { revision }),
      readiness,
      canUse: caps.canUse, canEdit: caps.canEdit, canManage: caps.canManage,
    };
  }

  // ── idempotency envelope ────────────────────────────────────────────────

  /**
   * Run a mutation exactly once per `operationId`. A committed operation replays its
   * stored result; an in-flight one (`applying`/`prepared`/`reconciling`, observable
   * only after a crash) reports `outcome-unknown` so the caller queries instead of
   * double-applying; a mismatched payload under the same id is a conflict; `failed`/
   * `cancelled` allow a fresh attempt. New-resource ids derive from `operationId`, so
   * a retry overwrites rather than duplicates. Everything runs on the mutation tail.
   */
  private async withOperation<T>(
    actor: ActorContext,
    action: ExpertAction,
    context: MutationContext,
    payloadDigest: string,
    signal: AbortSignal | undefined,
    run: (record: (result: { resultRef?: string; resultDetail?: string }) => void) => Promise<T>,
    replay: (operation: Operation) => Promise<T> | T,
  ): Promise<T> {
    this.assertContext(context);
    return this.enqueue(async () => {
      signal?.throwIfAborted();
      const operations = this.operationsTable();
      const operationId = context.operationId;
      const key = keys.operation(operationId);
      const existing = operations.get(key);
      if (existing) {
        if (existing.actorRef !== actor.principalId) {
          throw new ExpertsError('experts/forbidden', '没有权限重放该操作。');
        }
        if (existing.action !== action || existing.payloadDigest !== payloadDigest) {
          throw new ExpertsError('experts/idempotency-conflict', 'operationId 已被不同的请求占用，请更换后重试。', { operationId });
        }
        if (existing.phase === 'committed') return await replay(existing);
        if (existing.phase !== 'failed' && existing.phase !== 'cancelled') {
          throw new ExpertsError('experts/outcome-unknown', '上一次相同请求的结果尚未确定，请稍后查询该操作。', { operationId, phase: existing.phase });
        }
      }
      const createdAt = existing?.createdAt ?? new Date().toISOString();
      let resultRef: string | undefined;
      let resultDetail: string | undefined;
      const record = (result: { resultRef?: string; resultDetail?: string }): void => {
        resultRef = result.resultRef;
        resultDetail = result.resultDetail;
      };
      const applying: Operation = {
        operationId, actorRef: actor.principalId, action, payloadDigest,
        phase: 'applying', auditDelivery: 'pending', createdAt, updatedAt: new Date().toISOString(),
      };
      await operations.put(key, applying);
      try {
        const value = await run(record);
        await operations.put(key, {
          ...applying, phase: 'committed', auditDelivery: 'delivered', updatedAt: new Date().toISOString(),
          ...(resultRef === undefined ? {} : { resultRef }),
          ...(resultDetail === undefined ? {} : { resultDetail }),
        });
        return value;
      } catch (error) {
        await operations.put(key, {
          ...applying, phase: 'failed', error: errorCode(error, 'experts/internal'),
          auditDelivery: 'delivered', updatedAt: new Date().toISOString(),
        }).catch(() => undefined);
        throw error;
      }
    });
  }

  /** Deterministic, readable, preset-safe id for a newly created expert. */
  private newExpertId(operationId: string, name: string): string {
    return `${slugSegment(name)}-${shortDigest(operationId)}`;
  }

  // ── validation ───────────────────────────────────────────────────

  /**
   * Validate a draft with no side effect: structural/limit rules plus resolving each
   * declared Skill dependency to a frozen revision. The Skill owner keys by name, so
   * a declared name resolves to at most one local skill; unresolvable/disabled/drifted
   * dependencies come back as issues (never a silent skip).
   */
  private async computeValidation(draft: ExpertDraft, signal?: AbortSignal): Promise<ExpertValidation> {
    const definition = draft.definition;
    const issues: DomainIssue[] = [...validateDefinition(definition)];
    const dependencyLock: SkillRevisionRef[] = [];
    const seen = new Set<string>();
    let index = 0;
    const requirements = [definition, ...(definition.team?.members.map(member => member.definition) ?? [])].flatMap(item => item.skillRequirements);
    for (const requirement of requirements) {
      const path = `skillRequirements.${index}.name`;
      index += 1;
      const name = requirement.name;
      if (definition.packageDocuments?.[`skills/${requirement.skillId ?? name}/SKILL.md`]) continue;
      if (name.trim().length === 0) continue;
      if (seen.has(requirement.skillId ?? name) && definition.team) continue;
      if (seen.has(requirement.skillId ?? name)) {
        issues.push({ code: 'experts/dependency-missing', path, message: `Skill 依赖「${name}」重复声明。`, dependencyRef: name });
        continue;
      }
      seen.add(requirement.skillId ?? name);
      signal?.throwIfAborted();
      try {
        dependencyLock.push(await this.ctx.workdshSkills.resolveRevision(requirement.skillId ?? name, undefined, signal));
      } catch (error) {
        issues.push({ code: mapSkillDependencyError(error), path, message: `无法冻结 Skill 依赖「${name}」：${describeError(error)}`, dependencyRef: name });
      }
    }
    const defDigest = definitionDigest(definition);
    const dependencyLockDigest = digestOf(dependencyLock);
    return { issues, definitionDigest: defDigest, dependencyLock, dependencyLockDigest, publishable: issues.length === 0 };
  }

  // ── authoring ────────────────────────────────────────────────────

  async createDraft(
    actor: ActorContext,
    definition: Partial<ExpertDefinition> | undefined,
    context: MutationContext,
    signal?: AbortSignal,
  ): Promise<ExpertDraft> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    const candidate = definition?.packageDocuments ? definitionFromDocuments(definition.packageDocuments, definition.packageAssets) : normalizeDefinition(mergeDefinition(emptyDefinition(), definition ?? {}));
    const payloadDigest = digestOf({ action: 'experts.create-draft', definition: candidate });
    try {
      const draft = await this.withOperation(actor, 'experts.create-draft', context, payloadDigest, signal,
        async (record) => {
          const expertId = this.newExpertId(context.operationId, candidate.name);
          const now = new Date().toISOString();
          const draftRevision = shortDigest({ expertId, definition: candidate, createdAt: now });
          const nextDraft: ExpertDraft = { expertId, revision: draftRevision, definition: candidate, validationIssues: validateDefinition(candidate) };
          const expert: Expert = {
            id: expertId, owner: this.newOwner(actor), origin: 'personal', availability: 'enabled',
            revision: `r-${randomUUID()}`, draftRevision, createdAt: now, updatedAt: now,
          };
          await this.expertsTable().put(keys.expert(expertId), expert);
          await this.draftsTable().put(keys.draft(expertId), nextDraft);
          record({ resultRef: expertId, resultDetail: draftRevision });
          return nextDraft;
        },
        (operation) => this.loadDraft(operation.resultRef ?? this.newExpertId(context.operationId, candidate.name)),
      );
      await this.audit(actor, 'experts.create-draft', draft.expertId, 'succeeded', 'experts/create-draft-succeeded');
      return draft;
    } catch (error) {
      await this.audit(actor, 'experts.create-draft', undefined, 'failed', errorCode(error, 'experts/internal'));
      throw error;
    }
  }

  async updateDraft(
    actor: ActorContext,
    expertId: string,
    patch: Partial<ExpertDefinition>,
    context: MutationContext,
    signal?: AbortSignal,
  ): Promise<ExpertDraft> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    await this.ensureSeeded(actor, signal);
    const expert = this.loadExpert(expertId);
    if (!this.isVisible(actor, expert)) throw new ExpertsError('experts/not-found', '未找到该专家。');
    await this.authorize(actor, 'experts.update-draft', expert, signal);
    const payloadDigest = digestOf({ action: 'experts.update-draft', expertId, patch });
    try {
      const draft = await this.withOperation(actor, 'experts.update-draft', context, payloadDigest, signal,
        async (record) => {
          const current = this.loadExpert(expertId);
          if (current.origin === 'default') {
            throw new ExpertsError('experts/forbidden', '内置专家不可直接编辑，请先复制为我的专家。', { reason: 'default-immutable' });
          }
          if (context.expectedRevision !== undefined && current.revision !== context.expectedRevision) {
            throw new ExpertsError('experts/conflict', '专家已被修改，请刷新后重试。', { expectedRevision: context.expectedRevision, currentRevision: current.revision });
          }
          const base = this.loadDraft(expertId);
          const candidate = patch.packageDocuments
            ? definitionFromDocuments(patch.packageDocuments, patch.packageAssets ?? base.definition.packageAssets)
            : patch.agentDocument ? normalizeDefinition({ ...mergeDefinition(base.definition, patch), ...parseExpertDocument(patch.agentDocument) })
            : base.definition.packageDocuments || base.definition.agentDocument
              ? (() => { throw new ExpertsError('experts/invalid-definition', '请修改完整制作文件，不能仅修改摘要字段。'); })()
              : normalizeDefinition(mergeDefinition(base.definition, patch));
          if (base.definition.packageDocuments && candidate.packageDocuments) {
            const identity = (files: Record<string, string>) => JSON.parse(files['.workdsh-expert/plugin.json'] ?? files['.codebuddy-plugin/plugin.json']);
            const before = identity(base.definition.packageDocuments), after = identity(candidate.packageDocuments);
            if (before.name !== after.name || before.agentName !== after.agentName) throw new ExpertsError('experts/invalid-definition', '修改必须保留包 name 与默认 agentName；更换身份请创建新作品。');
          }
          const now = new Date().toISOString();
          const draftRevision = shortDigest({ expertId, definition: candidate, updatedAt: now });
          const nextDraft: ExpertDraft = { expertId, revision: draftRevision, definition: candidate, validationIssues: validateDefinition(candidate) };
          await this.draftsTable().put(keys.draft(expertId), nextDraft);
          await this.expertsTable().update(keys.expert(expertId), (row) => ({ ...row, draftRevision, revision: `r-${randomUUID()}`, updatedAt: now }));
          record({ resultRef: expertId, resultDetail: draftRevision });
          return nextDraft;
        },
        (operation) => this.loadDraft(operation.resultRef ?? expertId),
      );
      await this.audit(actor, 'experts.update-draft', expertId, 'succeeded', 'experts/update-draft-succeeded');
      return draft;
    } catch (error) {
      await this.audit(actor, 'experts.update-draft', expertId, 'failed', errorCode(error, 'experts/internal'));
      throw error;
    }
  }

  async copy(
    actor: ActorContext,
    expertId: string,
    revisionId: string | undefined,
    context: MutationContext,
    signal?: AbortSignal,
  ): Promise<ExpertDraft> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    await this.ensureSeeded(actor, signal);
    const source = this.loadExpert(expertId);
    if (!this.isVisible(actor, source)) throw new ExpertsError('experts/not-found', '未找到该专家。');
    await this.authorize(actor, 'experts.copy', source, signal);
    const sourceRevisionId = revisionId ?? source.publishedRevisionRef?.revisionId;
    const sourceDefinition = sourceRevisionId !== undefined
      ? this.loadRevision(expertId, sourceRevisionId).definition
      : this.loadDraft(expertId).definition;
    const candidate = normalizeDefinition({ ...sourceDefinition, name: `${sourceDefinition.name} 副本` });
    const payloadDigest = digestOf({ action: 'experts.copy', expertId, revisionId: revisionId ?? null, definition: candidate });
    try {
      const draft = await this.withOperation(actor, 'experts.copy', context, payloadDigest, signal,
        async (record) => {
          const newId = this.newExpertId(context.operationId, candidate.name);
          const now = new Date().toISOString();
          const draftRevision = shortDigest({ expertId: newId, definition: candidate, createdAt: now });
          const nextDraft: ExpertDraft = { expertId: newId, revision: draftRevision, definition: candidate, validationIssues: validateDefinition(candidate) };
          const expert: Expert = {
            id: newId, owner: this.newOwner(actor), origin: 'personal', availability: 'enabled',
            revision: `r-${randomUUID()}`, draftRevision, createdAt: now, updatedAt: now,
          };
          await this.expertsTable().put(keys.expert(newId), expert);
          await this.draftsTable().put(keys.draft(newId), nextDraft);
          record({ resultRef: newId, resultDetail: draftRevision });
          return nextDraft;
        },
        (operation) => this.loadDraft(operation.resultRef ?? this.newExpertId(context.operationId, candidate.name)),
      );
      await this.audit(actor, 'experts.copy', draft.expertId, 'succeeded', 'experts/copy-succeeded', { source: expertId });
      return draft;
    } catch (error) {
      await this.audit(actor, 'experts.copy', expertId, 'failed', errorCode(error, 'experts/internal'));
      throw error;
    }
  }

  async validate(actor: ActorContext, expertId: string, draftRevision: string, signal?: AbortSignal): Promise<ExpertValidation> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    await this.ensureSeeded(actor, signal);
    const expert = this.loadExpert(expertId);
    if (!this.isVisible(actor, expert)) throw new ExpertsError('experts/not-found', '未找到该专家。');
    await this.authorize(actor, 'experts.validate', expert, signal);
    const draft = this.loadDraft(expertId);
    if (draft.revision !== draftRevision) {
      throw new ExpertsError('experts/conflict', '草稿已变化，请重新加载后校验。', { expected: draftRevision, current: draft.revision });
    }
    const validation = await this.computeValidation(draft, signal);
    await this.audit(actor, 'experts.validate', expertId, 'succeeded', 'experts/validate-succeeded', { publishable: String(validation.publishable) });
    return validation;
  }

  // ── publish (confirmation-bound) ────────────────────────────────────────

  async requestPublishConfirmation(actor: ActorContext, expertId: string, draftRevision: string, signal?: AbortSignal): Promise<ConfirmationRequest> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    await this.ensureSeeded(actor, signal);
    const expert = this.loadExpert(expertId);
    if (!this.isVisible(actor, expert)) throw new ExpertsError('experts/not-found', '未找到该专家。');
    await this.authorize(actor, 'experts.publish', expert, signal);
    if (expert.origin === 'default') throw new ExpertsError('experts/forbidden', '内置专家不可直接发布，请先复制为我的专家。', { reason: 'default-immutable' });
    if (expert.availability === 'archived') throw new ExpertsError('experts/archived', '专家已归档，无法发布。');
    const draft = this.loadDraft(expertId);
    if (draft.revision !== draftRevision) {
      throw new ExpertsError('experts/conflict', '草稿已变化，请重新加载后再确认发布。', { expected: draftRevision, current: draft.revision });
    }
    const validation = await this.computeValidation(draft, signal);
    if (!validation.publishable) {
      throw new ExpertsError('experts/invalid-definition', '定义尚未通过校验，无法发布。', { issues: validation.issues });
    }
    const request = this.confirmations.request({
      expertId, action: 'experts.publish', draftRevision,
      definitionDigest: validation.definitionDigest, dependencyLockDigest: validation.dependencyLockDigest,
      principalId: actor.principalId,
    });
    await this.audit(actor, 'experts.publish', expertId, 'succeeded', 'experts/publish-confirmation-requested');
    return request;
  }

  /**
   * Trusted UI user action: exchange a pending challenge for a one-time proof. The
   * Connection transport exposes this only on the user route; the Agent tool surface
   * never calls it, so a model or prompt text can never fabricate publish authority.
   */
  async confirmPublish(actor: ActorContext, confirmationToken: string, signal?: AbortSignal): Promise<ConfirmationProof> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    return this.confirmations.confirm(confirmationToken, actor.principalId);
  }

  async publish(
    actor: ActorContext,
    expertId: string,
    draftRevision: string,
    dependencyLockDigest: string,
    proof: ConfirmationProof,
    context: MutationContext,
    signal?: AbortSignal,
  ): Promise<PublishReceipt> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    await this.ensureSeeded(actor, signal);
    const expert = this.loadExpert(expertId);
    if (!this.isVisible(actor, expert)) throw new ExpertsError('experts/not-found', '未找到该专家。');
    await this.authorize(actor, 'experts.publish', expert, signal);
    if (expert.origin === 'default') throw new ExpertsError('experts/forbidden', '内置专家不可直接发布，请先复制为我的专家。', { reason: 'default-immutable' });
    if (expert.availability === 'archived') throw new ExpertsError('experts/archived', '专家已归档，无法发布。');
    const payloadDigest = digestOf({ action: 'experts.publish', expertId, draftRevision, dependencyLockDigest });
    try {
      const receipt = await this.withOperation(actor, 'experts.publish', context, payloadDigest, signal,
        async (record) => {
          const current = this.loadExpert(expertId);
          if (context.expectedRevision !== undefined && current.revision !== context.expectedRevision) {
            throw new ExpertsError('experts/conflict', '专家已被修改，请刷新后重试。', { expectedRevision: context.expectedRevision, currentRevision: current.revision });
          }
          const draft = this.loadDraft(expertId);
          if (draft.revision !== draftRevision) {
            throw new ExpertsError('experts/conflict', '草稿已变化，请重新校验并确认后再发布。', { expected: draftRevision, current: draft.revision });
          }
          const validation = await this.computeValidation(draft, signal);
          if (!validation.publishable) {
            throw new ExpertsError('experts/invalid-definition', '定义未通过校验，无法发布。', { issues: validation.issues });
          }
          if (validation.dependencyLockDigest !== dependencyLockDigest) {
            throw new ExpertsError('experts/confirmation-stale', '依赖已变化，请重新校验并确认后再发布。', { expected: dependencyLockDigest, current: validation.dependencyLockDigest });
          }
          // One-time proof consumed only on a fresh attempt; an idempotent replay never reaches here.
          this.confirmations.consume(proof, {
            principalId: actor.principalId,
            definitionDigest: validation.definitionDigest,
            dependencyLockDigest: validation.dependencyLockDigest,
          });
          const teamMembers: Record<string, ExpertRevisionRef> = {};
          for (const member of draft.definition.team?.members ?? []) {
            signal?.throwIfAborted();
            // Content-addressed members are invisible until a parent revision commits.
            // A failed aggregate retry reuses exactly the same snapshots.
            const memberId = `member-${shortDigest({ parent: expertId, key: member.key, definition: member.definition, packageDocuments: draft.definition.packageDocuments, packageAssets: draft.definition.packageAssets, dependencies: validation.dependencyLock })}`;
            const memberDefinition: ExpertDefinition = { ...member.definition, ...(draft.definition.packageAssets ? { packageAssets: draft.definition.packageAssets } : {}), ...(draft.definition.packageDocuments ? { packageDocuments: draft.definition.packageDocuments } : {}) };
            const lock = member.definition.skillRequirements.filter(req => !draft.definition.packageDocuments?.[`skills/${req.skillId ?? req.name}/SKILL.md`]).map(req => {
              const target = req.skillId ?? req.name;
              const ref = validation.dependencyLock.find(ref => ref.skillId === target || ref.name === target);
              if (!ref) throw new ExpertsError('experts/dependency-missing', `成员 ${member.key} 的技能快照缺失。`);
              return ref;
            });
            const dirs: string[] = [];
            for (const ref of lock) dirs.push((await this.ctx.workdshSkills.retainRevision(ref, { domain: EXPERT_DOMAIN, id: memberId }, signal)).snapshotDir);
            const compiledMember = await compileExpertPreset(this.ctx, { expertId: memberId, definition: memberDefinition, snapshotDirs: dirs, basePresetId: await this.resolveBasePreset(signal) });
            const memberDigest = definitionDigest(memberDefinition);
            const lockDigest = digestOf(lock);
            const memberRevisionId = revisionIdFor(memberDigest, lockDigest, compiledMember.presetId);
            const now = new Date().toISOString();
            const ref = { expertId: memberId, revisionId: memberRevisionId };
            if (!this.revisionsTable().get(keys.revision(memberId, memberRevisionId))) {
              await this.revisionsTable().put(keys.revision(memberId, memberRevisionId), { expertId: memberId, revisionId: memberRevisionId, definition: memberDefinition, definitionDigest: memberDigest, dependencyLock: lock, dependencyLockDigest: lockDigest, presetRevisionRef: compiledMember.presetId, compilerVersion: COMPILER_VERSION, compositionDigest: compiledMember.compositionDigest, publishedAt: now, publishedBy: actor.principalId });
            }
            if (!this.expertsTable().get(keys.expert(memberId))) {
              await this.draftsTable().put(keys.draft(memberId), { expertId: memberId, revision: memberDigest, definition: member.definition, validationIssues: [] });
              await this.expertsTable().put(keys.expert(memberId), { id: memberId, teamParentId: expertId, owner: current.owner, origin: 'personal', availability: 'enabled', revision: memberDigest, draftRevision: memberDigest, publishedRevisionRef: ref, createdAt: now, updatedAt: now });
            }
            teamMembers[member.key] = ref;
          }
          // Freeze each declared Skill dependency into a retained, managed snapshot.
          const consumer = { domain: EXPERT_DOMAIN, id: expertId };
          const snapshotDirs: string[] = [];
          for (const ref of validation.dependencyLock) {
            signal?.throwIfAborted();
            const retained = await this.ctx.workdshSkills.retainRevision(ref, consumer, signal);
            snapshotDirs.push(retained.snapshotDir);
          }
          const basePresetId = await this.resolveBasePreset(signal);
          const compiled = await compileExpertPreset(this.ctx, { expertId, definition: draft.definition, snapshotDirs, basePresetId, ...(draft.definition.team ? { teamMembers } : {}) });
          const revisionId = revisionIdFor(validation.definitionDigest, validation.dependencyLockDigest, compiled.presetId);
          const now = new Date().toISOString();
          const revision: ExpertRevision = {
            expertId, revisionId, definition: draft.definition, definitionDigest: validation.definitionDigest,
            dependencyLock: validation.dependencyLock, dependencyLockDigest: validation.dependencyLockDigest,
            ...(draft.definition.team ? { teamMembers } : {}),
            presetRevisionRef: compiled.presetId, compilerVersion: COMPILER_VERSION,
            compositionDigest: compiled.compositionDigest,
            publishedAt: now, publishedBy: actor.principalId,
          };
          await this.revisionsTable().put(keys.revision(expertId, revisionId), revision);
          const publishedRef: ExpertRevisionRef = { expertId, revisionId };
          await this.expertsTable().update(keys.expert(expertId), (row) => ({
            ...row, publishedRevisionRef: publishedRef, revision: `r-${randomUUID()}`, updatedAt: now,
          }));
          const result: PublishReceipt = {
            expertId, revision: publishedRef, presetRevisionRef: compiled.presetId,
            definitionDigest: validation.definitionDigest, dependencyLockDigest: validation.dependencyLockDigest,
            operationId: context.operationId,
          };
          record({ resultRef: revisionId, resultDetail: JSON.stringify(result) });
          return result;
        },
        (operation) => {
          if (!operation.resultDetail) throw new ExpertsError('experts/outcome-unknown', '无法恢复发布结果，请查询操作状态。');
          return JSON.parse(operation.resultDetail) as PublishReceipt;
        },
      );
      await this.audit(actor, 'experts.publish', expertId, 'succeeded', 'experts/publish-succeeded', { revisionId: receipt.revision.revisionId });
      return receipt;
    } catch (error) {
      await this.audit(actor, 'experts.publish', expertId, 'failed', errorCode(error, 'experts/internal'));
      throw error;
    }
  }

  // ── lifecycle & preference ────────────────────────────────────────────────

  async setAvailability(
    actor: ActorContext,
    expertId: string,
    availability: ExpertAvailability,
    context: MutationContext,
    _proof?: ConfirmationProof,
    signal?: AbortSignal,
  ): Promise<AvailabilityReceipt> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    await this.ensureSeeded(actor, signal);
    const expert = this.loadExpert(expertId);
    if (!this.isVisible(actor, expert)) throw new ExpertsError('experts/not-found', '未找到该专家。');
    await this.authorize(actor, 'experts.set-availability', expert, signal);
    // Availability is reversible (enable/disable/archive are states, never a hard delete),
    // so 0.1 does not require a content-bound confirmation proof here; `_proof` is reserved.
    const payloadDigest = digestOf({ action: 'experts.set-availability', expertId, availability });
    try {
      const receipt = await this.withOperation(actor, 'experts.set-availability', context, payloadDigest, signal,
        async (record) => {
          const current = this.loadExpert(expertId);
          if (context.expectedRevision !== undefined && current.revision !== context.expectedRevision) {
            throw new ExpertsError('experts/conflict', '专家已被修改，请刷新后重试。', { expectedRevision: context.expectedRevision, currentRevision: current.revision });
          }
          const now = new Date().toISOString();
          const nextRevision = `r-${randomUUID()}`;
          await this.expertsTable().update(keys.expert(expertId), (row) => ({ ...row, availability, revision: nextRevision, updatedAt: now }));
          const result: AvailabilityReceipt = { expertId, availability, revision: nextRevision, operationId: context.operationId };
          record({ resultRef: expertId, resultDetail: JSON.stringify(result) });
          return result;
        },
        (operation) => {
          if (!operation.resultDetail) throw new ExpertsError('experts/outcome-unknown', '无法恢复状态变更结果，请查询操作状态。');
          return JSON.parse(operation.resultDetail) as AvailabilityReceipt;
        },
      );
      await this.audit(actor, 'experts.set-availability', expertId, 'succeeded', 'experts/set-availability-succeeded', { availability });
      return receipt;
    } catch (error) {
      await this.audit(actor, 'experts.set-availability', expertId, 'failed', errorCode(error, 'experts/internal'));
      throw error;
    }
  }

  async setPreference(actor: ActorContext, expertId: string, pinned: boolean, expectedRevision?: string, signal?: AbortSignal): Promise<ExpertPreference> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    await this.ensureSeeded(actor, signal);
    const expert = this.loadExpert(expertId);
    if (!this.isVisible(actor, expert)) throw new ExpertsError('experts/not-found', '未找到该专家。');
    // Preference is per-principal and never mutates the shared expert; read access suffices.
    await this.authorize(actor, 'experts.set-preference', expert, signal);
    return this.enqueue(async () => {
      const key = keys.preference(actor.principalId, expertId);
      const table = this.preferencesTable();
      const existing = table.get(key);
      if (expectedRevision !== undefined && existing?.revision !== expectedRevision) {
        throw new ExpertsError('experts/conflict', '偏好已变化，请刷新后重试。', { expectedRevision, currentRevision: existing?.revision });
      }
      const next: ExpertPreference = {
        principalId: actor.principalId, expertId, pinned,
        ...(existing?.lastUsedAt === undefined ? {} : { lastUsedAt: existing.lastUsedAt }),
        revision: `p-${randomUUID()}`,
      };
      await table.put(key, next);
      await this.audit(actor, 'experts.set-preference', expertId, 'succeeded', 'experts/set-preference-succeeded', { pinned: String(pinned) });
      return next;
    });
  }

  /** Record recent use for the actor without disturbing their pinned flag. */
  private async touchLastUsed(actor: ActorContext, expertId: string): Promise<void> {
    const key = keys.preference(actor.principalId, expertId);
    const table = this.preferencesTable();
    const existing = table.get(key);
    const next: ExpertPreference = {
      principalId: actor.principalId, expertId,
      pinned: existing?.pinned ?? false,
      lastUsedAt: new Date().toISOString(),
      revision: `p-${randomUUID()}`,
    };
    await table.put(key, next);
  }

  // ── execution (native Session, bound to one frozen revision) ────────────────

  async prepareExecution(
    actor: ActorContext,
    expertId: string,
    revisionId: string | undefined,
    workspaceRef: string | undefined,
    modelSelection: ModelSelectionRequest | undefined,
    draftText: string | undefined,
    signal?: AbortSignal,
    workspaceId?: string,
  ): Promise<ExecutionPlan> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    await this.ensureSeeded(actor, signal);
    const expert = this.loadExpert(expertId);
    if (!this.isVisible(actor, expert)) throw new ExpertsError('experts/not-found', '未找到该专家。');
    await this.authorize(actor, 'experts.prepare-execution', expert, signal);
    if (expert.availability === 'archived') throw new ExpertsError('experts/archived', '专家已归档，无法召唤。');
    if (expert.availability === 'disabled') throw new ExpertsError('experts/disabled', '专家已停用，请先启用后再召唤。');
    const targetRevisionId = revisionId ?? expert.publishedRevisionRef?.revisionId;
    if (targetRevisionId === undefined) throw new ExpertsError('experts/not-published', '专家尚未发布，无法召唤。');
    let revision = this.loadRevision(expertId, targetRevisionId);
    revision = await this.ensureCurrentExecutionRevision(actor, revision, signal);
    const readiness = await this.computeReadiness(revision, actor, signal);
    const missing: DomainIssue[] = [];
    if (readiness === 'missing-dependency') missing.push({ code: 'experts/dependency-missing', message: '存在缺失或漂移的 Skill 依赖，请修复后再召唤。' });
    else if (readiness === 'unsupported-capability') missing.push({ code: 'experts/unsupported-capability', message: '存在尚未满足的必需能力，暂不可召唤。' });
    else if (readiness === 'broken') missing.push({ code: 'experts/preset-broken', message: '专家 preset 不可用，请重新发布后再召唤。' });
    const executionPlanId = `plan-${randomUUID()}`;
    const plan: ExecutionPlan = {
      executionPlanId,
      expertRevisionRef: { expertId, revisionId: revision.revisionId },
      presetRevisionRef: revision.presetRevisionRef,
      ...(workspaceRef === undefined ? {} : { workspaceRef }),
      ...(workspaceId === undefined ? {} : { workspaceId }),
      ...(modelSelection === undefined ? {} : { modelSelection }),
      ...(draftText === undefined ? {} : { draftText }),
      missing,
      expiresAt: new Date(Date.now() + PLAN_TTL_MS).toISOString(),
    };
    this.executionPlans.set(executionPlanId, plan);
    await this.audit(actor, 'experts.prepare-execution', expertId, 'succeeded', 'experts/prepare-execution-succeeded', { executionPlanId, missing: String(missing.length) });
    return plan;
  }

  /** Reconstruct an execution creation from a committed/​checkpointed operation record. */
  private replayExecution(operation: Operation): ExecutionCreation {
    const detail = JSON.parse(operation.resultDetail ?? '{}') as { sessionId?: string; handoffId?: string };
    const sessionId = operation.resultRef ?? detail.sessionId;
    if (!sessionId) throw new ExpertsError('experts/outcome-unknown', '无法恢复上次执行创建结果，请查询操作状态。');
    const binding = this.bindingsTable().get(keys.binding(sessionId));
    if (!binding) throw new ExpertsError('experts/outcome-unknown', '执行绑定缺失，请查询操作状态。');
    return { binding, sessionId, handoffId: detail.handoffId ?? '' };
  }

  async createExecution(actor: ActorContext, executionPlanId: string, context: MutationContext, signal?: AbortSignal): Promise<ExecutionCreation> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    this.assertContext(context);
    const payloadDigest = digestOf({ action: 'experts.create-execution', executionPlanId, operationId: context.operationId });
    // Idempotent fast path: a committed creation replays without the (one-shot, consumed) plan.
    const committed = this.operationsTable().get(keys.operation(context.operationId));
    if (committed && committed.action === 'experts.create-execution' && committed.payloadDigest === payloadDigest && committed.phase === 'committed') {
      if (committed.actorRef !== actor.principalId) throw new ExpertsError('experts/forbidden', '没有权限重放该操作。');
      const replayed = this.replayExecution(committed);
      if (replayed.binding.owner.organizationId !== actor.organizationId) throw new ExpertsError('experts/forbidden', '没有权限重放该组织的操作。');
      await this.audit(actor, 'experts.create-execution', replayed.binding.expertRevisionRef.expertId, 'succeeded', 'experts/create-execution-replayed', { sessionId: replayed.sessionId });
      return replayed;
    }
    const peeked = this.executionPlans.peek(executionPlanId);
    if (!peeked) throw new ExpertsError('experts/plan-expired', '执行计划不存在或已过期，请重新召唤。');
    if (peeked.expired) throw new ExpertsError('experts/plan-expired', '执行计划已过期，请重新召唤。');
    const plan = peeked.value;
    if (plan.missing.length > 0) {
      throw new ExpertsError('experts/dependency-missing', '存在未解决的依赖或能力问题，无法创建任务。', { issues: plan.missing });
    }
    const expert = this.loadExpert(plan.expertRevisionRef.expertId);
    if (!this.isVisible(actor, expert)) throw new ExpertsError('experts/not-found', '未找到该专家。');
    await this.authorize(actor, 'experts.create-execution', expert, signal);
    const revision = this.loadRevision(plan.expertRevisionRef.expertId, plan.expertRevisionRef.revisionId);
    try {
      const creation = await this.withOperation(actor, 'experts.create-execution', context, payloadDigest, signal,
        async (record) => {
          // Deterministic id ⇒ at most one native Session per operationId (no orphan on retry).
          const sessionId = `session-${digestOf(context.operationId).slice(0, 32)}`;
          const prior = this.bindingsTable().get(keys.binding(sessionId));
          if (prior) {
            const handoffId = `handoff-${randomUUID()}`;
            this.stageHandoff(handoffId, sessionId, plan.draftText ?? '');
            record({ resultRef: sessionId, resultDetail: JSON.stringify({ sessionId, handoffId }) });
            return { binding: prior, sessionId, handoffId };
          }
          const created = await this.ctx.workdshSessionAccess.create({
            sessionId: sessionId as SessionId,
            agentPreset: plan.presetRevisionRef,
            ...(plan.workspaceId !== undefined || plan.workspaceRef === undefined ? {} : { cwd: plan.workspaceRef }),
            ...(plan.workspaceId === undefined ? {} : { workspaceId: plan.workspaceId as SessionCreateRequest['workspaceId'] }),
          }, signal);
          const boundSessionId = String(created.sessionId);
          if (plan.modelSelection) {
            try {
              await this.ctx.sessionController.selectModel({ sessionId: created.sessionId, ...plan.modelSelection });
            } catch (error) {
              await this.audit(actor, 'experts.create-execution', plan.expertRevisionRef.expertId, 'failed', 'experts/model-selection-failed', { reason: describeError(error) });
              throw new ExpertsError('experts/unavailable', '指定模型无法选择，任务尚未就绪。');
            }
          }
          const now = new Date().toISOString();
          const binding: ExecutionBinding = {
            sessionId: boundSessionId,
            expertRevisionRef: plan.expertRevisionRef,
            presetRevisionRef: plan.presetRevisionRef,
            compositionDigest: revision.compositionDigest,
            skillRevisionRefs: revision.dependencyLock,
            owner: expert.owner,
            ...(plan.workspaceRef === undefined ? {} : { workspaceRef: plan.workspaceRef }),
            creationOperationId: context.operationId,
            createdAt: now,
          };
          await this.bindingsTable().put(keys.binding(boundSessionId), binding);
          const handoffId = `handoff-${randomUUID()}`;
          this.stageHandoff(handoffId, boundSessionId, plan.draftText ?? '');
          await this.touchLastUsed(actor, plan.expertRevisionRef.expertId);
          this.executionPlans.delete(executionPlanId);
          record({ resultRef: boundSessionId, resultDetail: JSON.stringify({ sessionId: boundSessionId, handoffId }) });
          return { binding, sessionId: boundSessionId, handoffId };
        },
        (operation) => this.replayExecution(operation),
      );
      await this.audit(actor, 'experts.create-execution', plan.expertRevisionRef.expertId, 'succeeded', 'experts/create-execution-succeeded', { sessionId: creation.sessionId });
      return creation;
    } catch (error) {
      await this.audit(actor, 'experts.create-execution', plan.expertRevisionRef.expertId, 'failed', errorCode(error, 'experts/internal'));
      throw error;
    }
  }

  /**
   * Store a one-shot draft handoff (never auto-sent); empty text stages nothing.
   * The handoff id doubles as the one-shot challenge the Client must echo back to
   * `consumeHandoff`; the Host cannot observe the native input draft version, so the
   * "original draft unchanged" guard is enforced Client-side against a freshly created
   * (empty) Session input, while this token guarantees single server-side release.
   */
  private stageHandoff(handoffId: string, sessionId: string, text: string): void {
    if (text.length === 0) return;
    const handoff: DraftHandoff = {
      handoffId, sessionId,
      expectedDraftVersion: handoffId,
      text,
      expiry: new Date(Date.now() + HANDOFF_TTL_MS).toISOString(),
    };
    this.handoffs.set(handoffId, handoff);
  }

  async consumeHandoff(actor: ActorContext, handoffId: string, expectedDraftVersion: string, signal?: AbortSignal): Promise<DraftHandoff> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) throw new ExpertsError('experts/plan-expired', '任务草稿交接不存在或已过期。');
    if (handoff.expectedDraftVersion !== expectedDraftVersion) {
      throw new ExpertsError('experts/conflict', '任务草稿版本不匹配，可能已被消费或更新。', { expected: expectedDraftVersion });
    }
    const binding = this.bindingsTable().get(keys.binding(handoff.sessionId));
    if (!binding) throw new ExpertsError('experts/not-found', '未找到该任务草稿对应的绑定。');
    if (binding.owner.ownerPrincipalId !== actor.principalId || binding.owner.organizationId !== actor.organizationId) {
      throw new ExpertsError('experts/forbidden', '没有权限消费该任务草稿。');
    }
    this.handoffs.delete(handoffId); // one-shot
    return handoff;
  }

  // ── handoff (switch expert by creating a related new task) ──────────────────

  async prepareHandoff(
    actor: ActorContext,
    sourceSessionId: string,
    targetExpertId: string,
    sourceEventRef: string | undefined,
    selectedAssetRefs: readonly string[],
    signal?: AbortSignal,
  ): Promise<HandoffPlan> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    await this.ensureSeeded(actor, signal);
    const sourceBinding = this.bindingsTable().get(keys.binding(sourceSessionId));
    if (!sourceBinding) throw new ExpertsError('experts/not-found', '源任务不是专家绑定的任务，无法交接。');
    if (sourceBinding.owner.ownerPrincipalId !== actor.principalId || sourceBinding.owner.organizationId !== actor.organizationId) {
      throw new ExpertsError('experts/forbidden', '没有权限交接该任务。');
    }
    const targetExpert = this.loadExpert(targetExpertId);
    if (!this.isVisible(actor, targetExpert)) throw new ExpertsError('experts/not-found', '未找到目标专家。');
    await this.authorize(actor, 'experts.prepare-handoff', targetExpert, signal);
    if (targetExpert.availability === 'archived') throw new ExpertsError('experts/archived', '目标专家已归档，无法交接。');
    if (targetExpert.availability === 'disabled') throw new ExpertsError('experts/disabled', '目标专家已停用，无法交接。');
    const targetRevisionId = targetExpert.publishedRevisionRef?.revisionId;
    if (targetRevisionId === undefined) throw new ExpertsError('experts/not-published', '目标专家尚未发布，无法交接。');
    const targetRevision = this.loadRevision(targetExpertId, targetRevisionId);
    const readiness = await this.computeReadiness(targetRevision, actor, signal);
    const unavailable: DomainIssue[] = [];
    if (readiness !== 'ready') {
      unavailable.push({ code: 'experts/dependency-missing', message: `目标专家就绪状态为 ${readiness}，交接后可能无法正常运行。` });
    }
    const handoffPlanId = `handoffplan-${randomUUID()}`;
    const plan: HandoffPlan = {
      handoffPlanId, sourceSessionId, targetExpertId,
      ...(sourceEventRef === undefined ? {} : { sourceEventRef }),
      selectedAssetRefs: [...selectedAssetRefs],
      reviewedSummary: '', unavailable,
      expiresAt: new Date(Date.now() + PLAN_TTL_MS).toISOString(),
    };
    this.handoffPlans.set(handoffPlanId, plan);
    await this.audit(actor, 'experts.prepare-handoff', targetExpertId, 'succeeded', 'experts/prepare-handoff-succeeded', { handoffPlanId, sourceSessionId });
    return plan;
  }

  async createHandoff(actor: ActorContext, handoffPlanId: string, reviewedSummary: string, context: MutationContext, signal?: AbortSignal): Promise<ExecutionCreation> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    this.assertContext(context);
    const summary = reviewedSummary.trim();
    if (summary.length === 0) throw new ExpertsError('experts/invalid-request', '交接摘要不能为空。');
    const payloadDigest = digestOf({ action: 'experts.create-handoff', handoffPlanId, summary, operationId: context.operationId });
    const committed = this.operationsTable().get(keys.operation(context.operationId));
    if (committed && committed.action === 'experts.create-handoff' && committed.payloadDigest === payloadDigest && committed.phase === 'committed') {
      const replayed = this.replayExecution(committed);
      await this.audit(actor, 'experts.create-handoff', replayed.binding.expertRevisionRef.expertId, 'succeeded', 'experts/create-handoff-replayed', { sessionId: replayed.sessionId });
      return replayed;
    }
    const peeked = this.handoffPlans.peek(handoffPlanId);
    if (!peeked) throw new ExpertsError('experts/plan-expired', '交接计划不存在或已过期，请重新发起交接。');
    if (peeked.expired) throw new ExpertsError('experts/plan-expired', '交接计划已过期，请重新发起交接。');
    const plan = peeked.value;
    const targetExpert = this.loadExpert(plan.targetExpertId);
    if (!this.isVisible(actor, targetExpert)) throw new ExpertsError('experts/not-found', '未找到目标专家。');
    await this.authorize(actor, 'experts.create-handoff', targetExpert, signal);
    const targetRevisionId = targetExpert.publishedRevisionRef?.revisionId;
    if (targetRevisionId === undefined) throw new ExpertsError('experts/not-published', '目标专家尚未发布，无法交接。');
    const targetRevision = this.loadRevision(plan.targetExpertId, targetRevisionId);
    try {
      const creation = await this.withOperation(actor, 'experts.create-handoff', context, payloadDigest, signal,
        async (record) => {
          const sessionId = `session-${digestOf(context.operationId).slice(0, 32)}`;
          const prior = this.bindingsTable().get(keys.binding(sessionId));
          if (prior) {
            const handoffId = `handoff-${randomUUID()}`;
            this.stageHandoff(handoffId, sessionId, summary);
            record({ resultRef: sessionId, resultDetail: JSON.stringify({ sessionId, handoffId }) });
            return { binding: prior, sessionId, handoffId };
          }
          const created = await this.ctx.workdshSessionAccess.create({ sessionId: sessionId as SessionId, agentPreset: targetRevision.presetRevisionRef }, signal);
          const boundSessionId = String(created.sessionId);
          const now = new Date().toISOString();
          const binding: ExecutionBinding = {
            sessionId: boundSessionId,
            expertRevisionRef: { expertId: plan.targetExpertId, revisionId: targetRevisionId },
            presetRevisionRef: targetRevision.presetRevisionRef,
            compositionDigest: targetRevision.compositionDigest,
            skillRevisionRefs: targetRevision.dependencyLock,
            owner: targetExpert.owner,
            createdFrom: plan.sourceSessionId,
            creationOperationId: context.operationId,
            createdAt: now,
          };
          await this.bindingsTable().put(keys.binding(boundSessionId), binding);
          const handoffId = `handoff-${randomUUID()}`;
          this.stageHandoff(handoffId, boundSessionId, summary);
          await this.touchLastUsed(actor, plan.targetExpertId);
          this.handoffPlans.delete(handoffPlanId);
          record({ resultRef: boundSessionId, resultDetail: JSON.stringify({ sessionId: boundSessionId, handoffId }) });
          return { binding, sessionId: boundSessionId, handoffId };
        },
        (operation) => this.replayExecution(operation),
      );
      await this.audit(actor, 'experts.create-handoff', plan.targetExpertId, 'succeeded', 'experts/create-handoff-succeeded', { sessionId: creation.sessionId, sourceSessionId: plan.sourceSessionId });
      return creation;
    } catch (error) {
      await this.audit(actor, 'experts.create-handoff', plan.targetExpertId, 'failed', errorCode(error, 'experts/internal'));
      throw error;
    }
  }

  /** Asset resolution only; official Team owns roster, child creation and messages. */
  async resolveNativeRole(actor: ActorContext, rootSessionId: string, memberName?: string, signal?: AbortSignal): Promise<{ binding: ExecutionBinding; revision: ExpertRevision }> {
    const binding = await this.verifyBinding(actor, rootSessionId, signal);
    const owner = this.loadExpert(binding.expertRevisionRef.expertId);
    if (!this.isVisible(actor, owner)) throw new ExpertsError('experts/not-found', '未找到该任务绑定的专家。');
    await this.authorize(actor, 'experts.prepare-execution', owner, signal);
    if (owner.availability !== 'enabled') throw new ExpertsError('experts/disabled', '该任务绑定的专家已停用或归档。');
    const lead = this.loadRevision(binding.expertRevisionRef.expertId, binding.expertRevisionRef.revisionId);
    let revision = lead;
    if (memberName && lead.definition.team) {
      const ref = lead.teamMembers?.[memberName];
      if (!ref) throw new ExpertsError('experts/invalid-request', '该成员不在当前已发布团队配置中，请使用配置中的成员 key。');
      const expert = this.loadExpert(ref.expertId);
      if (!this.isVisible(actor, expert)) throw new ExpertsError('experts/not-found', '未找到该团队成员。');
      await this.authorize(actor, 'experts.prepare-execution', expert, signal);
      if (expert.availability !== 'enabled') throw new ExpertsError('experts/disabled', '成员已停用或归档。');
      revision = this.loadRevision(ref.expertId, ref.revisionId);
      await this.verifyRevision(actor, revision, signal);
    }
    return { binding, revision };
  }

  async verifyBinding(actor: ActorContext, sessionId: string, signal?: AbortSignal): Promise<ExecutionBinding> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    const binding = this.bindingsTable().get(keys.binding(sessionId));
    // An unbound or forked Session has no binding row and is rejected here.
    if (!binding) throw new ExpertsError('experts/not-found', '该 Session 未绑定任何专家，或为未绑定的派生任务。', { reason: 'unbound' });
    if (binding.owner.ownerPrincipalId !== actor.principalId || binding.owner.organizationId !== actor.organizationId) {
      throw new ExpertsError('experts/forbidden', '没有权限校验该任务的专家绑定。');
    }
    if (binding.delegation) throw new ExpertsError('experts/unsupported-capability', '旧版专家团执行器已退役。请从专家团重新创建官方 Team 任务，旧文件和历史仍保留。');
    const revision = this.loadRevision(binding.expertRevisionRef.expertId, binding.expertRevisionRef.revisionId);
    if (revision.presetRevisionRef !== binding.presetRevisionRef || revision.compositionDigest !== binding.compositionDigest
        || digestOf(revision.dependencyLock) !== digestOf(binding.skillRevisionRefs)) {
      throw new ExpertsError('experts/conflict', '任务绑定与专家修订不一致。');
    }
    await this.verifyRevision(actor, revision, signal);
    await this.audit(actor, 'experts.verify-binding', binding.expertRevisionRef.expertId, 'succeeded', 'experts/verify-binding-succeeded', { sessionId });
    return binding;
  }

  private async verifyRevision(actor: ActorContext, revision: ExpertRevision, signal?: AbortSignal): Promise<void> {
    if (revision.definition.packageDocuments) await verifyPackageFiles(expertPresetDir(revision.presetRevisionRef), revision.definition.packageDocuments, revision.definition.packageAssets);
    if (sha256(await readExpertPreset(revision.presetRevisionRef)) !== revision.compositionDigest) {
      throw new ExpertsError('experts/conflict', '已发布专家 preset 已漂移。');
    }
    for (const ref of revision.dependencyLock) {
      signal?.throwIfAborted();
      const check = await this.ctx.workdshSkills.checkRevision(ref, actor, signal);
      if (check.status === 'drifted') throw new ExpertsError('experts/dependency-drift', '绑定任务的 Skill 快照已漂移，拒绝执行。', { skillId: ref.skillId });
      if (check.status === 'missing' || check.status === 'source-uninstalled') throw new ExpertsError('experts/dependency-missing', '绑定任务的 Skill 快照缺失，拒绝执行。', { skillId: ref.skillId });
      if (check.status === 'source-disabled') throw new ExpertsError('experts/dependency-disabled', '绑定任务依赖的 Skill 来源已停用，拒绝执行。', { skillId: ref.skillId });
      if (check.status === 'forbidden') throw new ExpertsError('experts/forbidden', '当前主体无权使用绑定任务的 Skill 依赖。', { skillId: ref.skillId });
    }
  }

  // ── local import / export ───────────────────────────────────────────────

  /**
   * Stage an uploaded `.expert.zip` into a private, per-deployment directory and
   * return a short-lived staged id for `previewImport`. Not part of the public
   * ExpertsService contract; the Connection transport calls it on the concrete
   * service (mirrors the Skill owner's `imports.stage`). The size cap is enforced
   * while streaming, so an oversized upload is rejected before it fully lands.
   */
  async stageImport(fileName: string, body: ReadableStream<Uint8Array> | Uint8Array | null, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted();
    const stagedId = `stage-${randomUUID()}`;
    const dir = join(this.stagingRoot, stagedId);
    await mkdir(dir, { recursive: true });
    const path = join(dir, 'package.expert.zip');
    try {
      const chunks: Uint8Array[] = [];
      let total = 0;
      if (body instanceof Uint8Array) {
        assertUploadWithinLimit(body.byteLength);
        chunks.push(body);
        total = body.byteLength;
      } else if (body) {
        const reader = body.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              total += value.byteLength;
              assertUploadWithinLimit(total);
              chunks.push(value);
            }
            signal?.throwIfAborted();
          }
        } finally {
          reader.releaseLock();
        }
      }
      await writeFile(path, concatBytes(chunks, total));
    } catch (error) {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      throw error;
    }
    this.stagedImports.set(stagedId, { fileName: sanitizeFileName(fileName), path });
    return stagedId;
  }

  async previewImport(actor: ActorContext, uploadedArtifactRef: string, signal?: AbortSignal): Promise<ImportPreview> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    if (!STAGED_IMPORT_PATTERN.test(uploadedArtifactRef)) {
      throw new ExpertsError('experts/invalid-request', '无效的导入引用，请重新上传专家包。');
    }
    const staged = this.stagedImports.get(uploadedArtifactRef);
    if (!staged) throw new ExpertsError('experts/plan-expired', '上传的专家包不存在或已过期，请重新上传。');
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await readFile(staged.path));
    } catch {
      throw new ExpertsError('experts/not-found', '无法读取上传的专家包。');
    }
    // Structural violations throw ExpertsError; definition problems come back as issues.
    const preflight = preflightPackage(bytes);
    const missingDependencies: DomainIssue[] = [];
    const seen = new Set<string>();
    for (const requirement of preflight.candidate.skillRequirements) {
      const name = requirement.name;
      if (name.trim().length === 0 || seen.has(name)) continue;
      seen.add(name);
      signal?.throwIfAborted();
      try {
        await this.ctx.workdshSkills.resolveRevision(requirement.skillId ?? name, undefined, signal);
      } catch (error) {
        missingDependencies.push({ code: mapSkillDependencyError(error), message: `导入的专家依赖 Skill「${name}」在本机不可用。`, dependencyRef: name });
      }
    }
    const importPlanId = `import-${randomUUID()}`;
    const preview: ImportPreview = {
      importPlanId,
      candidate: preflight.candidate,
      issues: preflight.issues,
      missingDependencies,
      previewDigest: preflight.previewDigest,
      expiresAt: new Date(Date.now() + PLAN_TTL_MS).toISOString(),
    };
    this.importPreviews.set(importPlanId, {
      preview, candidate: preflight.candidate,
      ...(preflight.sourceAttribution === undefined ? {} : { sourceAttribution: preflight.sourceAttribution }),
    });
    await this.audit(actor, 'experts.preview-import', undefined, 'succeeded', 'experts/preview-import-succeeded', { importPlanId, fileName: staged.fileName });
    return preview;
  }

  async commitImport(actor: ActorContext, importPlanId: string, previewDigest: string, context: MutationContext, signal?: AbortSignal): Promise<ExpertDraft> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    this.assertContext(context);
    const staged = this.importPreviews.get(importPlanId);
    if (!staged) throw new ExpertsError('experts/plan-expired', '导入预览不存在或已过期，请重新上传预览。');
    if (staged.preview.previewDigest !== previewDigest) {
      throw new ExpertsError('experts/conflict', '导入内容已变化，请重新预览后提交。');
    }
    if (staged.preview.issues.length > 0) {
      throw new ExpertsError('experts/invalid-definition', '导入包未通过校验，无法提交为草稿。', { issues: staged.preview.issues });
    }
    const candidate = staged.candidate;
    const payloadDigest = digestOf({ action: 'experts.commit-import', importPlanId, previewDigest, definition: candidate });
    try {
      const draft = await this.withOperation(actor, 'experts.commit-import', context, payloadDigest, signal,
        async (record) => {
          const expertId = this.newExpertId(context.operationId, candidate.name);
          const now = new Date().toISOString();
          const draftRevision = shortDigest({ expertId, definition: candidate, createdAt: now });
          const nextDraft: ExpertDraft = { expertId, revision: draftRevision, definition: candidate, validationIssues: validateDefinition(candidate) };
          const expert: Expert = {
            id: expertId, owner: this.newOwner(actor), origin: 'personal', availability: 'enabled',
            revision: `r-${randomUUID()}`, draftRevision, createdAt: now, updatedAt: now,
          };
          await this.expertsTable().put(keys.expert(expertId), expert);
          await this.draftsTable().put(keys.draft(expertId), nextDraft);
          this.importPreviews.delete(importPlanId);
          record({ resultRef: expertId, resultDetail: draftRevision });
          return nextDraft;
        },
        (operation) => this.loadDraft(operation.resultRef ?? this.newExpertId(context.operationId, candidate.name)),
      );
      await this.audit(actor, 'experts.commit-import', draft.expertId, 'succeeded', 'experts/commit-import-succeeded', { importPlanId });
      return draft;
    } catch (error) {
      await this.audit(actor, 'experts.commit-import', undefined, 'failed', errorCode(error, 'experts/internal'));
      throw error;
    }
  }

  async export(actor: ActorContext, expertId: string, revisionId: string | undefined, signal?: AbortSignal): Promise<ExpertExport> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    await this.ensureSeeded(actor, signal);
    const expert = this.loadExpert(expertId);
    if (!this.isVisible(actor, expert)) throw new ExpertsError('experts/not-found', '未找到该专家。');
    await this.authorize(actor, 'experts.export', expert, signal);
    const targetRevisionId = revisionId ?? expert.publishedRevisionRef?.revisionId;
    // Export the published revision when present, else the current draft definition.
    const definition = targetRevisionId !== undefined
      ? this.loadRevision(expertId, targetRevisionId).definition
      : this.loadDraft(expertId).definition;
    // The transport re-builds the byte-identical archive from `descriptor.definition` to stream.
    const { descriptor } = buildExport(definition);
    await this.audit(actor, 'experts.export', expertId, 'succeeded', 'experts/export-succeeded', { fileName: descriptor.fileName, bytes: String(descriptor.bytes) });
    return descriptor;
  }

  async operation(actor: ActorContext, operationId: string, signal?: AbortSignal): Promise<Operation> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    const operation = this.operationsTable().get(keys.operation(operationId));
    if (!operation) throw new ExpertsError('experts/not-found', '未找到该操作记录。');
    if (operation.actorRef !== actor.principalId) {
      throw new ExpertsError('experts/forbidden', '没有权限查看该操作记录。');
    }
    return operation;
  }
}
