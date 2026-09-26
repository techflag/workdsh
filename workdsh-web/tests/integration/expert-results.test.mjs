import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkExpertResults } from '../../scripts/check-expert-results.mjs';

const fixture = new URL('../fixtures/experts/retail-analysis/expected.json', import.meta.url);
async function withResults(fn) {
  const home = await mkdtemp(join(tmpdir(), 'workdsh-results-check-'));
  const expected = JSON.parse(await readFile(fixture, 'utf8'));
  const result = { ...expected, stores: Object.entries(expected.stores).map(([storeId, row]) => ({ storeId, ...row })), inputIssues: [] };
  await writeFile(join(home, 'analysis-results.json'), JSON.stringify(result));
  await writeFile(join(home, 'analysis-report.md'), 'Professional report fixture. '.repeat(20));
  try { await fn(home, result); } finally { await rm(home, { recursive: true, force: true }); }
}
test('professional artifact oracle accepts correct reconciled results', async () => {
  await withResults(async (home, result) => {
    assert.match(await checkExpertResults(home), /verified/);
    result.inputIssues = [{ severity: 'info', detail: 'April data stays outside the May/June comparison.' }];
    await writeFile(join(home, 'analysis-results.json'), JSON.stringify(result));
    assert.match(await checkExpertResults(home), /verified/);
    result.inputIssues = ['April data stays outside the May/June comparison.'];
    await writeFile(join(home, 'analysis-results.json'), JSON.stringify(result));
    assert.match(await checkExpertResults(home), /verified/);
  });
});
test('professional artifact oracle rejects percentage ratios and missing actual files', async () => {
  await withResults(async (home, result) => {
    result.changePercent /= 100;
    await writeFile(join(home, 'analysis-results.json'), JSON.stringify(result));
    await assert.rejects(checkExpertResults(home), /changePercent/);
    await rm(join(home, 'analysis-report.md'));
    result.changePercent *= 100;
    await writeFile(join(home, 'analysis-results.json'), JSON.stringify(result));
    await assert.rejects(checkExpertResults(home), /ENOENT/);
  });
});
test('professional artifact oracle rejects duplicated stores and malformed quality notes', async () => {
  await withResults(async (home, result) => {
    result.stores[1].storeId = 'A';
    await writeFile(join(home, 'analysis-results.json'), JSON.stringify(result));
    await assert.rejects(checkExpertResults(home), /Unique stores/);
    result.stores[1].storeId = 'B'; result.inputIssues = [42];
    await writeFile(join(home, 'analysis-results.json'), JSON.stringify(result));
    await assert.rejects(checkExpertResults(home), /Quality notes/);
    result.inputIssues = [{ severity: 'error', detail: '' }];
    await writeFile(join(home, 'analysis-results.json'), JSON.stringify(result));
    await assert.rejects(checkExpertResults(home), /Quality notes/);
  });
});
