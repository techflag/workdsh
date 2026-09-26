import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { Context } from '@deepseek-ai/cordis';
import SkillRegistry from '@deepseek-ai/dsh-skill';
import * as filesystem from '@deepseek-ai/dsh-skill-filesystem';
import { SkillManager } from '../../packages/plugins/skills/dist/index.js';

const skillPackageRequire = createRequire(new URL('../../packages/plugins/skills/package.json', import.meta.url));
const { zipSync } = skillPackageRequire('fflate');

test('default managed skills stay inside the WorkDSH home', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-skill-private-home-'));
  const dshHome = join(root, 'dsh');
  const agentsHome = join(dshHome, 'agents');
  const originalAgentsHome = process.env.DSH_AGENTS_HOME;
  const originalDshHome = process.env.DSH_HOME;
  const ctx = new Context();
  try {
    process.env.DSH_HOME = dshHome;
    delete process.env.DSH_AGENTS_HOME;
    await mkdir(join(agentsHome, 'skills', 'private-skill'), { recursive: true });
    await writeFile(join(agentsHome, 'skills', 'private-skill', 'SKILL.md'), '---\nname: private-skill\ndescription: Private WorkDSH skill\n---\n');
    await ctx.plugin(SkillRegistry);
    await ctx.plugin(filesystem, { dshHome, agentsHome, watch: false });
    new SkillManager(ctx);
    const skills = await ctx.workdshSkills.list();
    assert.equal(skills.find(skill => skill.name === 'private-skill')?.manageable, true);
    assert.equal((await readdir(join(root))).includes('.agents'), false);
  } finally {
    await ctx.fiber.dispose();
    if (originalAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = originalAgentsHome;
    if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
    await rm(root, { recursive: true, force: true });
  }
});

test('SkillHub directory slug may differ from the official DSH skill name', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-skillhub-name-'));
  const dshHome = join(root, 'dsh'); const agentsHome = join(dshHome, 'agents');
  const originalDshHome = process.env.DSH_HOME; const originalAgentsHome = process.env.DSH_AGENTS_HOME;
  const file = join(dshHome, 'skills', 'marketplace-slug', 'SKILL.md');
  const document = '---\nname: original-name\ndescription: Marketplace skill\n---\nInstructions\n';
  const ctx = new Context();
  try {
    process.env.DSH_HOME = dshHome; delete process.env.DSH_AGENTS_HOME;
    await mkdir(join(dshHome, 'skills', 'marketplace-slug'), { recursive: true });
    await writeFile(file, document);
    await ctx.plugin(SkillRegistry);
    await ctx.plugin(filesystem, { dshHome, agentsHome, watch: false });
    new SkillManager(ctx);
    const rows = await ctx.workdshSkills.list();
    assert.equal(rows.some(row => row.name === 'marketplace-slug'), false);
    assert.equal(rows.find(row => row.name === 'original-name')?.state, 'enabled');
    assert.equal((await ctx.workdshSkills.detail('original-name'))?.manageable, true);
    assert.equal(await readFile(file, 'utf8'), document);
    await ctx.workdshSkills.setEnabled('original-name', false);
    assert.equal((await ctx.workdshSkills.list()).find(row => row.name === 'original-name')?.state, 'disabled');
    await ctx.workdshSkills.setEnabled('original-name', true);
    assert.equal((await ctx.workdshSkills.list()).find(row => row.name === 'original-name')?.state, 'enabled');
    assert.equal(await readFile(file, 'utf8'), document);
  } finally {
    await ctx.fiber.dispose();
    if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
    if (originalAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = originalAgentsHome;
    await rm(root, { recursive: true, force: true });
  }
});

test('canonical skill paths remain manageable through a home alias without selecting a shadowed local copy', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-skill-canonical-'));
  const physicalHome = join(root, 'physical-agents');
  const agentsHome = join(root, 'agents-alias'); const dshHome = join(root, 'dsh');
  const originalAgentsHome = process.env.DSH_AGENTS_HOME; const originalDshHome = process.env.DSH_HOME;
  const ctx = new Context();
  const document = body => `---\nname: canonical-skill\ndescription: Path identity fixture\n---\n${body}\n`;
  try {
    await mkdir(join(physicalHome, 'skills/canonical-skill'), { recursive: true });
    await symlink(physicalHome, agentsHome, process.platform === 'win32' ? 'junction' : 'dir');
    process.env.DSH_AGENTS_HOME = agentsHome; process.env.DSH_HOME = dshHome;
    const file = join(agentsHome, 'skills/canonical-skill/SKILL.md');
    await writeFile(file, document('LOCAL'));
    await ctx.plugin(SkillRegistry);
    await ctx.plugin(filesystem, { dshHome, agentsHome, watch: false });
    new SkillManager(ctx);
    const definition = await ctx.skills.get('canonical-skill');
    assert.equal(definition.path, await realpath(file));
    assert.notEqual(definition.path, file, 'the provider returns a canonical path, not the configured alias');
    const detail = await ctx.workdshSkills.detail('canonical-skill');
    assert.equal(detail.manageable, true);
    assert.match(detail.document, /LOCAL/);
    await ctx.workdshSkills.update({ name: detail.name, document: document('UPDATED'), expectedRevision: detail.revision });
    assert.match(await readFile(file, 'utf8'), /UPDATED/);
    await ctx.workdshSkills.setEnabled(detail.name, false);
    await ctx.workdshSkills.setEnabled(detail.name, true);

    const external = join(root, 'external');
    await mkdir(join(external, 'canonical-skill'), { recursive: true });
    const externalFile = join(external, 'canonical-skill/SKILL.md');
    await writeFile(externalFile, document('EXTERNAL'));
    await ctx.plugin(filesystem, { providerName: 'external', includeDefaultRoots: false, customSkillDirs: [external], watch: false });
    assert.match((await ctx.skills.get(detail.name)).content, /EXTERNAL/);
    const shadowed = await ctx.workdshSkills.detail(detail.name);
    assert.equal(shadowed.state, 'readonly');
    assert.equal(shadowed.manageable, false);
    await assert.rejects(ctx.workdshSkills.update({ name: detail.name, document: document('WRONG'), expectedRevision: detail.revision }), /skill\/not-manageable/);
    assert.match(await readFile(file, 'utf8'), /UPDATED/);
    assert.equal(await readFile(externalFile, 'utf8'), document('EXTERNAL'));
  } finally {
    await ctx.fiber.dispose();
    if (originalAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = originalAgentsHome;
    if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
    await rm(root, { recursive: true, force: true });
  }
});

test('skill manager reads, conflict-checks, disables, enables and recoverably uninstalls local skills', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-skill-manager-'));
  const agentsHome = join(root, 'agents'); const dshHome = join(root, 'dsh');
  const skillDir = join(dshHome, 'skills', 'sample'); const skillFile = join(skillDir, 'SKILL.md');
  const originalAgentsHome = process.env.DSH_AGENTS_HOME; const originalDshHome = process.env.DSH_HOME;
  const document = body => `---\nname: sample\ndescription: Managed sample\n---\n${body}\n`;
  const ctx = new Context();
  try {
    process.env.DSH_AGENTS_HOME = agentsHome; process.env.DSH_HOME = dshHome;
    await mkdir(join(skillDir, 'references'), { recursive: true });
    await writeFile(skillFile, document('FIRST')); await writeFile(join(skillDir, 'references', 'guide.md'), 'guide');
    await ctx.plugin(SkillRegistry);
    await ctx.plugin(filesystem, { dshHome, agentsHome, watch: false });
    new SkillManager(ctx);
    const listed = await ctx.workdshSkills.list();
    assert.deepEqual(listed.map(row => [row.name, row.state, row.manageable]), [['sample', 'enabled', true]]);
    const first = await ctx.workdshSkills.detail('sample');
    assert.match(first.document, /FIRST/); assert.deepEqual(first.resources, ['references/guide.md']);
    const guide = await ctx.workdshSkills.readResource('sample', 'references/guide.md');
    assert.equal(guide.document, 'guide');
    await assert.rejects(ctx.workdshSkills.writeResource({ name: 'sample', path: 'references/guide.md', document: 'stale', expectedRevision: 'stale' }), /skill\/revision-conflict/);
    await ctx.workdshSkills.writeResource({ name: 'sample', path: 'references/guide.md', document: 'updated guide', expectedRevision: guide.revision });
    await ctx.workdshSkills.writeResource({ name: 'sample', path: 'templates/example.md', document: 'new template' });
    assert.deepEqual((await ctx.workdshSkills.detail('sample')).resources, ['references/guide.md', 'templates/example.md']);
    await assert.rejects(ctx.workdshSkills.update({ name: 'sample', document: document('SECOND'), expectedRevision: 'stale' }), /skill\/revision-conflict/);
    const competing = await Promise.allSettled([
      ctx.workdshSkills.update({ name: 'sample', document: document('SECOND'), expectedRevision: first.revision }),
      ctx.workdshSkills.update({ name: 'sample', document: document('THIRD'), expectedRevision: first.revision }),
    ]);
    assert.equal(competing.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(competing.filter(result => result.status === 'rejected' && /skill\/revision-conflict/.test(String(result.reason))).length, 1);
    const second = competing.find(result => result.status === 'fulfilled').value;
    assert.match(second.document, /SECOND|THIRD/);
    const disabled = await ctx.workdshSkills.setEnabled('sample', false); assert.equal(disabled.state, 'disabled');
    const disabledDetail = await ctx.workdshSkills.detail('sample'); assert.equal(disabledDetail.state, 'disabled'); assert.match(disabledDetail.document, /SECOND|THIRD/);
    assert.deepEqual((await ctx.workdshSkills.list()).map(row => [row.name, row.state]), [['sample', 'disabled']]);
    const enabled = await ctx.workdshSkills.setEnabled('sample', true); assert.equal(enabled.state, 'enabled');
    assert.equal(enabled.path, skillDir, 'enable restores the original skill scope and path');
    assert.match(await readFile(join(enabled.path, 'SKILL.md'), 'utf8'), /SECOND|THIRD/);
    await ctx.workdshSkills.setEnabled('sample', false);
    const impact = await ctx.workdshSkills.dependencyImpact('sample'); assert.deepEqual(impact.dependents, []);
    const removed = await ctx.workdshSkills.uninstall('sample', impact.revision); assert.equal(removed.state, 'uninstalled');
    assert.match(await readFile(join(removed.path, 'SKILL.md'), 'utf8'), /SECOND|THIRD/);
    const trash = await ctx.workdshSkills.listTrash(); assert.equal(trash.length, 1); assert.equal(trash[0].name, 'sample'); assert.equal(trash[0].previousState, 'disabled');
    const restored = await ctx.workdshSkills.restore(trash[0].id); assert.equal(restored.state, 'disabled');
    const restoredEnabled = await ctx.workdshSkills.setEnabled('sample', true); assert.equal(restoredEnabled.path, skillDir); assert.equal(restoredEnabled.state, 'enabled');
    assert.match(await readFile(join(skillDir, 'SKILL.md'), 'utf8'), /SECOND|THIRD/);
  } finally {
    await ctx.fiber.dispose();
    if (originalAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = originalAgentsHome;
    if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
    await rm(root, { recursive: true, force: true });
  }
});

test('skill manager surfaces invalid local skills with actionable diagnostics', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-invalid-skill-'));
  const agentsHome = join(root, 'agents'); const dshHome = join(root, 'dsh');
  const originalAgentsHome = process.env.DSH_AGENTS_HOME; const originalDshHome = process.env.DSH_HOME;
  const ctx = new Context();
  try {
    process.env.DSH_AGENTS_HOME = agentsHome; process.env.DSH_HOME = dshHome;
    const invalidDir = join(agentsHome, 'skills', 'broken-skill');
    await mkdir(invalidDir, { recursive: true });
    await writeFile(join(invalidDir, 'SKILL.md'), '---\nname: wrong-name\n---\n');
    await ctx.plugin(SkillRegistry); await ctx.plugin(filesystem, { dshHome, agentsHome, watch: false }); new SkillManager(ctx);
    const summary = (await ctx.workdshSkills.list()).find(row => row.name === 'broken-skill');
    assert.equal(summary.state, 'invalid');
    assert.equal(summary.modelInvocable, false);
    assert.deepEqual(summary.diagnostics.map(item => item.code), ['description-required']);
    const detail = await ctx.workdshSkills.detail('broken-skill');
    assert.equal(detail.state, 'invalid');
    assert.match(detail.diagnostics[0].message, /description/);
    const fixed = '---\nname: broken-skill\ndescription: Repaired skill\n---\nUse these repaired instructions.\n';
    const repaired = await ctx.workdshSkills.update({ name: 'broken-skill', document: fixed, expectedRevision: detail.revision });
    assert.equal(repaired.state, 'enabled');
  } finally {
    await ctx.fiber.dispose();
    if (originalAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = originalAgentsHome;
    if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
    await rm(root, { recursive: true, force: true });
  }
});

test('skill manager batch operations return one result per skill and retain recoverability', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-batch-skills-'));
  const agentsHome = join(root, 'agents'); const dshHome = join(root, 'dsh');
  const originalAgentsHome = process.env.DSH_AGENTS_HOME; const originalDshHome = process.env.DSH_HOME;
  const ctx = new Context();
  try {
    process.env.DSH_AGENTS_HOME = agentsHome; process.env.DSH_HOME = dshHome;
    for (const name of ['batch-one', 'batch-two']) {
      const directory = join(agentsHome, 'skills', name); await mkdir(directory, { recursive: true });
      await writeFile(join(directory, 'SKILL.md'), `---\nname: ${name}\ndescription: Batch fixture\n---\nUse this fixture.\n`);
    }
    await ctx.plugin(SkillRegistry); await ctx.plugin(filesystem, { dshHome, agentsHome, watch: false }); new SkillManager(ctx);
    const disabled = await ctx.workdshSkills.batch({ names: ['batch-one', 'batch-two'], action: 'disable' });
    assert.deepEqual(disabled.results.map(item => [item.name, item.ok, item.receipt?.state]), [['batch-one', true, 'disabled'], ['batch-two', true, 'disabled']]);
    const mixed = await ctx.workdshSkills.batch({ names: ['batch-one', 'batch-two'], action: 'enable' });
    assert.equal(mixed.results.every(item => item.ok), true);
    const removed = await ctx.workdshSkills.batch({ names: ['batch-one', 'batch-two'], action: 'uninstall' });
    assert.equal(removed.results.every(item => item.receipt?.state === 'uninstalled'), true);
    assert.deepEqual((await ctx.workdshSkills.listTrash()).map(item => item.name).sort(), ['batch-one', 'batch-two']);
  } finally {
    await ctx.fiber.dispose();
    if (originalAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = originalAgentsHome;
    if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
    await rm(root, { recursive: true, force: true });
  }
});

test('skill manager checks registered dependency providers again at uninstall time', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-skill-impact-'));
  const agentsHome = join(root, 'agents'); const dshHome = join(root, 'dsh');
  const originalAgentsHome = process.env.DSH_AGENTS_HOME; const originalDshHome = process.env.DSH_HOME;
  const ctx = new Context();
  try {
    process.env.DSH_AGENTS_HOME = agentsHome; process.env.DSH_HOME = dshHome;
    const directory = join(agentsHome, 'skills', 'dep-skill'); await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'SKILL.md'), '---\nname: dep-skill\ndescription: Dependency fixture\n---\nUse this fixture.\n');
    await ctx.plugin(SkillRegistry); await ctx.plugin(filesystem, { dshHome, agentsHome, watch: false }); new SkillManager(ctx);
    let blocked = false;
    const unregister = ctx.workdshSkills.registerDependencyInspector(name => name === 'dep-skill' && blocked
      ? [{ kind: 'expert', id: 'reviewer', label: '专家：审阅员', blocking: true }]
      : []);
    const clear = await ctx.workdshSkills.dependencyImpact('dep-skill');
    blocked = true;
    await assert.rejects(ctx.workdshSkills.uninstall('dep-skill', clear.revision), /skill\/dependency-impact-changed/);
    const impact = await ctx.workdshSkills.dependencyImpact('dep-skill');
    assert.equal(impact.dependents[0].label, '专家：审阅员');
    await assert.rejects(ctx.workdshSkills.uninstall('dep-skill', impact.revision), /skill\/dependency-blocked/);
    unregister();
    const unblocked = await ctx.workdshSkills.dependencyImpact('dep-skill');
    assert.equal((await ctx.workdshSkills.uninstall('dep-skill', unblocked.revision)).state, 'uninstalled');
  } finally {
    await ctx.fiber.dispose();
    if (originalAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = originalAgentsHome;
    if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
    await rm(root, { recursive: true, force: true });
  }
});

test('skill manager validates imports, rejects symlinks and installs atomically into an official root', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-skill-import-'));
  const agentsHome = join(root, 'agents'); const dshHome = join(root, 'dsh'); const source = join(root, 'incoming');
  const originalAgentsHome = process.env.DSH_AGENTS_HOME; const originalDshHome = process.env.DSH_HOME;
  const ctx = new Context();
  try {
    process.env.DSH_AGENTS_HOME = agentsHome; process.env.DSH_HOME = dshHome;
    await mkdir(join(source, 'references'), { recursive: true });
    await writeFile(join(source, 'SKILL.md'), '---\nname: imported-skill\ndescription: Imported safely\n---\nUse this.\n');
    await writeFile(join(source, 'references', 'guide.md'), 'guide');
    await ctx.plugin(SkillRegistry); await ctx.plugin(filesystem, { dshHome, agentsHome, watch: false }); new SkillManager(ctx);
    const inspection = await ctx.workdshSkills.inspectImport(source);
    assert.deepEqual(inspection.files, ['SKILL.md', 'references/guide.md']);
    const installed = await ctx.workdshSkills.installImport({ source });
    assert.equal(installed.path, join(agentsHome, 'skills', 'imported-skill'));
    assert.match(await readFile(join(installed.path, 'SKILL.md'), 'utf8'), /Imported safely/);
    await assert.rejects(ctx.workdshSkills.installImport({ source }), /skill\/target-exists/);
    const flatSource = join(root, 'flat-incoming'); await mkdir(flatSource, { recursive: true });
    await writeFile(join(flatSource, 'SKILL.md'), '---\nname: flat-collision\ndescription: Must conflict globally\n---\nCandidate.\n');
    await mkdir(join(dshHome, 'skills'), { recursive: true });
    await writeFile(join(dshHome, 'skills', 'flat-collision.md'), '---\nname: flat-collision\ndescription: Existing flat skill\n---\nExisting.\n');
    await assert.rejects(ctx.workdshSkills.installImport({ source: flatSource }), /skill\/target-exists/, 'flat and directory forms share one global name');
    await import('node:fs/promises').then(({ symlink }) => symlink(join(source, 'references', 'guide.md'), join(source, 'unsafe-link')));
    await assert.rejects(ctx.workdshSkills.inspectImport(source), /skill\/import-symlink/);
    const outside = join(root, 'outside-skill'); await mkdir(outside, { recursive: true });
    await writeFile(join(outside, 'SKILL.md'), '---\nname: linked-skill\ndescription: Must not escape\n---\nUnsafe.\n');
    await mkdir(join(agentsHome, 'skills'), { recursive: true });
    await import('node:fs/promises').then(({ symlink }) => symlink(outside, join(agentsHome, 'skills', 'linked-skill'), 'dir'));
    await assert.rejects(ctx.workdshSkills.detail('linked-skill'), /skill\/path-symlink/);
  } finally {
    await ctx.fiber.dispose();
    if (originalAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = originalAgentsHome;
    if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
    await rm(root, { recursive: true, force: true });
  }
});

test('browser import staging preflights inert markdown and commits only after confirmation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-staged-import-'));
  const agentsHome = join(root, 'agents'); const dshHome = join(root, 'dsh');
  const originalAgentsHome = process.env.DSH_AGENTS_HOME; const originalDshHome = process.env.DSH_HOME;
  const ctx = new Context();
  try {
    process.env.DSH_AGENTS_HOME = agentsHome; process.env.DSH_HOME = dshHome;
    await ctx.plugin(SkillRegistry); await ctx.plugin(filesystem, { dshHome, agentsHome, watch: false }); new SkillManager(ctx);
    const document = '---\nname: staged-skill\ndescription: Browser upload fixture\n---\nNever execute resources while importing.\n';
    const staged = await ctx.workdshSkills.imports.stage('candidate.md', new Blob([document]).stream(), AbortSignal.timeout(5000));
    assert.equal(staged.inspection.name, 'staged-skill');
    assert.deepEqual(staged.inspection.files, ['SKILL.md']);
    assert.equal((await ctx.workdshSkills.list()).some(row => row.name === 'staged-skill'), false, 'preflight does not install');
    const installed = await ctx.workdshSkills.imports.commit(staged.id, 'shared-agents');
    assert.equal(installed.path, join(agentsHome, 'skills', 'staged-skill'));
    assert.equal((await ctx.workdshSkills.list()).some(row => row.name === 'staged-skill'), true);
    await assert.rejects(ctx.workdshSkills.imports.commit(staged.id), /skill\/import-expired/);
    await assert.rejects(ctx.workdshSkills.imports.stage('candidate.txt', new Blob([document]).stream(), AbortSignal.timeout(5000)), /skill\/import-file-type/);
    const importsRoot = join(agentsHome, '.workdsh-state/skills/imports');
    const beforeCancelledUpload = (await readdir(importsRoot).catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error))).sort();
    let releaseUpload;
    const slowUpload = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(document.slice(0, 24)));
        releaseUpload = () => { controller.enqueue(new TextEncoder().encode(document.slice(24))); controller.close(); };
      },
      cancel() { releaseUpload = undefined; },
    });
    const cancelledUpload = new AbortController();
    const interruptedStage = ctx.workdshSkills.imports.stage('cancelled.md', slowUpload, cancelledUpload.signal);
    await new Promise(resolve => setImmediate(resolve));
    cancelledUpload.abort();
    await assert.rejects(interruptedStage, error => error?.name === 'AbortError');
    releaseUpload?.();
    const afterCancelledUpload = (await readdir(importsRoot).catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error))).sort();
    assert.deepEqual(afterCancelledUpload, beforeCancelledUpload, 'cancelled transfer removes its private staging directory');
    const cancelledCommitDocument = document.replaceAll('staged-skill', 'cancelled-commit-skill');
    const cancelledCommit = await ctx.workdshSkills.imports.stage('cancelled-commit.md', new Blob([cancelledCommitDocument]).stream(), AbortSignal.timeout(5000));
    const commitAbort = new AbortController(); commitAbort.abort();
    await assert.rejects(ctx.workdshSkills.imports.commit(cancelledCommit.id, 'shared-agents', commitAbort.signal), error => error?.name === 'AbortError');
    assert.equal((await ctx.workdshSkills.list()).some(row => row.name === 'cancelled-commit-skill'), false, 'abort before the atomic commit boundary leaves no installed target');
    assert.equal((await ctx.workdshSkills.imports.commit(cancelledCommit.id, 'shared-agents')).name, 'cancelled-commit-skill', 'cancelled commit keeps the verified staging receipt retryable');
    const tampered = await ctx.workdshSkills.imports.stage('tampered.md', new Blob([document.replace('staged-skill', 'staged-other')]).stream(), AbortSignal.timeout(5000));
    const stagedFile = join(agentsHome, '.workdsh-state/skills/imports', tampered.id, 'tree/SKILL.md');
    const beforeTamper = await readFile(stagedFile, 'utf8');
    await writeFile(stagedFile, beforeTamper.replace('Browser upload fixture', 'Browser upload fixturE'));
    await assert.rejects(ctx.workdshSkills.imports.commit(tampered.id), /skill\/import-verification-failed/, 'commit verifies exact staged bytes, not only size');
    await ctx.workdshSkills.imports.discard(tampered.id);
    const zippedDocument = '---\nname: zipped-skill\ndescription: Wrapped ZIP fixture\n---\nZIP resources remain inert.\n';
    const archive = zipSync({ 'zipped-skill/SKILL.md': Buffer.from(zippedDocument), 'zipped-skill/references/guide.md': Buffer.from('guide') });
    const stagedZip = await ctx.workdshSkills.imports.stage('candidate.zip', new Blob([archive]).stream(), AbortSignal.timeout(5000));
    assert.deepEqual(stagedZip.inspection.files, ['SKILL.md', 'references/guide.md']);
    await ctx.workdshSkills.imports.commit(stagedZip.id, 'profile');
    assert.match(await readFile(join(dshHome, 'skills/zipped-skill/references/guide.md'), 'utf8'), /guide/);
    const traversal = zipSync({ '../SKILL.md': Buffer.from(zippedDocument) });
    await assert.rejects(ctx.workdshSkills.imports.stage('unsafe.zip', new Blob([traversal]).stream(), AbortSignal.timeout(5000)), /skill\/import-unsafe-path/);
    const concurrentDocument = document.replaceAll('staged-skill', 'concurrent-skill');
    const firstConcurrent = await ctx.workdshSkills.imports.stage('first.md', new Blob([concurrentDocument]).stream(), AbortSignal.timeout(5000));
    const secondConcurrent = await ctx.workdshSkills.imports.stage('second.md', new Blob([concurrentDocument]).stream(), AbortSignal.timeout(5000));
    const concurrent = await Promise.allSettled([
      ctx.workdshSkills.imports.commit(firstConcurrent.id),
      ctx.workdshSkills.imports.commit(secondConcurrent.id),
    ]);
    assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(concurrent.filter(result => result.status === 'rejected' && /skill\/target-exists/.test(String(result.reason))).length, 1);
    const pending = concurrent[0].status === 'rejected' ? firstConcurrent : secondConcurrent;
    await ctx.workdshSkills.imports.discard(pending.id);
  } finally {
    await ctx.fiber.dispose();
    if (originalAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = originalAgentsHome;
    if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
    await rm(root, { recursive: true, force: true });
  }
});

test('staged import survives a Host restart and remains verifiable before commit', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-staged-restart-'));
  const agentsHome = join(root, 'agents'); const dshHome = join(root, 'dsh');
  const originalAgentsHome = process.env.DSH_AGENTS_HOME; const originalDshHome = process.env.DSH_HOME;
  try {
    process.env.DSH_AGENTS_HOME = agentsHome; process.env.DSH_HOME = dshHome;
    const firstContext = new Context();
    await firstContext.plugin(SkillRegistry); await firstContext.plugin(filesystem, { dshHome, agentsHome, watch: false }); new SkillManager(firstContext);
    const document = '---\nname: restart-import\ndescription: Durable staged import\n---\nCommit after Host restart.\n';
    const staged = await firstContext.workdshSkills.imports.stage('restart.md', new Blob([document]).stream(), AbortSignal.timeout(5000));
    await firstContext.fiber.dispose();

    const secondContext = new Context();
    try {
      await secondContext.plugin(SkillRegistry); await secondContext.plugin(filesystem, { dshHome, agentsHome, watch: false }); new SkillManager(secondContext);
      const installed = await secondContext.workdshSkills.imports.commit(staged.id, 'shared-agents');
      assert.equal(installed.name, 'restart-import');
      assert.match(await readFile(join(agentsHome, 'skills/restart-import/SKILL.md'), 'utf8'), /Commit after Host restart/);
    } finally { await secondContext.fiber.dispose(); }
  } finally {
    if (originalAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = originalAgentsHome;
    if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
    await rm(root, { recursive: true, force: true });
  }
});

test('official watcher retires a disabled skill and rediscovers it after enable', { timeout: 15000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-skill-watch-'));
  const agentsHome = join(root, 'agents'); const dshHome = join(root, 'dsh');
  const skillDir = join(agentsHome, 'skills', 'watched-skill');
  const originalAgentsHome = process.env.DSH_AGENTS_HOME; const originalDshHome = process.env.DSH_HOME;
  const ctx = new Context();
  const until = async predicate => {
    const deadline = Date.now() + 8000;
    while (!await predicate()) { if (Date.now() > deadline) assert.fail('timed out waiting for official skill watcher'); await new Promise(resolve => setTimeout(resolve, 50)); }
  };
  try {
    process.env.DSH_AGENTS_HOME = agentsHome; process.env.DSH_HOME = dshHome;
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), '---\nname: watched-skill\ndescription: Runtime watcher fixture\n---\nWATCHED_BODY\n');
    await ctx.plugin(SkillRegistry); await ctx.plugin(filesystem, { dshHome, agentsHome, watch: true }); new SkillManager(ctx);
    await until(async () => (await ctx.skills.get('watched-skill'))?.content.trim() === 'WATCHED_BODY');
    await ctx.workdshSkills.setEnabled('watched-skill', false);
    await until(async () => await ctx.skills.get('watched-skill') === undefined);
    await ctx.workdshSkills.setEnabled('watched-skill', true);
    await until(async () => (await ctx.skills.get('watched-skill'))?.content.trim() === 'WATCHED_BODY');
  } finally {
    await ctx.fiber.dispose();
    if (originalAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = originalAgentsHome;
    if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
    await rm(root, { recursive: true, force: true });
  }
});
