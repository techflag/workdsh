import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { unzipSync } from 'fflate';
import type { SkillImportInspection, SkillInstallScope, SkillMutationReceipt, StagedSkillImport } from '../shared.js';

const maximumUploadBytes = 50 * 1024 * 1024;
const maximumFiles = 400;
const maximumDepth = 6;
const stagingLifetimeMs = 24 * 60 * 60 * 1000;
const importIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type Receipt = StagedSkillImport & { readonly source: string; readonly createdAt: string; readonly sourceFingerprint: string };
type Inspect = (source: string, signal?: AbortSignal) => Promise<SkillImportInspection>;
type Install = (request: { source: string; scope?: SkillInstallScope }, signal?: AbortSignal) => Promise<SkillMutationReceipt>;

function safeArchivePath(raw: string): string | undefined {
  const portable = raw.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!portable || portable.includes('\0') || portable.startsWith('/') || /^[a-zA-Z]:/.test(portable)) throw new Error('skill/import-unsafe-path');
  const segments = portable.split('/').filter(Boolean);
  if (segments.some(segment => segment === '..')) throw new Error('skill/import-unsafe-path');
  if (segments[0] === '__MACOSX' || segments.at(-1) === '.DS_Store') return undefined;
  if (segments.length > maximumDepth + 2) throw new Error('skill/import-too-deep');
  return segments.join('/');
}

async function sourceFingerprint(root: string, signal?: AbortSignal): Promise<string> {
  const hash = createHash('sha256');
  const files: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    signal?.throwIfAborted();
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push(path);
      else throw new Error('skill/import-verification-failed');
    }
  };
  await visit(root);
  for (const path of files.sort()) {
    signal?.throwIfAborted();
    hash.update(path.slice(root.length + 1)); hash.update('\0');
    hash.update(await readFile(path)); hash.update('\0');
  }
  return hash.digest('hex');
}

async function writeUpload(body: ReadableStream<Uint8Array> | null, target: string, signal: AbortSignal): Promise<void> {
  if (!body) throw new Error('skill/import-empty');
  const handle = await open(target, 'wx', 0o600);
  const reader = body.getReader();
  let aborting: Promise<void> | undefined;
  const abortRead = (): void => {
    aborting = reader.cancel(signal.reason).catch(() => undefined);
  };
  signal.addEventListener('abort', abortRead, { once: true });
  let total = 0;
  try {
    for (;;) {
      signal.throwIfAborted();
      const part = await reader.read();
      signal.throwIfAborted();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > maximumUploadBytes) throw new Error('skill/import-too-large');
      await handle.write(part.value);
    }
    if (!total) throw new Error('skill/import-empty');
  } finally {
    signal.removeEventListener('abort', abortRead);
    await aborting;
    reader.releaseLock();
    await handle.close();
  }
}

async function extractZip(archive: string, target: string): Promise<string> {
  const compressed = await readFile(archive);
  let count = 0; let expanded = 0;
  let files: ReturnType<typeof unzipSync>;
  try {
    files = unzipSync(compressed, { filter: info => {
      const path = safeArchivePath(info.name);
      if (!path || info.name.endsWith('/')) return false;
      count += 1; expanded += info.originalSize;
      if (count > maximumFiles || expanded > maximumUploadBytes) throw new Error('skill/import-too-large');
      return true;
    }});
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('skill/')) throw error;
    throw new Error('skill/import-invalid-zip');
  }
  const written = new Set<string>();
  for (const [raw, bytes] of Object.entries(files)) {
    const path = safeArchivePath(raw);
    if (!path || raw.endsWith('/')) continue;
    const destination = resolve(target, normalize(path));
    if (destination !== target && !destination.startsWith(`${resolve(target)}${sep}`)) throw new Error('skill/import-unsafe-path');
    if (written.has(destination)) throw new Error('skill/import-duplicate-path');
    written.add(destination);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: 'wx', mode: 0o600 });
  }
  const skillFiles: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name === 'SKILL.md') skillFiles.push(path);
    }
  };
  await visit(target);
  if (skillFiles.length !== 1) throw new Error(skillFiles.length ? 'skill/import-multiple-skills' : 'skill/import-missing-skill-md');
  return dirname(skillFiles[0]);
}

/** Durable, bounded staging for browser uploads. Files remain inert until an explicit commit. */
export class SkillImportStaging {
  constructor(private readonly root: string, private readonly inspect: Inspect, private readonly install: Install) {}

  async stage(fileName: string, body: ReadableStream<Uint8Array> | null, signal: AbortSignal): Promise<StagedSkillImport> {
    await this.cleanupExpired();
    const safeName = basename(fileName.trim());
    const extension = extname(safeName).toLowerCase();
    if (!safeName || (extension !== '.zip' && extension !== '.md')) throw new Error('skill/import-file-type');
    const id = randomUUID(); const directory = join(this.root, id); const input = join(directory, `upload${extension}`);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    try {
      await writeUpload(body, input, signal);
      const declared = await stat(input);
      if (declared.size > maximumUploadBytes) throw new Error('skill/import-too-large');
      signal.throwIfAborted();
      const source = extension === '.zip' ? await extractZip(input, join(directory, 'tree')) : await this.stageMarkdown(input, directory);
      signal.throwIfAborted();
      const inspection = await this.inspect(source, signal);
      const createdAt = new Date(); const expiresAt = new Date(createdAt.getTime() + stagingLifetimeMs);
      const receipt: Receipt = { id, fileName: safeName, inspection, source, sourceFingerprint: await sourceFingerprint(source, signal), createdAt: createdAt.toISOString(), expiresAt: expiresAt.toISOString() };
      await writeFile(join(directory, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
      return { id, fileName: safeName, inspection, expiresAt: receipt.expiresAt };
    } catch (error) {
      await rm(directory, { recursive: true, force: true });
      throw error;
    }
  }

  async commit(id: string, scope?: SkillInstallScope, signal?: AbortSignal): Promise<SkillMutationReceipt> {
    signal?.throwIfAborted();
    const receipt = await this.readReceipt(id, signal);
    signal?.throwIfAborted();
    const installed = await this.install({ source: receipt.source, scope }, signal);
    await rm(join(this.root, id), { recursive: true, force: true });
    return installed;
  }

  async discard(id: string): Promise<void> {
    if (!importIdPattern.test(id)) throw new Error('skill/import-invalid-id');
    await rm(join(this.root, id), { recursive: true, force: true });
  }

  private async stageMarkdown(input: string, directory: string): Promise<string> {
    const target = join(directory, 'tree');
    await mkdir(target, { mode: 0o700 });
    await rename(input, join(target, 'SKILL.md'));
    return target;
  }

  private async readReceipt(id: string, signal?: AbortSignal): Promise<Receipt> {
    signal?.throwIfAborted();
    if (!importIdPattern.test(id)) throw new Error('skill/import-invalid-id');
    let receipt: Receipt;
    try { receipt = JSON.parse(await readFile(join(this.root, id, 'receipt.json'), 'utf8')) as Receipt; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('skill/import-expired'); throw error; }
    if (receipt.id !== id || typeof receipt.sourceFingerprint !== 'string' || !resolve(receipt.source).startsWith(`${resolve(join(this.root, id))}${sep}`)) throw new Error('skill/import-invalid-id');
    if (Date.parse(receipt.expiresAt) <= Date.now()) { await this.discard(id); throw new Error('skill/import-expired'); }
    const current = await this.inspect(receipt.source, signal);
    if (current.name !== receipt.inspection.name || current.totalBytes !== receipt.inspection.totalBytes || await sourceFingerprint(receipt.source, signal) !== receipt.sourceFingerprint) throw new Error('skill/import-verification-failed');
    return receipt;
  }

  private async cleanupExpired(): Promise<void> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    for (const entry of await readdir(this.root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !importIdPattern.test(entry.name)) continue;
      try { if (Date.now() - (await stat(join(this.root, entry.name))).mtimeMs > stagingLifetimeMs) await rm(join(this.root, entry.name), { recursive: true, force: true }); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
  }
}
