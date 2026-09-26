import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import Storage from '@deepseek-ai/dsh-storage';
import * as JsonStorage from '@deepseek-ai/dsh-storage-json';
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain';
import { LocalIdentityService } from '../../packages/providers/identity-local/dist/index.js';

const config = {
  principalId: 'principal-local-owner',
  organizationId: 'organization-personal',
  organizationName: '个人空间',
};

async function boot(root, identityConfig = config) {
  const ctx = new Context();
  try {
    await ctx.plugin(Storage);
    await ctx.plugin(JsonStorage, { root });
    await ctx.plugin(StorageDomain, { backend: 'json' });
    await ctx.plugin(LocalIdentityService, identityConfig);
    return ctx;
  } catch (error) {
    await ctx.fiber.dispose();
    throw error;
  }
}

test('local identity Cordis service persists one coherent personal profile across cold restart', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-identity-'));
  let first;
  let second;
  try {
    first = await boot(root);
    const initial = first.workdshIdentity.profile();
    assert.equal(initial.organization.id, config.organizationId);
    assert.equal(initial.membership.organizationId, initial.organization.id);
    assert.equal(initial.membership.principalId, initial.principalId);
    assert.equal(initial.membership.role, 'owner');
    assert.deepEqual(first.workdshIdentity.membership(initial.organization.id, initial.principalId), initial.membership);
    assert.equal(first.workdshIdentity.membership('another-organization', initial.principalId), undefined);
    assert.ok(Object.isFrozen(initial));
    assert.ok(Object.isFrozen(initial.organization));
    assert.ok(Object.isFrozen(initial.membership));
    await first.fiber.dispose();
    first = undefined;

    second = await boot(root);
    assert.deepEqual(second.workdshIdentity.profile(), initial);
    const actor = await second.workdshIdentity.resolve({ sessionId: 'session-cold-restart' });
    assert.equal(actor.principalId, initial.principalId);
    assert.equal(actor.organizationId, initial.organization.id);
    assert.equal(actor.sessionId, 'session-cold-restart');

    const medium = await readFile(join(root, 'workdsh_identity_local.json'), 'utf8');
    assert.ok(medium.length > 0);
  } finally {
    if (first) await first.fiber.dispose();
    if (second) await second.fiber.dispose();
    await rm(root, { recursive: true, force: true });
  }
});

test('local identity refuses a Host config that conflicts with persisted identity', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-identity-conflict-'));
  let first;
  try {
    first = await boot(root);
    await first.fiber.dispose();
    first = undefined;
    await assert.rejects(
      boot(root, { ...config, principalId: 'forged-second-principal' }),
      { code: 'identity-local/config-conflict' },
    );
  } finally {
    if (first) await first.fiber.dispose();
    await rm(root, { recursive: true, force: true });
  }
});
