import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain';
import { z } from 'zod';

const id = z.string().min(1).max(256);
const iso = z.string().datetime();
const owner = z.object({
  organizationId: id,
  ownerPrincipalId: id,
  scope: z.literal('personal'),
});
const space = z.object({ id, title: id, owner, createdAt: iso, updatedAt: iso });
const node = z.object({
  id, spaceId: id, parentId: id.optional(), kind: z.enum(['folder', 'asset']), name: id,
  assetId: id.optional(), createdAt: iso, updatedAt: iso,
});
const asset = z.object({
  id, spaceId: id, nodeId: id, kind: z.enum(['markdown', 'text', 'pdf', 'docx', 'pptx', 'html']),
  mediaType: id, byteLength: z.number().int().nonnegative(), owner, currentRevisionId: id,
  status: z.enum(['active', 'disabled']).default('active'),
  source: z.enum(['upload', 'task', 'created']), sourceTaskId: id.optional(), createdAt: iso, updatedAt: iso,
});
const revision = z.object({
  id, assetId: id, number: z.number().int().positive(), originalSha256: id, contentSha256: id,
  originalByteLength: z.number().int().nonnegative().default(0),
  originalRelativePath: id, contentRelativePath: id,
  conversionStatus: z.enum(['ready', 'pending', 'failed']), conversionWarnings: z.array(z.string()),
  createdBy: id, createdAt: iso,
});
const receipt = z.object({ operationId: id, assetId: id, revisionId: id, nodeId: id, inputSha256: id.optional() });
const reference = z.object({ sessionId: id, nodeId: id, assetId: id, revisionId: id, selectedAt: iso });
const draft = z.object({ id, assetId: id, baseRevisionId: id, revision: id, content: z.string().max(8 * 1024 * 1024), createdBy: id, createdAt: iso, updatedAt: iso });

export const libraryStateSchema = z.object({
  schemaVersion: z.literal(1),
  space,
  nodes: z.record(id, node),
  assets: z.record(id, asset),
  revisions: z.record(id, revision),
  receipts: z.record(id, receipt),
  references: z.record(id, z.array(reference)).default({}),
  drafts: z.record(id, draft).default({}),
});

export type LibraryState = z.infer<typeof libraryStateSchema>;

export const libraryDomainSpec = defineDomain({
  name: 'workdsh_library',
  version: 1,
  layout: 'per-record',
  tables: { states: domainTable<string, LibraryState>(libraryStateSchema) },
});

export const stateKey = (organizationId: string, principalId: string): string =>
  `${organizationId}_${principalId}`.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 240);
