import { createHash } from 'node:crypto';
import { lstat, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import type { SkillCatalogEntry, SkillCatalogIcon, SkillCatalogStatus, SkillCatalogSummary, SkillDiagnostic } from '../shared.js';

/**
 * Read-only view over the WorkDSH-owned local skill catalog.
 *
 * The catalog is plain data below the shared Agents home (`catalog.json`,
 * `icons/`, `payloads/`). This store owns metadata lookup, icon bytes and
 * payload resolution only; installation itself stays in the skill manager's
 * import path so Harness remains the discovery and execution owner.
 */
export const skillCatalogIconPath = '/api/workdsh-skills/icon';
const CATALOG_SCHEMA = 1;
const CATALOG_KIND = 'workdsh-skill-catalog';
const skillNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const contentTypes: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

interface CatalogFileEntry {
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly categories?: readonly string[];
  readonly version?: string;
  readonly examples?: readonly string[];
  readonly icon?: string;
  readonly payload?: string;
  readonly installable?: boolean;
  readonly installLimits?: readonly string[];
}

interface CatalogFile {
  readonly schema: number;
  readonly kind: string;
  readonly generatedAt?: string;
  readonly categories?: readonly string[];
  readonly entries: readonly CatalogFileEntry[];
}

interface LoadedCatalog {
  readonly status: SkillCatalogStatus;
  readonly file?: CatalogFile;
  readonly diagnostics: readonly SkillDiagnostic[];
}

function inside(root: string, target: string): boolean {
  const part = relative(resolve(root), resolve(target));
  return part !== '' && !part.startsWith(`..${sep}`) && part !== '..' && !part.startsWith(sep);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function strings(value: unknown, limit: number): string[] {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim().length > 0).slice(0, limit) as string[] : [];
}

export class SkillCatalogStore {
  private cache?: { readonly signature: string; readonly catalog: LoadedCatalog; readonly icons: Map<string, { path: string; revision: string }> };

  constructor(private readonly root: string) {}

  get location(): string { return this.root; }

  /** Catalog metadata for the given installed names plus live install state. */
  async summary(installed: ReadonlySet<string>): Promise<SkillCatalogSummary> {
    const state = await this.load();
    if (!state.file) return { status: state.status, entries: [], categories: [], diagnostics: state.diagnostics };
    const entries: SkillCatalogEntry[] = [];
    for (const row of state.file.entries) {
      if (!skillNamePattern.test(row.name)) continue;
      const limit = Array.isArray(row.installLimits) ? row.installLimits.filter(item => typeof item === 'string') : undefined;
      entries.push({
        name: row.name,
        title: typeof row.title === 'string' && row.title.trim() ? row.title.trim() : row.name,
        description: typeof row.description === 'string' ? row.description.trim() : row.name,
        categories: strings(row.categories, 4),
        ...(typeof row.version === 'string' && row.version.trim() ? { version: row.version.trim() } : {}),
        ...(strings(row.examples, 3).length ? { examples: strings(row.examples, 3) } : {}),
        ...(this.iconUrl(state, row.name) ? { iconUrl: this.iconUrl(state, row.name) as string } : {}),
        installed: installed.has(row.name),
        installable: row.installable !== false && !limit?.length,
        ...(limit?.length ? { installLimits: limit } : {}),
      });
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    const categories = [...new Set(entries.flatMap(entry => entry.categories))];
    return {
      status: state.status,
      entries,
      categories,
      ...(state.file.generatedAt ? { generatedAt: state.file.generatedAt } : {}),
      ...(state.diagnostics.length ? { diagnostics: state.diagnostics } : {}),
    };
  }

  /** Metadata for merging into managed summaries, keyed by skill name. */
  async metadata(installed: ReadonlySet<string>): Promise<Map<string, { title: string; localizedDescription?: string; categories?: readonly string[]; iconUrl?: string }>> {
    const summary = await this.summary(installed);
    const rows = new Map<string, { title: string; localizedDescription?: string; categories?: readonly string[]; iconUrl?: string }>();
    for (const entry of summary.entries) {
      rows.set(entry.name, {
        title: entry.title,
        ...(entry.description ? { localizedDescription: entry.description } : {}),
        ...(entry.categories.length ? { categories: entry.categories } : {}),
        ...(entry.iconUrl ? { iconUrl: entry.iconUrl } : {}),
      });
    }
    // Product-owned labels; third-party names are never translated automatically.
    const builtinTitles: Readonly<Record<string, string>> = {
      'workdsh-skill-creator': '技能创建与优化',
      'workdsh-expert-manager': '专家与专家团制作',
      'workdsh-ppt-design': 'PPT 专业设计',
      'workdsh-word-design': 'Word 文档设计',
      'workdsh-excel-design': 'Excel 表格设计',
      'workdsh-web-design': '网页设计与制作',
      'workdsh-pdf-design': 'PDF 文档设计',
    };
    for (const [name, title] of Object.entries(builtinTitles)) {
      if (installed.has(name) && (!rows.get(name)?.title || rows.get(name)?.title === name)) rows.set(name, { ...rows.get(name), title });
    }
    return rows;
  }

  /** Install eligibility for one entry; limits mirror the import path bounds. */
  async eligibility(name: string): Promise<{ known: boolean; installable: boolean; limits?: readonly string[] }> {
    const state = await this.load();
    const row = state.file?.entries.find(entry => entry.name === name);
    if (!state.file || !row) return { known: false, installable: false };
    const limits = Array.isArray(row.installLimits) ? row.installLimits.filter(item => typeof item === 'string') : [];
    return { known: true, installable: row.installable !== false && limits.length === 0, ...(limits.length ? { limits } : {}) };
  }

  /** Inert payload directory for one entry; verified to stay inside the catalog. */
  async payloadPath(name: string): Promise<string | undefined> {
    const state = await this.load();
    const row = state.file?.entries.find(entry => entry.name === name);
    if (!row || typeof row.payload !== 'string') return undefined;
    const target = resolve(this.root, row.payload);
    if (!inside(this.root, target)) return undefined;
    try {
      const info = await lstat(target);
      if (info.isSymbolicLink() || !info.isDirectory()) return undefined;
      const skillFile = await lstat(join(target, 'SKILL.md'));
      if (!skillFile.isFile() || skillFile.isSymbolicLink()) return undefined;
    } catch { return undefined; }
    return target;
  }

  /** Icon bytes for one entry, content-addressed by revision for safe caching. */
  async icon(name: string): Promise<SkillCatalogIcon | undefined> {
    const state = await this.load();
    const resolved = state.icons.get(name);
    if (!resolved) return undefined;
    const type = contentTypes[extname(resolved.path).toLowerCase()];
    if (!type) return undefined;
    try {
      const bytes = await readFile(resolved.path);
      return { bytes, contentType: type, revision: resolved.revision };
    } catch { return undefined; }
  }

  private iconUrl(state: LoadedCatalog & { icons: Map<string, { path: string; revision: string }> }, name: string): string | undefined {
    const resolved = state.icons.get(name);
    if (!resolved) return undefined;
    return `${skillCatalogIconPath}?name=${encodeURIComponent(name)}&rev=${resolved.revision}`;
  }

  private async load(): Promise<LoadedCatalog & { icons: Map<string, { path: string; revision: string }> }> {
    const file = join(this.root, 'catalog.json');
    let signature = '';
    try {
      const info = await stat(file);
      signature = `${info.mtimeMs}:${info.size}`;
    } catch {
      return { status: 'missing', diagnostics: [{ code: 'skill/catalog-missing', message: '本地技能目录未配置。', path: this.root }], icons: new Map() };
    }
    if (this.cache?.signature === signature) return { ...this.cache.catalog, icons: this.cache.icons };
    const catalog = await this.parse(file);
    const icons = catalog.file ? await this.resolveIcons(catalog.file) : new Map<string, { path: string; revision: string }>();
    this.cache = { signature, catalog, icons };
    return { ...catalog, icons };
  }

  private async parse(file: string): Promise<LoadedCatalog> {
    let raw: unknown;
    try { raw = JSON.parse(await readFile(file, 'utf8')); }
    catch (error) {
      return { status: 'invalid', diagnostics: [{ code: 'skill/catalog-invalid', message: `本地技能目录无法解析：${error instanceof Error ? error.message : '未知错误'}`, path: file }] };
    }
    if (!isRecord(raw) || raw.schema !== CATALOG_SCHEMA || raw.kind !== CATALOG_KIND || !Array.isArray(raw.entries)) {
      return { status: 'invalid', diagnostics: [{ code: 'skill/catalog-invalid', message: `本地技能目录格式不受支持（需要 schema ${CATALOG_SCHEMA}）。`, path: file }] };
    }
    const entries = raw.entries.filter((entry): entry is CatalogFileEntry => isRecord(entry) && typeof entry.name === 'string');
    return {
      status: 'ready',
      file: {
        schema: raw.schema as number,
        kind: raw.kind as string,
        ...(typeof raw.generatedAt === 'string' ? { generatedAt: raw.generatedAt } : {}),
        ...(Array.isArray(raw.categories) ? { categories: strings(raw.categories, 32) } : {}),
        entries,
      },
      diagnostics: [],
    };
  }

  private async resolveIcons(file: CatalogFile): Promise<Map<string, { path: string; revision: string }>> {
    const icons = new Map<string, { path: string; revision: string }>();
    for (const row of file.entries) {
      if (typeof row.icon !== 'string' || !row.icon.trim()) continue;
      const target = resolve(this.root, row.icon);
      if (!inside(this.root, target)) continue;
      if (!contentTypes[extname(target).toLowerCase()]) continue;
      try {
        const info = await lstat(target);
        if (info.isSymbolicLink() || !info.isFile()) continue;
        const digest = createHash('sha256').update(await readFile(target)).digest('hex').slice(0, 12);
        icons.set(row.name, { path: target, revision: digest });
      } catch { /* A missing icon degrades to the letter mark. */ }
    }
    return icons;
  }
}
