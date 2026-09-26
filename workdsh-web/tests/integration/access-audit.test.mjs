import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import Storage from '@deepseek-ai/dsh-storage';
import * as JsonStorage from '@deepseek-ai/dsh-storage-json';
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain';
import { AccessManager } from '../../packages/plugins/access/dist/index.js';
import { AuditJournal } from '../../packages/plugins/audit/dist/index.js';

const membershipDirectory = new Map([
  ['organization-a', 'owner-a', 'owner'],
  ['organization-a', 'admin-a', 'admin'],
  ['organization-a', 'member-a', 'member'],
  ['organization-b', 'owner-b', 'owner'],
].map(([organizationId, principalId, role]) => [
  `${organizationId}:${principalId}`,
  { organizationId, principalId, principalKind: 'human', role, state: 'active', revision: `membership-${principalId}-1` },
]));

const identity = {
  id: 'test-identity',
  async resolve() { throw new Error('not used by this Host-side policy test'); },
  profile() { throw new Error('not used by this Host-side policy test'); },
  membership(organizationId, principalId) { return membershipDirectory.get(`${organizationId}:${principalId}`); },
};

const resource = { domain: 'skills', id: 'skill-private-a', revision: 'resource-1' };
const owner = { organizationId: 'organization-a', ownerPrincipalId: 'owner-a', scope: 'personal' };
const actor = (principalId, organizationId = 'organization-a') => ({
  principalId,
  organizationId,
  requestId: `request-${principalId}-${organizationId}`,
  resolvedBy: 'test-identity',
});

async function boot(root) {
  const ctx = new Context();
  try {
    ctx.provide('workdshIdentity', identity);
    await ctx.plugin(Storage);
    await ctx.plugin(JsonStorage, { root });
    await ctx.plugin(StorageDomain, { backend: 'json' });
    await ctx.plugin(AuditJournal);
    await ctx.plugin(AccessManager);
    return ctx;
  } catch (error) {
    await ctx.fiber.dispose();
    throw error;
  }
}

test('access denies cross-organization and admin private reads, grants explicitly, then revokes immediately', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-access-'));
  let ctx;
  try {
    ctx = await boot(root);
    assert.equal((await ctx.workdshAccess.authorize({ actor: actor('owner-a'), action: 'manage', resource, owner })).effect, 'allow');
    const adminDecision = await ctx.workdshAccess.authorize({ actor: actor('admin-a'), action: 'read', resource, owner });
    assert.equal(adminDecision.effect, 'deny');
    assert.equal(adminDecision.code, 'access/not-granted');
    const crossOrganization = await ctx.workdshAccess.authorize({
      actor: actor('owner-b', 'organization-b'), action: 'read', resource, owner,
    });
    assert.equal(crossOrganization.effect, 'deny');
    assert.equal(crossOrganization.code, 'access/cross-organization');

    const grant = {
      id: 'grant-member-a-read',
      organizationId: 'organization-a',
      subjectPrincipalId: 'member-a',
      resource,
      actions: ['read'],
      revision: 'grant-revision-1',
    };
    await ctx.workdshAccess.putGrant(actor('owner-a'), owner, grant);
    const granted = await ctx.workdshAccess.authorize({ actor: actor('member-a'), action: 'read', resource, owner });
    assert.equal(granted.effect, 'allow');
    assert.equal(granted.code, 'access/explicit-grant');
    assert.deepEqual(granted.grantIds, ['grant-member-a-read']);
    const activeMembership = membershipDirectory.get('organization-a:member-a');
    membershipDirectory.set('organization-a:member-a', { ...activeMembership, state: 'suspended', revision: 'membership-member-a-2' });
    try {
      const suspended = await ctx.workdshAccess.authorize({ actor: actor('member-a'), action: 'read', resource, owner });
      assert.equal(suspended.effect, 'deny');
      assert.equal(suspended.code, 'access/inactive-membership');
    } finally {
      membershipDirectory.set('organization-a:member-a', activeMembership);
    }
    assert.equal((await ctx.workdshAccess.authorize({ actor: actor('member-a'), action: 'edit', resource, owner })).effect, 'deny');
    await assert.rejects(
      ctx.workdshAccess.putGrant(actor('owner-a'), owner, { ...grant, revision: 'grant-revision-2' }),
      { code: 'access/revision-conflict' },
    );
    assert.equal(await ctx.workdshAccess.revokeGrant(actor('owner-a'), owner, grant.id, grant.revision), true);
    const revoked = await ctx.workdshAccess.authorize({ actor: actor('member-a'), action: 'read', resource, owner });
    assert.equal(revoked.effect, 'deny');
    assert.equal(revoked.code, 'access/not-granted');

    const events = ctx.workdshAudit.snapshot();
    assert.ok(events.some((event) => event.code === 'access/cross-organization' && event.outcome === 'denied'));
    assert.ok(events.some((event) => event.code === 'access/grant-succeeded'));
    assert.ok(events.some((event) => event.code === 'access/revoke-succeeded'));
    assert.ok(events.every((event) => !Object.keys(event.references ?? {}).some((key) => /prompt|secret|token|credential/i.test(key))));
  } finally {
    if (ctx) await ctx.fiber.dispose();
    await rm(root, { recursive: true, force: true });
  }
});

test('access grants and audit records survive a cold Host restart', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-access-cold-'));
  let first;
  let second;
  try {
    first = await boot(root);
    const grant = {
      id: 'grant-cold-restart', organizationId: 'organization-a', subjectPrincipalId: 'member-a',
      resource, actions: ['use'], revision: 'grant-cold-1',
    };
    await first.workdshAccess.putGrant(actor('owner-a'), owner, grant);
    const eventCount = first.workdshAudit.snapshot().length;
    await first.fiber.dispose();
    first = undefined;

    second = await boot(root);
    const decision = await second.workdshAccess.authorize({ actor: actor('member-a'), action: 'use', resource, owner });
    assert.equal(decision.effect, 'allow');
    assert.deepEqual(decision.grantIds, ['grant-cold-restart']);
    assert.ok(second.workdshAudit.snapshot().length > eventCount);
  } finally {
    if (first) await first.fiber.dispose();
    if (second) await second.fiber.dispose();
    await rm(root, { recursive: true, force: true });
  }
});

test('audit rejects duplicate IDs and sensitive references', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-audit-'));
  let ctx;
  try {
    ctx = await boot(root);
    const event = {
      id: 'audit-fixed-id', occurredAt: new Date().toISOString(), requestId: 'request-audit',
      principalId: 'owner-a', organizationId: 'organization-a', action: 'test.audit',
      outcome: 'succeeded', code: 'test/succeeded', references: { operationId: 'safe-reference' },
    };
    await ctx.workdshAudit.append(event);
    await assert.rejects(ctx.workdshAudit.append(event), { code: 'audit/duplicate-event' });
    await assert.rejects(
      ctx.workdshAudit.append({ ...event, id: 'audit-sensitive', references: { accessToken: 'forbidden' } }),
      { code: 'audit/sensitive-reference' },
    );
  } finally {
    if (ctx) await ctx.fiber.dispose();
    await rm(root, { recursive: true, force: true });
  }
});
