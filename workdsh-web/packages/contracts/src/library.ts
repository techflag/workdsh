import type { ActorContext, ResourceOwner } from './governance.js';

export type LibraryAssetKind = 'markdown' | 'text' | 'pdf' | 'docx' | 'pptx' | 'html';
export type LibraryConversionStatus = 'ready' | 'pending' | 'failed';
export type LibraryAssetStatus = 'active' | 'disabled';

export interface LibrarySpace {
  readonly id: string;
  readonly title: string;
  readonly owner: ResourceOwner;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LibraryNode {
  readonly id: string;
  readonly spaceId: string;
  readonly parentId?: string;
  readonly kind: 'folder' | 'asset';
  readonly name: string;
  readonly assetId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LibraryAsset {
  readonly id: string;
  readonly spaceId: string;
  readonly nodeId: string;
  readonly kind: LibraryAssetKind;
  readonly mediaType: string;
  readonly byteLength: number;
  readonly owner: ResourceOwner;
  readonly status: LibraryAssetStatus;
  readonly currentRevisionId: string;
  readonly source: 'upload' | 'task' | 'created';
  readonly sourceTaskId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LibraryRevision {
  readonly id: string;
  readonly assetId: string;
  readonly number: number;
  readonly originalSha256: string;
  readonly contentSha256: string;
  readonly originalByteLength: number;
  readonly originalRelativePath: string;
  readonly contentRelativePath: string;
  readonly conversionStatus: LibraryConversionStatus;
  readonly conversionWarnings: readonly string[];
  readonly createdBy: string;
  readonly createdAt: string;
}

export interface LibraryTreeEntry extends LibraryNode {
  readonly asset?: LibraryAsset;
  readonly revision?: LibraryRevision;
}

export interface LibraryImportInput {
  readonly parentId?: string;
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly mediaType?: string;
  readonly source?: LibraryAsset['source'];
  readonly sourceTaskId?: string;
  readonly operationId: string;
}

export interface LibrarySearchHit {
  readonly assetId: string;
  readonly revisionId: string;
  readonly nodeId: string;
  readonly name: string;
  readonly kind: LibraryAssetKind;
  readonly source: LibraryAsset['source'];
  readonly updatedAt: string;
  readonly folderPath: string;
  readonly location?: string;
  readonly excerpt: string;
  readonly score: number;
}

export interface LibrarySearchFilters {
  readonly kinds?: readonly LibraryAssetKind[];
  readonly sources?: readonly LibraryAsset['source'][];
  readonly updatedAfter?: string;
  readonly updatedBefore?: string;
}

export interface LibraryTaskReference {
  readonly sessionId: string;
  readonly nodeId: string;
  readonly assetId: string;
  readonly revisionId: string;
  /** Display metadata is carried with the reference so the composer can render it without walking the library tree. */
  readonly name: string;
  readonly kind: LibraryAssetKind;
  readonly selectedAt: string;
}

export interface LibraryDraft {
  readonly id: string;
  readonly assetId: string;
  readonly baseRevisionId: string;
  readonly revision: string;
  readonly content: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LibraryOriginalPreviewInput {
  readonly name: string;
  readonly kind: Extract<LibraryAssetKind, 'docx' | 'pptx'>;
  readonly bytes: Uint8Array;
}

/** Optional Client capability: Office can contribute original-file viewers without Library importing Office internals. */
export interface LibraryOriginalPreviewRegistry {
  register(kinds: readonly LibraryOriginalPreviewInput['kind'][], mount: (target: HTMLElement, input: LibraryOriginalPreviewInput) => void | (() => void) | Promise<void | (() => void)>): () => void;
  canOpen(kind: LibraryAssetKind): boolean;
  mount(target: HTMLElement, input: LibraryOriginalPreviewInput): Promise<() => void>;
  subscribe(listener: () => void): () => void;
  getRevision(): number;
}

export interface LibraryService {
  space(actor: ActorContext, signal?: AbortSignal): Promise<LibrarySpace>;
  list(actor: ActorContext, parentId?: string, signal?: AbortSignal): Promise<readonly LibraryTreeEntry[]>;
  createFolder(actor: ActorContext, name: string, parentId?: string, signal?: AbortSignal): Promise<LibraryNode>;
  importAsset(actor: ActorContext, input: LibraryImportInput, signal?: AbortSignal): Promise<LibraryTreeEntry>;
  readText(actor: ActorContext, assetId: string, revisionId?: string, signal?: AbortSignal): Promise<string>;
  readOriginal(actor: ActorContext, assetId: string, revisionId?: string, signal?: AbortSignal): Promise<Uint8Array>;
  search(actor: ActorContext, query: string, filters?: LibrarySearchFilters, signal?: AbortSignal): Promise<readonly LibrarySearchHit[]>;
  setTaskSelection(actor: ActorContext, sessionId: string, nodeIds: readonly string[], signal?: AbortSignal): Promise<readonly LibraryTaskReference[]>;
  taskSelection(actor: ActorContext, sessionId: string, signal?: AbortSignal): Promise<readonly LibraryTaskReference[]>;
  createDraft(actor: ActorContext, assetId: string, baseRevisionId?: string, signal?: AbortSignal): Promise<LibraryDraft>;
  updateDraft(actor: ActorContext, draftId: string, content: string, expectedRevision: string, signal?: AbortSignal): Promise<LibraryDraft>;
  publishDraft(actor: ActorContext, draftId: string, expectedRevision: string, signal?: AbortSignal): Promise<LibraryTreeEntry>;
  setAssetStatus(actor: ActorContext, assetId: string, status: LibraryAssetStatus, signal?: AbortSignal): Promise<LibraryTreeEntry>;
  rename(actor: ActorContext, nodeId: string, name: string, signal?: AbortSignal): Promise<LibraryNode>;
  move(actor: ActorContext, nodeId: string, parentId: string | undefined, signal?: AbortSignal): Promise<LibraryNode>;
  remove(actor: ActorContext, nodeId: string, signal?: AbortSignal): Promise<void>;
}

/** Payload of the workdsh-library native input-trigger reference; URI-encoded JSON in ReferenceInsert.ref. */
export interface LibraryComposerReference {
  readonly assetId: string;
  readonly revisionId: string;
  readonly nodeId: string;
  readonly name: string;
  readonly kind: string;
  readonly sessionId?: string;
}
