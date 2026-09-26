import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAcceptance } from './validate-acceptance.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const phase = process.argv[2];
if (!['P0', 'P1', 'P2', 'P3'].includes(phase)) {
  process.stderr.write('Usage: node scripts/check-acceptance.mjs P0|P1|P2|P3\n');
  process.exitCode = 2;
} else {
  const { failures, cases } = validateAcceptance(root);
  const requiredPhases = ['P0', 'P1', 'P2', 'P3'].slice(0, Number(phase[1]) + 1);
  const pending = cases.filter(c => requiredPhases.includes(c.phase) && c.status !== 'passed');
  if (failures.length) process.stderr.write(failures.join('\n') + '\n');
  if (pending.length) process.stdout.write(pending.map(c => `${c.phase} ${c.id}: ${c.status}`).join('\n') + '\n');
  process.stdout.write(`${phase} gate: ${pending.length} unfinished cases (includes previous phases).\n`);
  if (failures.length || pending.length) process.exitCode = 1;
}
