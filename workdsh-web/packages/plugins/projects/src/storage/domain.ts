import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain';
import { z } from 'zod';
const anyRecord = z.record(z.string(), z.unknown());
export const projectStateSchema = z.object({ schemaVersion: z.literal(1), projects: anyRecord, configs: anyRecord, workItems: anyRecord, assets: anyRecord, tasks: anyRecord, activity: anyRecord });
export type ProjectState = z.infer<typeof projectStateSchema>;
export const projectDomainSpec = defineDomain({ name: 'workdsh_projects', version: 1, layout: 'per-record', tables: { states: domainTable<string, ProjectState>(projectStateSchema) } });
export const projectStateKey = (organizationId: string, principalId: string) => `${organizationId}_${principalId}`.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 240);
