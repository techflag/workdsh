import { assetBytes, validateResources, packagePath, type PackageAssets } from '../authoring/package-resources.js';
import { strFromU8, strToU8, unzipSync, zipSync, type Unzipped, type Zippable } from 'fflate';
import type {
  DomainIssue,
  ExpertDefinition,
  ExpertExport,
} from 'workdsh-contracts';
import { ExpertsError } from '../domain/values.js';
import { byteLength, digestOf, sha256Bytes } from '../domain/digest.js';
import { normalizeDefinition, validateDefinition } from '../domain/definition.js';
import { authoringDocuments, definitionFromDocuments } from '../authoring/documents.js';

/**
 * Local expert package portability (EP-06, CONTRACTS §6, AT-21).
 *
 * Format `workdsh-expert` schemaVersion 1 — a WorkDSH product format, never the
 * official Harness skill format. A package carries `manifest.json` + `expert.json`
 * (the definition + source attribution) and nothing that auto-installs: no owner,
 * internal preset id, granted permission, session id, credential, executable
 * script or npm package. Import produces a NEW personal draft; identity and
 * version are regenerated, professional content/examples/tags are preserved.
 *
 * Preflight is strict and runs before any commit: archive/uncompressed/per-file
 * size, file count, depth, path traversal, normalization collisions, unlisted
 * entries, manifest digest mismatch, unknown schema major, invalid or
 * duplicate-key JSON. Structural violations throw; definition field problems are
 * returned as `DomainIssue[]` so the UI can show them without a half-written
 * object. `manifest.json` never lists itself (its own digest is unknowable before
 * it is written), so it is exempt from the listed-entry check but must be present.
 */

export const EXPERT_FORMAT = 'workdsh-expert';
export const EXPERT_SCHEMA_VERSION = 1;

const MANIFEST_FILE = 'manifest.json';
const EXPERT_FILE = 'expert.json';

const MAX_ZIP_BYTES = 10 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 20 * 1024 * 1024;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 64;
const MAX_DEPTH = 8;
/** Permitted avatar image magic bytes; SVG is text and never accepted here. */
const IMAGE_SIGNATURES: readonly { readonly bytes: readonly number[] }[] = [
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { bytes: [0xff, 0xd8, 0xff] },
  { bytes: [0x52, 0x49, 0x46, 0x46] },
];

interface ManifestFile {
  readonly path: string;
  readonly size: number;
  readonly sha256: string;
  readonly executable?: boolean;
}

interface ExpertPackageManifest {
  readonly format: string;
  readonly schemaVersion: number;
  readonly expertFile: string;
  readonly files: readonly ManifestFile[];
}

/** expert.json payload: the definition plus optional, credential-free attribution. */
interface ExpertFilePayload {
  readonly definition: ExpertDefinition;
  readonly sourceAttribution?: string;
}

/** Fields that must never travel inside a package. */
const FORBIDDEN_DEFINITION_FIELDS = ['owner', 'presetRevisionRef', 'sessionId', 'credential', 'token', 'publishedRevisionRef'] as const;

function invalid(message: string, code: 'experts/invalid-request' | 'experts/invalid-definition' = 'experts/invalid-request'): never {
  throw new ExpertsError(code, message);
}

function byteCount(bytes: Uint8Array): number {
  return bytes.byteLength;
}

function assertSafeRelativePath(path: string): void {
  if (typeof path !== 'string' || path.length === 0 || path.length > 512) invalid('专家包文件路径无效。');
  if (path.startsWith('/') || path.includes('\\') || path.includes('\0') || /^[a-zA-Z]:/.test(path)) {
    invalid('专家包含绝对路径或非法分隔符，已拒绝。');
  }
  const segments = path.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    invalid('专家包含越界或空路径段，已拒绝。');
  }
  if (segments.length > MAX_DEPTH) invalid(`专家包目录层级超过 ${MAX_DEPTH} 层上限。`);
}

/** Reject entries that collide under case-folding or Unicode NFC normalization. */
function assertNoPathCollisions(paths: readonly string[]): void {
  const seen = new Map<string, string>();
  for (const path of paths) {
    const folded = path.normalize('NFC').toLowerCase();
    const prior = seen.get(folded);
    if (prior !== undefined && prior !== path) {
      invalid('专家包含大小写或 Unicode 规范化碰撞的路径，已拒绝。');
    }
    seen.set(folded, path);
  }
}

/**
 * Parse JSON and reject duplicate object keys. `JSON.parse` silently keeps the
 * last of a duplicated key, which could overwrite a validated field; the scan
 * runs on already-valid JSON and compares parsed key values (escapes resolved).
 */
function parseJsonRejectingDuplicateKeys(text: string, label: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    invalid(`${label} 不是有效 JSON。`);
  }
  const stacks: Set<string>[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === '{') { stacks.push(new Set()); i += 1; continue; }
    if (ch === '}') { stacks.pop(); i += 1; continue; }
    if (ch === '"') {
      const start = i;
      i += 1;
      while (i < n) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === '"') { i += 1; break; }
        i += 1;
      }
      const raw = text.slice(start, i);
      let j = i;
      while (j < n && (text[j] === ' ' || text[j] === '\t' || text[j] === '\n' || text[j] === '\r')) j += 1;
      if (text[j] === ':' && stacks.length > 0) {
        const key = JSON.parse(raw) as string;
        const top = stacks[stacks.length - 1];
        if (top.has(key)) invalid(`${label} 含重复键 "${key}"，已拒绝以避免静默覆盖。`);
        top.add(key);
      }
      continue;
    }
    i += 1;
  }
  return parsed;
}

function isPermittedImage(bytes: Uint8Array): boolean {
  return IMAGE_SIGNATURES.some((signature) => signature.bytes.every((byte, index) => bytes[index] === byte));
}

function assertManifest(value: unknown): ExpertPackageManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('manifest.json 结构无效。');
  const record = value as Record<string, unknown>;
  if (record.format !== EXPERT_FORMAT) invalid('manifest.format 不是 workdsh-expert，可能是其他格式的包。');
  const schemaVersion = record.schemaVersion;
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    invalid('manifest.schemaVersion 无效。');
  }
  if (schemaVersion > EXPERT_SCHEMA_VERSION) {
    invalid(`专家包 schemaVersion ${schemaVersion} 高于当前支持的 ${EXPERT_SCHEMA_VERSION}，请升级后再导入。`);
  }
  if (record.expertFile !== EXPERT_FILE) invalid('manifest.expertFile 必须为 expert.json。');
  if (!Array.isArray(record.files)) invalid('manifest.files 缺失或不是数组。');
  const files: ManifestFile[] = [];
  const seen = new Set<string>();
  for (const entry of record.files as unknown[]) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) invalid('manifest.files 条目结构无效。');
    const file = entry as Record<string, unknown>;
    if (typeof file.path !== 'string' || typeof file.size !== 'number' || typeof file.sha256 !== 'string') {
      invalid('manifest.files 条目缺少 path/size/sha256。');
    }
    assertSafeRelativePath(file.path);
    if (file.path === MANIFEST_FILE) invalid('manifest.files 不能列出 manifest.json 自身。');
    if (seen.has(file.path)) invalid(`manifest.files 含重复路径 "${file.path}"。`);
    seen.add(file.path);
    if (!Number.isInteger(file.size) || file.size < 0) invalid(`manifest.files "${file.path}" 的 size 无效。`);
    if (!/^[a-f0-9]{64}$/.test(file.sha256)) invalid(`manifest.files "${file.path}" 的 sha256 无效。`);
    files.push({ path: file.path, size: file.size, sha256: file.sha256 });
  }
  if (!seen.has(EXPERT_FILE)) invalid('manifest.files 必须列出 expert.json。');
  return { format: EXPERT_FORMAT, schemaVersion, expertFile: EXPERT_FILE, files };
}

function assertExpertPayload(value: unknown): ExpertFilePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('expert.json 结构无效。', 'experts/invalid-definition');
  const record = value as Record<string, unknown>;
  const definition = record.definition;
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    invalid('expert.json 缺少 definition 对象。', 'experts/invalid-definition');
  }
  const sourceAttribution = record.sourceAttribution;
  if (sourceAttribution !== undefined && (typeof sourceAttribution !== 'string' || byteLength(sourceAttribution) > 512)) {
    invalid('expert.json 的 sourceAttribution 无效。', 'experts/invalid-definition');
  }
  const definitionRecord = definition as Record<string, unknown>;
  for (const forbidden of FORBIDDEN_DEFINITION_FIELDS) {
    if (forbidden in definitionRecord) {
      invalid(`expert.json 含禁止字段 "${forbidden}"，已拒绝。`, 'experts/invalid-definition');
    }
  }
  return {
    definition: definition as ExpertDefinition,
    ...(typeof sourceAttribution === 'string' ? { sourceAttribution } : {}),
  };
}

/**
 * Validate an uploaded `.expert.zip`. Structural violations throw `ExpertsError`;
 * definition field problems come back as issues so the UI can present them.
 */
export function preflightPackage(zipBytes: Uint8Array): {
  candidate: ExpertDefinition;
  sourceAttribution?: string;
  issues: readonly DomainIssue[];
  previewDigest: string;
} {
  if (byteCount(zipBytes) > MAX_ZIP_BYTES) invalid(`专家包超过 ${MAX_ZIP_BYTES / (1024 * 1024)} MiB 上限。`);
  let entries: Unzipped;
  try {
    let declaredTotal = 0, declaredCount = 0;
    entries = unzipSync(zipBytes, { filter(file) {
      if (file.name.endsWith('/') && !file.originalSize) return false;
      declaredTotal += file.originalSize; declaredCount++;
      if (declaredCount > MAX_FILES || declaredTotal > 48 * 1024 * 1024 || file.originalSize > (file.name === EXPERT_FILE ? 32 * 1024 * 1024 : MAX_FILE_BYTES)) invalid('专家包单文件、数量或总大小过大。');
      return true;
    } });
    for (const path of Object.keys(entries)) if (path.endsWith('/') && !entries[path].length) delete entries[path];
  } catch {
    invalid('专家包不是有效的 zip 压缩包或使用了不支持的压缩格式。');
  }
  const paths = Object.keys(entries);
  if (paths.length === 0) invalid('专家包为空。');
  if (paths.length > MAX_FILES) invalid(`专家包文件数超过 ${MAX_FILES} 上限。`);
  for (const path of paths) assertSafeRelativePath(path);
  assertNoPathCollisions(paths);

  let totalUncompressed = 0;
  for (const path of paths) {
    const size = byteCount(entries[path]);
    if (size > (path === EXPERT_FILE ? 32 * 1024 * 1024 : MAX_FILE_BYTES)) invalid(`专家包文件 "${path}" 超过 ${MAX_FILE_BYTES / (1024 * 1024)} MiB 单文件上限。`);
    totalUncompressed += size;
  }
  if (totalUncompressed > (entries[EXPERT_FILE] ? 48 * 1024 * 1024 : MAX_UNCOMPRESSED_BYTES)) invalid('专家包总解压大小超过 20 MiB 上限。');

  if (!paths.includes(MANIFEST_FILE) && (paths.includes('.workdsh-expert/plugin.json') || paths.includes('.codebuddy-plugin/plugin.json'))) {
    const documents: Record<string, string> = {};
    const assets: Record<string, PackageAssets[string]> = {};
    for (const path of paths) {
      packagePath(path);
      if (/^(avatars|assets|bin)\//.test(path)) assets[path] = { base64: Buffer.from(entries[path]).toString('base64'), ...(path.startsWith('bin/') ? { executable: true } : {}) };
      else { try { documents[path] = new TextDecoder('utf-8', { fatal: true }).decode(entries[path]); } catch { assets[path] = { base64: Buffer.from(entries[path]).toString('base64') }; } }
    }
    const candidate = definitionFromDocuments(documents, assets);
    return { candidate, issues: validateDefinition(candidate), previewDigest: digestOf({ candidate, sourceAttribution: null }) };
  }
  if (!paths.includes(MANIFEST_FILE)) invalid('专家包缺少 manifest.json。');
  if (!paths.includes(EXPERT_FILE)) invalid('专家包缺少 expert.json。');

  const manifest = assertManifest(
    parseJsonRejectingDuplicateKeys(strFromU8(entries[MANIFEST_FILE]), 'manifest.json'),
  );

  // Every unzipped entry except manifest.json must be listed; every listed file
  // must be present with a matching size and sha256. Rejects unlisted/tampered.
  const listed = new Map(manifest.files.map((file) => [file.path, file]));
  for (const path of paths) {
    if (path !== MANIFEST_FILE && !listed.has(path)) invalid(`专家包含未在 manifest 列出的文件 "${path}"。`);
  }
  for (const file of manifest.files) {
    const bytes = entries[file.path];
    if (!bytes) invalid(`manifest 列出的文件 "${file.path}" 在压缩包中缺失。`);
    if (byteCount(bytes) !== file.size) invalid(`文件 "${file.path}" 大小与 manifest 不符。`);
    if (sha256Bytes(bytes) !== file.sha256) invalid(`文件 "${file.path}" 摘要与 manifest 不符，可能已被篡改。`);
    if (file.path !== EXPERT_FILE) packagePath(file.path);
  }

  const payload = assertExpertPayload(
    parseJsonRejectingDuplicateKeys(strFromU8(entries[EXPERT_FILE]), 'expert.json'),
  );
  const candidate = normalizeDefinition(payload.definition);
  if (paths.some(path => path.startsWith('agents/'))) {
    const assets = candidate.packageAssets ?? {};
    const documents = Object.fromEntries(paths.filter(path => path !== MANIFEST_FILE && path !== EXPERT_FILE && !(path in assets)).map(path => [path, strFromU8(entries[path])]));
    for (const [path, asset] of Object.entries(assets)) if (!Buffer.from(entries[path] ?? []).equals(assetBytes(path, asset))) invalid('二进制资源与作品内容不一致。');
    if (digestOf(definitionFromDocuments(documents, assets)) !== digestOf(candidate)) invalid('Markdown 制作稿与 expert.json 内容不一致，请从保存后的草稿重新导出。');
  }
  const issues = validateDefinition(candidate);
  const previewDigest = digestOf({ candidate, sourceAttribution: payload.sourceAttribution ?? null });
  return {
    candidate,
    ...(payload.sourceAttribution === undefined ? {} : { sourceAttribution: payload.sourceAttribution }),
    issues,
    previewDigest,
  };
}

/**
 * Build an export archive for one definition. Credential-free and owner-free;
 * returns the contract descriptor (byte count + digest) beside the raw archive so
 * the transport can stream a download without recomputing.
 */
export function buildExport(definition: ExpertDefinition, sourceAttribution?: string): {
  descriptor: ExpertExport;
  archive: Uint8Array;
} {
  const normalized = normalizeDefinition(definition);
  validateResources(normalized.packageDocuments ?? {}, normalized.packageAssets);
  const expertPayload: ExpertFilePayload = {
    definition: normalized,
    ...(sourceAttribution === undefined ? {} : { sourceAttribution }),
  };
  const expertBytes = strToU8(`${JSON.stringify(expertPayload, null, 2)}\n`);
  const documents = { ...Object.fromEntries(Object.entries(authoringDocuments(normalized)).map(([path, content]) => [path, strToU8(content)])), ...Object.fromEntries(Object.entries(normalized.packageAssets ?? {}).map(([path, asset]) => [path, assetBytes(path, asset)])) };
  const manifest: ExpertPackageManifest = {
    format: EXPERT_FORMAT,
    schemaVersion: EXPERT_SCHEMA_VERSION,
    expertFile: EXPERT_FILE,
    files: [{ path: EXPERT_FILE, size: byteCount(expertBytes), sha256: sha256Bytes(expertBytes) }, ...Object.entries(documents).map(([path, bytes]) => ({ path, size: byteCount(bytes), sha256: sha256Bytes(bytes) }))],
  };
  const manifestBytes = strToU8(`${JSON.stringify(manifest, null, 2)}\n`);
  const archive = zipSync({ [MANIFEST_FILE]: manifestBytes, [EXPERT_FILE]: expertBytes, ...documents } satisfies Zippable, { level: 9 });
  const descriptor: ExpertExport = {
    fileName: `${slugify(normalized.name)}.expert.zip`,
    bytes: byteCount(archive),
    digest: sha256Bytes(archive),
    definition: normalized,
    ...(sourceAttribution === undefined ? {} : { sourceAttribution }),
  };
  return { descriptor, archive };
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'expert';
}

/** Aggregate size guard reused by the transport before staging an upload. */
export function assertUploadWithinLimit(declaredLength: number | undefined): void {
  if (declaredLength !== undefined && Number.isFinite(declaredLength) && declaredLength > MAX_ZIP_BYTES) {
    invalid(`专家包超过 ${MAX_ZIP_BYTES / (1024 * 1024)} MiB 上限。`);
  }
}

export const EXPERT_IMPORT_LIMITS = Object.freeze({
  maxZipBytes: MAX_ZIP_BYTES,
  maxUncompressedBytes: MAX_UNCOMPRESSED_BYTES,
  maxFileBytes: MAX_FILE_BYTES,
  maxFiles: MAX_FILES,
  maxDepth: MAX_DEPTH,
});
