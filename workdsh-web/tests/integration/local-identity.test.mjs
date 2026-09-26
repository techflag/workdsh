import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalIdentityProvider } from '../../packages/providers/identity-local/dist/index.js';

test('local identity resolves one Host-configured actor and ignores forged identity fields', async () => {
  const provider = new LocalIdentityProvider({ principalId: 'principal-local', organizationId: 'organization-personal' });
  const actor = await provider.resolve({
    sessionId: 'session-1',
    principalId: 'forged-principal',
    organizationId: 'forged-organization',
    requestId: 'forged-request',
    resolvedBy: 'forged-provider',
  });
  assert.equal(actor.principalId, 'principal-local');
  assert.equal(actor.organizationId, 'organization-personal');
  assert.equal(actor.resolvedBy, 'workdsh-identity-local');
  assert.equal(actor.sessionId, 'session-1');
  assert.match(actor.requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(Object.isFrozen(actor), true);
});

test('local identity creates per-request correlation and honors cancellation', async () => {
  const provider = new LocalIdentityProvider({ principalId: 'principal-local', organizationId: 'organization-personal' });
  const first = await provider.resolve();
  const second = await provider.resolve();
  assert.notEqual(first.requestId, second.requestId);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(provider.resolve(undefined, controller.signal), error => error?.name === 'AbortError');
});

test('local identity rejects invalid Host configuration', () => {
  assert.throws(() => new LocalIdentityProvider({ principalId: '', organizationId: 'organization-personal' }), /Invalid principalId/);
  assert.throws(() => new LocalIdentityProvider({ principalId: 'principal-local', organizationId: '' }), /Invalid organizationId/);
});
