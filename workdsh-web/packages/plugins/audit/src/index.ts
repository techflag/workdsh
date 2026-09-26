import { Context, Service } from '@deepseek-ai/cordis';
import { defineDomain, domainTable, type KvTable } from '@deepseek-ai/dsh-storage-domain';
import { z } from 'zod';
import type { AuditEvent, AuditService } from 'workdsh-contracts';
import { GovernanceContractError } from './governance.js';

const bounded = z.string().min(1).max(256).refine((value) => !/[\u0000-\u001f]/.test(value));
const resourceRefSchema = z.object({ domain: bounded, id: bounded, revision: bounded.optional() });
const auditEventSchema: z.ZodType<AuditEvent> = z.object({
  id: bounded,
  occurredAt: z.iso.datetime(),
  requestId: bounded,
  principalId: bounded,
  organizationId: bounded,
  action: bounded,
  target: resourceRefSchema.optional(),
  outcome: z.enum(['succeeded', 'denied', 'failed', 'cancelled', 'unknown']),
  code: bounded,
  sessionId: bounded.optional(),
  runId: bounded.optional(),
  references: z.record(z.string(), z.string()).optional(),
});

export const auditDomainSpec = defineDomain({
  name: 'workdsh_audit',
  version: 1,
  layout: 'per-record',
  tables: { events: domainTable<string, AuditEvent>(auditEventSchema) },
});

declare module '@deepseek-ai/cordis' {
  interface Context {
    workdshAudit: AuditService;
  }
}

const sensitiveReference = /(credential|password|prompt|secret|token)/i;

function validateEvent(event: AuditEvent): void {
  const parsed = auditEventSchema.safeParse(event);
  if (!parsed.success) {
    throw new GovernanceContractError('audit/invalid-event', 'Audit event does not satisfy the durable schema.');
  }
  for (const [key, value] of Object.entries(event.references ?? {})) {
    if (sensitiveReference.test(key)) {
      throw new GovernanceContractError('audit/sensitive-reference', `Audit reference '${key}' is forbidden.`);
    }
    if (key.length > 128 || value.length > 1024 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
      throw new GovernanceContractError('audit/invalid-reference', `Audit reference '${key}' is invalid.`);
    }
  }
}

export class AuditJournal extends Service implements AuditService {
  static inject = ['storageDomain'];
  private events?: KvTable<string, AuditEvent>;
  private appendTail: Promise<void> = Promise.resolve();

  constructor(ctx: Context) {
    super(ctx, 'workdshAudit');
  }

  async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(auditDomainSpec);
    this.ctx.effect(() => () => domain.close(), 'workdshAudit.domainClose');
    this.events = domain.table('events');
    this.ctx.effect(() => async () => this.flush(), 'workdshAudit.flush');
  }

  append(event: AuditEvent, signal?: AbortSignal): Promise<void> {
    const result = this.appendTail.then(async () => {
      signal?.throwIfAborted();
      validateEvent(event);
      const events = this.requireEvents();
      if (events.get(event.id)) throw new GovernanceContractError('audit/duplicate-event', `Audit event '${event.id}' already exists.`);
      await events.put(event.id, Object.freeze({ ...event, references: event.references && Object.freeze({ ...event.references }) }));
    });
    this.appendTail = result.then(() => undefined, () => undefined);
    return result;
  }

  snapshot(): readonly AuditEvent[] {
    return Object.freeze([...this.requireEvents().entries()]
      .map(([, event]) => event)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id)));
  }

  async flush(): Promise<void> {
    await this.appendTail;
  }

  private requireEvents(): KvTable<string, AuditEvent> {
    if (!this.events) throw new GovernanceContractError('audit/not-ready', 'Audit journal is not ready.');
    return this.events;
  }
}

export default AuditJournal;
