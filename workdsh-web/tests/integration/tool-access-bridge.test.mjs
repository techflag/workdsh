import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import Storage from '@deepseek-ai/dsh-storage';
import * as JsonStorage from '@deepseek-ai/dsh-storage-json';
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain';
import Tools from '@deepseek-ai/dsh-tools';
import { AccessManager, SessionAccessBridge, ToolAccessBridge } from '../../packages/plugins/access/dist/index.js';
import { createRequire } from 'node:module';
const { ApiSessionNotFound } = await import(createRequire(new URL('../../packages/plugins/access/package.json', import.meta.url)).resolve('@deepseek-ai/dsh-api-session-controller'));
import { AuditJournal } from '../../packages/plugins/audit/dist/index.js';

const membershipDirectory = new Map([
  ['personal-owner:owner-a', {
    organizationId: 'personal-owner', principalId: 'owner-a', principalKind: 'human',
    role: 'owner', state: 'active', revision: 'membership-owner-a-1',
  }],
  ['personal-owner:member-a', {
    organizationId: 'personal-owner', principalId: 'member-a', principalKind: 'human',
    role: 'member', state: 'active', revision: 'membership-member-a-1',
  }],
  ['organization-b:owner-b', {
    organizationId: 'organization-b', principalId: 'owner-b', principalKind: 'human',
    role: 'owner', state: 'active', revision: 'membership-owner-b-1',
  }],
]);

function createIdentity(selectedBySession) {
  let request = 0;
  return {
    id: 'test-session-identity',
    profile() {
      return {
        principalId: 'owner-a', principalKind: 'human', resolvedBy: this.id,
        organization: { id: 'personal-owner', kind: 'personal', name: 'Owner profile', revision: 'organization-1' },
        membership: membershipDirectory.get('personal-owner:owner-a'),
      };
    },
    membership(organizationId, principalId) {
      return membershipDirectory.get(`${organizationId}:${principalId}`);
    },
    async resolve(evidence, signal) {
      signal?.throwIfAborted();
      const selected = selectedBySession.get(evidence?.sessionId) ?? ['owner-a', 'personal-owner'];
      request += 1;
      return {
        principalId: selected[0], organizationId: selected[1], requestId: `tool-request-${request}`,
        resolvedBy: this.id, ...(evidence?.sessionId ? { sessionId: evidence.sessionId } : {}),
      };
    },
  };
}

function registerFixtures(ctx, counters) {
  ctx.tools.register({
    name: 'governed_echo',
    description: 'Governance integration fixture.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: {
      schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false },
      render: () => [],
    },
    async execute() {
      counters.executed += 1;
      return { ok: true };
    },
  });
  ctx.tools.register({
    name: 'governed_failure',
    description: 'Governance failure fixture.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: {
      schema: { type: 'object', properties: {}, additionalProperties: false },
      render: () => [],
    },
    async execute() { throw new Error('fixture failed'); },
  });
}

async function boot(root, selectedBySession, config = {}) {
  const ctx = new Context();
  try {
    ctx.provide('systemPrompt', { tools() {}, section() {}, getSectionOrder() { return 0; } });
    ctx.provide('workdshIdentity', createIdentity(selectedBySession));
    await ctx.plugin(Storage);
    await ctx.plugin(JsonStorage, { root });
    await ctx.plugin(StorageDomain, { backend: 'json' });
    await ctx.plugin(Tools);
    await ctx.plugin(AuditJournal);
    await ctx.plugin(AccessManager);
    await ctx.plugin(ToolAccessBridge, { runtimeId: 'test-runtime', ...config });
    return ctx;
  } catch (error) {
    await ctx.fiber.dispose();
    throw error;
  }
}

async function execute(ctx, sessionId, name = 'governed_echo') {
  return ctx.tools.execute({
    callId: `call-${sessionId}-${name}-${Math.random()}`,
    name,
    arguments: {},
    agent: { id: sessionId },
    signal: new AbortController().signal,
  });
}

test('official tool pipeline auto-binds a personal Session, denies unauthorized actors and audits final outcomes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-tool-access-'));
  const selected = new Map([['session-a', ['owner-a', 'personal-owner']]]);
  const counters = { executed: 0 };
  let ctx;
  try {
    ctx = await boot(root, selected);
    registerFixtures(ctx, counters);
    assert.equal((await execute(ctx, 'session-a')).isError, false);
    assert.equal(counters.executed, 1);
    assert.equal(ctx.workdshAccess.sessionOwner('session-a').ownerPrincipalId, 'owner-a');

    selected.set('session-a', ['member-a', 'personal-owner']);
    const denied = await execute(ctx, 'session-a');
    assert.equal(denied.isError, true);
    assert.match(denied.error.message, /access\/not-granted/);
    assert.equal(counters.executed, 1, 'denied calls never reach the tool body');

    await ctx.workdshAccess.putGrant(
      { principalId: 'owner-a', organizationId: 'personal-owner', requestId: 'grant-request', resolvedBy: 'test-session-identity' },
      { organizationId: 'personal-owner', ownerPrincipalId: 'owner-a', scope: 'personal' },
      {
        id: 'session-a-use-member-a', organizationId: 'personal-owner', subjectPrincipalId: 'member-a',
        resource: { domain: 'session', id: 'session-a' }, actions: ['use'], revision: 'grant-session-a-1',
      },
    );
    assert.equal((await execute(ctx, 'session-a')).isError, false);
    assert.equal((await execute(ctx, 'session-a', 'governed_failure')).isError, true);
    assert.equal(counters.executed, 2);

    await ctx.workdshToolAccess.flush();
    const events = ctx.workdshAudit.snapshot();
    assert.ok(events.some((event) => event.action === 'tool.execute' && event.outcome === 'denied' && event.code === 'access/not-granted'));
    assert.ok(events.some((event) => event.action === 'tool.execute' && event.outcome === 'succeeded' && event.code === 'tool/succeeded'));
    assert.ok(events.some((event) => event.action === 'tool.execute' && event.outcome === 'failed' && event.code === 'tool/failed'));
    assert.ok(events.filter((event) => event.action === 'tool.execute' && event.outcome !== 'denied')
      .every((event) => event.references?.authorizationRevision));
  } finally {
    if (ctx) await ctx.fiber.dispose();
    await rm(root, { recursive: true, force: true });
  }
});

test('explicit Session ownership survives restart and cannot be replaced', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-runtime-binding-'));
  const selected = new Map([['session-team', ['owner-a', 'personal-owner']]]);
  let first;
  let second;
  try {
    first = await boot(root, selected, { autoBindPersonalSessions: false });
    registerFixtures(first, { executed: 0 });
    assert.equal((await execute(first, 'session-team')).isError, true);
    const actor = { principalId: 'owner-a', organizationId: 'personal-owner', requestId: 'bind-request', resolvedBy: 'test-session-identity' };
    const bound = await first.workdshAccess.bindSession(actor, { sessionId: 'session-team', workspaceId: 'workspace-a' });
    await assert.rejects(
      first.workdshAccess.bindSession(
        { principalId: 'member-a', organizationId: 'personal-owner', requestId: 'replace-request', resolvedBy: 'test-session-identity' },
        { sessionId: 'session-team', workspaceId: 'workspace-a' },
      ),
      { code: 'access/session-owner-conflict' },
    );
    await first.fiber.dispose();
    first = undefined;

    second = await boot(root, selected, { autoBindPersonalSessions: false });
    registerFixtures(second, { executed: 0 });
    assert.equal(second.workdshAccess.sessionOwner('session-team').revision, bound.revision);
    const runtime = await second.workdshAccess.resolveRuntime(
      { ...actor, requestId: 'resume-request', sessionId: 'session-team' },
      { sessionId: 'session-team', workspaceId: 'workspace-a', runtimeId: 'resumed-runtime', isolation: 'process' },
    );
    assert.equal(runtime.authorizationRevision.length, 64);
    assert.equal(runtime.runtimeId, 'resumed-runtime');
    assert.equal(runtime.workspaceId, 'workspace-a');
  } finally {
    if (first) await first.fiber.dispose();
    if (second) await second.fiber.dispose();
    await rm(root, { recursive: true, force: true });
  }
});

test('trusted Session ingress binds before create, preserves retry ownership and authorizes resume', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-session-ingress-'));
  const selected = new Map();
  const createCalls = [];
  const resumeCalls = [];
  const failCreate = new Set(['session-retry']);
  const existingSessions = new Set(['session-orphan']);
  let ctx;
  try {
    ctx = await boot(root, selected, { autoBindPersonalSessions: false });
    ctx.provide('sessionController', {
      async inspect(sessionId) {
        if (existingSessions.has(String(sessionId))) return { header: { id: sessionId }, events: [] };
        throw new ApiSessionNotFound('fixture Session not found');
      },
      async create(request) {
        const sessionId = String(request.sessionId);
        assert.equal(ctx.workdshAccess.sessionOwner(sessionId)?.ownerPrincipalId, 'owner-a', 'owner is durable before official create');
        createCalls.push(sessionId);
        if (failCreate.delete(sessionId)) throw Object.assign(new Error('fixture create failed'), { code: 'session/create-fixture' });
        existingSessions.add(sessionId);
        return { sessionId: request.sessionId };
      },
      async resolveAgent(sessionId) {
        resumeCalls.push(String(sessionId));
        return { agent: { id: sessionId } };
      },
    });
    await ctx.plugin(SessionAccessBridge, { runtimeId: 'session-ingress-test' });

    await assert.rejects(
      ctx.workdshSessionAccess.create({ sessionId: 'session-orphan', cwd: '/tmp' }),
      { code: 'access/unbound-session-adoption' },
    );
    assert.equal(ctx.workdshAccess.sessionOwner('session-orphan'), undefined);

    await assert.rejects(ctx.workdshSessionAccess.create({ sessionId: 'session-retry', cwd: '/tmp' }), /fixture create failed/);
    assert.equal(ctx.workdshAccess.sessionOwner('session-retry')?.ownerPrincipalId, 'owner-a');

    selected.set('session-retry', ['member-a', 'personal-owner']);
    await assert.rejects(
      ctx.workdshSessionAccess.create({ sessionId: 'session-retry', cwd: '/tmp' }),
      { code: 'access/session-owner-conflict' },
    );
    assert.deepEqual(createCalls, ['session-retry'], 'an ownership conflict never reaches the official controller');

    selected.set('session-retry', ['owner-a', 'personal-owner']);
    assert.equal((await ctx.workdshSessionAccess.create({ sessionId: 'session-retry', cwd: '/tmp' })).sessionId, 'session-retry');
    const generated = await ctx.workdshSessionAccess.create({ cwd: '/tmp' });
    assert.match(String(generated.sessionId), /^session-/);
    assert.equal(ctx.workdshAccess.sessionOwner(String(generated.sessionId))?.ownerPrincipalId, 'owner-a');

    selected.set('session-retry', ['member-a', 'personal-owner']);
    await assert.rejects(ctx.workdshSessionAccess.resolveAgent('session-retry'), { code: 'access/not-granted' });
    assert.deepEqual(resumeCalls, [], 'unauthorized resume never reaches the official controller');
    await ctx.workdshAccess.putGrant(
      { principalId: 'owner-a', organizationId: 'personal-owner', requestId: 'session-grant', resolvedBy: 'test-session-identity' },
      { organizationId: 'personal-owner', ownerPrincipalId: 'owner-a', scope: 'personal' },
      {
        id: 'session-retry-use-member-a', organizationId: 'personal-owner', subjectPrincipalId: 'member-a',
        resource: { domain: 'session', id: 'session-retry' }, actions: ['use'], revision: 'session-retry-grant-1',
      },
    );
    assert.ok('agent' in await ctx.workdshSessionAccess.resolveAgent('session-retry'));
    assert.deepEqual(resumeCalls, ['session-retry']);

    await ctx.workdshToolAccess.flush();
    const events = ctx.workdshAudit.snapshot();
    assert.ok(events.some((event) => event.action === 'session.create' && event.outcome === 'failed' && event.code === 'session/create-fixture'));
    assert.ok(events.some((event) => event.action === 'session.create' && event.outcome === 'denied' && event.code === 'access/unbound-session-adoption'));
    assert.ok(events.some((event) => event.action === 'session.create' && event.outcome === 'succeeded'));
    assert.ok(events.some((event) => event.action === 'session.resume' && event.outcome === 'succeeded'));
  } finally {
    if (ctx) await ctx.fiber.dispose();
    await rm(root, { recursive: true, force: true });
  }
});
