/**
 * Governance runtime primitives, owned locally by the local identity provider (D01).
 *
 * ADR-0019 (installable Host self-containment): an installed Host `dist/*.js` may not
 * carry a runtime import of the private `workdsh-contracts` package, which is never
 * packed or installed. `workdsh-contracts/governance` stays the single source of truth
 * for these primitives and for the shared TYPES (imported `type`-only below and erased
 * at build); this local copy lets the identity Host resolve them without the workspace
 * at runtime. The logic is replicated verbatim so the stable `governance/*` and
 * `identity-local/*` codes are unchanged.
 */
import type { ActorContext } from 'workdsh-contracts';

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
