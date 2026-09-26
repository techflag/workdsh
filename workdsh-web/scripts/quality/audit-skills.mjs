import { readFile, readdir, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(new URL('../../packages/plugins/skills/package.json', import.meta.url));
const { parse } = require('yaml');

// Advisory content checks only. Harness still owns skill discovery and execution.
export function inspectSkill(text, path) {
  const findings = [];
  const add = (code, message) => findings.push({ code, message });
  const match = text.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  let meta;
  try { meta = match ? parse(match[1]) : undefined; }
  catch { add('metadata-unreadable', 'YAML 元数据无法读取，请核对原文件。'); }
  const description = typeof meta?.description === 'string' ? meta.description.trim() : '';
  if (!description) add('description-missing', '没有可读描述，无法评估技能选择入口。');
  if ([...description].length > 240) add('description-long', '描述超过 240 字符，建议审查是否可缩短；此阈值不是官方限制。');
  if (/\b(always|every task|all tasks|any task)\b|所有任务|任何任务|所有联网操作/i.test(description)) add('trigger-broad', '描述含全局触发措辞，建议限定具体任务。');
  const body = match ? text.slice(match[0].length) : text;
  if ([...body].length > 12000) add('entry-long', '入口正文超过 12000 字符，可考虑按工作流拆分引用；长度本身不证明问题。');
  if (/\b(must always use|always invoke|before every task)\b|每次任务.*必须|所有任务.*必须/i.test(body)) add('unconditional-guidance', '正文含无条件使用要求，需人工判断是否适用于此技能。');
  return { path, name: typeof meta?.name === 'string' ? meta.name : null, descriptionCharacters: [...description].length, bodyCharacters: [...body].length, findings, normalizedDescription: description.toLowerCase().replace(/\s+/g, ' ') };
}

export async function auditRoots(roots) {
  const files = new Set();
  async function walk(path, depth = 0) {
    if (depth > 12) throw new Error('目录深度超过 12 层，请选择更具体的技能目录。');
    const info = await lstat(path);
    if (info.isSymbolicLink()) return; // Do not traverse aliases outside the selected roots.
    if (info.isDirectory()) {
      for (const row of (await readdir(path)).sort()) {
        if (['node_modules', '.git', '.artifacts'].includes(row)) continue;
        await walk(join(path, row), depth + 1);
      }
    } else if (info.isFile() && path.endsWith('/SKILL.md')) files.add(path);
  }
  for (const root of roots) await walk(resolve(root));
  const skills = [];
  for (const path of [...files].sort()) {
    const info = await lstat(path);
    if (info.size > 1024 * 1024) throw new Error(`技能文件超过 1 MiB：${path}`);
    skills.push(inspectSkill(await readFile(path, 'utf8'), path));
  }
  const groups = new Map();
  for (const skill of skills) {
    if (!skill.normalizedDescription) continue;
    const group = groups.get(skill.normalizedDescription) ?? [];
    group.push(skill); groups.set(skill.normalizedDescription, group);
  }
  for (const group of groups.values()) if (group.length > 1) for (const skill of group) skill.findings.push({ code: 'duplicate-description', message: '所选文件中存在相同描述，建议核对职责重叠；不代表官方运行时同时加载。' });
  return { advisoryOnly: true, scanned: skills.length, withFindings: skills.filter(s => s.findings.length).length, skills: skills.map(({ normalizedDescription, ...skill }) => skill) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const roots = process.argv.slice(2);
  if (!roots.length || roots.includes('--help')) {
    console.log('Usage: node scripts/quality/audit-skills.mjs <skill-directory> [directory...]\n只读 JSON 报告；明确指定目录，不自动读取用户技能。');
    if (!roots.length) process.exitCode = 2;
  } else {
    try { console.log(JSON.stringify(await auditRoots(roots), null, 2)); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
