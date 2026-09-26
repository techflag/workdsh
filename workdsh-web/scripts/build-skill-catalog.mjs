#!/usr/bin/env node
// Build the WorkDSH-owned local skill catalog from a WorkBuddy/SkillHub mirror.
//
// The catalog is data, not code: metadata (title, category, icon) plus inert
// payload copies that the skills plugin installs through its existing import
// path. Source layout is the local marketplace mirror:
//   <source>/.codebuddy-skill/marketplace.json   (skills[] with name/source/tags)
//   <source>/icons/<skill>.(svg|png)             (optional brand icon)
//   <source>/skills/<source>/SKILL.md            (payload)
//
// Usage:
//   node scripts/build-skill-catalog.mjs --source /path/to/skills-marketplace
//   node scripts/build-skill-catalog.mjs --source ... --target ~/.agents/.workdsh-catalog --dry-run
import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const yaml = require(require.resolve('yaml', { paths: [join(root, 'packages/plugins/skills')] }));

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SCHEMA = 1;
const MAX_FILES = 400;      // mirrors SkillImportStaging / installImportTree limits
const MAX_DEPTH = 6;
const MAX_BYTES = 50 * 1024 * 1024;
const SKIP_DIRS = new Set(['node_modules', '.git', '__MACOSX']);
const SKIP_FILES = new Set(['.DS_Store']);
const SKIP_EXTENSIONS = new Set(['.zip', '.tgz', '.tar', '.gz']);
// Icons whose stem differs from the mirror directory and the skill name.
const ICON_ALIASES = { chuangye: 'the-entrepreneurship-handbook' };
// Icon stems that cover a skill family by name prefix.
const ICON_PREFIXES = ['minimax'];

function parseArguments(argv) {
  const options = { source: '', target: process.env.WORKDSH_SKILL_CATALOG ?? '', dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--source') options.source = argv[++index] ?? '';
    else if (current === '--target') options.target = argv[++index] ?? '';
    else if (current === '--dry-run') options.dryRun = true;
    else throw new Error(`未知参数：${current}`);
  }
  if (!options.source) throw new Error('缺少 --source：请指向包含 .codebuddy-skill/marketplace.json、skills/ 与 icons/ 的镜像目录。');
  options.source = resolve(options.source.replace(/^~(?=\/|$)/, homedir()));
  if (!options.target) {
    const agentsHome = resolve(process.env.DSH_AGENTS_HOME ?? join(homedir(), '.agents'));
    options.target = join(agentsHome, '.workdsh-catalog');
  }
  options.target = resolve(options.target.replace(/^~(?=\/|$)/, homedir()));
  return options;
}

function frontmatterValue(document, key) {
  const match = document.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return undefined;
  try {
    const value = yaml.parse(match[1]);
    const field = value && typeof value === 'object' ? value[key] : undefined;
    return typeof field === 'string' && field.trim() ? field.trim() : undefined;
  } catch { return undefined; }
}

function text(value, limit) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 1)}…` : trimmed;
}

async function walkTree(directory, depth = 0) {
  if (depth > MAX_DEPTH) return { files: 0, bytes: 0, depth, symlink: false };
  let files = 0; let bytes = 0; let deepest = depth; let symlink = false;
  for (const row of await readdir(directory, { withFileTypes: true })) {
    if (SKIP_FILES.has(row.name) || SKIP_DIRS.has(row.name)) continue;
    const path = join(directory, row.name);
    if (row.isSymbolicLink()) { symlink = true; continue; }
    if (row.isDirectory()) {
      const nested = await walkTree(path, depth + 1);
      files += nested.files; bytes += nested.bytes; deepest = Math.max(deepest, nested.depth);
      symlink = symlink || nested.symlink;
    } else if (row.isFile()) {
      if (SKIP_EXTENSIONS.has(extname(row.name).toLowerCase())) continue;
      files += 1; bytes += (await stat(path)).size;
    }
  }
  return { files, bytes, depth: deepest, symlink };
}

async function copyTree(source, target) {
  await mkdir(target, { recursive: true });
  for (const row of await readdir(source, { withFileTypes: true })) {
    if (SKIP_FILES.has(row.name) || SKIP_DIRS.has(row.name)) continue;
    const from = join(source, row.name); const to = join(target, row.name);
    if (row.isSymbolicLink()) continue;
    if (row.isDirectory()) await copyTree(from, to);
    else if (row.isFile()) {
      if (SKIP_EXTENSIONS.has(extname(row.name).toLowerCase())) continue;
      await copyFile(from, to);
    }
  }
}

const options = parseArguments(process.argv.slice(2));
const marketplaceFile = join(options.source, '.codebuddy-skill', 'marketplace.json');
const skillsRoot = join(options.source, 'skills');
const iconsRoot = join(options.source, 'icons');

const marketplace = JSON.parse(await readFile(marketplaceFile, 'utf8'));
if (!Array.isArray(marketplace.skills)) throw new Error('镜像 marketplace.json 缺少 skills 数组。');

function stemOf(file) { return basename(file, extname(file)).toLowerCase(); }

const iconFiles = new Map();
for (const file of await readdir(iconsRoot)) {
  if (!/\.(svg|png|jpe?g|webp)$/i.test(file)) continue;
  iconFiles.set(stemOf(file), file);
}
function matchIcon(source, name) {
  const lowerSource = source.toLowerCase(); const lowerName = name.toLowerCase();
  if (iconFiles.has(lowerSource)) return iconFiles.get(lowerSource);
  if (iconFiles.has(lowerName)) return iconFiles.get(lowerName);
  const alias = Object.entries(ICON_ALIASES).find(([, targetName]) => targetName === name);
  if (alias && iconFiles.has(alias[0])) return iconFiles.get(alias[0]);
  for (const prefix of ICON_PREFIXES) if (iconFiles.has(prefix) && (lowerSource.startsWith(`${prefix}-`) || lowerName.startsWith(`${prefix}-`))) return iconFiles.get(prefix);
  return undefined;
}

const entries = [];
const skipped = [];
const iconsUsed = new Set();
for (const row of marketplace.skills) {
  const source = typeof row.source === 'string' ? row.source.trim() : '';
  if (!source || !KEBAB.test(source)) { skipped.push({ source: source || '(空)', reason: '来源目录不是 kebab-case' }); continue; }
  const payload = join(skillsRoot, source);
  let document;
  try { document = (await readFile(join(payload, 'SKILL.md'), 'utf8')).replace(/^\uFEFF/, ''); }
  catch { skipped.push({ source, reason: '缺少 SKILL.md' }); continue; }
  const name = frontmatterValue(document, 'name');
  if (!name || !KEBAB.test(name)) { skipped.push({ source, reason: `frontmatter name 无效：${name ?? '(缺失)'}` }); continue; }
  if (entries.some(entry => entry.name === name)) { skipped.push({ source, reason: `技能名 ${name} 与已有条目重复` }); continue; }
  await lstat(payload);
  const tree = await walkTree(payload);
  const icon = matchIcon(source, name);
  if (icon) iconsUsed.add(stemOf(icon));
  const limits = [];
  if (tree.files > MAX_FILES) limits.push(`文件 ${tree.files} 个超过 ${MAX_FILES} 上限`);
  if (tree.depth >= MAX_DEPTH) limits.push(`目录嵌套超过 ${MAX_DEPTH} 层`);
  if (tree.bytes > MAX_BYTES) limits.push('负载超过 50 MiB 上限');
  if (tree.symlink) limits.push('包含符号链接');
  entries.push({
    name,
    title: text(row.name, 80) ?? name,
    description: text(row.description_zh ?? row.description, 300) ?? text(row.description_en, 300) ?? name,
    descriptionEn: text(row.description_en, 300),
    categories: Array.isArray(row.tags_zh) ? row.tags_zh.filter(value => typeof value === 'string' && value.trim()).slice(0, 4) : [],
    version: text(row.version, 40),
    examples: Array.isArray(row.examples_zh) ? row.examples_zh.filter(value => typeof value === 'string').slice(0, 3) : [],
    icon: icon ? `icons/${icon}` : undefined,
    payload: `payloads/${name}`,
    sourceDirectory: source,
    files: tree.files,
    bytes: tree.bytes,
    installable: limits.length === 0,
    ...(limits.length ? { installLimits: limits } : {}),
  });
}
entries.sort((a, b) => a.name.localeCompare(b.name));

const categories = [...new Set(entries.flatMap(entry => entry.categories))];
const catalog = {
  schema: SCHEMA,
  kind: 'workdsh-skill-catalog',
  generatedAt: new Date().toISOString(),
  generator: 'scripts/build-skill-catalog.mjs',
  source: { path: options.source, marketplace: basename(marketplaceFile), entries: marketplace.skills.length, icons: iconFiles.size },
  categories,
  entries,
};

const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
console.log(`目录条目 ${entries.length} / 市场 ${marketplace.skills.length}，图标文件 ${iconFiles.size}，分类 ${categories.length}`);
console.log(`映射图标 ${entries.filter(entry => entry.icon).length} 个，未使用图标 ${[...iconFiles.keys()].filter(stem => !iconsUsed.has(stem)).length} 个`);
console.log(`负载合计 ${(totalBytes / 1024 / 1024).toFixed(1)} MiB`);
for (const entry of entries.filter(row => !row.installable)) console.log(`  受限：${entry.name} — ${entry.installLimits.join('；')}`);
for (const row of skipped) console.log(`  跳过：${row.source} — ${row.reason}`);
if (options.dryRun) { console.log(`dry-run：未写入 ${options.target}`); process.exit(0); }

const target = options.target;
const staging = `${target}.staging-${process.pid}`;
await rm(staging, { recursive: true, force: true });
await mkdir(join(staging, 'payloads'), { recursive: true });
if (iconFiles.size) {
  await mkdir(join(staging, 'icons'), { recursive: true });
  for (const file of iconFiles.values()) await copyFile(join(iconsRoot, file), join(staging, 'icons', file));
}
for (const entry of entries) await copyTree(join(skillsRoot, entry.sourceDirectory), join(staging, entry.payload));
await writeFile(join(staging, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);
await rm(target, { recursive: true, force: true });
await mkdir(dirname(target), { recursive: true });
await rename(staging, target);
const digest = createHash('sha256').update(await readFile(join(target, 'catalog.json'))).digest('hex').slice(0, 12);
console.log(`已写入 ${target}（catalog.json sha256:${digest}，schema ${SCHEMA}）`);
