/**
 * Expert domain runtime values, owned locally by the experts plugin (D04 / P1-02).
 *
 * ADR-0019 (installable Host self-containment): an installed Host `dist/*.js` may
 * only import official `@deepseek-ai/*` packages, declared npm dependencies, Node
 * builtins and its own workspace source — never the private `workdsh-contracts`
 * package, which is not packed or installed. The pure domain values therefore live
 * here (mirroring how the skills plugin keeps its runtime values local), while
 * `workdsh-contracts/experts` stays the single source of the shared TYPES, imported
 * `type`-only below and erased from the emitted JavaScript.
 *
 * `assertActorContext` is a minimal structural guard replicated from the governance
 * contract so the Host can validate a Host-resolved actor without a runtime
 * dependency on `workdsh-contracts/governance`. It deliberately keeps the
 * `governance/invalid-context` code (AT-22/AT-15 traceability) and is NOT an
 * `ExpertsError`, so the transport maps it exactly as before. The trusted actor is
 * still established by the injected IdentityService at the transport boundary; this
 * guard is defence in depth, not the authority.
 */
import type { AccessAction, ActorContext, ExpertAction, ExpertErrorCode } from 'workdsh-contracts';

/** Definition field limits (Unicode code points for string maxLength; total UTF-8 bytes checked at publish). */
export const EXPERT_LIMITS = Object.freeze({
  nameMax: 80,
  descriptionMax: 300,
  proseMax: 16000,
  tagsMax: 8,
  examplesMax: 6,
  skillRequirementsMax: 32,
  futureRequirementsMax: 32,
  /** Total UTF-8 size of a published definition, in bytes. */
  publishedDefinitionMaxBytes: 32 * 1024,
  searchMaxChars: 200,
  listDefaultLimit: 50,
  listMaxLimit: 100,
} as const);

/** Domain error carrying a stable code and optional public details. Never leaks other owners' paths/content. */
export class ExpertsError extends Error {
  constructor(
    readonly code: ExpertErrorCode | string,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = 'ExpertsError';
  }
}

/** Map an expert action to the access action checked against the resource owner. */
export function actionAccess(action: ExpertAction): AccessAction {
  switch (action) {
    case 'experts.publish':
    case 'experts.set-availability':
      return 'manage';
    case 'experts.create-draft':
    case 'experts.update-draft':
    case 'experts.copy':
    case 'experts.validate':
    case 'experts.commit-import':
      return 'edit';
    case 'experts.prepare-execution':
    case 'experts.create-execution':
    case 'experts.prepare-handoff':
    case 'experts.create-handoff':
      return 'use';
    default:
      return 'read';
  }
}

/**
 * Structural actor-context error. Kept separate from `ExpertsError` so the exact
 * transport mapping is preserved; carries the governance-compatible code.
 */
export class ActorContextError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'ActorContextError';
  }
}

function requireContextString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 256 || /[\u0000-\u001f]/.test(value)) {
    throw new ActorContextError('governance/invalid-context', `Invalid ${field}.`);
  }
}

/** Minimal structural guard for a Host-resolved actor context (defence in depth). */
export function assertActorContext(value: unknown): asserts value is ActorContext {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ActorContextError('governance/invalid-context', 'Actor context must be a record.');
  }
  const actor = value as Partial<ActorContext>;
  requireContextString(actor.principalId, 'principalId');
  requireContextString(actor.organizationId, 'organizationId');
  requireContextString(actor.requestId, 'requestId');
  requireContextString(actor.resolvedBy, 'resolvedBy');
  if (actor.sessionId !== undefined) requireContextString(actor.sessionId, 'sessionId');
  if (actor.runId !== undefined) requireContextString(actor.runId, 'runId');
  if (actor.delegatedByPrincipalId !== undefined) requireContextString(actor.delegatedByPrincipalId, 'delegatedByPrincipalId');
}
