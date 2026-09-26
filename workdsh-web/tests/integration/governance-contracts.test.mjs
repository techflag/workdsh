import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GovernanceContractError,
  assertActorContext,
  assertResourceOwner,
  sameOrganization,
} from '../../packages/contracts/dist/index.js';

const actor = {
  principalId: 'principal-local',
  organizationId: 'organization-personal',
  requestId: 'request-1',
  resolvedBy: 'workdsh-identity-local',
};

test('governance contracts accept Host-resolved actors and enforce resource scope shape', () => {
  assert.doesNotThrow(() => assertActorContext(actor));
  const personal = { organizationId: actor.organizationId, ownerPrincipalId: actor.principalId, scope: 'personal' };
  assert.doesNotThrow(() => assertResourceOwner(personal));
  assert.equal(sameOrganization(actor, personal), true);
  assert.equal(sameOrganization(actor, { ...personal, organizationId: 'another-organization' }), false);
  assert.throws(
    () => assertResourceOwner({ ...personal, scope: 'project' }),
    error => error instanceof GovernanceContractError && error.code === 'governance/invalid-owner',
  );
});

test('governance contracts reject incomplete or control-character identity input', () => {
  assert.throws(
    () => assertActorContext({ principalId: 'browser-claimed', organizationId: '', requestId: 'request-2', resolvedBy: '' }),
    error => error instanceof GovernanceContractError && error.code === 'governance/invalid-context',
  );
  assert.throws(
    () => assertActorContext({ ...actor, principalId: 'bad\nprincipal' }),
    error => error instanceof GovernanceContractError && error.code === 'governance/invalid-context',
  );
});
