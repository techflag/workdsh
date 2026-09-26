import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain';
import { z } from 'zod';
import type {
  Expert,
  ExpertDraft,
  ExpertPreference,
  ExpertRevision,
  ExecutionBinding,
  Operation,
  SkillRevisionRef,
} from 'workdsh-contracts';
import { expertDefinitionSchema } from '../domain/definition.js';

/**
 * Storage layout for the `workdsh_experts` domain (G06).
 *
 * `per-record` layout keeps each object independently addressable; authoritative
 * tables reject invalid records on read (default `invalidRecords`) rather than
 * silently skipping, so a corrupted expert/revision/binding fails loud instead of
 * disappearing. All writes go through `KvTable.update` for compare-and-swap.
 */

// Shared schema fragments, re-exported for the sibling team-run domain so both
// expert storage domains validate owner/revision references identically.
export const iso = z.string().min(1);
export const bounded = z.string().min(1).max(512);

export const resourceOwnerSchema = z.object({
  organizationId: bounded,
  ownerPrincipalId: bounded,
  scope: z.enum(['personal', 'organization', 'project']),
  projectId: bounded.optional(),
});

export const revisionRefSchema = z.object({ expertId: bounded, revisionId: bounded });

const skillRevisionRefSchema: z.ZodType<SkillRevisionRef> = z.object({
  skillId: bounded,
  revisionId: bounded,
  name: bounded,
  contentDigest: bounded,
});

const domainIssueSchema = z.object({
  code: z.string().min(1),
  path: z.string().optional(),
  message: z.string(),
  dependencyRef: z.string().optional(),
});

const expertSchema: z.ZodType<Expert> = z.object({
  id: bounded,
  owner: resourceOwnerSchema,
  origin: z.enum(['default', 'personal', 'organization']),
  availability: z.enum(['enabled', 'disabled', 'archived']),
  revision: bounded,
  draftRevision: bounded,
  publishedRevisionRef: revisionRefSchema.optional(),
  createdAt: iso,
  updatedAt: iso,
  teamParentId: bounded.optional(),
});

const draftSchema: z.ZodType<ExpertDraft> = z.object({
  expertId: bounded,
  revision: bounded,
  definition: expertDefinitionSchema,
  validationIssues: z.array(domainIssueSchema),
});

const revisionSchema: z.ZodType<ExpertRevision> = z.object({
  expertId: bounded,
  revisionId: bounded,
  definition: expertDefinitionSchema,
  definitionDigest: bounded,
  dependencyLock: z.array(skillRevisionRefSchema),
  dependencyLockDigest: bounded,
  teamMembers: z.record(z.string(), revisionRefSchema).optional(),
  presetRevisionRef: bounded,
  compilerVersion: bounded,
  compositionDigest: bounded,
  publishedAt: iso,
  publishedBy: bounded,
});

const bindingSchema: z.ZodType<ExecutionBinding> = z.object({
  sessionId: bounded,
  expertRevisionRef: revisionRefSchema,
  presetRevisionRef: bounded,
  compositionDigest: bounded,
  skillRevisionRefs: z.array(skillRevisionRefSchema),
  owner: resourceOwnerSchema,
  workspaceRef: bounded.optional(),
  createdFrom: bounded.optional(),
  // Read old bindings without rewriting user data. New Team members have no such row.
  delegation: z.object({
    parentSessionId: bounded,
    parentCompositionDigest: bounded,
    admission: z.enum(['reserved', 'claimed']),
  }).optional(),
  creationOperationId: bounded,
  createdAt: iso,
});

const preferenceSchema: z.ZodType<ExpertPreference> = z.object({
  principalId: bounded,
  expertId: bounded,
  pinned: z.boolean(),
  lastUsedAt: iso.optional(),
  revision: bounded,
});

const operationSchema: z.ZodType<Operation> = z.object({
  operationId: bounded,
  actorRef: bounded,
  action: z.string().min(1),
  payloadDigest: bounded,
  phase: z.enum(['prepared', 'applying', 'committed', 'failed', 'reconciling', 'cancelled']),
  resultRef: bounded.optional(),
  resultDetail: z.string().optional(),
  error: z.string().optional(),
  auditDelivery: z.enum(['delivered', 'pending', 'failed']),
  createdAt: iso,
  updatedAt: iso,
});

export const expertsDomainSpec = defineDomain({
  name: 'workdsh_experts',
  version: 1,
  layout: 'per-record',
  tables: {
    experts: domainTable<string, Expert>(expertSchema),
    drafts: domainTable<string, ExpertDraft>(draftSchema),
    revisions: domainTable<string, ExpertRevision>(revisionSchema),
    bindings: domainTable<string, ExecutionBinding>(bindingSchema),
    preferences: domainTable<string, ExpertPreference>(preferenceSchema),
    operations: domainTable<string, Operation>(operationSchema),
  },
});

/**
 * Coerce one key component to the storage domain's per-record path-safe charset.
 * A `per-record` unit addresses each row by a filename, so the backend rejects any
 * key outside `/^[a-zA-Z0-9_-]+$/`. Expert ids (slug), revision ids (`rev-<hex>`),
 * session ids (`session-<hex>`) and UUID operation ids are already safe, so this is
 * a no-op for real traffic; it only hardens caller-supplied values (operationId,
 * principalId) that would otherwise fail the write.
 */
const keyPart = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, '-');

/**
 * Composite key helpers so per-record keys stay path-safe, stable and sortable.
 * A NUL (`\u0000`) separator is NOT path-safe and would be rejected by the backend,
 * so composite keys join sanitized parts with `_`, which never occurs inside a slug
 * expert id or a `rev-`/hex revision id. Keys are only ever reconstructed for lookup
 * (never parsed back), so a consistent join is sufficient.
 */
export const keys = {
  expert: (expertId: string) => keyPart(expertId),
  draft: (expertId: string) => keyPart(expertId),
  revision: (expertId: string, revisionId: string) => `${keyPart(expertId)}_${keyPart(revisionId)}`,
  preference: (principalId: string, expertId: string) => `${keyPart(principalId)}_${keyPart(expertId)}`,
  binding: (sessionId: string) => keyPart(sessionId),
  operation: (operationId: string) => keyPart(operationId),
};
