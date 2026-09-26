/**
 * WorkDSH expert domain contracts (D04 / P1-02, expert module 0.1).
 *
 * Pure DTOs, stable error codes and the Host service interface. No runtime
 * dependency: the Host resolves the actor, owns every write, and never accepts
 * a client- or model-supplied actor/owner/confirmation boolean as authority.
 * These are WorkDSH contracts, not Harness official API.
 */
import type { ActorContext, ResourceOwner } from './governance.js';

// ── Enumerations ────────────────────────────────────────────────────────────

/** Where an expert came from. `organization` is reserved for the enterprise phase. */
export type ExpertOrigin = 'default' | 'personal' | 'organization';
/** Lifecycle availability. Archive is an availability change, never a silent hard delete. */
export type ExpertAvailability = 'enabled' | 'disabled' | 'archived';
/** Whether a published expert can actually compose a task right now. */
export type ExpertReadiness = 'ready' | 'missing-dependency' | 'unsupported-capability' | 'broken' | 'unknown';
/** Management operation phase. Timeout is not a terminal phase; reconnection queries the operation. */
export type OperationPhase = 'prepared' | 'applying' | 'committed' | 'failed' | 'reconciling' | 'cancelled';
/** Audit delivery state attached to a committed operation. */
export type AuditDelivery = 'delivered' | 'pending' | 'failed';

// ── References and small value objects ──────────────────────────────────────

/** Stable pointer to one immutable published expert revision. */
export interface ExpertRevisionRef {
  readonly expertId: string;
  readonly revisionId: string;
}

/** One frozen Skill snapshot an expert revision depends on. */
export interface SkillRevisionRef {
  readonly skillId: string;
  readonly revisionId: string;
  readonly name: string;
  readonly contentDigest: string;
}

/** One validation problem, optionally tied to a definition path or dependency. */
export interface DomainIssue {
  readonly code: string;
  readonly path?: string;
  readonly message: string;
  readonly dependencyRef?: string;
}

/** Idempotency + optimistic-concurrency context for a mutation. */
export interface MutationContext {
  readonly operationId: string;
  readonly expectedRevision?: string;
}

/**
 * A user-confirmation proof bound to exact content. Issued only by a trusted UI
 * user action or the official approval bridge; `confirmed:true`, a model restatement
 * or prompt text are never sufficient.
 */
export interface ConfirmationProof {
  readonly token: string;
}

/** A future (not-yet-satisfied) capability reference. Holds no credential. */
export interface FutureRequirement {
  readonly kind: string;
  readonly key: string;
  readonly required: boolean;
  readonly description: string;
}

/** One executable example shown in the detail dialog and usable to seed a task draft. */
export interface ExpertExample {
  readonly id: string;
  readonly title?: string;
  readonly prompt: string;
}

/** A declared Skill dependency. `name` resolves to a local `skillId` at publish time. */
export interface SkillRequirement {
  readonly name: string;
  readonly skillId?: string;
}

// ── Expert definition (machine-readable shape) ──────────────────────────────

/**
 * The authored expert definition. `role`/`methodology`/`boundaries`/`deliverables`
 * are prose strings compiled into the persona prefix; `examples` seed task drafts;
 * `skillRequirements` are frozen at publish; `futureRequirements` are declared but
 * not yet satisfied capabilities.
 */
export interface ExpertDefinition {
  /** Complete authored Agent MD; legacy prose fields remain compatible projections. */
  readonly agentDocument?: string;
  /** Original package text resources, retained verbatim; never executed on import. */
  readonly packageDocuments?: Readonly<Record<string, string>>;
  /** Lossless non-text package resources; executable is file mode, never an execution grant. */
  readonly packageAssets?: Readonly<Record<string, { readonly base64: string; readonly executable?: boolean }>>;
  readonly name: string;
  readonly description: string;
  readonly avatarRef?: string;
  readonly role: string;
  readonly methodology: string;
  readonly boundaries: string;
  readonly deliverables: string;
  readonly tags: readonly string[];
  readonly categoryId?: string;
  readonly examples: readonly ExpertExample[];
  readonly skillRequirements: readonly SkillRequirement[];
  readonly futureRequirements: readonly FutureRequirement[];
  /** One authored work: the root is the lead; members are independent content snapshots. */
  readonly team?: ExpertTeamDefinition;
}

export interface ExpertTeamDefinition {
  readonly members: readonly { readonly key: string; readonly definition: Omit<ExpertDefinition, 'team'> }[];
  readonly workflows: readonly {
    readonly id: string;
    readonly title: string;
    readonly trigger: string;
    readonly deliverable: string;
    /** Empty stages means the lead handles this scenario directly. */
    readonly stages: readonly { readonly id: string; readonly worker: string; readonly reviewer?: string; readonly dependsOn: readonly string[] }[];
  }[];
}

// ── Stored / transported objects ────────────────────────────────────────────

/** The mutable expert record. `revision` is the CAS token; `draftRevision` tracks the editable draft. */
export interface Expert {
  readonly id: string;
  readonly owner: ResourceOwner;
  readonly origin: ExpertOrigin;
  readonly availability: ExpertAvailability;
  readonly revision: string;
  readonly draftRevision: string;
  readonly publishedRevisionRef?: ExpertRevisionRef;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Internal member snapshot, managed only through its containing team. */
  readonly teamParentId?: string;
}

/** The editable draft. May hold an incomplete definition; publish requires a complete one. */
export interface ExpertDraft {
  readonly expertId: string;
  readonly revision: string;
  readonly definition: ExpertDefinition;
  readonly validationIssues: readonly DomainIssue[];
}

/** One immutable published revision. Never overwritten; may be referenced by many tasks. */
export interface ExpertRevision {
  readonly expertId: string;
  readonly revisionId: string;
  readonly definition: ExpertDefinition;
  readonly definitionDigest: string;
  readonly dependencyLock: readonly SkillRevisionRef[];
  readonly dependencyLockDigest: string;
  readonly teamMembers?: Readonly<Record<string, ExpertRevisionRef>>;
  readonly presetRevisionRef: string;
  readonly compilerVersion: string;
  /** Digest of the actual frozen native YAML composition. */
  readonly compositionDigest: string;
  readonly publishedAt: string;
  readonly publishedBy: string;
}

/** List-row projection. Never carries prose bodies. */
export interface ExpertSummary {
  readonly expertType?: 'agent' | 'team';
  readonly profession?: string;
  readonly tags?: readonly string[];
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly avatarRef?: string;
  readonly origin: ExpertOrigin;
  readonly availability: ExpertAvailability;
  readonly publishedRevisionRef?: ExpertRevisionRef;
  readonly canUse: boolean;
  readonly canEdit: boolean;
  readonly canManage: boolean;
  readonly readiness: ExpertReadiness;
  readonly pinned: boolean;
  readonly lastUsedAt?: string;
  readonly updatedAt: string;
}

/** Full detail returned by `get`. */
export interface ExpertDetail {
  readonly expert: Expert;
  readonly draft: ExpertDraft;
  readonly revision?: ExpertRevision;
  readonly readiness: ExpertReadiness;
  readonly canUse: boolean;
  readonly canEdit: boolean;
  readonly canManage: boolean;
}

/** Durable Session → expert-revision binding. Reserved before task creation; never re-bound. */
export interface ExecutionBinding {
  readonly sessionId: string;
  readonly expertRevisionRef: ExpertRevisionRef;
  readonly presetRevisionRef: string;
  readonly compositionDigest: string;
  readonly skillRevisionRefs: readonly SkillRevisionRef[];
  readonly owner: ResourceOwner;
  readonly workspaceRef?: string;
  readonly createdFrom?: string;
  /** Legacy record retained for history detection; the retired executor cannot resume it. */
  readonly delegation?: {
    readonly parentSessionId: string;
    readonly parentCompositionDigest: string;
    readonly admission: 'reserved' | 'claimed';
  };
  readonly creationOperationId: string;
  readonly createdAt: string;
}

/** Per-principal pinned / recent state. Never written back into a published revision. */
export interface ExpertPreference {
  readonly principalId: string;
  readonly expertId: string;
  readonly pinned: boolean;
  readonly lastUsedAt?: string;
  readonly revision: string;
}

/** Durable operation record for idempotent retry and reconciliation. Holds no token or credential. */
export interface Operation {
  readonly operationId: string;
  readonly actorRef: string;
  readonly action: string;
  readonly payloadDigest: string;
  readonly phase: OperationPhase;
  readonly resultRef?: string;
  /** Non-sensitive result detail (e.g. reserved sessionId) enabling exact idempotent replay. Never a token or credential. */
  readonly resultDetail?: string;
  readonly error?: string;
  readonly auditDelivery: AuditDelivery;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ── Query / result envelopes ────────────────────────────────────────────────

export interface ExpertListQuery {
  readonly expertType?: 'agent' | 'team';
  readonly search?: string;
  readonly origin?: ExpertOrigin;
  readonly availability?: ExpertAvailability;
  readonly categoryId?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface ExpertListResult {
  readonly items: readonly ExpertSummary[];
  readonly total: number;
  readonly nextCursor?: string;
  readonly catalogRevision: string;
}

/** Short-lived execution plan produced by `prepareExecution`; default TTL 10 minutes. */
export interface ExecutionPlan {
  readonly executionPlanId: string;
  readonly expertRevisionRef: ExpertRevisionRef;
  readonly presetRevisionRef: string;
  readonly workspaceRef?: string;
  readonly workspaceId?: string;
  readonly modelSelection?: ModelSelectionRequest;
  /** One-shot draft text handed to the native input; never auto-sent. */
  readonly draftText?: string;
  readonly missing: readonly DomainIssue[];
  readonly expiresAt: string;
}

/** Native model selection request (provider/model/reasoningEffort), resolved by the Host. */
export interface ModelSelectionRequest {
  readonly provider: string;
  readonly model: string;
  readonly reasoningEffort?: string;
}

/** Result of `createExecution`: the binding, the native Session, and a one-shot draft handoff. */
export interface ExecutionCreation {
  readonly binding: ExecutionBinding;
  readonly sessionId: string;
  readonly handoffId: string;
}

/** One-shot draft handoff to a target Session's native input. Content-sensitive, short-lived. */
export interface DraftHandoff {
  readonly handoffId: string;
  readonly sessionId: string;
  readonly expectedDraftVersion: string;
  readonly text: string;
  readonly expiry: string;
}

/** Reviewable handoff draft for moving a non-empty task to another expert. */
export interface HandoffPlan {
  readonly handoffPlanId: string;
  readonly sourceSessionId: string;
  readonly targetExpertId: string;
  readonly sourceEventRef?: string;
  readonly selectedAssetRefs: readonly string[];
  readonly reviewedSummary: string;
  readonly unavailable: readonly DomainIssue[];
  readonly expiresAt: string;
}

/** Validation result with no business side effect. */
export interface ExpertValidation {
  readonly issues: readonly DomainIssue[];
  readonly definitionDigest: string;
  readonly dependencyLock: readonly SkillRevisionRef[];
  readonly dependencyLockDigest: string;
  readonly publishable: boolean;
}

/** Publish receipt. */
export interface PublishReceipt {
  readonly expertId: string;
  readonly revision: ExpertRevisionRef;
  readonly presetRevisionRef: string;
  readonly definitionDigest: string;
  readonly dependencyLockDigest: string;
  readonly operationId: string;
}

/** Availability change receipt. */
export interface AvailabilityReceipt {
  readonly expertId: string;
  readonly availability: ExpertAvailability;
  readonly revision: string;
  readonly operationId: string;
}

/** Import preview produced by `previewImport`. */
export interface ImportPreview {
  readonly importPlanId: string;
  readonly candidate: ExpertDefinition;
  readonly issues: readonly DomainIssue[];
  readonly missingDependencies: readonly DomainIssue[];
  readonly previewDigest: string;
  readonly expiresAt: string;
}

/** Export archive descriptor (no credential, no internal preset id, no session id). */
export interface ExpertExport {
  readonly fileName: string;
  readonly bytes: number;
  readonly digest: string;
  readonly definition: ExpertDefinition;
  readonly sourceAttribution?: string;
}

/** A confirmation request the UI turns into a proof via a trusted user action. */
export interface ConfirmationRequest {
  readonly confirmationToken: string;
  readonly expertId: string;
  readonly action: string;
  readonly draftRevision: string;
  readonly definitionDigest: string;
  readonly dependencyLockDigest: string;
  readonly expiresAt: string;
  readonly nonce: string;
}

// ── Stable error codes ──────────────────────────────────────────────────────

/** Wire codes share the `experts/` prefix; the UI maps by code and never parses messages. */
export type ExpertErrorCode =
  | 'experts/not-found'
  | 'experts/forbidden'
  | 'experts/conflict'
  | 'experts/invalid-definition'
  | 'experts/dependency-missing'
  | 'experts/dependency-disabled'
  | 'experts/dependency-drift'
  | 'experts/unsupported-capability'
  | 'experts/not-published'
  | 'experts/disabled'
  | 'experts/archived'
  | 'experts/preset-broken'
  | 'experts/confirmation-required'
  | 'experts/confirmation-stale'
  | 'experts/plan-expired'
  | 'experts/idempotency-conflict'
  | 'experts/cursor-stale'
  | 'experts/outcome-unknown'
  | 'experts/unavailable'
  | 'experts/invalid-request'
  | 'experts/internal';

// ── Host service interface ──────────────────────────────────────────────────

/**
 * The single Host domain service. Pages and Agent management tools call exactly
 * this surface; the transport resolves the actor first, so no method takes an
 * actor/owner/confirmation boolean from the client or model.
 */
export interface ExpertSkillOption {
  readonly skillId: string;
  readonly name: string;
  readonly description: string;
  readonly state: 'enabled' | 'disabled' | 'invalid' | 'readonly' | 'missing';
  readonly selectable: boolean;
}

export interface ExpertsService {
  listSkills(actor: ActorContext, expertId: string, scope: 'available' | 'equipped', signal?: AbortSignal): Promise<readonly ExpertSkillOption[]>;
  list(actor: ActorContext, query: ExpertListQuery, signal?: AbortSignal): Promise<ExpertListResult>;
  get(actor: ActorContext, expertId: string, revisionId?: string, signal?: AbortSignal): Promise<ExpertDetail>;
  createDraft(actor: ActorContext, definition: Partial<ExpertDefinition> | undefined, context: MutationContext, signal?: AbortSignal): Promise<ExpertDraft>;
  updateDraft(actor: ActorContext, expertId: string, patch: Partial<ExpertDefinition>, context: MutationContext, signal?: AbortSignal): Promise<ExpertDraft>;
  copy(actor: ActorContext, expertId: string, revisionId: string | undefined, context: MutationContext, signal?: AbortSignal): Promise<ExpertDraft>;
  validate(actor: ActorContext, expertId: string, draftRevision: string, signal?: AbortSignal): Promise<ExpertValidation>;
  requestPublishConfirmation(actor: ActorContext, expertId: string, draftRevision: string, signal?: AbortSignal): Promise<ConfirmationRequest>;
  /** Trusted UI user action: exchange a pending challenge for a one-time publish proof. A model or prompt text can never call this. */
  confirmPublish(actor: ActorContext, confirmationToken: string, signal?: AbortSignal): Promise<ConfirmationProof>;
  publish(actor: ActorContext, expertId: string, draftRevision: string, dependencyLockDigest: string, proof: ConfirmationProof, context: MutationContext, signal?: AbortSignal): Promise<PublishReceipt>;
  setAvailability(actor: ActorContext, expertId: string, availability: ExpertAvailability, context: MutationContext, proof?: ConfirmationProof, signal?: AbortSignal): Promise<AvailabilityReceipt>;
  setPreference(actor: ActorContext, expertId: string, pinned: boolean, expectedRevision?: string, signal?: AbortSignal): Promise<ExpertPreference>;
  prepareExecution(actor: ActorContext, expertId: string, revisionId: string | undefined, workspaceRef: string | undefined, modelSelection: ModelSelectionRequest | undefined, draftText: string | undefined, signal?: AbortSignal, workspaceId?: string): Promise<ExecutionPlan>;
  createExecution(actor: ActorContext, executionPlanId: string, context: MutationContext, signal?: AbortSignal): Promise<ExecutionCreation>;
  consumeHandoff(actor: ActorContext, handoffId: string, expectedDraftVersion: string, signal?: AbortSignal): Promise<DraftHandoff>;
  prepareHandoff(actor: ActorContext, sourceSessionId: string, targetExpertId: string, sourceEventRef: string | undefined, selectedAssetRefs: readonly string[], signal?: AbortSignal): Promise<HandoffPlan>;
  createHandoff(actor: ActorContext, handoffPlanId: string, reviewedSummary: string, context: MutationContext, signal?: AbortSignal): Promise<ExecutionCreation>;
  previewImport(actor: ActorContext, uploadedArtifactRef: string, signal?: AbortSignal): Promise<ImportPreview>;
  commitImport(actor: ActorContext, importPlanId: string, previewDigest: string, context: MutationContext, signal?: AbortSignal): Promise<ExpertDraft>;
  export(actor: ActorContext, expertId: string, revisionId: string | undefined, signal?: AbortSignal): Promise<ExpertExport>;
  operation(actor: ActorContext, operationId: string, signal?: AbortSignal): Promise<Operation>;
  /** Verify a bound Session's artifacts before execution/recovery; rejects tampering, drift and unbound forks. */
  verifyBinding(actor: ActorContext, sessionId: string, signal?: AbortSignal): Promise<ExecutionBinding>;
}

/** The action vocabulary audited and authorized for expert operations. */
export type ExpertAction =
  | 'experts.list' | 'experts.get' | 'experts.create-draft' | 'experts.update-draft'
  | 'experts.copy' | 'experts.validate' | 'experts.publish' | 'experts.set-availability'
  | 'experts.set-preference' | 'experts.prepare-execution' | 'experts.create-execution'
  | 'experts.prepare-handoff' | 'experts.create-handoff' | 'experts.preview-import'
  | 'experts.commit-import' | 'experts.export' | 'experts.operation' | 'experts.verify-binding';
