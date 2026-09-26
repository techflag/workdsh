/**
 * Governance runtime primitives, owned locally by the access plugin (D01).
 *
 * ADR-0019 (installable Host self-containment): an installed Host `dist/*.js` may
 * not carry a runtime import of the private `workdsh-contracts` package, which is
 * never packed or installed. `workdsh-contracts/governance` stays the single source
 * of truth for these primitives and for the shared TYPES (imported `type`-only below
 * and erased at build); this local copy lets the access Host resolve them without the
 * workspace at runtime, matching the skills and experts plugins. The validation logic
 * is replicated verbatim so the stable `governance/*` and `access/*` codes are
 * unchanged.
 */
import type { ActorContext, ResourceOwner } from 'workdsh-contracts';

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
