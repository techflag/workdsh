import type { SkillRevisionProvider } from './skill-revisions.js';

/** Local Host skill management contract. Not an enterprise authorization API. */
export type ManagedSkillState = 'enabled' | 'disabled' | 'invalid' | 'readonly';

export interface SkillDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export interface SkillValidationResult {
  readonly valid: boolean;
  readonly name?: string;
  readonly description?: string;
  readonly diagnostics: readonly SkillDiagnostic[];
}

export interface ManagedSkillSummary {
  readonly name: string;
  readonly description: string;
  readonly whenToUse?: string;
  readonly modelInvocable: boolean;
  readonly state: ManagedSkillState;
  readonly manageable: boolean;
  readonly diagnostics?: readonly SkillDiagnostic[];
  /** Present only when the local catalog owns richer metadata for this skill. */
  readonly title?: string;
  readonly localizedDescription?: string;
  readonly categories?: readonly string[];
  readonly iconUrl?: string;
}

export interface ManagedSkillDetail extends ManagedSkillSummary {
  readonly document?: string;
  readonly revision?: string;
  readonly directoryPath?: string;
  readonly resources: readonly string[];
}

export interface SkillWriteRequest {
  readonly name: string;
  readonly document: string;
  readonly expectedRevision: string;
}

export interface SkillMutationReceipt {
  readonly name: string;
  readonly state: ManagedSkillState | 'uninstalled';
  readonly path: string;
}

export interface SkillDependency {
  readonly kind: string;
  readonly id: string;
  readonly label: string;
  readonly blocking: boolean;
}

export interface SkillDependencyImpact {
  readonly name: string;
  readonly revision: string;
  readonly dependents: readonly SkillDependency[];
}

export interface SkillDraft {
  readonly id: string;
  readonly name: string;
  readonly scope: SkillInstallScope;
  readonly document: string;
  readonly revision: string;
  readonly updatedAt: string;
  readonly validation: SkillValidationResult;
}

export interface SkillDraftWriteRequest {
  readonly id?: string;
  readonly expectedRevision?: string;
  readonly name: string;
  readonly scope?: SkillInstallScope;
  readonly document: string;
}

export type SkillBatchAction = 'enable' | 'disable' | 'uninstall';
export interface SkillBatchRequest { readonly names: readonly string[]; readonly action: SkillBatchAction; }
export interface SkillBatchItemResult {
  readonly name: string;
  readonly ok: boolean;
  readonly receipt?: SkillMutationReceipt;
  readonly error?: string;
}
export interface SkillBatchResult { readonly action: SkillBatchAction; readonly results: readonly SkillBatchItemResult[]; }

export interface ManagedSkillResource {
  readonly path: string;
  readonly document: string;
  readonly revision: string;
}

export interface SkillResourceWriteRequest {
  readonly name: string;
  readonly path: string;
  readonly document: string;
  readonly expectedRevision?: string;
}

export interface TrashedSkillSummary {
  readonly id: string;
  readonly name: string;
  readonly removedAt: string;
  readonly previousState: 'enabled' | 'disabled';
}

/**
 * One entry of the WorkDSH-owned local skill catalog. Metadata and an inert
 * payload copy live under the shared Agents home; installation goes through the
 * existing import path, so the official provider stays the execution owner.
 */
export interface SkillCatalogEntry {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly categories: readonly string[];
  readonly version?: string;
  readonly examples?: readonly string[];
  readonly iconUrl?: string;
  readonly installed: boolean;
  readonly installable: boolean;
  readonly installLimits?: readonly string[];
}

/** `missing`/`invalid` are reported instead of a fabricated empty catalog. */
export type SkillCatalogStatus = 'ready' | 'missing' | 'invalid';

export interface SkillCatalogSummary {
  readonly status: SkillCatalogStatus;
  readonly entries: readonly SkillCatalogEntry[];
  readonly categories: readonly string[];
  readonly generatedAt?: string;
  readonly diagnostics?: readonly SkillDiagnostic[];
}

export interface SkillCatalogIcon {
  readonly bytes: Uint8Array;
  readonly contentType: string;
  readonly revision: string;
}

export type SkillInstallScope = 'shared-agents' | 'profile';
export interface SkillImportInspection {
  readonly name: string;
  readonly description: string;
  readonly files: readonly string[];
  readonly totalBytes: number;
}
export interface SkillImportRequest { readonly source: string; readonly scope?: SkillInstallScope; }
export interface StagedSkillImport {
  readonly id: string;
  readonly fileName: string;
  readonly inspection: SkillImportInspection;
  readonly expiresAt: string;
}

export type SkillManagementEndpoint = 'list' | 'detail' | 'update' | 'resource' | 'write-resource' | 'set-enabled' | 'dependency-impact' | 'uninstall' | 'batch' | 'trash-list' | 'restore' | 'commit-import' | 'discard-import' | 'catalog' | 'install-catalog' | 'normalize-skillhub';
export interface SkillManagementFailure { readonly code: string; readonly message: string; }
export type SkillManagementResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: SkillManagementFailure };

export type SkillDependencyInspector = (name: string) => Promise<readonly SkillDependency[]> | readonly SkillDependency[];

/**
 * Provided as ctx.workdshSkills; consumers inject the service, not its implementation.
 * Extends the cross-domain revision capability so an expert (or other consumer) can
 * freeze an explicit Skill dependency into an immutable snapshot without walking
 * another plugin's private directories.
 */
export interface SkillManagementService extends SkillRevisionProvider {
  readonly contractVersion: 1;
  list(signal?: AbortSignal): Promise<readonly ManagedSkillSummary[]>;
  detail(name: string, signal?: AbortSignal): Promise<ManagedSkillDetail | undefined>;
  readResource(name: string, path: string): Promise<ManagedSkillResource>;
  update(request: SkillWriteRequest): Promise<ManagedSkillDetail>;
  normalizeSkillHub(name: string): Promise<ManagedSkillDetail>;
  writeResource(request: SkillResourceWriteRequest): Promise<ManagedSkillResource>;
  validateDocument(document: string, expectedName?: string): SkillValidationResult;
  saveDraft(request: SkillDraftWriteRequest): Promise<SkillDraft>;
  getDraft(id: string): Promise<SkillDraft>;
  publishDraft(id: string, expectedRevision: string): Promise<SkillMutationReceipt>;
  inspectImport(source: string, signal?: AbortSignal): Promise<SkillImportInspection>;
  installImport(request: SkillImportRequest, signal?: AbortSignal): Promise<SkillMutationReceipt>;
  setEnabled(name: string, enabled: boolean): Promise<SkillMutationReceipt>;
  /** The consumer owns this registration and must release it with its own effect. */
  registerDependencyInspector(inspector: SkillDependencyInspector): () => void;
  dependencyImpact(name: string): Promise<SkillDependencyImpact>;
  uninstall(name: string, expectedImpactRevision: string): Promise<SkillMutationReceipt>;
  batch(request: SkillBatchRequest): Promise<SkillBatchResult>;
  listTrash(): Promise<readonly TrashedSkillSummary[]>;
  restore(id: string): Promise<SkillMutationReceipt>;
  /** Local catalog metadata joined with the current discovery state. */
  catalog(signal?: AbortSignal): Promise<SkillCatalogSummary>;
  /** Installs one catalog payload through the shared import verification path. */
  installFromCatalog(name: string, scope?: SkillInstallScope, signal?: AbortSignal): Promise<SkillMutationReceipt>;
  readCatalogIcon(name: string): Promise<SkillCatalogIcon | undefined>;
  readonly imports: {
    stage(fileName: string, body: ReadableStream<Uint8Array> | null, signal: AbortSignal): Promise<StagedSkillImport>;
    commit(id: string, scope?: SkillInstallScope, signal?: AbortSignal): Promise<SkillMutationReceipt>;
    discard(id: string): Promise<void>;
  };
}
