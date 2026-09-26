import { assetBytes, validateResources, type PackageAssets } from '../authoring/package-resources.js';
import { mkdir, readFile, writeFile, readdir, lstat, chmod, mkdtemp, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Context } from '@deepseek-ai/cordis';
import type { PresetDefinition } from '@deepseek-ai/dsh-agent-preset-registry';
import type {} from '@deepseek-ai/cordis-plugin-loader';
import { homedir } from 'node:os';
import type { ExpertDefinition, ExpertRevisionRef } from 'workdsh-contracts';
import { readFileSync } from 'node:fs';
import { compilePersonaPrefix, compilePersonaSuffix } from '../domain/definition.js';
import { sha256, shortDigest } from '../domain/digest.js';

/** Expert revisions declare official presets; Loader and AgentPresetRegistry own activation. */
export const COMPILER_VERSION = 'workdsh-expert-compiler/0.4-declarative-presets';

const PERSONA_MODULE = '@deepseek-ai/dsh-persona';
const SKILL_FS_MODULE = '@deepseek-ai/dsh-skill-filesystem';
const TOOL_SKILL_MODULE = '@deepseek-ai/dsh-tool-skill';

const LEGACY_TEAM_TOOL_REPLACEMENTS: Readonly<Record<string, string>> = {
  workdsh_expert_team_start: '官方 Team 已随当前会话建立（无需调用建团工具）',
  workdsh_expert_team_ask: '`spawn_teammate`、`send_message` 与 `wait_agent`',
  workdsh_expert_team_delegate: '`spawn_teammate`、`team_task_create` 与 `send_message`',
  workdsh_expert_team_status: '`list_agents`、`team_task_list` 与 `team_task_get`',
  workdsh_expert_team_complete: '`team_task_update`',
  workdsh_expert_team_deliver: '完成共享任务后直接汇总交付',
  workdsh_expert_team_cancel: '`interrupt_agent` 或更新共享任务状态',
};

/** Keep older published team assets usable after the 0.1.6 official Team migration. */
export function migrateLegacyTeamInstructions(text: string): string {
  return text.replace(/workdsh_expert_team_(?:start|ask|delegate|status|complete|deliver|cancel)\b/g, tool => LEGACY_TEAM_TOOL_REPLACEMENTS[tool] ?? tool);
}

export interface CompiledPreset {
  readonly presetId: string;
  readonly presetDir: string;
  readonly compositionDigest: string;
  readonly created: boolean;
}

export interface CompileInput {
  readonly expertId: string;
  readonly definition: ExpertDefinition;
  /** Absolute managed snapshot directories, one per retained Skill revision. */
  readonly snapshotDirs: readonly string[];
  readonly basePresetId: string;
  readonly packageRoot?: string;
  readonly teamMembers?: Readonly<Record<string, ExpertRevisionRef>>;
}

/** Lowercase kebab segment safe for `PRESET_ID = /^[a-z0-9][a-z0-9-]*$/`. */
function kebab(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return normalized || 'expert';
}

/** Deterministic preset id: `wd-exp-<kebab>-<digest>`; same content ⇒ same id (idempotent). */
export function presetIdFor(input: CompileInput): string {
  const digest = shortDigest({
    compiler: COMPILER_VERSION,
    base: input.basePresetId,
    definition: input.definition,
    snapshotDirs: [...input.snapshotDirs].sort(),
    ...(input.teamMembers ? { teamMembers: input.teamMembers } : {}),
  });
  return `wd-exp-${kebab(input.expertId)}-${digest}`;
}

/**
 * Compile (or reuse) the immutable preset directory for one expert revision.
 * Idempotent: an existing directory whose composition digest matches is reused.
 */
export function expertPresetDir(presetId: string): string {
  if (!/^wd-exp-[a-z0-9-]+$/.test(presetId)) throw new Error('experts/invalid-preset-id');
  return join(process.env.DSH_AGENTS_HOME ?? join(homedir(), '.agents'), '.workdsh-state', 'experts', 'presets', presetId);
}

const registrations = new WeakMap<Context, Map<string, Promise<void>>>();

/** Restore only the frozen declaration; never recompile an existing revision against a new base. */
export async function readExpertPreset(presetId: string): Promise<string> {
  try { return await readFile(join(expertPresetDir(presetId), 'preset.json'), 'utf8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw Object.assign(new Error('此专家为旧目录预设，请重新发布后创建新任务；历史任务不会自动换用新组合。'), { code: 'experts/preset-broken' });
    throw error;
  }
}

export async function registerExpertPreset(ctx: Context, presetId: string, expectedDigest: string): Promise<void> {
  const text = await readExpertPreset(presetId);
  if (sha256(text) !== expectedDigest) throw Object.assign(new Error('专家预设内容已变化，请重新发布。'), { code: 'experts/preset-drift' });
  let pending = registrations.get(ctx);
  if (!pending) { pending = new Map(); registrations.set(ctx, pending); }
  if (!pending.has(presetId)) {
    const definition = JSON.parse(text) as PresetDefinition;
    if (definition.id !== presetId) throw Object.assign(new Error('专家预设内容已变化，请重新发布。'), { code: 'experts/preset-drift' });
    const promise = ctx.agentPresets.register(definition).then(dispose => { ctx.effect(() => dispose); });
    pending.set(presetId, promise);
    promise.catch(() => { pending!.delete(presetId); });
  }
  await pending.get(presetId);
}

export async function compileExpertPreset(ctx: Context, input: CompileInput): Promise<CompiledPreset> {
  const presetId = presetIdFor(input);
  const presetDir = expertPresetDir(presetId);
  const files = input.definition.packageDocuments ?? {};
  const assets = input.definition.packageAssets ?? {};
  validateResources(files, assets);
  const manifestPath = join(presetDir, 'workdsh-expert-manifest.json');
  const inputDigest = sha256(renderComposition(input));
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (manifest.inputDigest !== inputDigest) throw Object.assign(new Error('专家预设内容已变化，请重新发布。'), { code: 'experts/preset-drift' });
    await verifyPackageFiles(presetDir, files, assets);
    await registerExpertPreset(ctx, presetId, manifest.compositionDigest);
    return { presetId, presetDir, compositionDigest: manifest.compositionDigest, created: false };
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }

  // The public Loader entry contains the effective Profile declaration, including !!js nodes.
  const base = [...ctx.loader.entries()].find(entry => !entry.disabled && entry.options.name === '@deepseek-ai/dsh-agent-preset' && entry.options.config?.id === input.basePresetId);
  if (!base) throw Object.assign(new Error('缺少官方标准模式声明，无法发布专家。'), { code: 'experts/preset-broken' });
  const plugins = JSON.parse(JSON.stringify(base.options.config.plugins)) as PresetDefinition['plugins'];
  const rootsInPackage = Object.keys(files).filter(path => /^skills\/[a-z][a-z0-9-]+\/SKILL\.md$/.test(path)).map(path => join(presetDir, 'expert-package', path.slice(0, -9)));
  const packageRoot = Object.keys(files).length || Object.keys(assets).length ? join(presetDir, 'expert-package') : undefined;
  const persona = expertPersonaConfig({ ...input, packageRoot });
  const skillConfig = { includeDefaultRoots: true, watch: false, customSkillDirs: [...input.snapshotDirs, ...rootsInPackage].sort() };
  const rows = [...plugins];
  for (const [name, config] of [[PERSONA_MODULE, persona], [SKILL_FS_MODULE, skillConfig]] as const) {
    const index = rows.findIndex(row => row.name === name);
    const row = { id: name === PERSONA_MODULE ? 'persona' : 'skill-filesystem', name, config };
    if (index < 0) rows.push(row); else rows[index] = { ...rows[index], config };
  }
  if (!rows.some(row => row.name === TOOL_SKILL_MODULE)) rows.push({ id: 'tool-skill', name: TOOL_SKILL_MODULE });
  const definition: PresetDefinition = { id: presetId, name: input.definition.name, description: input.definition.description, plugins: rows };
  const text = JSON.stringify(definition);
  await mkdir(join(presetDir, '..'), { recursive: true });
  const staging = await mkdtemp(presetDir + '.staging-');
  try {
    await mkdir(join(staging, 'expert-package'), { recursive: true });
    for (const [path, text] of Object.entries(files)) {
      const target = join(staging, 'expert-package', path);
      await mkdir(join(target, '..'), { recursive: true });
      await writeFile(target, text, 'utf8');
    }
    for (const [path, asset] of Object.entries(assets)) {
      const target = join(staging, 'expert-package', path);
      await mkdir(join(target, '..'), { recursive: true });
      await writeFile(target, assetBytes(path, asset));
      if (asset.executable) await chmod(target, 0o755);
    }
    await writeFile(join(staging, 'preset.json'), text, { flag: 'wx' });
    const compositionDigest = sha256(text);
    await writeFile(join(staging, 'workdsh-expert-manifest.json'), JSON.stringify({ inputDigest, compositionDigest }), { flag: 'wx' });
    try { await rename(staging, presetDir); }
    catch (error) {
      if (!['EEXIST', 'ENOTEMPTY'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      // Another publisher won; validate its immutable result instead of overwriting it.
      return await compileExpertPreset(ctx, input);
    }
    await registerExpertPreset(ctx, presetId, compositionDigest);
    return { presetId, presetDir, compositionDigest, created: true };
  } finally { await rm(staging, { recursive: true, force: true }); }
}

/** Render the persona/skill config we intend, used only for the idempotency digest. */
function renderComposition(input: CompileInput): string {
  return JSON.stringify({
    compiler: COMPILER_VERSION,
    prefix: compilePersonaPrefix(input.definition),
    suffix: compilePersonaSuffix(input.definition),
    snapshotDirs: [...input.snapshotDirs].sort(),
    packageDocuments: input.definition.packageDocuments ?? null,
    ...(input.definition.packageAssets ? { packageAssets: input.definition.packageAssets } : {}),
    teamMembers: input.teamMembers ?? null,
  });
}

export async function verifyPackageFiles(presetDir: string, files: Readonly<Record<string, string>>, assets: PackageAssets = {}): Promise<void> {
  validateResources(files, assets);
  if (!Object.keys(files).length && !Object.keys(assets).length) return;
  const root = join(presetDir, 'expert-package');
  const found: string[] = [];
  async function inventory(dir: string, prefix = ''): Promise<void> {
    for (const name of await readdir(dir)) {
      const path = prefix ? `${prefix}/${name}` : name;
      const info = await lstat(join(dir, name));
      if (info.isSymbolicLink()) throw new Error('experts/package-drift');
      if (info.isDirectory()) await inventory(join(dir, name), path);
      else if (info.isFile()) found.push(path);
      else throw new Error('experts/package-drift');
    }
  }
  await inventory(root);
  if (JSON.stringify(found.sort()) !== JSON.stringify([...Object.keys(files), ...Object.keys(assets)].sort())) throw new Error('experts/package-drift');
  for (const [path, text] of Object.entries(files)) {
    if (path.startsWith('/') || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('experts/invalid-package-path');
    if (await readFile(join(presetDir, 'expert-package', path), 'utf8') !== text) throw new Error('experts/package-drift');
  }
  for (const [path, asset] of Object.entries(assets)) {
    const target = join(root, path);
    if (!(await readFile(target)).equals(assetBytes(path, asset)) || asset.executable && ((await lstat(target)).mode & 0o111) === 0) throw new Error('experts/package-drift');
  }
}

export function expertPersonaConfig(input: Pick<CompileInput, 'definition' | 'packageRoot' | 'teamMembers'>) {
  const authoredPersona = compilePersonaPrefix(input.definition);
  const prefix = [...(input.teamMembers ? [
    readFileSync(new URL('../../resources/skills/workdsh-expert-manager/runtime/team-lead.md', import.meta.url), 'utf8'),
    JSON.stringify({ members: input.teamMembers, workflows: input.definition.team?.workflows }),
    migrateLegacyTeamInstructions(authoredPersona),
  ] : [authoredPersona]), ...(input.packageRoot ? [`专家作品资源目录：${input.packageRoot}。bin 下的工具已随发布版本安装；用原生 bash 按此路径调用，仍遵守沙箱和审批。`] : [])].join('\n\n');
  const suffix = compilePersonaSuffix(input.definition);
  return { prefix, suffix, complete: false, includeRuntimeContext: true };
}
