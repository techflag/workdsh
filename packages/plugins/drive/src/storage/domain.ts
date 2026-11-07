import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain';
import { z } from 'zod';

const id = z.string().min(1).max(256);
/** 全文索引单条上限（字符）：与写入侧 drive-manager 的降采样上限保持同一真源。 */
export const MAX_INDEX_CHARS = 128 * 1024;
const indexText = z.string().max(MAX_INDEX_CHARS);
const iso = z.string().datetime();
const owner = z.object({
  organizationId: id,
  ownerPrincipalId: id,
  scope: z.literal('personal'),
});
const space = z.object({ id, title: id, owner, createdAt: iso, updatedAt: iso });
const node = z.object({
  id, spaceId: id, parentId: id.optional(), kind: z.enum(['folder', 'file']), name: id,
  fileId: id.optional(), status: z.enum(['active', 'archived']).default('active'), archivedAt: iso.optional(),
  createdAt: iso, updatedAt: iso,
});
const file = z.object({
  id, spaceId: id, nodeId: id, kind: z.enum(['document', 'image', 'video', 'audio', 'archive', 'other']),
  mediaType: id, byteLength: z.number().int().nonnegative(), owner, currentRevisionId: id,
  status: z.enum(['active', 'archived']).default('active'),
  source: z.enum(['ai-generated', 'user-upload', 'tool-output']),
  sessionId: id.optional(), attachmentId: id, createdAt: iso, updatedAt: iso,
});
const revision = z.object({
  id, fileId: id, number: z.number().int().positive(), sha256: id, byteLength: z.number().int().nonnegative(),
  attachmentId: id, createdBy: id, createdAt: iso,
});
const receipt = z.object({ operationId: id, fileId: id, revisionId: id, nodeId: id, inputSha256: id.optional() });

export const driveStateSchema = z.object({
  schemaVersion: z.literal(1),
  space,
  nodes: z.record(id, node),
  files: z.record(id, file),
  revisions: z.record(id, revision),
  receipts: z.record(id, receipt).default({}),
  /** 全文内容索引：revisionId → 降采样 UTF-8 文本（仅供内容搜索，非权威数据）。 */
  textIndex: z.record(id, indexText).default({}),
});

export type DriveState = z.infer<typeof driveStateSchema>;

export const driveDomainSpec = defineDomain({
  name: 'workdsh_drive',
  version: 1,
  layout: 'per-record',
  tables: { states: domainTable<string, DriveState>(driveStateSchema) },
});

export const stateKey = (organizationId: string, principalId: string): string =>
  `${organizationId}_${principalId}`.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 240);
