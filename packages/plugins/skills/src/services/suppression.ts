import { lstat, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { isSkillName, type SkillCandidate, type SkillProvider, type SkillProviderControl } from '@deepseek-ai/dsh-skill';

/**
 * Registry-level suppression for skills whose files WorkDSH does not own.
 *
 * A packaged or third-party provider keeps its own skills discoverable, and the
 * official Skills subsystem has no per-name exclusion: the only public way to
 * stop exposing one name is to win its duplicate inside the same registry layer
 * with a smaller rank and a contribution that refuses both invocation surfaces.
 * The files stay owned, updated and removed by their own plugin.
 */
export const suppressionProvider = 'workdsh-skill-suppression';
/**
 * Rank of a suppression candidate. It must outrank the registry's runtime
 * contributions (250) and packaged roots (600) so a disabled name wins its
 * duplicate inside the layer, while project roots (100/200) stay deliberately
 * out of reach so a project-owned skill of the same name remains invocable.
 */
export const suppressionRank = 240;
export const suppressionFile = 'suppressed.json';

const skillNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const frontmatterPattern = /^---\s*\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

/** One skill name this Host hides from both the model and the user command surface. */
export interface SuppressedSkill {
  readonly name: string;
  readonly description: string;
  readonly whenToUse?: string;
  /** Directory that owns the visible SKILL.md, as reported by the winning provider. */
  readonly directory: string;
  /** Source of the original contribution, kept for display and diagnostics. */
  readonly source: string;
  readonly suppressedAt: string;
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

function readRecord(value: unknown): SuppressedSkill | undefined {
  const row = asRecord(value);
  if (!row) return undefined;
  const { name, description, directory, source, suppressedAt, whenToUse } = row;
  if (typeof name !== 'string' || !skillNamePattern.test(name) || !isSkillName(name)) return undefined;
  if (typeof description !== 'string' || !description.trim()) return undefined;
  if (typeof directory !== 'string' || !directory) return undefined;
  if (typeof source !== 'string' || !source) return undefined;
  if (typeof suppressedAt !== 'string') return undefined;
  if (whenToUse !== undefined && typeof whenToUse !== 'string') return undefined;
  return { name, description, directory, source, suppressedAt, ...(whenToUse === undefined ? {} : { whenToUse }) };
}

/**
 * Durable list of disabled plugin-provided skills plus the registry provider that
 * projects it. The store owns the data; `ctx.skills` stays the discovery owner.
 *
 * A missing file is an empty store, while an unreadable or malformed file is a
 * hard failure: reads degrade to "nothing suppressed" only through the async
 * guard below, and every mutation reports `skill/suppression-store-unavailable`
 * instead of silently overwriting state it could not read.
 */
export class SkillSuppressionStore {
  private readonly file: string;
  private readonly records = new Map<string, SuppressedSkill>();
  private readonly ready: Promise<void>;
  private invalidate: () => void = () => {};

  constructor(stateRoot: string) {
    this.file = join(stateRoot, suppressionFile);
    this.ready = this.load();
  }

  /** Borrow the exact registration's lifecycle so mutations refresh official discovery. */
  bind(control: SkillProviderControl): void { this.invalidate = () => control.invalidate(); }

  /** Wait for the first read so sync lookups below see the persisted state. */
  async hydrate(): Promise<void> { await this.ensure(); }

  has(name: string): boolean { return this.records.has(name); }
  get(name: string): SuppressedSkill | undefined { return this.records.get(name); }
  list(): readonly SuppressedSkill[] { return [...this.records.values()].sort((left, right) => left.name.localeCompare(right.name)); }

  /** Hide one plugin-provided skill. Fails closed when the instruction file is unreadable. */
  async add(entry: SuppressedSkill): Promise<void> {
    await this.ensure();
    try { await this.readDocument(entry.directory); }
    catch { throw new Error('skill/not-manageable'); }
    this.records.set(entry.name, entry);
    try { await this.persist(); }
    catch (error) { this.records.delete(entry.name); throw error; }
    this.invalidate();
  }

  /** Restore the name to its own provider. Returns false when it was not suppressed. */
  async remove(name: string): Promise<boolean> {
    await this.ensure();
    const entry = this.records.get(name);
    if (!entry) return false;
    this.records.delete(name);
    try { await this.persist(); }
    catch (error) { this.records.set(name, entry); throw error; }
    this.invalidate();
    return true;
  }

  /** The winning candidate provider: same name, smaller rank, no invocation surface. */
  provider(): SkillProvider {
    return {
      name: suppressionProvider,
      list: async options => {
        await this.ensure();
        options.signal?.throwIfAborted();
        const candidates: SkillCandidate[] = [];
        for (const entry of this.list()) {
          const file = join(entry.directory, 'SKILL.md');
          try {
            const info = await lstat(file);
            if (!info.isFile() || info.isSymbolicLink()) continue;
          } catch { continue; }
          candidates.push({
            name: entry.name,
            description: entry.description,
            ...(entry.whenToUse === undefined ? {} : { whenToUse: entry.whenToUse }),
            invocation: { modelInvocable: false, userInvocable: false },
            source: entry.source,
            provider: suppressionProvider,
            resourceBase: { kind: 'directory', path: entry.directory },
            rank: suppressionRank,
            locator: entry.directory,
            path: file,
          });
        }
        return candidates;
      },
      get: async (candidate, options) => {
        options.signal?.throwIfAborted();
        const directory = typeof candidate.locator === 'string' ? candidate.locator : undefined;
        if (!directory) return undefined;
        let document: string;
        try { document = await this.readDocument(directory); } catch { return undefined; }
        return {
          name: candidate.name,
          description: candidate.description,
          ...(candidate.whenToUse === undefined ? {} : { whenToUse: candidate.whenToUse }),
          invocation: candidate.invocation,
          source: candidate.source,
          provider: candidate.provider,
          resourceBase: candidate.resourceBase,
          ...(candidate.path === undefined ? {} : { path: candidate.path }),
          content: document.replace(frontmatterPattern, '').trim(),
        };
      },
    };
  }

  private async readDocument(directory: string): Promise<string> {
    const file = join(directory, 'SKILL.md');
    const info = await lstat(file);
    if (info.isSymbolicLink() || !info.isFile()) throw new Error('skill/not-manageable');
    return await readFile(file, 'utf8');
  }

  private async ensure(): Promise<void> {
    try { await this.ready; }
    catch { throw new Error('skill/suppression-store-unavailable'); }
  }

  private async load(): Promise<void> {
    let text: string;
    try { text = await readFile(this.file, 'utf8'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw new Error(`skill/suppression-store-unreadable: ${String(error)}`);
    }
    const rows = asRecord(JSON.parse(text))?.skills;
    if (!Array.isArray(rows)) throw new Error('skill/suppression-store-invalid');
    for (const row of rows) { const entry = readRecord(row); if (entry) this.records.set(entry.name, entry); }
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    const temporary = `${this.file}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify({ version: 1, skills: this.list() }, null, 2)}\n`);
    await rename(temporary, this.file);
  }
}
