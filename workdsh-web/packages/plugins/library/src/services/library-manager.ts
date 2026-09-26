import { createHash, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import { mkdir, readFile, rename as renameFile, rm, writeFile } from 'node:fs/promises';
import { Context, Service } from '@deepseek-ai/cordis';
import type { KvTable } from '@deepseek-ai/dsh-storage-domain';
import type {
  ActorContext, IdentityService, LibraryAsset, LibraryAssetKind, LibraryAssetStatus, LibraryDraft, LibraryImportInput, LibraryNode, LibraryRevision,
  LibrarySearchFilters, LibrarySearchHit, LibraryService, LibrarySpace, LibraryTaskReference, LibraryTreeEntry, ResourceOwner,
} from 'workdsh-contracts';
import { convertToMarkdown, type ConversionResult } from './converters.js';
import { libraryDomainSpec, stateKey, type LibraryState } from '../storage/domain.js';

declare module '@deepseek-ai/cordis' { interface Context { workdshLibrary: LibraryService; workdshIdentity: IdentityService; } }

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 5 * 1024 * 1024 * 1024;
const MAX_SELECTION_BYTES = 32 * 1024 * 1024;
const sha256 = (value: Uint8Array | string): string => createHash('sha256').update(value).digest('hex');
const now = (): string => new Date().toISOString();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sessionKeys = (sessionId: string): readonly string[] => {
  if (sessionId.startsWith('session-') && UUID.test(sessionId.slice('session-'.length))) return [sessionId, sessionId.slice('session-'.length)];
  if (UUID.test(sessionId)) return [sessionId, `session-${sessionId}`];
  return [sessionId];
};
const cleanName = (value: string): string => {
  const name = value.trim();
  if (!name || name.length > 256 || name === '.' || name === '..' || /[\/\\\u0000-\u001f]/.test(name)) throw new Error('library/invalid-name');
  return name;
};
const extensionKinds: Readonly<Record<string, LibraryAssetKind>> = {
  '.md': 'markdown', '.markdown': 'markdown', '.txt': 'text', '.pdf': 'pdf', '.docx': 'docx', '.pptx': 'pptx', '.html': 'html', '.htm': 'html',
};
const defaultMediaTypes: Readonly<Record<LibraryAssetKind, string>> = {
  markdown: 'text/markdown', text: 'text/plain', pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  html: 'text/html',
};

export interface LibraryManagerOptions { readonly root?: string; readonly maxBytes?: number; readonly maxTotalBytes?: number; readonly maxSelectionBytes?: number; readonly maxSelectionAssets?: number; readonly converter?: typeof convertToMarkdown; }

export class LibraryManager extends Service implements LibraryService {
  static inject = ['storageDomain'];
  private table?: KvTable<string, LibraryState>;
  private serial: Promise<unknown> = Promise.resolve();
  private readonly root: string;
  private readonly maxBytes: number;
  private readonly maxTotalBytes: number;
  private readonly converter: typeof convertToMarkdown;
  private readonly maxSelectionBytes: number;
  private readonly maxSelectionAssets: number;

  constructor(ctx: Context, options: LibraryManagerOptions = {}) {
    super(ctx, 'workdshLibrary');
    this.root = resolve(options.root ?? join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'library'));
    this.maxBytes = options.maxBytes ?? MAX_BYTES;
    this.maxTotalBytes = options.maxTotalBytes ?? MAX_TOTAL_BYTES;
    this.converter = options.converter ?? convertToMarkdown;
    this.maxSelectionBytes = options.maxSelectionBytes ?? MAX_SELECTION_BYTES;
    this.maxSelectionAssets = options.maxSelectionAssets ?? 200;
  }

  async [Service.init](): Promise<void> {
    await mkdir(join(this.root, 'objects'), { recursive: true, mode: 0o700 });
    await mkdir(join(this.root, '.tmp'), { recursive: true, mode: 0o700 });
    const domain = await this.ctx.storageDomain.open(libraryDomainSpec);
    this.table = domain.table('states');
    this.ctx.effect(() => () => domain.close(), 'workdshLibrary.domainClose');
  }

  space(actor: ActorContext, signal?: AbortSignal): Promise<LibrarySpace> {
    return this.enqueue(async () => (await this.ensureState(actor, signal)).space);
  }

  list(actor: ActorContext, parentId?: string, signal?: AbortSignal): Promise<readonly LibraryTreeEntry[]> {
    return this.enqueue(async () => {
      const state = await this.ensureState(actor, signal); this.assertFolder(state, parentId);
      return Object.values(state.nodes).filter((node) => node.parentId === parentId)
        .sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name, 'zh-CN') : a.kind === 'folder' ? -1 : 1)
        .map((node) => this.entry(state, node));
    });
  }

  createFolder(actor: ActorContext, name: string, parentId?: string, signal?: AbortSignal): Promise<LibraryNode> {
    return this.enqueue(async () => {
      const state = await this.ensureState(actor, signal); this.assertFolder(state, parentId); signal?.throwIfAborted();
      this.assertUniqueName(state, parentId, cleanName(name));
      const timestamp = now();
      const node: LibraryNode = { id: randomUUID(), spaceId: state.space.id, ...(parentId ? { parentId } : {}), kind: 'folder', name: cleanName(name), createdAt: timestamp, updatedAt: timestamp };
      await this.states().put(this.key(actor), { ...state, nodes: { ...state.nodes, [node.id]: node }, space: { ...state.space, updatedAt: timestamp } });
      return node;
    });
  }

  importAsset(actor: ActorContext, input: LibraryImportInput, signal?: AbortSignal): Promise<LibraryTreeEntry> {
    return this.enqueue(async () => {
      const state = await this.ensureState(actor, signal);
      const prior = state.receipts[input.operationId];
      const inputSha256 = sha256(`${input.parentId ?? ''}\u0000${input.name}\u0000${sha256(input.bytes)}`);
      if (prior) { if (prior.inputSha256 && prior.inputSha256 !== inputSha256) throw new Error('library/operation-conflict'); return this.entry(state, this.requireNode(state, prior.nodeId)); }
      const name = cleanName(input.name); this.assertFolder(state, input.parentId); this.assertUniqueName(state, input.parentId, name);
      if (!input.operationId.trim() || input.operationId.length > 256) throw new Error('library/invalid-operation');
      if (!input.bytes.byteLength || input.bytes.byteLength > this.maxBytes) throw new Error('library/file-size');
      if (Object.values(state.revisions).reduce((total, revision) => total + revision.originalByteLength, 0) + input.bytes.byteLength > this.maxTotalBytes) throw new Error('library/quota-exceeded');
      signal?.throwIfAborted();
      const kind = extensionKinds[extname(name).toLowerCase()];
      if (!kind) throw new Error('library/unsupported-format');
      // PDF.js transfers/detaches its input buffer. Keep the authoritative original
      // and the caller-owned buffer intact by converting an independent copy.
      const originalBytes = Uint8Array.from(input.bytes);
      let converted: ConversionResult; let conversionStatus: LibraryRevision['conversionStatus'] = 'ready';
      try { converted = await this.converter(kind, Uint8Array.from(originalBytes), signal); }
      catch (cause) {
        if (signal?.aborted || (cause instanceof Error && cause.message.startsWith('library/'))) throw cause;
        conversionStatus = 'failed'; converted = { markdown: '', locations: [], warnings: [`转换失败：${cause instanceof Error ? cause.message : '未知转换错误'}`] };
      }
      const timestamp = now(); const assetId = randomUUID(); const nodeId = randomUUID(); const revisionId = randomUUID();
      const relativeBase = join('objects', assetId, revisionId); const finalDirectory = this.safePath(relativeBase);
      const temporaryDirectory = this.safePath(join('.tmp', randomUUID()));
      const originalName = `original${extname(name).toLowerCase()}`;
      const originalRelativePath = join(relativeBase, originalName); const contentRelativePath = join(relativeBase, 'content.md');
      await mkdir(temporaryDirectory, { recursive: false, mode: 0o700 });
      try {
        await writeFile(join(temporaryDirectory, originalName), originalBytes, { flag: 'wx', mode: 0o600 });
        await writeFile(join(temporaryDirectory, 'content.md'), converted.markdown, { flag: 'wx', mode: 0o600 });
        await writeFile(join(temporaryDirectory, 'conversion.json'), `${JSON.stringify({ version: 1, kind, originalSha256: sha256(originalBytes), warnings: converted.warnings, locations: converted.locations }, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
        await mkdir(dirname(finalDirectory), { recursive: true, mode: 0o700 });
        await renameFile(temporaryDirectory, finalDirectory);
      } catch (cause) { await rm(temporaryDirectory, { recursive: true, force: true }); throw cause; }
      const owner = this.owner(actor);
      const node: LibraryNode = { id: nodeId, spaceId: state.space.id, ...(input.parentId ? { parentId: input.parentId } : {}), kind: 'asset', name, assetId, createdAt: timestamp, updatedAt: timestamp };
      const asset: LibraryState['assets'][string] = { id: assetId, spaceId: state.space.id, nodeId, kind, mediaType: input.mediaType?.trim() || defaultMediaTypes[kind], byteLength: input.bytes.byteLength, owner, status: 'active', currentRevisionId: revisionId, source: input.source ?? 'upload', ...(input.sourceTaskId ? { sourceTaskId: input.sourceTaskId } : {}), createdAt: timestamp, updatedAt: timestamp };
      const revision: LibraryState['revisions'][string] = { id: revisionId, assetId, number: 1, originalSha256: sha256(originalBytes), contentSha256: sha256(converted.markdown), originalByteLength: originalBytes.byteLength, originalRelativePath, contentRelativePath, conversionStatus, conversionWarnings: [...converted.warnings], createdBy: actor.principalId, createdAt: timestamp };
      const next: LibraryState = { ...state, space: { ...state.space, updatedAt: timestamp }, nodes: { ...state.nodes, [nodeId]: node }, assets: { ...state.assets, [assetId]: asset }, revisions: { ...state.revisions, [revisionId]: revision }, receipts: { ...state.receipts, [input.operationId]: { operationId: input.operationId, assetId, revisionId, nodeId, inputSha256 } } };
      try { await this.states().put(this.key(actor), next); }
      catch (cause) { await rm(finalDirectory, { recursive: true, force: true }); throw cause; }
      return { ...node, asset, revision };
    });
  }

  readText(actor: ActorContext, assetId: string, revisionId?: string, signal?: AbortSignal): Promise<string> {
    return this.enqueue(async () => { const state = await this.ensureState(actor, signal); this.assertActive(state, assetId); const revision = this.resolveRevision(state, assetId, revisionId); if (revision.conversionStatus !== 'ready') throw new Error(revision.conversionStatus === 'failed' ? 'library/conversion-failed' : 'library/conversion-pending'); return readFile(this.safePath(revision.contentRelativePath), 'utf8'); });
  }

  readOriginal(actor: ActorContext, assetId: string, revisionId?: string, signal?: AbortSignal): Promise<Uint8Array> {
    return this.enqueue(async () => { const state = await this.ensureState(actor, signal); this.assertActive(state, assetId); const revision = this.resolveRevision(state, assetId, revisionId); return new Uint8Array(await readFile(this.safePath(revision.originalRelativePath))); });
  }

  search(actor: ActorContext, query: string, filters: LibrarySearchFilters = {}, signal?: AbortSignal): Promise<readonly LibrarySearchHit[]> {
    return this.enqueue(async () => {
      const needle = query.trim().toLocaleLowerCase();
      const state = await this.ensureState(actor, signal); const hits: LibrarySearchHit[] = [];
      for (const asset of Object.values(state.assets)) {
        if (asset.status !== 'active') continue;
        if (filters.kinds?.length && !filters.kinds.includes(asset.kind)) continue;
        if (filters.sources?.length && !filters.sources.includes(asset.source)) continue;
        if (filters.updatedAfter && asset.updatedAt < filters.updatedAfter) continue;
        if (filters.updatedBefore && asset.updatedAt > filters.updatedBefore) continue;
        signal?.throwIfAborted(); const node = this.requireNode(state, asset.nodeId); const revision = this.requireRevision(state, asset.currentRevisionId);
        if (revision.conversionStatus !== 'ready') { if (needle) continue; hits.push({ assetId: asset.id, revisionId: revision.id, nodeId: node.id, name: node.name, kind: asset.kind, source: asset.source, updatedAt: asset.updatedAt, folderPath: this.folderPath(state, node.parentId), excerpt: '', score: 0 }); continue; }
        const text = await readFile(this.safePath(revision.contentRelativePath), 'utf8'); const lower = text.toLocaleLowerCase();
        const titleMatch = Boolean(needle) && node.name.toLocaleLowerCase().includes(needle); const offset = needle ? lower.indexOf(needle) : 0; if (needle && !titleMatch && offset < 0) continue;
        const start = Math.max(0, offset < 0 ? 0 : offset - 80); const excerpt = text.slice(start, start + 240).replace(/\s+/g, ' ').trim();
        const prefix = text.slice(0, offset < 0 ? text.length : offset); const heading = [...prefix.matchAll(/^#{1,6}\s+(.+)$/gm)].at(-1)?.[1]?.trim();
        hits.push({ assetId: asset.id, revisionId: revision.id, nodeId: node.id, name: node.name, kind: asset.kind, source: asset.source, updatedAt: asset.updatedAt, folderPath: this.folderPath(state, node.parentId), ...(heading ? { location: heading } : {}), excerpt, score: titleMatch ? 2 : needle ? 1 : 0 });
      }
      return hits.sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name, 'zh-CN')).slice(0, 50);
    });
  }

  setTaskSelection(actor: ActorContext, sessionId: string, nodeIds: readonly string[], signal?: AbortSignal): Promise<readonly LibraryTaskReference[]> {
    return this.enqueue(async () => {
      const state = await this.ensureState(actor, signal); if (!sessionId.trim() || nodeIds.length > 32) throw new Error('library/invalid-selection');
      const assetIds = new Set<string>();
      for (const nodeId of new Set(nodeIds)) {
        const node = this.requireNode(state, nodeId);
        if (node.assetId) { this.assertActive(state, node.assetId); assetIds.add(node.assetId); }
        else for (const childId of this.descendants(state, node.id)) { const child = state.nodes[childId]; if (child?.assetId && state.assets[child.assetId]?.status === 'active') assetIds.add(child.assetId); }
      }
      if (assetIds.size > this.maxSelectionAssets || [...assetIds].reduce((total, assetId) => total + state.assets[assetId]!.byteLength, 0) > this.maxSelectionBytes) throw new Error('library/selection-too-large');
      const selectedAt = now();
      const references = [...assetIds].map((assetId): LibraryTaskReference => { const asset = state.assets[assetId]!; const node = this.requireNode(state, asset.nodeId); return { sessionId, nodeId: asset.nodeId, assetId, revisionId: asset.currentRevisionId, name: node.name, kind: asset.kind, selectedAt }; });
      await this.states().put(this.key(actor), { ...state, references: { ...state.references, [sessionId]: references } });
      return references;
    });
  }

  taskSelection(actor: ActorContext, sessionId: string, signal?: AbortSignal): Promise<readonly LibraryTaskReference[]> {
    return this.enqueue(async () => {
      const state = await this.ensureState(actor, signal);
      const references = sessionKeys(sessionId).map(key => state.references[key]).find(rows => rows !== undefined) ?? [];
      return references.flatMap(reference => { const asset = state.assets[reference.assetId]; const node = state.nodes[reference.nodeId]; return asset && node ? [{ ...reference, name: node.name, kind: asset.kind }] : []; });
    });
  }

  createDraft(actor: ActorContext, assetId: string, baseRevisionId?: string, signal?: AbortSignal): Promise<LibraryDraft> {
    return this.enqueue(async () => {
      const state = await this.ensureState(actor, signal); const asset = state.assets[assetId]; if (!asset) throw new Error('library/not-found'); this.assertActive(state, assetId);
      if (asset.kind !== 'markdown' && asset.kind !== 'text') throw new Error('library/draft-format');
      const revision = this.resolveRevision(state, assetId, baseRevisionId); const content = await readFile(this.safePath(revision.contentRelativePath), 'utf8'); const timestamp = now();
      const draft: LibraryState['drafts'][string] = { id: randomUUID(), assetId, baseRevisionId: revision.id, revision: randomUUID(), content, createdBy: actor.principalId, createdAt: timestamp, updatedAt: timestamp };
      await this.states().put(this.key(actor), { ...state, drafts: { ...state.drafts, [draft.id]: draft } }); return draft;
    });
  }

  updateDraft(actor: ActorContext, draftId: string, content: string, expectedRevision: string, signal?: AbortSignal): Promise<LibraryDraft> {
    return this.enqueue(async () => {
      const state = await this.ensureState(actor, signal); const current = state.drafts[draftId]; if (!current) throw new Error('library/not-found');
      if (current.revision !== expectedRevision) throw new Error('library/revision-conflict');
      if (Buffer.byteLength(content, 'utf8') > 8 * 1024 * 1024) throw new Error('library/file-size');
      const next: LibraryState['drafts'][string] = { ...current, content, revision: randomUUID(), updatedAt: now() };
      await this.states().put(this.key(actor), { ...state, drafts: { ...state.drafts, [draftId]: next } }); return next;
    });
  }

  publishDraft(actor: ActorContext, draftId: string, expectedRevision: string, signal?: AbortSignal): Promise<LibraryTreeEntry> {
    return this.enqueue(async () => {
      const state = await this.ensureState(actor, signal); const draft = state.drafts[draftId]; if (!draft) throw new Error('library/not-found');
      if (draft.revision !== expectedRevision) throw new Error('library/revision-conflict');
      const asset = state.assets[draft.assetId]; if (!asset) throw new Error('library/not-found'); this.assertActive(state, asset.id);
      if (asset.currentRevisionId !== draft.baseRevisionId) throw new Error('library/base-revision-conflict');
      const previous = this.requireRevision(state, draft.baseRevisionId); const extension = extname(previous.originalRelativePath); const bytes = new TextEncoder().encode(draft.content);
      if (Object.values(state.revisions).reduce((total, revision) => total + revision.originalByteLength, 0) + bytes.byteLength > this.maxTotalBytes) throw new Error('library/quota-exceeded');
      const revisionId = randomUUID(); const relativeBase = join('objects', asset.id, revisionId); const finalDirectory = this.safePath(relativeBase); const temporaryDirectory = this.safePath(join('.tmp', randomUUID()));
      const originalRelativePath = join(relativeBase, `original${extension}`); const contentRelativePath = join(relativeBase, 'content.md');
      await mkdir(temporaryDirectory, { recursive: false, mode: 0o700 });
      try { await writeFile(join(temporaryDirectory, `original${extension}`), bytes, { flag: 'wx', mode: 0o600 }); await writeFile(join(temporaryDirectory, 'content.md'), draft.content, { flag: 'wx', mode: 0o600 }); await writeFile(join(temporaryDirectory, 'conversion.json'), `${JSON.stringify({ version: 1, kind: asset.kind, originalSha256: sha256(bytes), warnings: [] }, null, 2)}\n`, { flag: 'wx', mode: 0o600 }); await renameFile(temporaryDirectory, finalDirectory); }
      catch (cause) { await rm(temporaryDirectory, { recursive: true, force: true }); throw cause; }
      const timestamp = now(); const revision: LibraryState['revisions'][string] = { id: revisionId, assetId: asset.id, number: previous.number + 1, originalSha256: sha256(bytes), contentSha256: sha256(draft.content), originalByteLength: bytes.byteLength, originalRelativePath, contentRelativePath, conversionStatus: 'ready', conversionWarnings: [], createdBy: actor.principalId, createdAt: timestamp };
      const nextAsset: LibraryState['assets'][string] = { ...asset, currentRevisionId: revisionId, byteLength: bytes.byteLength, updatedAt: timestamp };
      const drafts = { ...state.drafts }; delete drafts[draftId];
      const next = { ...state, assets: { ...state.assets, [asset.id]: nextAsset }, revisions: { ...state.revisions, [revisionId]: revision }, drafts, nodes: { ...state.nodes, [asset.nodeId]: { ...this.requireNode(state, asset.nodeId), updatedAt: timestamp } } };
      try { await this.states().put(this.key(actor), next); } catch (cause) { await rm(finalDirectory, { recursive: true, force: true }); throw cause; }
      return this.entry(next, next.nodes[asset.nodeId]!);
    });
  }

  setAssetStatus(actor: ActorContext, assetId: string, status: LibraryAssetStatus, signal?: AbortSignal): Promise<LibraryTreeEntry> {
    return this.enqueue(async () => {
      const state = await this.ensureState(actor, signal); const asset = state.assets[assetId]; if (!asset) throw new Error('library/not-found');
      const timestamp = now(); const nextAsset: LibraryState['assets'][string] = { ...asset, status, updatedAt: timestamp };
      const next: LibraryState = { ...state, assets: { ...state.assets, [assetId]: nextAsset }, nodes: { ...state.nodes, [asset.nodeId]: { ...this.requireNode(state, asset.nodeId), updatedAt: timestamp } }, space: { ...state.space, updatedAt: timestamp } };
      await this.states().put(this.key(actor), next); return this.entry(next, next.nodes[asset.nodeId]!);
    });
  }

  rename(actor: ActorContext, nodeId: string, name: string, signal?: AbortSignal): Promise<LibraryNode> {
    return this.changeNode(actor, nodeId, signal, (state, node) => { const value = cleanName(name); this.assertUniqueName(state, node.parentId, value, node.id); return { ...node, name: value, updatedAt: now() }; });
  }

  move(actor: ActorContext, nodeId: string, parentId: string | undefined, signal?: AbortSignal): Promise<LibraryNode> {
    return this.changeNode(actor, nodeId, signal, (state, node) => {
      this.assertFolder(state, parentId); if (parentId === nodeId || this.descendants(state, nodeId).has(parentId ?? '')) throw new Error('library/cycle');
      this.assertUniqueName(state, parentId, node.name, node.id); return { ...node, parentId, updatedAt: now() };
    });
  }

  remove(actor: ActorContext, nodeId: string, signal?: AbortSignal): Promise<void> {
    return this.enqueue(async () => {
      const state = await this.ensureState(actor, signal); this.requireNode(state, nodeId); signal?.throwIfAborted();
      const ids = new Set([nodeId, ...this.descendants(state, nodeId)]); const assetIds = Object.values(state.nodes).filter((node) => ids.has(node.id) && node.assetId).map((node) => node.assetId!);
      const nodes = Object.fromEntries(Object.entries(state.nodes).filter(([id]) => !ids.has(id)));
      const assets = Object.fromEntries(Object.entries(state.assets).filter(([id]) => !assetIds.includes(id)));
      const removedRevisionIds = new Set(Object.values(state.revisions).filter((revision) => assetIds.includes(revision.assetId)).map((revision) => revision.id));
      const revisions = Object.fromEntries(Object.entries(state.revisions).filter(([id]) => !removedRevisionIds.has(id)));
      const receipts = Object.fromEntries(Object.entries(state.receipts).filter(([, receipt]) => !assetIds.includes(receipt.assetId)));
      const drafts = Object.fromEntries(Object.entries(state.drafts).filter(([, draft]) => !assetIds.includes(draft.assetId)));
      const references = Object.fromEntries(Object.entries(state.references).map(([sessionId, rows]) => [sessionId, rows.filter((row) => !assetIds.includes(row.assetId))]));
      await this.states().put(this.key(actor), { ...state, nodes, assets, revisions, receipts, drafts, references, space: { ...state.space, updatedAt: now() } });
      await Promise.all(assetIds.map((id) => rm(this.safePath(join('objects', id)), { recursive: true, force: true })));
    });
  }

  private changeNode(actor: ActorContext, nodeId: string, signal: AbortSignal | undefined, mutate: (state: LibraryState, node: LibraryNode) => LibraryNode): Promise<LibraryNode> {
    return this.enqueue(async () => { const state = await this.ensureState(actor, signal); const next = mutate(state, this.requireNode(state, nodeId)); await this.states().put(this.key(actor), { ...state, nodes: { ...state.nodes, [nodeId]: next }, space: { ...state.space, updatedAt: now() } }); return next; });
  }
  private async ensureState(actor: ActorContext, signal?: AbortSignal): Promise<LibraryState> {
    signal?.throwIfAborted(); this.validateActor(actor); const key = this.key(actor); const current = this.states().get(key); if (current) return current;
    const timestamp = now(); const state: LibraryState = { schemaVersion: 1, space: { id: randomUUID(), title: '我的资料', owner: this.owner(actor), createdAt: timestamp, updatedAt: timestamp }, nodes: {}, assets: {}, revisions: {}, receipts: {}, references: {}, drafts: {} };
    await this.states().put(key, state); return state;
  }
  private entry(state: LibraryState, node: LibraryNode): LibraryTreeEntry { const asset = node.assetId ? state.assets[node.assetId] : undefined; const revision = asset ? state.revisions[asset.currentRevisionId] : undefined; return { ...node, ...(asset ? { asset } : {}), ...(revision ? { revision } : {}) }; }
  private resolveRevision(state: LibraryState, assetId: string, revisionId?: string): LibraryRevision { const asset = state.assets[assetId]; if (!asset) throw new Error('library/not-found'); return this.requireRevision(state, revisionId ?? asset.currentRevisionId); }
  private assertActive(state: LibraryState, assetId: string): void { const asset = state.assets[assetId]; if (!asset) throw new Error('library/not-found'); if (asset.status !== 'active') throw new Error('library/disabled'); }
  private requireNode(state: LibraryState, id: string): LibraryNode { const node = state.nodes[id]; if (!node) throw new Error('library/not-found'); return node; }
  private requireRevision(state: LibraryState, id: string): LibraryRevision { const revision = state.revisions[id]; if (!revision) throw new Error('library/not-found'); return revision; }
  private assertFolder(state: LibraryState, id?: string): void { if (id && this.requireNode(state, id).kind !== 'folder') throw new Error('library/not-folder'); }
  private assertUniqueName(state: LibraryState, parentId: string | undefined, name: string, except?: string): void { if (Object.values(state.nodes).some((node) => node.id !== except && node.parentId === parentId && node.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('library/name-conflict'); }
  private descendants(state: LibraryState, id: string): Set<string> { const result = new Set<string>(); const queue = [id]; while (queue.length) { const parent = queue.shift()!; for (const node of Object.values(state.nodes)) if (node.parentId === parent && !result.has(node.id)) { result.add(node.id); queue.push(node.id); } } return result; }
  private folderPath(state: LibraryState, parentId?: string): string { const parts: string[] = []; let current = parentId; const seen = new Set<string>(); while (current && !seen.has(current)) { seen.add(current); const node = state.nodes[current]; if (!node) break; parts.unshift(node.name); current = node.parentId; } return parts.length ? `我的资料 / ${parts.join(' / ')}` : '我的资料'; }
  private owner(actor: ActorContext): ResourceOwner & { scope: 'personal' } { return { organizationId: actor.organizationId, ownerPrincipalId: actor.principalId, scope: 'personal' }; }
  private key(actor: ActorContext): string { return stateKey(actor.organizationId, actor.principalId); }
  private validateActor(actor: ActorContext): void { if (!actor.organizationId?.trim() || !actor.principalId?.trim() || !actor.requestId?.trim() || !actor.resolvedBy?.trim()) throw new Error('library/invalid-actor'); }
  private safePath(relative: string): string { const target = resolve(this.root, relative); if (target !== this.root && !target.startsWith(`${this.root}${sep}`)) throw new Error('library/path-escape'); return target; }
  private states(): KvTable<string, LibraryState> { if (!this.table) throw new Error('library/unavailable'); return this.table; }
  private enqueue<T>(run: () => Promise<T>): Promise<T> { const next = this.serial.then(run, run); this.serial = next.catch(() => undefined); return next; }
}
