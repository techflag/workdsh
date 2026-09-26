import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectSkill, auditRoots } from './audit-skills.mjs';

test('multiline YAML and precise task description avoid broad-trigger warning', () => {
  const result = inspectSkill('---\nname: migration\ndescription: >\n  Review database migrations\n  and rollout steps.\n---\nUse the rollout checklist.', 'SKILL.md');
  assert.equal(result.name, 'migration');
  assert.deepEqual(result.findings, []);
});
test('invalid YAML and global trigger produce advisory diagnostics', () => {
  assert.ok(inspectSkill('---\nname: [\n---\nBody', 'SKILL.md').findings.some(f => f.code === 'metadata-unreadable'));
  assert.ok(inspectSkill('---\nname: global\ndescription: Use for every task\n---\nBody', 'SKILL.md').findings.some(f => f.code === 'trigger-broad'));
});
test('scan deduplicates selected files, skips symlinks, reports duplicate descriptions and preserves source', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-quality-'));
  try {
    const source = '---\nname: example\ndescription: Review migrations\n---\nBody';
    for (const name of ['one', 'two']) { await mkdir(join(root, name)); await writeFile(join(root, name, 'SKILL.md'), source); }
    await symlink(join(root, 'one'), join(root, 'alias'));
    const report = await auditRoots([root, join(root, 'one')]);
    assert.equal(report.scanned, 2);
    assert.equal(report.withFindings, 2);
    assert.ok(report.skills.every(s => s.findings.some(f => f.code === 'duplicate-description')));
    assert.equal(await readFile(join(root, 'one', 'SKILL.md'), 'utf8'), source);
  } finally { await rm(root, { recursive: true, force: true }); }
});
