import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Context, Service } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import * as McpClient from '@deepseek-ai/dsh-mcp-client';
import type { KvTable } from '@deepseek-ai/dsh-storage-domain';
import type { ConnectorConfigView, ConnectorInput, ConnectorManagementService, ConnectorState, ConnectorSummary } from './shared.js';
import { connectorDefinitionSchema, connectorSelectionsDomainSpec, connectorsDomainSpec, type ConnectorDefinition, type ConnectorSelection } from './storage.js';

declare module '@deepseek-ai/cordis' { interface Context { workdshConnectors: ConnectorManagementService; } }

const serverPath = fileURLToPath(new URL('./example-server.mjs', import.meta.url));
type ChildFiber = { dispose(): Promise<void> };
type Runtime = { child?: ChildFiber; state: ConnectorState; diagnostic?: string };
type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord | undefined => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : undefined;
const idPart = (value: string) => value.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
const refFor = (value: string) => credentialRef(value) as unknown as Parameters<Context['credentials']['resolve']>[0];

/** Persist connector instances here; delegate protocol, transport, discovery and reconnect to official MCP clients. */
export class ConnectorManager extends Service implements ConnectorManagementService {
  static inject = ['storageDomain', 'tools', 'mcpResources', 'agents', 'credentials'];
  private definitions?: KvTable<string, ConnectorDefinition>;
  private selections?: KvTable<string, ConnectorSelection>;
  private readonly runtimes = new Map<string, Runtime>();
  private readonly restrictions = new WeakMap<Agent, () => void>();
  private serial: Promise<void> = Promise.resolve();

  constructor(ctx: Context) { super(ctx, 'workdshConnectors'); }

  async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(connectorsDomainSpec);
    this.ctx.effect(() => () => domain.close(), 'workdshConnectors.domainClose');
    this.definitions = domain.table('definitions');
    const selectionDomain = await this.ctx.storageDomain.open(connectorSelectionsDomainSpec);
    this.ctx.effect(() => () => selectionDomain.close(), 'workdshConnectors.selectionDomainClose');
    this.selections = selectionDomain.table('selections');
    if (!domain.global.get().seededExample) {
      const now = new Date().toISOString();
      await this.definitions.put('workdsh-example', {
        id: 'workdsh-example', title: 'WorkDSH MCP 示例', description: '可查询业务目录，并通过 MCP 资源与 URI 模板读取示例资料。',
        serverName: 'workdsh-example', transport: 'stdio', command: process.execPath, args: [serverPath], enabled: true,
        createdAt: now, updatedAt: now,
      });
      await domain.global.set({ seededExample: true });
    }
    for (const [, definition] of this.table().entries()) {
      this.runtimes.set(definition.id, { state: definition.enabled ? 'discovering' : 'disabled' });
      if (definition.enabled) void this.start(definition).catch(() => undefined);
    }
    this.ctx.on('agent/created', ({ agent }) => { this.applyRestriction(agent); return undefined; });
    for (const agent of this.ctx.agents.list()) this.applyRestriction(agent);
    this.ctx.effect(() => () => this.dispose(), 'workdshConnectors.runtimeClose');
  }

  async list(signal?: AbortSignal): Promise<readonly ConnectorSummary[]> {
    signal?.throwIfAborted(); const rows: ConnectorSummary[] = [];
    for (const [, definition] of this.table().entries()) rows.push(await this.summary(definition, signal));
    return rows.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
  }

  async config(id: string): Promise<ConnectorConfigView> {
    const row = this.definition(id);
    const credential = row.authorizationCredentialRef
      ? await this.ctx.credentials.describe(refFor(row.authorizationCredentialRef))
      : { configured: false, writable: true };
    return { id, title: row.title, description: row.description, serverName: row.serverName, transport: row.transport,
      ...(row.command ? { command: row.command } : {}), ...(row.args ? { args: row.args } : {}), ...(row.url ? { url: row.url } : {}),
      authorizationConfigured: credential.configured, authorizationWritable: credential.writable, editable: true };
  }

  async create(input: ConnectorInput): Promise<ConnectorSummary> {
    return this.enqueue(async () => {
      const normalized = this.normalize(input); this.assertUniqueServer(normalized.serverName);
      const base = idPart(normalized.serverName) || 'mcp'; let id = base;
      while (this.table().get(id)) id = `${base}-${randomUUID().slice(0, 8)}`;
      const now = new Date().toISOString();
      const authorizationCredentialRef = input.authorizationToken?.trim() ? this.credentialName(normalized.serverName) : undefined;
      if (authorizationCredentialRef) await this.ctx.credentials.set(refFor(authorizationCredentialRef), input.authorizationToken!.trim());
      const definition: ConnectorDefinition = { id, ...normalized, ...(authorizationCredentialRef ? { authorizationCredentialRef } : {}), enabled: true, createdAt: now, updatedAt: now };
      await this.table().put(id, definition); this.runtimes.set(id, { state: 'discovering' });
      await this.start(definition).catch(() => undefined);
      this.reapplyRestrictions();
      return this.summary(definition);
    });
  }

  async update(id: string, input: ConnectorInput): Promise<ConnectorSummary> {
    return this.enqueue(async () => {
      const current = this.definition(id); const normalized = this.normalize(input); this.assertUniqueServer(normalized.serverName, id);
      await this.stop(id, current.enabled);
      const authorizationCredentialRef = current.authorizationCredentialRef ?? (input.authorizationToken?.trim() ? this.credentialName(normalized.serverName) : undefined);
      if (authorizationCredentialRef && input.authorizationToken?.trim()) await this.ctx.credentials.set(refFor(authorizationCredentialRef), input.authorizationToken.trim());
      const next: ConnectorDefinition = { ...current, ...normalized, command: normalized.command, args: normalized.args, url: normalized.url,
        authorizationCredentialRef, updatedAt: new Date().toISOString() };
      await this.table().put(id, next); this.runtimes.set(id, { state: next.enabled ? 'discovering' : 'disabled' });
      if (next.enabled) await this.start(next).catch(() => undefined);
      this.reapplyRestrictions();
      return this.summary(next);
    });
  }

  async remove(id: string): Promise<void> {
    await this.enqueue(async () => {
      this.definition(id); await this.stop(id, false); await this.table().delete(id); this.runtimes.delete(id);
      await this.removeFromSelections(id); this.reapplyRestrictions();
    });
  }

  async setEnabled(id: string, enabled: boolean): Promise<ConnectorSummary> {
    return this.enqueue(async () => {
      const current = this.definition(id); if (enabled === current.enabled) return this.summary(current);
      if (!enabled) { await this.stop(id, false); await this.removeFromSelections(id); }
      const next = { ...current, enabled, updatedAt: new Date().toISOString() };
      await this.table().put(id, next); this.runtimes.set(id, { state: enabled ? 'discovering' : 'disabled' });
      if (enabled) await this.start(next).catch(() => undefined);
      this.reapplyRestrictions();
      return this.summary(next);
    });
  }

  async selection(sessionId: string): Promise<readonly string[]> {
    return [...(this.selectionTable().get(sessionId)?.connectorIds ?? [])];
  }

  async setSelection(sessionId: string, connectorIds: readonly string[]): Promise<readonly string[]> {
    const unique = [...new Set(connectorIds)];
    for (const id of unique) {
      const definition = this.definition(id);
      if (!definition.enabled || this.runtime(id).state !== 'ready') throw new Error('connector/not-ready');
    }
    await this.selectionTable().put(sessionId, { sessionId, connectorIds: unique, updatedAt: new Date().toISOString() });
    const agent = this.ctx.agents.get(sessionId as Agent['id']);
    if (agent) this.applyRestriction(agent);
    return unique;
  }

  async dispose(): Promise<void> { for (const [id] of this.runtimes) await this.stop(id, false); }

  private async start(definition: ConnectorDefinition): Promise<void> {
    const runtime = this.runtime(definition.id); if (runtime.child) return;
    runtime.state = 'discovering'; runtime.diagnostic = undefined;
    const authorization = definition.authorizationCredentialRef
      ? await this.ctx.credentials.resolve(refFor(definition.authorizationCredentialRef))
      : undefined;
    const headers: Record<string, string> = authorization ? { Authorization: authorization.value } : {};
    const transportConfig = definition.transport === 'stdio'
      ? { serverName: definition.serverName, transport: 'stdio' as const, command: definition.command!, args: [...(definition.args ?? [])], env: {} }
      : { serverName: definition.serverName, transport: 'streamable-http' as const, url: definition.url!, headers };
    const fiber = this.ctx.plugin(McpClient, { ...transportConfig, failOnStartupError: true, toolCallTimeoutMs: 10_000, maxInstructionBytes: 8_192,
      reconnect: { enabled: true, initialDelayMs: 250, maxDelayMs: 5_000, maxAttempts: 4 } }) as ChildFiber & PromiseLike<unknown>;
    try { await fiber; runtime.child = fiber; runtime.state = 'ready'; }
    catch (cause) { await fiber.dispose().catch(() => undefined); runtime.state = 'offline'; runtime.diagnostic = cause instanceof Error ? cause.message : 'MCP 服务启动失败。'; throw cause; }
  }

  private async stop(id: string, remainsEnabled: boolean): Promise<void> {
    const runtime = this.runtime(id); const child = runtime.child; runtime.child = undefined;
    if (child) await child.dispose(); runtime.state = remainsEnabled ? 'offline' : 'disabled';
  }

  private async summary(definition: ConnectorDefinition, signal?: AbortSignal): Promise<ConnectorSummary> {
    const health = await this.health(definition, signal);
    return { id: definition.id, title: definition.title, description: definition.description, serverName: definition.serverName,
      transport: definition.transport, scope: 'shared', enabled: definition.enabled, state: health.state, toolNames: health.toolNames,
      resourceCount: health.resourceCount, resourceTemplateCount: health.resourceTemplateCount, lastCheckedAt: new Date().toISOString(),
      ...(health.diagnostic ? { diagnostic: health.diagnostic } : {}) };
  }

  private async health(definition: ConnectorDefinition, signal?: AbortSignal): Promise<{ state: ConnectorState; toolNames: string[]; resourceCount: number; resourceTemplateCount: number; diagnostic?: string }> {
    const runtime = this.runtime(definition.id);
    if (!definition.enabled) return { state: 'disabled', toolNames: [], resourceCount: 0, resourceTemplateCount: 0 };
    const prefix = `mcp__${definition.serverName}__`; const toolNames = this.ctx.tools.schemas().map(tool => tool.name).filter(name => name.startsWith(prefix));
    if (!runtime.child) return { state: runtime.state, toolNames, resourceCount: 0, resourceTemplateCount: 0, ...(runtime.diagnostic ? { diagnostic: runtime.diagnostic } : {}) };
    if (!toolNames.length) return { state: 'discovering', toolNames, resourceCount: 0, resourceTemplateCount: 0 };
    try {
      const agent = { id: `workdsh-connector-health-${randomUUID()}` } as never;
      const call = async (name: string, args: JsonRecord) => {
        const output = await this.ctx.tools.execute({ name, arguments: args, callId: randomUUID() as never, agent, signal: signal ?? new AbortController().signal });
        if (output.isError) throw output.error; return record(output.value) ?? {};
      };
      // Resources are optional MCP capabilities. A server with working tools must not
      // be reported offline only because it does not expose resource endpoints.
      const resources: JsonRecord = this.ctx.tools.get('list_mcp_resources')
        ? await call('list_mcp_resources', { server: definition.serverName }).catch(() => ({})) : {};
      const templates: JsonRecord = this.ctx.tools.get('list_mcp_resource_templates')
        ? await call('list_mcp_resource_templates', { server: definition.serverName }).catch(() => ({})) : {};
      runtime.state = 'ready'; runtime.diagnostic = undefined;
      return { state: 'ready', toolNames, resourceCount: Array.isArray(resources.resources) ? resources.resources.length : 0,
        resourceTemplateCount: Array.isArray(templates.resourceTemplates) ? templates.resourceTemplates.length : 0 };
    } catch (cause) {
      runtime.state = 'offline'; runtime.diagnostic = cause instanceof Error ? cause.message : 'MCP 健康检查失败。';
      return { state: 'offline', toolNames, resourceCount: 0, resourceTemplateCount: 0, diagnostic: runtime.diagnostic };
    }
  }

  private normalize(input: ConnectorInput): Omit<ConnectorDefinition, 'id' | 'enabled' | 'createdAt' | 'updatedAt'> {
    const value = connectorDefinitionSchema.omit({ id: true, enabled: true, createdAt: true, updatedAt: true }).parse({
      title: input.title.trim(), description: input.description?.trim() ?? '', serverName: input.serverName.trim(), transport: input.transport,
      ...(input.transport === 'stdio' ? { command: input.command?.trim(), args: [...(input.args ?? [])] } : { url: input.url?.trim() }),
    });
    if (value.transport === 'stdio' && !value.command) throw new Error('connector/command-required');
    if (value.transport === 'streamable-http' && !value.url) throw new Error('connector/url-required');
    return value;
  }
  private assertUniqueServer(serverName: string, except?: string): void {
    if ([...this.table().entries()].some(([id, row]) => id !== except && row.serverName === serverName)) throw new Error('connector/server-name-conflict');
  }
  private credentialName(serverName: string): string { return `WORKDSH_CONNECTOR_${serverName.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}_AUTHORIZATION`; }
  private definition(id: string): ConnectorDefinition { const row = this.table().get(id); if (!row) throw new Error('connector/not-found'); return row; }
  private runtime(id: string): Runtime { let row = this.runtimes.get(id); if (!row) { row = { state: 'disabled' }; this.runtimes.set(id, row); } return row; }
  private table(): KvTable<string, ConnectorDefinition> { if (!this.definitions) throw new Error('connector/unavailable'); return this.definitions; }
  private selectionTable(): KvTable<string, ConnectorSelection> { if (!this.selections) throw new Error('connector/unavailable'); return this.selections; }
  private applyRestriction(agent: Agent): void {
    this.restrictions.get(agent)?.();
    this.restrictions.delete(agent);
    const selected = new Set(this.selectionTable().get(String(agent.id))?.connectorIds ?? []);
    const denied = [...this.table().entries()]
      .filter(([id]) => !selected.has(id))
      .flatMap(([, definition]) => this.ctx.tools.schemas().map(tool => tool.name).filter(name => name.startsWith(`mcp__${definition.serverName}__`)));
    if (denied.length) this.restrictions.set(agent, agent.ctx.tools.restrict({ deny: denied }));
  }
  private reapplyRestrictions(): void { for (const agent of this.ctx.agents.list()) this.applyRestriction(agent); }
  private async removeFromSelections(connectorId: string): Promise<void> {
    for (const [sessionId, selection] of this.selectionTable().entries()) {
      if (!selection.connectorIds.includes(connectorId)) continue;
      await this.selectionTable().put(sessionId, { ...selection, connectorIds: selection.connectorIds.filter(id => id !== connectorId), updatedAt: new Date().toISOString() });
    }
  }
  private enqueue<T>(run: () => Promise<T>): Promise<T> { const next = this.serial.then(run, run); this.serial = next.then(() => undefined, () => undefined); return next; }
}
