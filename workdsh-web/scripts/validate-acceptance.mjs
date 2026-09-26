import { existsSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
export function validateAcceptance(root) {
  const failures = [];
  const data = JSON.parse(readFileSync(resolve(root, 'docs/acceptance.json'), 'utf8'));
  const doc = readFileSync(resolve(root, 'docs/ACCEPTANCE.md'), 'utf8');
  const ledger = readFileSync(resolve(root, 'docs/STATUS.md'), 'utf8');
  const described = new Set([...doc.matchAll(/^\| ((?:A|UI)\d+) \||^- ((?:T|J|B|Q)\d+(?:-P\d)?)：/gm)].map(m => m[1] || m[2]));
  const seen = new Set();
  for (const item of data.cases) {
    if (seen.has(item.id)) failures.push(`Duplicate acceptance: ${item.id}`);
    seen.add(item.id);
    if (!described.has(item.id)) failures.push(`Missing scenario description: ${item.id}`);
    if (!['基础', 'P0', 'P1', 'P2', 'P3'].includes(item.phase)) failures.push(`Invalid single phase: ${item.id}`);
    if (!['pending', 'passed', 'failed', 'blocked'].includes(item.status)) failures.push(`Invalid acceptance status: ${item.id}`);
    if (!Array.isArray(item.tasks) || !item.tasks.length) failures.push(`Missing acceptance tasks: ${item.id}`);
    else for (const task of item.tasks) if (!ledger.includes(`| ${task} |`)) failures.push(`Unknown task: ${task}`);
    if (!Array.isArray(item.evidence)) { failures.push(`Invalid evidence: ${item.id}`); continue; }
    if (item.status === 'passed' && !item.evidence.length) failures.push(`Passed without evidence: ${item.id}`);
    for (const path of item.evidence) {
      const target = resolve(root, path);
      if (relative(root, target).startsWith('..') || !existsSync(target)) failures.push(`Invalid evidence path: ${item.id}`);
    }
  }
  for (const id of described) if (!seen.has(id)) failures.push(`Unmapped acceptance: ${id}`);
  return { failures, cases: data.cases };
}
