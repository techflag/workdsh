import assert from 'node:assert/strict';
import { readFile, readdir, writeFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { checkExpertResults } from './check-expert-results.mjs';

const exec = promisify(execFile);
/** Read-only verification of the documented native v3 log, with a system zstd decoder. */
export async function checkProfessionalSession(artifacts, scenario = 'normal') {
  assert.ok(['normal', 'incomplete', 'dirty'].includes(scenario));
  const metadata = JSON.parse(await readFile(join(artifacts, 'running.json'), 'utf8'));
  const { home, workspace, sessionId, inputHash } = metadata;
  const relative = (await readdir(join(home, 'sessions'), { recursive: true })).find(p => p.endsWith(`${sessionId}/session.v3.jsonl.zstd`));
  assert.ok(relative, 'Native persistent session artifact required');
  const { stdout } = await exec('zstd', ['-dc', join(home, 'sessions', relative)], { maxBuffer: 32 * 1024 * 1024 });
  const events = stdout.trim().split('\n').map(JSON.parse);
  assert.equal(events[0].type, 'session');
  assert.equal(events[0].cwd, workspace);
  assert.ok(events[0].agentPreset?.startsWith('wd-exp-'), 'Full installed expert preset required');
  const end = events.filter(row => row.type === 'turn/end').at(-1);
  assert.equal(end?.data.reason.kind, 'completed', 'Native turn must finish normally');
  const calls = events.filter(row => row.type === 'tool/call').map(row => row.data);
  const loaded = calls.find(row => row.name === 'skill' && JSON.parse(row.arguments).name === 'retail-analysis-acceptance');
  assert.ok(loaded, 'Actual Skill tool call required');
  const results = events.filter(row => row.type === 'tool/result').map(row => row.data.message);
  const skillResult = results.find(message => message.source.callId === loaded.callId);
  assert.ok(skillResult && JSON.stringify(skillResult).includes('<skill_content') && JSON.stringify(skillResult).includes('retail-analysis-acceptance'), 'Successful Skill receipt required');
  assert.ok(JSON.stringify(skillResult).includes('/retained-revisions/'), 'Task must read the published retained Skill revision');
  assert.ok(calls.some(row => row.name === 'read' && row.arguments.includes('input.csv')), 'Actual CSV read required');
  assert.ok(calls.some(row => row.name === 'bash' && /python/.test(row.arguments)), 'Actual reproducible calculation required');
  assert.equal(createHash('sha256').update(await readFile(join(workspace, 'input.csv'))).digest('hex'), inputHash, 'Raw input must be unchanged');
  if (scenario === 'normal') await checkExpertResults(workspace);
  else {
    const partial = JSON.parse(await readFile(join(workspace, 'analysis-results.json'), 'utf8'));
    assert.ok(Array.isArray(partial.inputIssues) && partial.inputIssues.length > 0);
    assert.equal(partial.baseRevenue, 55000); assert.equal(partial.targetRevenue, 46000); assert.equal(partial.change, -9000);
    if (scenario === 'incomplete') {
      for (const key of ['baseVisitors', 'targetVisitors', 'baseOrders', 'targetOrders']) assert.equal(partial[key], null, 'Missing metrics must stay unknown');
      assert.ok(partial.stores === null || (Array.isArray(partial.stores) && partial.stores.length === 0), 'No fabricated store breakdown');
    } else {
      assert.equal(partial.baseVisitors,2500,'Complete base-month visitors must remain known despite target-month missing data');
      assert.equal(partial.targetVisitors,null,'Missing visitor data must not be imputed');
      assert.equal(partial.baseOrders,350);assert.equal(partial.targetOrders,280);
      // Optional reported subsets must use the same declared stores in both months.
      // Derive the oracle from unchanged CSV rows, never from model-supplied totals.
      const subset = partial.observedSubsetOnly;
      if (subset) {
        assert.ok(Array.isArray(subset.storesIncluded) && subset.storesIncluded.length > 0, 'Reported subset requires explicit store coverage');
        const lines = (await readFile(join(workspace, 'input.csv'), 'utf8')).trim().split(/\r?\n/);
        const columns = lines.shift().split(',');
        const rawRows = [...new Set(lines)].map(line => Object.fromEntries(line.split(',').map((value, index) => [columns[index], value])));
        for (const [prefix, month] of [['base', partial.baseMonth], ['target', partial.targetMonth]]) {
          const rows = rawRows.filter(row => row.month === month && subset.storesIncluded.includes(row.store_id));
          assert.equal(rows.length, new Set(subset.storesIncluded).size, 'Subset month must cover exactly its declared stores');
          const total = field => rows.some(row => row[field] === '' || !Number.isFinite(Number(row[field]))) ? null : rows.reduce((sum, row) => sum + Number(row[field]), 0);
          const visitors = total('visitors'), orders = total('orders');
          assert.equal(subset[prefix + 'Visitors'], visitors, 'Subset visitors must not include undeclared stores');
          assert.equal(subset[prefix + 'Orders'], orders, 'Subset orders must match declared coverage');
          const conversion = visitors === null || orders === null || visitors === 0 ? null : orders / visitors * 100;
          if (conversion === null) assert.equal(subset[prefix + 'ConversionPercent'], null);
          else assert.ok(Math.abs(subset[prefix + 'ConversionPercent'] - conversion) <= 0.02, 'Subset conversion must use matching numerator and denominator');
        }
      }

    }
  }
  const report = await readFile(join(workspace, 'analysis-report.md'), 'utf8');
  assert.ok(report.length >= 300);
  const config = events.find(row => row.type === 'request/header').data.header.config;
  const evidence = { ...metadata, scenario, modelExecution: 'executed', nativeTurn: end.data.reason.kind, agentPreset: events[0].agentPreset,
    model: { provider: config.provider, model: config.model, reasoningEffort: config.reasoningEffort },
    checks: ['Installed full expert preset', 'Published retained Skill receipt', 'Real CSV read and Python calculation', 'Native turn completed', 'Raw input hash unchanged', 'Actual JSON/Markdown and numeric checks'],
    toolCalls: calls.map(row => ({ name: row.name, callId: row.callId })), professionalReview: 'required', coldRestart: 'not verified by this read-only checker' };
  await copyFile(join(workspace, 'analysis-results.json'), join(artifacts, 'analysis-results.json'));
  await copyFile(join(workspace, 'analysis-report.md'), join(artifacts, 'analysis-report.md'));
  await writeFile(join(artifacts, 'report.json'), JSON.stringify(evidence, null, 2));
  return evidence;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.ok(process.argv[2], 'Usage: node scripts/check-expert-professional-session.mjs <artifact-directory> [scenario] (requires zstd)');
  const evidence = await checkProfessionalSession(process.argv[2], process.argv[3]);
  console.log(JSON.stringify({ scenario: evidence.scenario, model: evidence.model, nativeTurn: evidence.nativeTurn, checks: evidence.checks }, null, 2));
}
