import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The oracle stays outside the model workspace. Validates independently generated artifacts. */
export async function checkExpertResults(workspace) {
  const expected = JSON.parse(await readFile(new URL('../tests/fixtures/experts/retail-analysis/expected.json', import.meta.url), 'utf8'));
  const actual = JSON.parse(await readFile(join(workspace, 'analysis-results.json'), 'utf8'));
  for (const key of ['baseMonth', 'targetMonth']) assert.equal(actual[key], expected[key], key);
  for (const key of ['baseRevenue', 'targetRevenue', 'change', 'changePercent', 'baseVisitors', 'targetVisitors', 'baseOrders', 'targetOrders']) {
    assert.equal(typeof actual[key], 'number', key);
    assert.ok(Number.isFinite(actual[key]) && Math.abs(actual[key] - expected[key]) <= 0.01, `${key}: actual ${actual[key]} expected ${expected[key]}`);
  }
  assert.ok(Array.isArray(actual.stores) && actual.stores.length === 3, 'Three store results required');
  assert.equal(new Set(actual.stores.map(row => row.storeId)).size, 3, 'Unique stores required');
  for (const row of actual.stores) {
    const baseline = expected.stores[row.storeId];
    assert.ok(baseline, 'Unknown store');
    for (const key of ['baseRevenue', 'targetRevenue', 'change']) assert.equal(row[key], baseline[key], `${row.storeId}.${key}`);
  }
  assert.equal(actual.stores.reduce((sum, row) => sum + row.change, 0), actual.change, 'Store changes reconcile');
  assert.ok(Array.isArray(actual.inputIssues), 'inputIssues must be an array');
  assert.ok(actual.inputIssues.every(row => (typeof row === 'string' && row.trim()) || (row && typeof row === 'object' && typeof row.detail === 'string' && row.detail.trim())), 'Quality notes must contain nonempty text; professional accuracy is reviewed separately');
  const report = await readFile(join(workspace, 'analysis-report.md'), 'utf8');
  assert.ok(report.trim().length >= 300, 'Professional report must contain substantive content');
  return 'Numeric oracle and real JSON/Markdown artifacts verified; professional prose requires review';
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.ok(process.argv[2], 'Usage: node scripts/check-expert-results.mjs <workspace>');
  console.log(await checkExpertResults(process.argv[2]));
}
