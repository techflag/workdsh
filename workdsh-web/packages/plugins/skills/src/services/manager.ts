import { createHash, randomUUID } from 'node:crypto';
import { copyFile, lstat, mkdir, open, readFile, readdir, realpath, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { Context, Service } from '@deepseek-ai/cordis';
import { isSkillName, type SkillDefinition, type SkillSummary } from '@deepseek-ai/dsh-skill';
import { parse } from 'yaml';
import type { ManagedSkillDetail, ManagedSkillResource, ManagedSkillSummary, SkillBatchRequest, SkillBatchResult, SkillCatalogIcon, SkillCatalogSummary, SkillDependency, SkillDependencyImpact, SkillDiagnostic, SkillDraft, SkillDraftWriteRequest, SkillImportInspection, SkillImportRequest, SkillInstallScope, SkillMutationReceipt, SkillResourceWriteRequest, SkillValidationResult, SkillWriteRequest, TrashedSkillSummary } from '../shared.js';
import { SkillImportStaging } from './import-staging.js';
import { SkillCatalogStore } from './catalog.js';
import type { SkillManagementService, SkillDependencyInspector } from '../shared.js';
import type { RetainedSkillRevision, SkillConsumerRef, SkillRevisionCheck, SkillRevisionRef, SkillRevisionStatus } from 'workdsh-contracts';

declare module '@deepseek-ai/cordis' {
  interface Context { workdshSkills: SkillManagementService; }
}

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const skillNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const trashIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*-\d{4}-\d{2}-\d{2}T[0-9-]+Z$/;
const maximumDocumentBytes = 1024 * 1024;
const draftIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

interface DisabledOrigin { readonly name: string; readonly originalEntry: string; readonly directoryBundle: boolean; }
interface TrashReceipt extends TrashedSkillSummary { readonly originalEntry: string; readonly trashedEntry: string; readonly directoryBundle: boolean; }
export type { SkillDependencyInspector } from '../shared.js';

interface RetentionManifest {
  readonly ref: SkillRevisionRef;
  readonly contentDigest: string;
  readonly files: readonly { readonly path: string; readonly byteLength: number; readonly sha256: string }[];
  readonly retainedBy: readonly SkillConsumerRef[];
  readonly createdAt: string;
}

function addConsumer(list: readonly SkillConsumerRef[], consumer: SkillConsumerRef): SkillConsumerRef[] {
  const filtered = list.filter((entry) => !(entry.domain === consumer.domain && entry.id === consumer.id));
  return [...filtered, consumer];
}

/** Frozen-content fingerprint over SKILL.md + resources, plus per-file manifest stats. */
async function snapshotFiles(directory: string, signal?: AbortSignal): Promise<{ files: { path: string; byteLength: number; sha256: string }[]; contentDigest: string }> {
  const resources = await resourceFiles(directory);
  const paths = ['SKILL.md', ...resources].sort();
  const hash = createHash('sha256');
  const files: { path: string; byteLength: number; sha256: string }[] = [];
  for (const path of paths) {
    signal?.throwIfAborted();
    const bytes = await readFile(join(directory, path));
    files.push({ path, byteLength: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') });
    hash.update(path); hash.update('\0'); hash.update(bytes); hash.update('\0');
  }
  return { files, contentDigest: hash.digest('hex') };
}

function inside(root: string, target: string): boolean {
  const part = relative(resolve(root), resolve(target));
  return part === '' || (!part.startsWith(`..${sep}`) && part !== '..' && !part.startsWith(sep));
}

function frontmatter(document: string): Record<string, unknown> {
  const match = document.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error('skill/invalid-frontmatter');
  try {
    const value = parse(match[1]);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('skill/invalid-frontmatter');
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message === 'skill/invalid-frontmatter') throw error;
    throw new Error('skill/invalid-frontmatter');
  }
}

function frontmatterValue(document: string, key: string): string | undefined {
  try { const value = frontmatter(document)[key]; return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
  catch { return undefined; }
}

async function resourceFiles(directory: string, root = directory, depth = 0): Promise<string[]> {
  if (depth > 4) return [];
  const rows = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const row of rows) {
    if (row.isSymbolicLink()) continue;
    const path = join(directory, row.name);
    if (row.isDirectory()) files.push(...await resourceFiles(path, root, depth + 1));
    else if (row.isFile() && row.name !== 'SKILL.md') files.push(relative(root, path));
    if (files.length >= 200) break;
  }
  return files.slice(0, 200).sort();
}

async function inspectImportTree(source: string, signal?: AbortSignal): Promise<{ document: string; root: string; files: string[]; totalBytes: number; fingerprint: string }> {
  signal?.throwIfAborted();
  const sourceInfo = await lstat(source);
  if (sourceInfo.isSymbolicLink()) throw new Error('skill/import-symlink');
  const root = sourceInfo.isDirectory() ? source : dirname(source);
  const skillFile = sourceInfo.isDirectory() ? join(source, 'SKILL.md') : source;
  if (!sourceInfo.isDirectory() && basename(source) !== 'SKILL.md') throw new Error('skill/import-missing-skill-md');
  const files: string[] = []; let totalBytes = 0;
  const visit = async (directory: string, depth: number): Promise<void> => {
    signal?.throwIfAborted();
    if (depth > 6) throw new Error('skill/import-too-deep');
    for (const row of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, row.name);
      if (row.isSymbolicLink()) throw new Error('skill/import-symlink');
      if (row.isDirectory()) await visit(path, depth + 1);
      else if (row.isFile()) {
        const info = await stat(path); totalBytes += info.size; files.push(relative(root, path));
        if (files.length > 400 || totalBytes > 50 * 1024 * 1024) throw new Error('skill/import-too-large');
      }
    }
  };
  if (sourceInfo.isDirectory()) await visit(root, 0);
  else { files.push('SKILL.md'); totalBytes = sourceInfo.size; }
  let document: string;
  try { document = await readFile(skillFile, 'utf8'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('skill/import-missing-skill-md');
    throw error;
  }
  const sortedFiles = files.sort();
  const fingerprint = createHash('sha256');
  for (const file of sortedFiles) {
    signal?.throwIfAborted();
    fingerprint.update(file); fingerprint.update('\0');
    fingerprint.update(await readFile(join(root, file))); fingerprint.update('\0');
  }
  return { document, root, files: sortedFiles, totalBytes, fingerprint: fingerprint.digest('hex') };
}

async function copyImportTree(source: string, target: string, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  const sourceInfo = await lstat(source);
  if (sourceInfo.isDirectory()) {
    await mkdir(target, { recursive: true });
    for (const row of await readdir(source, { withFileTypes: true })) {
      if (row.isSymbolicLink()) throw new Error('skill/import-symlink');
      const from = join(source, row.name); const to = join(target, row.name);
      if (row.isDirectory()) await copyImportTree(from, to, signal);
      else if (row.isFile()) await copyFile(from, to);
    }
  } else {
    await mkdir(target, { recursive: true }); await copyFile(source, join(target, 'SKILL.md'));
  }
}

/** Host authority for local skill files. Harness remains the discovery and execution owner. */
export class SkillManager extends Service implements SkillManagementService {
  readonly contractVersion = 1 as const;
  private readonly activeRoots: readonly string[];
  private readonly disabledRoot: string;
  private readonly trashRoot: string;
  private readonly stateRoot: string;
  private readonly lockRoot: string;
  private readonly originRoot: string;
  private readonly receiptRoot: string;
  private readonly draftRoot: string;
  private readonly catalogStore: SkillCatalogStore;
  private readonly dependencyInspectors = new Set<SkillDependencyInspector>();
  readonly imports: SkillImportStaging;

  constructor(ctx: Context) {
    super(ctx, 'workdshSkills');
    const dshHome = resolve(process.env.DSH_HOME ?? join(homedir(), '.dsh'));
    const agentsHome = resolve(process.env.DSH_AGENTS_HOME ?? join(dshHome, 'agents'));
    this.activeRoots = [join(agentsHome, 'skills'), join(dshHome, 'skills')];
    this.disabledRoot = join(agentsHome, '.workdsh-disabled', 'skills');
    this.trashRoot = join(agentsHome, '.workdsh-trash', 'skills');
    this.stateRoot = join(agentsHome, '.workdsh-state', 'skills');
    this.lockRoot = join(this.stateRoot, 'locks');
    this.originRoot = join(this.stateRoot, 'disabled-origins');
    this.receiptRoot = join(this.stateRoot, 'trash-receipts');
    this.draftRoot = join(this.stateRoot, 'drafts');
    this.catalogStore = new SkillCatalogStore(process.env.WORKDSH_SKILL_CATALOG ?? join(agentsHome, '.workdsh-catalog'));
    this.imports = new SkillImportStaging(
      join(this.stateRoot, 'imports'),
      (source, signal) => this.inspectImport(source, signal),
      (request, signal) => this.installImport(request, signal),
    );
  }

  async list(signal?: AbortSignal): Promise<readonly ManagedSkillSummary[]> {
    signal?.throwIfAborted();
    const skills = await this.ctx.skills.list({ signal });
    const rows: ManagedSkillSummary[] = [];
    for (const skill of skills) {
      const manageable = this.isManagedSummary(skill);
      if (manageable) {
        const definition = await this.ctx.skills.get(skill.name, { signal });
        const path = definition?.path;
        if (!path) continue;
        try { if (!await this.isSafeManagedFile(path)) continue; }
        catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as Error).message === 'skill/path-symlink') continue; throw error; }
      }
      rows.push({ name: skill.name, description: skill.description, whenToUse: skill.whenToUse,
        modelInvocable: skill.invocation.modelInvocable, state: manageable ? 'enabled' : 'readonly', manageable });
    }
    for (const root of this.activeRoots) {
      await mkdir(root, { recursive: true });
      for (const entry of await readdir(root, { withFileTypes: true })) {
        const name = entry.isDirectory() ? entry.name : entry.isFile() && entry.name.endsWith('.md') ? entry.name.slice(0, -3) : undefined;
        if (!name || !skillNamePattern.test(name) || rows.some(row => row.name === name)) continue;
        let active;
        try { active = await this.activeEntry(name); }
        catch (error) { if ((error as Error).message === 'skill/path-symlink') continue; throw error; }
        if (!active) continue;
        const document = await readFile(active.file, 'utf8');
        const validation = this.validateDocument(document, name);
        rows.push({
          name,
          description: validation.description ?? '技能文件需要修复',
          whenToUse: frontmatterValue(document, 'when-to-use'),
          modelInvocable: validation.valid,
          state: validation.valid ? 'enabled' : 'invalid',
          manageable: true,
          ...(validation.valid ? {} : { diagnostics: validation.diagnostics }),
        });
      }
    }
    await mkdir(this.disabledRoot, { recursive: true });
    for (const entry of await readdir(this.disabledRoot, { withFileTypes: true })) {
      const name = entry.isDirectory() ? entry.name : entry.isFile() && entry.name.endsWith('.md') ? entry.name.slice(0, -3) : undefined;
      if (!name || rows.some(row => row.name === name)) continue;
      const disabled = await this.readDetail(name, signal);
      if (disabled) rows.push(disabled);
    }
    const metadata = await this.catalogStore.metadata(new Set(rows.map(row => row.name)));
    return rows.map(row => { const entry = metadata.get(row.name); return entry ? { ...row, ...entry } : row; }).sort((a, b) => a.name.localeCompare(b.name));
  }

  async detail(name: string, signal?: AbortSignal): Promise<ManagedSkillDetail | undefined> {
    const detail = await this.readDetail(name, signal);
    if (!detail) return undefined;
    const metadata = await this.catalogStore.metadata(new Set([detail.name]));
    const entry = metadata.get(detail.name);
    return entry ? { ...detail, ...entry } : detail;
  }

  private async readDetail(name: string, signal?: AbortSignal): Promise<ManagedSkillDetail | undefined> {
    this.assertName(name); signal?.throwIfAborted();
    const definition = await this.ctx.skills.get(name, { signal });
    if (definition) {
      try { const detail = await this.fromDefinition(definition); if (detail) return detail; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    const active = await this.activeEntry(name);
    if (active) {
      const document = await readFile(active.file, 'utf8');
      const validation = this.validateDocument(document, name);
      return {
        name,
        description: validation.description ?? '技能文件需要修复',
        whenToUse: frontmatterValue(document, 'when-to-use'),
        modelInvocable: validation.valid, state: validation.valid ? 'enabled' : 'invalid', manageable: true, document,
        directoryPath: dirname(active.file), revision: digest(document), resources: active.directoryBundle ? await resourceFiles(dirname(active.file)) : [],
        ...(validation.valid ? {} : { diagnostics: validation.diagnostics }),
      };
    }
    const disabled = await this.disabledEntry(name);
    if (!disabled) return undefined;
    const document = await readFile(disabled.file, 'utf8');
    return {
      name,
      description: frontmatterValue(document, 'description') ?? '已停用技能',
      whenToUse: frontmatterValue(document, 'when-to-use'),
      modelInvocable: false, state: 'disabled', manageable: true, document,
      directoryPath: dirname(disabled.file), revision: digest(document), resources: disabled.directoryBundle ? await resourceFiles(dirname(disabled.file)) : [],
    };
  }

  async update(request: SkillWriteRequest): Promise<ManagedSkillDetail> {
    this.assertName(request.name);
    if (Buffer.byteLength(request.document) > maximumDocumentBytes) throw new Error('skill/document-too-large');
    const metadata = frontmatter(request.document);
    if (metadata.name !== request.name) throw new Error('skill/name-mismatch');
    if (typeof metadata.description !== 'string' || !metadata.description.trim()) throw new Error('skill/description-required');
    return this.withSkillLock(request.name, async () => {
      const current = await this.detail(request.name);
      if (!current?.directoryPath || !current.revision || current.state === 'readonly') throw new Error('skill/not-manageable');
      const skillPath = current.state === 'disabled'
        ? (await this.disabledEntry(request.name))!.file
        : (await this.activeEntry(request.name))?.file;
      if (!skillPath) throw new Error('skill/not-manageable');
      if (digest(await readFile(skillPath, 'utf8')) !== request.expectedRevision) throw new Error('skill/revision-conflict');
      await this.atomicWrite(skillPath, request.document);
      const next = await this.detail(request.name);
      if (!next) throw new Error('skill/reload-failed');
      return next;
    });
  }

  /** SkillHub installs by catalog slug, while some published SKILL.md files use another name. */
  async normalizeSkillHub(name: string): Promise<ManagedSkillDetail> {
    this.assertName(name);
    return this.withSkillLock(name, async () => {
      const file = join(this.activeRoots[1], name, 'SKILL.md');
      const entry = await this.activeEntry(name);
      if (!entry?.directoryBundle || entry.file !== file) throw new Error('skill/not-manageable');
      const original = await readFile(file, 'utf8');
      const validation = this.validateDocument(original, name);
      if (!validation.valid) {
        if (validation.diagnostics.some(diagnostic => diagnostic.code !== 'name-mismatch')) throw new Error('skill/skillhub-invalid-document');
        const header = original.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
        if (!header) throw new Error('skill/skillhub-invalid-document');
        const lines = header[1].split(/\r?\n/);
        const index = lines.findIndex(line => /^name\s*:/.test(line));
        if (index < 0 || lines.filter(line => /^name\s*:/.test(line)).length !== 1) throw new Error('skill/skillhub-invalid-document');
        lines[index] = `name: ${name}`;
        const normalized = original.replace(header[1], lines.join(header[0].includes('\r\n') ? '\r\n' : '\n'));
        if (!this.validateDocument(normalized, name).valid) throw new Error('skill/skillhub-invalid-document');
        await this.atomicWrite(file, normalized);
      }
      const detail = await this.detail(name);
      if (!detail || detail.state === 'invalid') throw new Error('skill/reload-failed');
      return detail;
    });
  }

  validateDocument(document: string, expectedName?: string): SkillValidationResult {
    const diagnostics: SkillDiagnostic[] = [];
    if (Buffer.byteLength(document) > maximumDocumentBytes) diagnostics.push({ code: 'document-too-large', message: 'SKILL.md 超过 1 MiB 上限。', path: 'SKILL.md' });
    let metadata: Record<string, unknown> | undefined;
    try { metadata = frontmatter(document); }
    catch { diagnostics.push({ code: 'invalid-frontmatter', message: 'SKILL.md 必须以有效的 YAML frontmatter 开头。', path: 'SKILL.md' }); }
    const name = typeof metadata?.name === 'string' ? metadata.name.trim() : undefined;
    const description = typeof metadata?.description === 'string' ? metadata.description.trim() : undefined;
    if (!name || !skillNamePattern.test(name) || !isSkillName(name)) diagnostics.push({ code: 'invalid-name', message: 'name 必须是合法的 kebab-case 技能名称。', path: 'SKILL.md' });
    if (expectedName && name && name !== expectedName) diagnostics.push({ code: 'name-mismatch', message: `frontmatter name 必须与技能目录 ${expectedName} 一致。`, path: 'SKILL.md' });
    if (!description) diagnostics.push({ code: 'description-required', message: 'description 不能为空。', path: 'SKILL.md' });
    const body = metadata ? document.replace(/^---\s*\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').trim() : '';
    if (metadata && !body) diagnostics.push({ code: 'instructions-required', message: 'frontmatter 后必须包含可执行的技能说明。', path: 'SKILL.md' });
    return { valid: diagnostics.length === 0, ...(name ? { name } : {}), ...(description ? { description } : {}), diagnostics };
  }

  async saveDraft(request: SkillDraftWriteRequest): Promise<SkillDraft> {
    this.assertName(request.name);
    if (Buffer.byteLength(request.document) > maximumDocumentBytes) throw new Error('skill/document-too-large');
    const id = request.id ?? randomUUID();
    if (!draftIdPattern.test(id)) throw new Error('skill/invalid-draft-id');
    const path = this.draftPath(id);
    let current: SkillDraft | undefined;
    try { current = JSON.parse(await readFile(path, 'utf8')) as SkillDraft; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (request.id && (!current || !request.expectedRevision || current.revision !== request.expectedRevision)) throw new Error('skill/revision-conflict');
    if (current && current.name !== request.name) throw new Error('skill/name-mismatch');
    const validation = this.validateDocument(request.document, request.name);
    const updatedAt = new Date().toISOString();
    const revision = digest(`${request.name}\0${request.scope ?? current?.scope ?? 'shared-agents'}\0${request.document}\0${updatedAt}`);
    const draft: SkillDraft = { id, name: request.name, scope: request.scope ?? current?.scope ?? 'shared-agents', document: request.document, revision, updatedAt, validation };
    await this.writeJson(path, draft);
    return draft;
  }

  async getDraft(id: string): Promise<SkillDraft> {
    if (!draftIdPattern.test(id)) throw new Error('skill/invalid-draft-id');
    try {
      const value = JSON.parse(await readFile(this.draftPath(id), 'utf8')) as SkillDraft;
      if (value.id !== id || !skillNamePattern.test(value.name) || typeof value.document !== 'string' || typeof value.revision !== 'string') throw new Error('skill/invalid-draft');
      return value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('skill/draft-not-found');
      throw error;
    }
  }

  async publishDraft(id: string, expectedRevision: string): Promise<SkillMutationReceipt> {
    const draft = await this.getDraft(id);
    if (draft.revision !== expectedRevision) throw new Error('skill/revision-conflict');
    const validation = this.validateDocument(draft.document, draft.name);
    if (!validation.valid) throw new Error('skill/draft-invalid');
    return this.withSkillLock(draft.name, async () => {
      const latest = await this.getDraft(id);
      if (latest.revision !== expectedRevision) throw new Error('skill/revision-conflict');
      if (await this.detail(draft.name)) throw new Error('skill/target-exists');
      const root = draft.scope === 'profile' ? this.activeRoots[1] : this.activeRoots[0];
      const target = join(root, draft.name);
      await this.assertAbsent(target); await this.assertAbsent(`${target}.md`);
      await mkdir(target, { recursive: true });
      try {
        await this.atomicWrite(join(target, 'SKILL.md'), draft.document);
        const installed = await readFile(join(target, 'SKILL.md'), 'utf8');
        if (digest(installed) !== digest(draft.document) || !this.validateDocument(installed, draft.name).valid) throw new Error('skill/publish-verification-failed');
        await unlink(this.draftPath(id));
        return { name: draft.name, state: 'enabled', path: target };
      } catch (error) {
        await rm(target, { recursive: true, force: true });
        throw error;
      }
    });
  }

  async readResource(name: string, resourcePath: string): Promise<ManagedSkillResource> {
    const target = await this.resourceTarget(name, resourcePath, false);
    const bytes = await readFile(target);
    if (bytes.byteLength > maximumDocumentBytes) throw new Error('skill/resource-too-large');
    let document: string;
    try { document = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { throw new Error('skill/resource-not-text'); }
    return { path: resourcePath, document, revision: digest(document) };
  }

  async writeResource(request: SkillResourceWriteRequest): Promise<ManagedSkillResource> {
    this.assertName(request.name);
    if (Buffer.byteLength(request.document) > maximumDocumentBytes) throw new Error('skill/resource-too-large');
    return this.withSkillLock(request.name, async () => {
      const target = await this.resourceTarget(request.name, request.path, true);
      let current: string | undefined;
      try { current = await readFile(target, 'utf8'); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      if (current === undefined && request.expectedRevision !== undefined) throw new Error('skill/revision-conflict');
      if (current !== undefined && (request.expectedRevision === undefined || digest(current) !== request.expectedRevision)) throw new Error('skill/revision-conflict');
      await mkdir(dirname(target), { recursive: true });
      await this.assertResourceParent(request.name, dirname(target));
      await this.atomicWrite(target, request.document);
      return { path: request.path, document: request.document, revision: digest(request.document) };
    });
  }

  async inspectImport(source: string, signal?: AbortSignal): Promise<SkillImportInspection> {
    const resolvedSource = resolve(source);
    const inspected = await inspectImportTree(resolvedSource, signal);
    const metadata = frontmatter(inspected.document);
    const name = typeof metadata.name === 'string' ? metadata.name.trim() : undefined;
    const description = typeof metadata.description === 'string' ? metadata.description.trim() : undefined;
    if (!name || !skillNamePattern.test(name) || !isSkillName(name)) throw new Error('skill/invalid-name');
    if (!description) throw new Error('skill/description-required');
    return { name, description, files: inspected.files, totalBytes: inspected.totalBytes };
  }

  async installImport(request: SkillImportRequest, signal?: AbortSignal): Promise<SkillMutationReceipt> {
    signal?.throwIfAborted();
    const source = resolve(request.source);
    const inspected = await inspectImportTree(source, signal);
    const metadata = frontmatter(inspected.document);
    const name = typeof metadata.name === 'string' ? metadata.name.trim() : '';
    const description = typeof metadata.description === 'string' ? metadata.description.trim() : '';
    if (!skillNamePattern.test(name) || !isSkillName(name)) throw new Error('skill/invalid-name');
    if (!description) throw new Error('skill/description-required');
    return this.withSkillLock(name, async () => {
      signal?.throwIfAborted();
      // A name is global from the user's point of view. Reject collisions in every
      // official root and with bundled/remote providers instead of creating a
      // second candidate whose winner depends on provider order.
      if (await this.detail(name, signal)) throw new Error('skill/target-exists');
      const root = request.scope === 'profile' ? this.activeRoots[1] : this.activeRoots[0];
      const target = join(root, name);
      await this.assertAbsent(target); await this.assertAbsent(`${target}.md`); await mkdir(root, { recursive: true });
      const temporary = join(root, `.workdsh-import-${name}-${process.pid}-${Date.now()}`);
      try {
        await copyImportTree(source, temporary, signal);
        const copied = await inspectImportTree(temporary, signal);
        if (frontmatterValue(copied.document, 'name') !== name || copied.fingerprint !== inspected.fingerprint) throw new Error('skill/import-verification-failed');
        signal?.throwIfAborted();
        await rename(temporary, target);
        return { name, state: 'enabled', path: target };
      } catch (error) {
        await rm(temporary, { recursive: true, force: true });
        throw error;
      }
    });
  }

  async setEnabled(name: string, enabled: boolean): Promise<SkillMutationReceipt> {
    this.assertName(name);
    return this.withSkillLock(name, async () => {
      if (enabled) {
        const disabled = await this.disabledEntry(name);
        if (!disabled) throw new Error('skill/not-disabled');
        if (await this.activeEntry(name)) throw new Error('skill/target-exists');
        const origin = await this.disabledOrigin(name);
        const target = origin?.originalEntry ?? join(this.activeRoots[0], disabled.directoryBundle ? name : `${name}.md`);
        if (!this.rootFor(target)) throw new Error('skill/path-outside-managed-roots');
        await this.assertAbsent(target); await mkdir(dirname(target), { recursive: true }); await rename(disabled.entry, target);
        await this.removeJson(this.originPath(name));
        return { name, state: 'enabled', path: target };
      }
      const current = await this.detail(name);
      if (!current?.directoryPath || (current.state !== 'enabled' && current.state !== 'invalid')) throw new Error('skill/not-manageable');
      const active = await this.activeEntry(name);
      if (!active) throw new Error('skill/not-manageable');
      const target = join(this.disabledRoot, basename(active.entry));
      await this.assertAbsent(target); await mkdir(this.disabledRoot, { recursive: true });
      await this.writeJson(this.originPath(name), { name, originalEntry: active.entry, directoryBundle: active.directoryBundle } satisfies DisabledOrigin);
      try { await rename(active.entry, target); }
      catch (error) { await this.removeJson(this.originPath(name)); throw error; }
      return { name, state: 'disabled', path: target };
    });
  }

  registerDependencyInspector(inspector: SkillDependencyInspector): () => void {
    this.dependencyInspectors.add(inspector);
    return () => this.dependencyInspectors.delete(inspector);
  }

  async dependencyImpact(name: string): Promise<SkillDependencyImpact> {
    this.assertName(name);
    const current = await this.detail(name);
    if (!current?.manageable) throw new Error('skill/not-manageable');
    const nested = await Promise.all([...this.dependencyInspectors].map(inspector => inspector(name)));
    const dependents = nested.flat().sort((a, b) => `${a.kind}\0${a.id}`.localeCompare(`${b.kind}\0${b.id}`));
    const revision = digest(JSON.stringify(dependents.map(item => [item.kind, item.id, item.label, item.blocking])));
    return { name, revision, dependents };
  }

  async uninstall(name: string, expectedImpactRevision: string): Promise<SkillMutationReceipt> {
    this.assertName(name);
    return this.withSkillLock(name, async () => {
      const impact = await this.dependencyImpact(name);
      if (impact.revision !== expectedImpactRevision) throw new Error('skill/dependency-impact-changed');
      if (impact.dependents.some(item => item.blocking)) throw new Error('skill/dependency-blocked');
      const current = await this.detail(name);
      if (!current?.directoryPath || current.state === 'readonly') throw new Error('skill/not-manageable');
      const disabled = current.state === 'disabled' ? await this.disabledEntry(name) : undefined;
      const active = current.state === 'enabled' || current.state === 'invalid' ? await this.activeEntry(name) : undefined;
      const entry = disabled?.entry ?? active?.entry;
      if (!entry) throw new Error('skill/not-manageable');
      const origin = current.state === 'disabled' ? await this.disabledOrigin(name) : undefined;
      const originalEntry = origin?.originalEntry ?? active?.entry ?? join(this.activeRoots[0], disabled?.directoryBundle ? name : `${name}.md`);
      const removedAt = new Date().toISOString();
      const id = `${name}-${removedAt.replace(/[:.]/g, '-')}`;
      const target = join(this.trashRoot, `${id}${extname(entry)}`);
      const receipt: TrashReceipt = { id, name, removedAt, previousState: current.state === 'disabled' ? 'disabled' : 'enabled', originalEntry, trashedEntry: target, directoryBundle: disabled?.directoryBundle ?? active!.directoryBundle };
      await mkdir(this.trashRoot, { recursive: true });
      await this.writeJson(this.receiptPath(id), receipt);
      try { await rename(entry, target); }
      catch (error) { await this.removeJson(this.receiptPath(id)); throw error; }
      await this.removeJson(this.originPath(name));
      return { name, state: 'uninstalled', path: target };
    });
  }

  async batch(request: SkillBatchRequest): Promise<SkillBatchResult> {
    if (!Array.isArray(request.names) || request.names.length === 0 || request.names.length > 100) throw new Error('skill/invalid-batch');
    const names = [...new Set(request.names)];
    for (const name of names) this.assertName(name);
    const results = [];
    for (const name of names) {
      try {
        const receipt = request.action === 'enable'
          ? await this.setEnabled(name, true)
          : request.action === 'disable'
            ? await this.setEnabled(name, false)
            : await this.dependencyImpact(name).then(impact => this.uninstall(name, impact.revision));
        results.push({ name, ok: true as const, receipt });
      } catch (error) {
        results.push({ name, ok: false as const, error: error instanceof Error ? error.message : 'skill/internal' });
      }
    }
    return { action: request.action, results };
  }

  async listTrash(): Promise<readonly TrashedSkillSummary[]> {
    await mkdir(this.receiptRoot, { recursive: true });
    const rows: TrashedSkillSummary[] = [];
    for (const entry of await readdir(this.receiptRoot, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const receipt = await this.trashReceipt(entry.name.slice(0, -5));
      if (!receipt) continue;
      try { await lstat(receipt.trashedEntry); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
      rows.push({ id: receipt.id, name: receipt.name, removedAt: receipt.removedAt, previousState: receipt.previousState });
    }
    return rows.sort((a, b) => b.removedAt.localeCompare(a.removedAt));
  }

  async restore(id: string): Promise<SkillMutationReceipt> {
    if (!trashIdPattern.test(id)) throw new Error('skill/invalid-trash-id');
    const receipt = await this.trashReceipt(id);
    if (!receipt) throw new Error('skill/trash-not-found');
    return this.withSkillLock(receipt.name, async () => {
      if (await this.activeEntry(receipt.name) || await this.disabledEntry(receipt.name)) throw new Error('skill/target-exists');
      if (!this.rootFor(receipt.originalEntry) || !inside(this.trashRoot, receipt.trashedEntry)) throw new Error('skill/path-outside-managed-roots');
      if (receipt.previousState === 'disabled') {
        const target = join(this.disabledRoot, basename(receipt.originalEntry));
        await this.assertAbsent(target); await mkdir(dirname(target), { recursive: true });
        await this.writeJson(this.originPath(receipt.name), { name: receipt.name, originalEntry: receipt.originalEntry, directoryBundle: receipt.directoryBundle } satisfies DisabledOrigin);
        await rename(receipt.trashedEntry, target);
        await this.removeJson(this.receiptPath(id));
        return { name: receipt.name, state: 'disabled', path: target };
      }
      await this.assertAbsent(receipt.originalEntry); await mkdir(dirname(receipt.originalEntry), { recursive: true });
      await rename(receipt.trashedEntry, receipt.originalEntry); await this.removeJson(this.receiptPath(id));
      return { name: receipt.name, state: 'enabled', path: receipt.originalEntry };
    });
  }

  /** Local catalog metadata joined with the current discovery state. */
  async catalog(signal?: AbortSignal): Promise<SkillCatalogSummary> {
    signal?.throwIfAborted();
    const rows = await this.list(signal);
    return this.catalogStore.summary(new Set(rows.map(row => row.name)));
  }

  /**
   * Install one catalog payload. The payload copy is inert until this call, and
   * publication reuses installImport so collision checks, copy verification and
   * the atomic rename have exactly one implementation.
   */
  async installFromCatalog(name: string, scope?: SkillInstallScope, signal?: AbortSignal): Promise<SkillMutationReceipt> {
    this.assertName(name);
    signal?.throwIfAborted();
    const eligibility = await this.catalogStore.eligibility(name);
    if (!eligibility.known) throw new Error('skill/catalog-entry-unknown');
    if (!eligibility.installable) throw new Error('skill/catalog-entry-over-limit');
    const source = await this.catalogStore.payloadPath(name);
    if (!source) throw new Error('skill/catalog-payload-missing');
    return this.installImport({ source, scope }, signal);
  }

  async readCatalogIcon(name: string): Promise<SkillCatalogIcon | undefined> {
    this.assertName(name);
    return this.catalogStore.icon(name);
  }

  private async fromDefinition(definition: SkillDefinition): Promise<ManagedSkillDetail | undefined> {
    const readonlyDetail: ManagedSkillDetail = {
      name: definition.name, description: definition.description, whenToUse: definition.whenToUse,
      modelInvocable: definition.invocation.modelInvocable, state: 'readonly', manageable: false, resources: [],
    };
    if (!definition.path) return readonlyDetail;
    const active = await this.activeEntry(definition.name);
    if (!active) return readonlyDetail;
    // Harness exposes a canonical instruction path; configured roots may use
    // an OS alias (e.g. /var -> /private/var). Compare actual files only after
    // activeEntry has enforced the managed-root and symlink checks. A winning
    // external skill with the same name must never select the managed copy.
    if (await realpath(definition.path) !== await realpath(active.file)) return readonlyDetail;
    const document = await readFile(active.file, 'utf8');
    const directory = dirname(active.file);
    return {
      name: definition.name, description: definition.description, whenToUse: definition.whenToUse,
      modelInvocable: definition.invocation.modelInvocable, state: 'enabled', manageable: true,
      document, revision: digest(document), directoryPath: directory, resources: await resourceFiles(directory),
    };
  }

  private isManagedSummary(skill: SkillSummary): boolean {
    return skill.resourceBase?.kind === 'directory' && Boolean(this.rootFor(join(skill.resourceBase.path, 'SKILL.md')));
  }

  private rootFor(path: string): string | undefined { return this.activeRoots.find(root => inside(root, path)); }
  private assertName(name: string): void { if (!skillNamePattern.test(name) || !isSkillName(name)) throw new Error('skill/invalid-name'); }
  private async assertAbsent(path: string): Promise<void> { try { await stat(path); throw new Error('skill/target-exists'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } }
  private async disabledEntry(name: string): Promise<{ entry: string; file: string; directoryBundle: boolean } | undefined> {
    for (const entry of [join(this.disabledRoot, name), join(this.disabledRoot, `${name}.md`)]) {
      try {
        const info = await lstat(entry);
        if (info.isSymbolicLink()) throw new Error('skill/path-symlink');
        if (info.isDirectory()) {
          const file = join(entry, 'SKILL.md');
          const fileInfo = await lstat(file);
          if (fileInfo.isSymbolicLink()) throw new Error('skill/path-symlink');
          if (fileInfo.isFile()) return { entry, file, directoryBundle: true };
        }
        if (info.isFile()) return { entry, file: entry, directoryBundle: false };
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    return undefined;
  }
  private async activeEntry(name: string): Promise<{ entry: string; file: string; directoryBundle: boolean } | undefined> {
    for (const root of this.activeRoots) {
      for (const entry of [join(root, name), join(root, `${name}.md`)]) {
        try {
          const info = await lstat(entry);
          if (info.isSymbolicLink()) throw new Error('skill/path-symlink');
          if (info.isDirectory()) {
            const file = join(entry, 'SKILL.md');
            try {
              const fileInfo = await lstat(file);
              if (fileInfo.isSymbolicLink()) throw new Error('skill/path-symlink');
              if (fileInfo.isFile() && await this.isSafeManagedFile(file)) return { entry, file, directoryBundle: true };
            }
            catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
          }
          if (info.isFile() && await this.isSafeManagedFile(entry)) return { entry, file: entry, directoryBundle: false };
        } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      }
    }
    return undefined;
  }

  private async resourceTarget(name: string, resourcePath: string, allowMissing: boolean): Promise<string> {
    this.assertName(name);
    if (!resourcePath || resourcePath === 'SKILL.md' || resourcePath.includes('\\') || resourcePath.startsWith('/') || resourcePath.split('/').some(part => !part || part === '.' || part === '..')) {
      throw new Error('skill/invalid-resource-path');
    }
    const current = await this.detail(name);
    if (!current?.directoryPath || current.state === 'readonly') throw new Error('skill/not-manageable');
    const target = resolve(current.directoryPath, resourcePath);
    if (!inside(current.directoryPath, target)) throw new Error('skill/invalid-resource-path');
    await this.assertResourceParent(name, dirname(target));
    try {
      const info = await lstat(target);
      if (info.isSymbolicLink() || !info.isFile()) throw new Error('skill/path-symlink');
      if (!await this.isSafeManagedFile(target, current.state === 'disabled' ? this.disabledRoot : undefined)) throw new Error('skill/path-outside-managed-roots');
    } catch (error) {
      if (!allowMissing || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    return target;
  }

  private async assertResourceParent(name: string, parent: string): Promise<void> {
    const current = await this.detail(name);
    if (!current?.directoryPath || !inside(current.directoryPath, parent)) throw new Error('skill/invalid-resource-path');
    let cursor = resolve(parent);
    const root = resolve(current.directoryPath);
    while (inside(root, cursor) && cursor !== root) {
      try { if ((await lstat(cursor)).isSymbolicLink()) throw new Error('skill/path-symlink'); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      cursor = dirname(cursor);
    }
  }

  private async isSafeManagedFile(path: string, explicitRoot?: string): Promise<boolean> {
    try {
      const resolvedPath = await realpath(path);
      const roots = explicitRoot ? [explicitRoot] : this.activeRoots;
      for (const root of roots) {
        await mkdir(root, { recursive: true });
        if (inside(await realpath(root), resolvedPath)) return true;
      }
      return false;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  private originPath(name: string): string { return join(this.originRoot, `${name}.json`); }
  private receiptPath(id: string): string { return join(this.receiptRoot, `${id}.json`); }
  private draftPath(id: string): string { return join(this.draftRoot, `${id}.json`); }
  private async disabledOrigin(name: string): Promise<DisabledOrigin | undefined> {
    try {
      const value = JSON.parse(await readFile(this.originPath(name), 'utf8')) as DisabledOrigin;
      return value.name === name && typeof value.originalEntry === 'string' && Boolean(this.rootFor(value.originalEntry)) ? value : undefined;
    } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
  }
  private async trashReceipt(id: string): Promise<TrashReceipt | undefined> {
    if (!trashIdPattern.test(id)) return undefined;
    try {
      const value = JSON.parse(await readFile(this.receiptPath(id), 'utf8')) as TrashReceipt;
      return value.id === id && skillNamePattern.test(value.name) && typeof value.originalEntry === 'string' && typeof value.trashedEntry === 'string' ? value : undefined;
    } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
  }
  private async atomicWrite(path: string, content: string): Promise<void> {
    const temporary = `${path}.workdsh-${process.pid}-${Date.now()}.tmp`;
    await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    try { await rename(temporary, path); }
    catch (error) { await unlink(temporary).catch(() => {}); throw error; }
  }
  private async writeJson(path: string, value: object): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await this.atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
  }
  private async removeJson(path: string): Promise<void> {
    try { await unlink(path); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  private async withSkillLock<T>(name: string, operation: () => Promise<T>): Promise<T> {
    await mkdir(this.lockRoot, { recursive: true });
    const lockPath = join(this.lockRoot, `${name}.lock`);
    let handle: Awaited<ReturnType<typeof open>> | undefined;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { handle = await open(lockPath, 'wx', 0o600); await handle.writeFile(`${process.pid}\n`); break; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        let age: number;
        try { age = Date.now() - (await stat(lockPath)).mtimeMs; }
        catch (statError) { if ((statError as NodeJS.ErrnoException).code === 'ENOENT') continue; throw statError; }
        if (age > 60_000) { await this.removeJson(lockPath); continue; }
        await new Promise(resolve => setTimeout(resolve, 25));
      }
    }
    if (!handle) throw new Error('skill/busy');
    try { return await operation(); }
    finally { await handle.close(); await this.removeJson(lockPath); }
  }

  // ── Cross-domain revision capability (D04 dependency adaptation) ──────────
  // Lets an expert freeze an explicit Skill dependency into an immutable snapshot
  // mounted through the official provider, without the consumer walking this
  // plugin's private directories. Frozen content does not freeze source state:
  // checkRevision still reports a disabled/uninstalled source so the expert refuses.

  private retainedRoot(): string { return join(this.stateRoot, 'retained-revisions'); }
  private retentionManifestPath(revisionId: string): string { return join(this.retainedRoot(), `${revisionId}.manifest.json`); }
  private snapshotDirFor(revisionId: string): string { return join(this.retainedRoot(), revisionId); }

  private async readRetentionManifest(path: string): Promise<RetentionManifest | undefined> {
    try { return JSON.parse(await readFile(path, 'utf8')) as RetentionManifest; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
  }

  async resolveRevision(skillId: string, expectedDigest?: string, signal?: AbortSignal): Promise<SkillRevisionRef> {
    this.assertName(skillId); signal?.throwIfAborted();
    const detail = await this.detail(skillId, signal);
    if (!detail?.directoryPath) throw new Error('skill/revision-source-missing');
    if (detail.state === 'disabled') throw new Error('skill/revision-source-disabled');
    if (detail.state === 'invalid') throw new Error('skill/revision-source-invalid');
    const { contentDigest } = await snapshotFiles(detail.directoryPath, signal);
    if (expectedDigest && expectedDigest !== contentDigest) throw new Error('skill/revision-drift');
    return { skillId, revisionId: `rev-${contentDigest.slice(0, 24)}`, name: skillId, contentDigest };
  }

  async retainRevision(ref: SkillRevisionRef, consumer: SkillConsumerRef, signal?: AbortSignal): Promise<RetainedSkillRevision> {
    this.assertName(ref.skillId); signal?.throwIfAborted();
    return this.withSkillLock(ref.skillId, async () => {
      const snapshotDir = this.snapshotDirFor(ref.revisionId);
      const manifestPath = this.retentionManifestPath(ref.revisionId);
      const target = join(snapshotDir, ref.name);
      const existing = await this.readRetentionManifest(manifestPath);
      if (existing && existing.contentDigest === ref.contentDigest) {
        const current = await snapshotFiles(target, signal);
        if (current.contentDigest !== ref.contentDigest) throw new Error('skill/revision-snapshot-drift');
        const retainedBy = addConsumer(existing.retainedBy, consumer);
        await this.writeJson(manifestPath, { ...existing, retainedBy });
        return { ref, snapshotDir, files: current.files, retainedBy };
      }
      const detail = await this.detail(ref.skillId, signal);
      if (!detail?.directoryPath) throw new Error('skill/revision-source-missing');
      const source = await snapshotFiles(detail.directoryPath, signal);
      if (source.contentDigest !== ref.contentDigest) throw new Error('skill/revision-drift');
      await rm(snapshotDir, { recursive: true, force: true });
      await mkdir(target, { recursive: true });
      for (const file of source.files) {
        const to = join(target, file.path);
        await mkdir(dirname(to), { recursive: true });
        await copyFile(join(detail.directoryPath, file.path), to);
      }
      const retainedBy = addConsumer(existing?.retainedBy ?? [], consumer);
      const manifest: RetentionManifest = { ref, contentDigest: ref.contentDigest, files: source.files, retainedBy, createdAt: new Date().toISOString() };
      await this.writeJson(manifestPath, manifest);
      return { ref, snapshotDir, files: source.files, retainedBy };
    });
  }

  async checkRevision(ref: SkillRevisionRef, _actor: unknown, signal?: AbortSignal): Promise<SkillRevisionCheck> {
    this.assertName(ref.skillId); signal?.throwIfAborted();
    const snapshotDir = this.snapshotDirFor(ref.revisionId);
    const target = join(snapshotDir, ref.name);
    let retained = false;
    let status: SkillRevisionStatus;
    try {
      const snapshot = await snapshotFiles(target, signal);
      retained = true;
      status = snapshot.contentDigest === ref.contentDigest ? 'intact' : 'drifted';
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      status = 'missing';
    }
    if (status === 'intact') {
      const detail = await this.detail(ref.skillId, signal);
      if (!detail) status = 'source-uninstalled';
      else if (detail.state === 'disabled') status = 'source-disabled';
    }
    return { ref, status, retained, ...(retained ? { snapshotDir } : {}), ...(status === 'intact' ? {} : { reason: status }) };
  }

  async releaseReference(ref: SkillRevisionRef, consumer: SkillConsumerRef, _signal?: AbortSignal): Promise<void> {
    this.assertName(ref.skillId);
    return this.withSkillLock(ref.skillId, async () => {
      const manifestPath = this.retentionManifestPath(ref.revisionId);
      const manifest = await this.readRetentionManifest(manifestPath);
      if (!manifest) return;
      const retainedBy = manifest.retainedBy.filter((entry) => !(entry.domain === consumer.domain && entry.id === consumer.id));
      if (retainedBy.length === 0) {
        await rm(this.snapshotDirFor(ref.revisionId), { recursive: true, force: true });
        await this.removeJson(manifestPath);
        return;
      }
      await this.writeJson(manifestPath, { ...manifest, retainedBy });
    });
  }
}
