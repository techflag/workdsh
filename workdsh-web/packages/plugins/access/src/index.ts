import { createHash, randomUUID } from 'node:crypto';
import { Context, Service } from '@deepseek-ai/cordis';
import { ApiSessionNotFound } from '@deepseek-ai/dsh-api-session-controller';
import type {
  SessionCreateRequest,
  SessionCreateValue,
} from '@deepseek-ai/dsh-api-session-controller';
import { defineDomain, domainTable, type KvTable } from '@deepseek-ai/dsh-storage-domain';
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { PreToolDecision, ToolExecution, ToolExecutionResult, ToolExecutionToken } from '@deepseek-ai/dsh-tools';
import { z } from 'zod';
import {
  assertActorContext,
  assertResourceOwner,
  GovernanceContractError,
} from './governance.js';
import type {
  AccessAction,
  AccessGrant,
  AccessService,
  ActorContext,
  AuditEvent,
  AuditService,
  AuthorizationDecision,
  AuthorizationRequest,
  IdentityService,
  ResourceOwner,
  ResourceRef,
  RuntimeBinding,
  RuntimeBindingRequest,
  RuntimeBindingService,
  SessionOwnerBinding,
} from 'workdsh-contracts';

type SessionAgentResult = Awaited<ReturnType<Context['sessionController']['resolveAgent']>>;

const bounded = z.string().min(1).max(256).refine((value) => !/[\u0000-\u001f]/.test(value));
const resourceRefSchema: z.ZodType<ResourceRef> = z.object({ domain: bounded, id: bounded, revision: bounded.optional() });
const accessGrantSchema: z.ZodType<AccessGrant> = z.object({
  id: bounded,
  organizationId: bounded,
  subjectPrincipalId: bounded,
  resource: resourceRefSchema,
  actions: z.array(z.enum(['read', 'use', 'edit', 'manage'])).min(1),
  revision: bounded,
});

const sessionOwnerSchema: z.ZodType<SessionOwnerBinding> = z.object({
  sessionId: bounded,
  organizationId: bounded,
  ownerPrincipalId: bounded,
  workspaceId: bounded.optional(),
  revision: bounded,
});

export const accessDomainSpec = defineDomain({
  name: 'workdsh_access',
  version: 1,
  layout: 'per-record',
  tables: { grants: domainTable<string, AccessGrant>(accessGrantSchema) },
});

export const runtimeBindingDomainSpec = defineDomain({
  name: 'workdsh_runtime_binding',
  version: 1,
  layout: 'per-record',
  tables: { sessions: domainTable<string, SessionOwnerBinding>(sessionOwnerSchema) },
});

declare module '@deepseek-ai/cordis' {
  interface Context {
    workdshIdentity: IdentityService;
    workdshAudit: AuditService;
    workdshAccess: AccessManager;
    workdshSessionAccess: SessionAccessBridge;
    workdshToolAccess: ToolAccessBridge;
  }
}

function sameResource(left: ResourceRef, right: ResourceRef): boolean {
  return left.domain === right.domain && left.id === right.id;
}

function validateResource(resource: ResourceRef): void {
  if (!resourceRefSchema.safeParse(resource).success) {
    throw new GovernanceContractError('access/invalid-resource', 'Resource reference is invalid.');
  }
}

function validateGrant(grant: AccessGrant): void {
  if (!accessGrantSchema.safeParse(grant).success || new Set(grant.actions).size !== grant.actions.length) {
    throw new GovernanceContractError('access/invalid-grant', 'Access grant is invalid.');
  }
}

function authorizationRevision(membershipRevision: string | undefined, grants: readonly AccessGrant[]): string {
  const hash = createHash('sha256');
  hash.update(membershipRevision ?? 'no-membership');
  for (const grant of [...grants].sort((left, right) => left.id.localeCompare(right.id))) {
    hash.update('\0');
    hash.update(grant.id);
    hash.update('\0');
    hash.update(grant.revision);
  }
  return hash.digest('hex');
}

export class AccessManager extends Service implements AccessService, RuntimeBindingService {
  static inject = ['storageDomain', 'workdshIdentity', 'workdshAudit'];
  private grants?: KvTable<string, AccessGrant>;
  private sessionOwners?: KvTable<string, SessionOwnerBinding>;
  private mutationTail: Promise<void> = Promise.resolve();

  constructor(ctx: Context) {
    super(ctx, 'workdshAccess');
  }

  async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(accessDomainSpec);
    this.ctx.effect(() => () => domain.close(), 'workdshAccess.domainClose');
    this.grants = domain.table('grants');
    const runtimeDomain = await this.ctx.storageDomain.open(runtimeBindingDomainSpec);
    this.ctx.effect(() => () => runtimeDomain.close(), 'workdshAccess.runtimeDomainClose');
    this.sessionOwners = runtimeDomain.table('sessions');
  }

  bindSession(
    actor: ActorContext,
    request: Pick<RuntimeBindingRequest, 'sessionId' | 'workspaceId'>,
    signal?: AbortSignal,
  ): Promise<SessionOwnerBinding> {
    return this.enqueueMutation(async () => {
      signal?.throwIfAborted();
      assertActorContext(actor);
      validateRuntimeRequest({ ...request, runtimeId: 'binding', isolation: 'local-trusted' });
      const membership = this.ctx.workdshIdentity.membership(actor.organizationId, actor.principalId);
      if (!membership || membership.state !== 'active') {
        throw new GovernanceContractError('access/inactive-membership', 'Session owner is not an active member.');
      }
      const sessions = this.requireSessionOwners();
      const current = sessions.get(request.sessionId);
      if (current) {
        if (current.organizationId !== actor.organizationId
          || current.ownerPrincipalId !== actor.principalId
          || current.workspaceId !== request.workspaceId) {
          throw new GovernanceContractError('access/session-owner-conflict', 'Session ownership is already bound.');
        }
        return current;
      }
      const binding = Object.freeze({
        sessionId: request.sessionId,
        organizationId: actor.organizationId,
        ownerPrincipalId: actor.principalId,
        ...(request.workspaceId ? { workspaceId: request.workspaceId } : {}),
        revision: `session-owner-${randomUUID()}`,
      });
      const target = sessionResource(request.sessionId);
      const operationId = randomUUID();
      await this.audit(actor, 'access.session-bind', target, 'unknown', 'access/session-bind-started', { operationId });
      await sessions.put(request.sessionId, binding);
      await this.audit(actor, 'access.session-bind', target, 'succeeded', 'access/session-bind-succeeded', {
        operationId,
        bindingRevision: binding.revision,
      });
      return binding;
    });
  }

  sessionOwner(sessionId: string): SessionOwnerBinding | undefined {
    if (!bounded.safeParse(sessionId).success) {
      throw new GovernanceContractError('access/invalid-session', 'Session identity is invalid.');
    }
    return this.requireSessionOwners().get(sessionId);
  }

  async resolveRuntime(actor: ActorContext, request: RuntimeBindingRequest, signal?: AbortSignal): Promise<RuntimeBinding> {
    signal?.throwIfAborted();
    assertActorContext(actor);
    validateRuntimeRequest(request);
    const ownerBinding = this.sessionOwner(request.sessionId);
    const target = sessionResource(request.sessionId);
    if (!ownerBinding) {
      await this.audit(actor, 'access.runtime-resolve', target, 'denied', 'access/runtime-unbound', { runtimeId: request.runtimeId });
      throw new GovernanceContractError('access/runtime-unbound', 'Session has no trusted owner binding.');
    }
    if (request.workspaceId !== undefined && request.workspaceId !== ownerBinding.workspaceId) {
      await this.audit(actor, 'access.runtime-resolve', target, 'denied', 'access/workspace-mismatch', { runtimeId: request.runtimeId });
      throw new GovernanceContractError('access/workspace-mismatch', 'Runtime workspace does not match the Session binding.');
    }
    const decision = await this.authorize({
      actor,
      action: 'use',
      resource: target,
      owner: {
        organizationId: ownerBinding.organizationId,
        ownerPrincipalId: ownerBinding.ownerPrincipalId,
        scope: 'personal',
      },
    }, signal);
    if (decision.effect !== 'allow') {
      throw new GovernanceContractError(decision.code, 'Session runtime access was denied.');
    }
    return Object.freeze({
      sessionId: request.sessionId,
      organizationId: actor.organizationId,
      principalId: actor.principalId,
      requestId: actor.requestId,
      ...(ownerBinding.workspaceId ? { workspaceId: ownerBinding.workspaceId } : {}),
      runtimeId: request.runtimeId,
      isolation: request.isolation,
      authorizationRevision: decision.authorizationRevision,
    });
  }

  async authorize(request: AuthorizationRequest, signal?: AbortSignal): Promise<AuthorizationDecision> {
    signal?.throwIfAborted();
    assertActorContext(request.actor);
    assertResourceOwner(request.owner);
    validateResource(request.resource);
    const grants = [...this.requireGrants().entries()]
      .map(([, grant]) => grant)
      .filter((grant) => grant.organizationId === request.owner.organizationId
        && grant.subjectPrincipalId === request.actor.principalId
        && sameResource(grant.resource, request.resource));
    const membership = this.ctx.workdshIdentity.membership(request.actor.organizationId, request.actor.principalId);
    let decision: AuthorizationDecision;
    if (request.actor.organizationId !== request.owner.organizationId) {
      decision = this.deny('access/cross-organization', membership?.revision, grants);
    } else if (!membership || membership.state !== 'active') {
      decision = this.deny('access/inactive-membership', membership?.revision, grants);
    } else if (request.actor.principalId === request.owner.ownerPrincipalId) {
      decision = this.allow('access/resource-owner', membership.revision, []);
    } else {
      const matching = grants.filter((grant) => grant.actions.includes(request.action));
      decision = matching.length
        ? this.allow('access/explicit-grant', membership.revision, matching)
        : this.deny('access/not-granted', membership.revision, grants);
    }
    await this.audit(request.actor, 'access.authorize', request.resource,
      decision.effect === 'allow' ? 'succeeded' : 'denied', decision.code,
      { requestedAction: request.action, authorizationRevision: decision.authorizationRevision });
    return decision;
  }

  putGrant(
    actor: ActorContext,
    owner: ResourceOwner,
    grant: AccessGrant,
    expectedRevision?: string,
    signal?: AbortSignal,
  ): Promise<void> {
    return this.enqueueMutation(async () => {
      signal?.throwIfAborted();
      validateGrant(grant);
      const management = await this.authorize({ actor, action: 'manage', resource: grant.resource, owner }, signal);
      if (management.effect !== 'allow') throw new GovernanceContractError('access/denied', management.code);
      if (grant.organizationId !== owner.organizationId) {
        throw new GovernanceContractError('access/cross-organization', 'Grant and resource owner must share an organization.');
      }
      const subject = this.ctx.workdshIdentity.membership(grant.organizationId, grant.subjectPrincipalId);
      if (!subject || subject.state !== 'active') {
        throw new GovernanceContractError('access/inactive-subject', 'Grant subject is not an active member.');
      }
      const grants = this.requireGrants();
      const current = grants.get(grant.id);
      if ((current && expectedRevision !== current.revision) || (!current && expectedRevision !== undefined)) {
        throw new GovernanceContractError('access/revision-conflict', 'Grant revision does not match the current record.');
      }
      const operationId = randomUUID();
      await this.audit(actor, 'access.grant', grant.resource, 'unknown', 'access/grant-started', { operationId, grantId: grant.id });
      await grants.put(grant.id, Object.freeze({ ...grant, actions: Object.freeze([...grant.actions]) }));
      await this.audit(actor, 'access.grant', grant.resource, 'succeeded', 'access/grant-succeeded', { operationId, grantId: grant.id });
    });
  }

  revokeGrant(
    actor: ActorContext,
    owner: ResourceOwner,
    grantId: string,
    expectedRevision: string,
    signal?: AbortSignal,
  ): Promise<boolean> {
    return this.enqueueMutation(async () => {
      signal?.throwIfAborted();
      const grants = this.requireGrants();
      const current = grants.get(grantId);
      if (!current) return false;
      const management = await this.authorize({ actor, action: 'manage', resource: current.resource, owner }, signal);
      if (management.effect !== 'allow') throw new GovernanceContractError('access/denied', management.code);
      if (current.organizationId !== owner.organizationId) {
        throw new GovernanceContractError('access/resource-mismatch', 'Grant does not belong to this resource owner.');
      }
      if (current.revision !== expectedRevision) {
        throw new GovernanceContractError('access/revision-conflict', 'Grant revision does not match the current record.');
      }
      const operationId = randomUUID();
      await this.audit(actor, 'access.revoke', current.resource, 'unknown', 'access/revoke-started', { operationId, grantId });
      const deleted = await grants.delete(grantId);
      await this.audit(actor, 'access.revoke', current.resource, 'succeeded', 'access/revoke-succeeded', { operationId, grantId });
      return deleted;
    });
  }

  private allow(code: string, membershipRevision: string, grants: readonly AccessGrant[]): AuthorizationDecision {
    return Object.freeze({
      effect: 'allow', code,
      authorizationRevision: authorizationRevision(membershipRevision, grants),
      grantIds: Object.freeze(grants.map((grant) => grant.id).sort()),
    });
  }

  private deny(code: string, membershipRevision: string | undefined, grants: readonly AccessGrant[]): AuthorizationDecision {
    return Object.freeze({ effect: 'deny', code, authorizationRevision: authorizationRevision(membershipRevision, grants), grantIds: Object.freeze([]) });
  }

  private async audit(
    actor: ActorContext,
    action: string,
    target: ResourceRef,
    outcome: AuditEvent['outcome'],
    code: string,
    references: Readonly<Record<string, string>>,
  ): Promise<void> {
    await this.ctx.workdshAudit.append({
      id: randomUUID(),
      occurredAt: new Date().toISOString(),
      requestId: actor.requestId,
      principalId: actor.principalId,
      organizationId: actor.organizationId,
      action,
      target,
      outcome,
      code,
      ...(actor.sessionId ? { sessionId: actor.sessionId } : {}),
      ...(actor.runId ? { runId: actor.runId } : {}),
      references,
    });
  }

  private requireGrants(): KvTable<string, AccessGrant> {
    if (!this.grants) throw new GovernanceContractError('access/not-ready', 'Access manager is not ready.');
    return this.grants;
  }

  private requireSessionOwners(): KvTable<string, SessionOwnerBinding> {
    if (!this.sessionOwners) throw new GovernanceContractError('access/not-ready', 'Runtime binding registry is not ready.');
    return this.sessionOwners;
  }

  private enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationTail.then(operation);
    this.mutationTail = result.then(() => undefined, () => undefined);
    return result;
  }
}

function validateRuntimeRequest(request: RuntimeBindingRequest): void {
  if (!bounded.safeParse(request.sessionId).success
    || !bounded.safeParse(request.runtimeId).success
    || (request.workspaceId !== undefined && !bounded.safeParse(request.workspaceId).success)
    || !['local-trusted', 'process', 'container', 'unavailable'].includes(request.isolation)) {
    throw new GovernanceContractError('access/invalid-runtime', 'Runtime binding request is invalid.');
  }
}

function sessionResource(sessionId: string): ResourceRef {
  return Object.freeze({ domain: 'session', id: sessionId });
}

function safeAuditReference(value: string): string {
  return value.length <= 1024 && !/[\u0000-\u001f]/.test(value)
    ? value
    : `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

interface ToolAuthorizationState {
  readonly actor: ActorContext;
  readonly binding: RuntimeBinding;
}

export interface ToolAccessBridgeConfig {
  readonly runtimeId?: string;
  readonly isolation?: RuntimeBindingRequest['isolation'];
  /** Personal profiles may bind an unowned Session on its first official Agent tool call. */
  readonly autoBindPersonalSessions?: boolean;
}

export interface SessionAccessBridgeConfig {
  readonly runtimeId?: string;
  readonly isolation?: RuntimeBindingRequest['isolation'];
}

/** Trusted Host ingress for WorkDSH Session creation and resume. */
export class SessionAccessBridge extends Service {
  static inject = ['sessionController', 'workdshIdentity', 'workdshAccess', 'workdshAudit'];
  private readonly runtimeId: string;
  private readonly isolation: RuntimeBindingRequest['isolation'];

  constructor(ctx: Context, config: SessionAccessBridgeConfig = {}) {
    super(ctx, 'workdshSessionAccess');
    this.runtimeId = config.runtimeId ?? `workdsh-session-runtime-${randomUUID()}`;
    this.isolation = config.isolation ?? 'local-trusted';
  }

  async create(request: SessionCreateRequest, signal?: AbortSignal): Promise<SessionCreateValue> {
    signal?.throwIfAborted();
    const sessionId = request.sessionId ?? (`session-${randomUUID()}` as SessionId);
    const actor = await this.ctx.workdshIdentity.resolve({ sessionId: String(sessionId) }, signal);
    if (request.sessionId !== undefined && !this.ctx.workdshAccess.sessionOwner(String(sessionId))) {
      let exists = false;
      try {
        await this.ctx.sessionController.inspect(sessionId, signal);
        exists = true;
      } catch (error) {
        if (!(error instanceof ApiSessionNotFound) && !hasErrorCode(error, 'session/not-found')) throw error;
      }
      if (exists) {
        await this.audit(actor, 'session.create', 'denied', 'access/unbound-session-adoption');
        throw new GovernanceContractError(
          'access/unbound-session-adoption',
          'An existing Session without a trusted owner binding cannot be adopted.',
        );
      }
    }
    await this.ctx.workdshAccess.bindSession(actor, {
      sessionId: String(sessionId),
      ...(request.workspaceId === undefined ? {} : { workspaceId: String(request.workspaceId) }),
    }, signal);
    signal?.throwIfAborted();
    try {
      const result = await this.ctx.sessionController.create({ ...request, sessionId });
      if (String(result.sessionId) !== String(sessionId)) {
        throw new GovernanceContractError('access/session-id-mismatch', 'Session Controller returned a different Session identity.');
      }
      await this.audit(actor, 'session.create', 'succeeded', 'session/create-succeeded');
      return result;
    } catch (error) {
      await this.audit(actor, 'session.create', 'failed', errorCode(error, 'session/create-failed'));
      throw error;
    }
  }

  async resolveAgent(sessionId: SessionId, signal?: AbortSignal): Promise<SessionAgentResult> {
    signal?.throwIfAborted();
    const id = String(sessionId);
    const actor = await this.ctx.workdshIdentity.resolve({ sessionId: id }, signal);
    const owner = this.ctx.workdshAccess.sessionOwner(id);
    await this.ctx.workdshAccess.resolveRuntime(actor, {
      sessionId: id,
      runtimeId: this.runtimeId,
      isolation: this.isolation,
      ...(owner?.workspaceId === undefined ? {} : { workspaceId: owner.workspaceId }),
    }, signal);
    signal?.throwIfAborted();
    try {
      const result = await this.ctx.sessionController.resolveAgent(sessionId);
      if ('error' in result) {
        await this.audit(actor, 'session.resume', 'failed', errorCode(result.error, 'session/resume-failed'));
      } else {
        await this.audit(actor, 'session.resume', 'succeeded', 'session/resume-succeeded');
      }
      return result;
    } catch (error) {
      await this.audit(actor, 'session.resume', 'failed', errorCode(error, 'session/resume-failed'));
      throw error;
    }
  }

  private async audit(actor: ActorContext, action: string, outcome: AuditEvent['outcome'], code: string): Promise<void> {
    await this.ctx.workdshAudit.append({
      id: randomUUID(),
      occurredAt: new Date().toISOString(),
      requestId: actor.requestId,
      principalId: actor.principalId,
      organizationId: actor.organizationId,
      action,
      target: sessionResource(actor.sessionId ?? 'unknown'),
      outcome,
      code,
      ...(actor.sessionId ? { sessionId: actor.sessionId } : {}),
    });
  }
}

function errorCode(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return safeAuditReference(error.code);
  }
  return fallback;
}

function hasErrorCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === code);
}

/** Binds the official tool pipeline to Host identity, Session ownership, Access and Audit. */
export class ToolAccessBridge extends Service {
  static inject = ['tools', 'workdshIdentity', 'workdshAccess', 'workdshAudit'];
  private readonly runtimeId: string;
  private readonly isolation: RuntimeBindingRequest['isolation'];
  private readonly autoBindPersonalSessions: boolean;
  private readonly authorized = new Map<ToolExecutionToken, ToolAuthorizationState>();
  private resultAuditTail: Promise<void> = Promise.resolve();

  constructor(ctx: Context, config: ToolAccessBridgeConfig = {}) {
    super(ctx, 'workdshToolAccess');
    this.runtimeId = config.runtimeId ?? `workdsh-runtime-${randomUUID()}`;
    this.isolation = config.isolation ?? 'local-trusted';
    this.autoBindPersonalSessions = config.autoBindPersonalSessions ?? true;
    ctx.on('tools/pre-execute', async (exec, next) => this.authorizeTool(exec, next));
    ctx.on('tools/result', (exec, result) => {
      this.observeResult(exec, result);
      return undefined;
    });
    ctx.on('session/flush', async () => this.flush());
    ctx.effect(() => async () => this.flush(), 'workdshToolAccess.flush');
  }

  async flush(): Promise<void> {
    await this.resultAuditTail;
    await this.ctx.workdshAudit.flush();
  }

  private async authorizeTool(exec: ToolExecution, next: () => Promise<PreToolDecision>): Promise<PreToolDecision> {
    if (!exec.agent) return next();
    const sessionId = String(exec.agent.id);
    let actor: ActorContext | undefined;
    try {
      actor = await this.ctx.workdshIdentity.resolve({ sessionId }, exec.signal);
      if (!this.ctx.workdshAccess.sessionOwner(sessionId)) {
        const profile = this.ctx.workdshIdentity.profile();
        if (!this.autoBindPersonalSessions
          || profile.organization.kind !== 'personal'
          || profile.principalId !== actor.principalId
          || profile.organization.id !== actor.organizationId) {
          throw new GovernanceContractError('access/runtime-unbound', 'Session has no trusted owner binding.');
        }
        await this.ctx.workdshAccess.bindSession(actor, { sessionId }, exec.signal);
      }
      const binding = await this.ctx.workdshAccess.resolveRuntime(actor, {
        sessionId,
        runtimeId: this.runtimeId,
        isolation: this.isolation,
      }, exec.signal);
      this.authorized.set(exec.token, { actor, binding });
    } catch (error) {
      const code = error instanceof GovernanceContractError ? error.code : 'access/tool-policy-failed';
      if (actor) await this.auditTool(actor, exec, 'denied', code);
      return { kind: 'deny', reason: `WorkDSH denied this tool call (${code}).` };
    }
    return next();
  }

  private observeResult(exec: Readonly<ToolExecution>, result: Readonly<ToolExecutionResult>): void {
    const state = this.authorized.get(exec.token);
    this.authorized.delete(exec.token);
    if (!state) return;
    const cancelled = result.isError && /ABORTED/.test(result.error.info?.code ?? '');
    const append = () => this.auditTool(
      state.actor,
      exec,
      cancelled ? 'cancelled' : result.isError ? 'failed' : 'succeeded',
      cancelled ? 'tool/cancelled' : result.isError ? 'tool/failed' : 'tool/succeeded',
      state.binding.authorizationRevision,
    );
    this.resultAuditTail = this.resultAuditTail.then(append, append);
  }

  private async auditTool(
    actor: ActorContext,
    exec: Readonly<ToolExecution>,
    outcome: AuditEvent['outcome'],
    code: string,
    authorizationRevision?: string,
  ): Promise<void> {
    await this.ctx.workdshAudit.append({
      id: randomUUID(),
      occurredAt: new Date().toISOString(),
      requestId: actor.requestId,
      principalId: actor.principalId,
      organizationId: actor.organizationId,
      action: 'tool.execute',
      target: sessionResource(String(exec.agent?.id ?? 'host')),
      outcome,
      code,
      ...(actor.sessionId ? { sessionId: actor.sessionId } : {}),
      references: {
        toolName: safeAuditReference(exec.name),
        callId: safeAuditReference(String(exec.callId)),
        ...(authorizationRevision ? { authorizationRevision } : {}),
      },
    });
  }
}

export default AccessManager;
