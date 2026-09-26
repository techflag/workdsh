export type PrincipalKind = 'human' | 'service';
export type OrganizationKind = 'personal' | 'team';
export type MembershipRole = 'owner' | 'admin' | 'member';
export type ResourceScope = 'personal' | 'organization' | 'project';
export type AccessAction = 'read' | 'use' | 'edit' | 'manage';
export type AuthorizationEffect = 'allow' | 'deny';
export type AuditOutcome = 'succeeded' | 'denied' | 'failed' | 'cancelled' | 'unknown';
export type RuntimeIsolation = 'local-trusted' | 'process' | 'container' | 'unavailable';

export interface ActorContext {
  readonly principalId: string;
  readonly organizationId: string;
  readonly requestId: string;
  /** Identity provider that established this context at a trusted Host boundary. */
  readonly resolvedBy: string;
  readonly sessionId?: string;
  readonly runId?: string;
  readonly delegatedByPrincipalId?: string;
}

export interface Organization {
  readonly id: string;
  readonly kind: OrganizationKind;
  readonly name: string;
  readonly revision: string;
}

export interface Membership {
  readonly organizationId: string;
  readonly principalId: string;
  readonly principalKind: PrincipalKind;
  readonly role: MembershipRole;
  readonly state: 'active' | 'suspended';
  readonly revision: string;
}

export interface IdentityProfile {
  readonly principalId: string;
  readonly principalKind: PrincipalKind;
  readonly organization: Organization;
  readonly membership: Membership;
  readonly resolvedBy: string;
}

export interface IdentityResolutionContext {
  readonly sessionId?: string;
  readonly runId?: string;
}

export interface ResourceRef {
  readonly domain: string;
  readonly id: string;
  readonly revision?: string;
}

export interface ResourceOwner {
  readonly organizationId: string;
  readonly ownerPrincipalId: string;
  readonly scope: ResourceScope;
  readonly projectId?: string;
}

export interface AccessGrant {
  readonly id: string;
  readonly organizationId: string;
  readonly subjectPrincipalId: string;
  readonly resource: ResourceRef;
  readonly actions: readonly AccessAction[];
  readonly revision: string;
}

export interface AuthorizationRequest {
  readonly actor: ActorContext;
  readonly action: AccessAction;
  readonly resource: ResourceRef;
  readonly owner: ResourceOwner;
}

export interface AuthorizationDecision {
  readonly effect: AuthorizationEffect;
  readonly code: string;
  readonly authorizationRevision: string;
  readonly grantIds: readonly string[];
}

export interface RuntimeBinding {
  readonly sessionId: string;
  readonly organizationId: string;
  readonly principalId: string;
  readonly requestId: string;
  readonly workspaceId?: string;
  readonly runtimeId: string;
  readonly isolation: RuntimeIsolation;
  readonly authorizationRevision: string;
}

/** Durable owner record for one Harness Session. Runtime instances are derived from it. */
export interface SessionOwnerBinding {
  readonly sessionId: string;
  readonly organizationId: string;
  readonly ownerPrincipalId: string;
  readonly workspaceId?: string;
  readonly revision: string;
}

export interface RuntimeBindingRequest {
  readonly sessionId: string;
  readonly runtimeId: string;
  readonly isolation: RuntimeIsolation;
  readonly workspaceId?: string;
}

export interface AuditEvent {
  readonly id: string;
  readonly occurredAt: string;
  readonly requestId: string;
  readonly principalId: string;
  readonly organizationId: string;
  readonly action: string;
  readonly target?: ResourceRef;
  readonly outcome: AuditOutcome;
  readonly code: string;
  readonly sessionId?: string;
  readonly runId?: string;
  /** Non-sensitive references only. Prompts, tokens and credential values are forbidden. */
  readonly references?: Readonly<Record<string, string>>;
}

/** Evidence is transport/provider specific and must be resolved on the Host. */
export interface IdentityProvider<Evidence = IdentityResolutionContext | undefined> {
  readonly id: string;
  resolve(evidence: Evidence, signal?: AbortSignal): Promise<ActorContext>;
}

export interface IdentityService<Evidence = IdentityResolutionContext | undefined> extends IdentityProvider<Evidence> {
  /** Trusted profile loaded by the Host. It never accepts client-selected identity. */
  profile(): IdentityProfile;
  /** Resolve active or suspended membership without exposing provider storage. */
  membership(organizationId: string, principalId: string): Membership | undefined;
}

export interface AccessService {
  authorize(request: AuthorizationRequest, signal?: AbortSignal): Promise<AuthorizationDecision>;
}

export interface RuntimeBindingService {
  /** Bind a newly created Session to its Host-resolved owner. Existing ownership cannot be replaced. */
  bindSession(actor: ActorContext, request: Pick<RuntimeBindingRequest, 'sessionId' | 'workspaceId'>, signal?: AbortSignal): Promise<SessionOwnerBinding>;
  sessionOwner(sessionId: string): SessionOwnerBinding | undefined;
  /** Re-resolve current authorization for a live or resumed Session runtime. */
  resolveRuntime(actor: ActorContext, request: RuntimeBindingRequest, signal?: AbortSignal): Promise<RuntimeBinding>;
}

export interface AuditService {
  append(event: AuditEvent, signal?: AbortSignal): Promise<void>;
  /** Wait until every append accepted before this call has settled. */
  flush(): Promise<void>;
}

export class GovernanceContractError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'GovernanceContractError';
  }
}

function required(value: unknown, field: string, code = 'governance/invalid-context'): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 256 || /[\u0000-\u001f]/.test(value)) {
    throw new GovernanceContractError(code, `Invalid ${field}.`);
  }
}

export function assertActorContext(value: unknown): asserts value is ActorContext {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new GovernanceContractError('governance/invalid-context', 'Actor context must be a record.');
  }
  const actor = value as Partial<ActorContext>;
  required(actor.principalId, 'principalId');
  required(actor.organizationId, 'organizationId');
  required(actor.requestId, 'requestId');
  required(actor.resolvedBy, 'resolvedBy');
  if (actor.sessionId !== undefined) required(actor.sessionId, 'sessionId');
  if (actor.runId !== undefined) required(actor.runId, 'runId');
  if (actor.delegatedByPrincipalId !== undefined) required(actor.delegatedByPrincipalId, 'delegatedByPrincipalId');
}

export function assertResourceOwner(value: unknown): asserts value is ResourceOwner {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new GovernanceContractError('governance/invalid-owner', 'Resource owner must be a record.');
  }
  const owner = value as Partial<ResourceOwner>;
  required(owner.organizationId, 'organizationId', 'governance/invalid-owner');
  required(owner.ownerPrincipalId, 'ownerPrincipalId', 'governance/invalid-owner');
  if (!['personal', 'organization', 'project'].includes(owner.scope ?? '')) {
    throw new GovernanceContractError('governance/invalid-owner', 'Invalid resource scope.');
  }
  if (owner.scope === 'project') required(owner.projectId, 'projectId', 'governance/invalid-owner');
  if (owner.scope !== 'project' && owner.projectId !== undefined) {
    throw new GovernanceContractError('governance/invalid-owner', 'projectId requires project scope.');
  }
}

export function sameOrganization(actor: ActorContext, owner: ResourceOwner): boolean {
  return actor.organizationId === owner.organizationId;
}
