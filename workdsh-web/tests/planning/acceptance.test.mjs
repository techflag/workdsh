import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { validateAcceptance } from '../../scripts/validate-acceptance.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
import { fileURLToPath } from 'node:url';
function fixture(mutate) {
  const path = mkdtempSync(resolve(tmpdir(), 'workdsh-acceptance-'));
  try {
    cpSync(resolve(root, 'docs'), resolve(path, 'docs'), { recursive: true });
    const file = resolve(path, 'docs/acceptance.json');
    const data = JSON.parse(readFileSync(file, 'utf8'));
    mutate(data);
    writeFileSync(file, JSON.stringify(data));
    return validateAcceptance(path).failures;
  } finally { rmSync(path, { recursive: true, force: true }); }
}
test('every scenario has a valid single phase', () => {
  assert.deepEqual(validateAcceptance(root).failures, []);
  assert.ok(fixture(d => { d.cases[0].phase = 'P1/P3'; }).some(s => s.includes('Invalid single phase')));
});
test('a scenario cannot disappear or claim success without evidence', () => {
  assert.ok(fixture(d => { d.cases.pop(); }).some(s => s.includes('Unmapped acceptance')));
  assert.ok(fixture(d => { d.cases[0].status = 'passed'; }).some(s => s.includes('Passed without evidence')));
});
