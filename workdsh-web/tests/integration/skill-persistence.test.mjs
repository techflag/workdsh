import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { Context } from '@deepseek-ai/cordis';
import SkillRegistry from '@deepseek-ai/dsh-skill';
import * as filesystem from '@deepseek-ai/dsh-skill-filesystem';
import { SkillManager } from '../../packages/plugins/skills/dist/index.js';

const exec = promisify(execFile);
const worker = fileURLToPath(new URL('../helpers/skill-persistence-worker.mjs', import.meta.url));

test('official persistence survives process restart and retires removed skill', { timeout: 30000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-skill-cold-'));
  const skills = join(root, 'skills');
  const id = randomUUID();
  const run = async phase => {
    const { stdout } = await exec(process.execPath, [worker, phase, join(root, 'sessions'), skills, id], { timeout: 8000, maxBuffer: 4 * 1024 * 1024 });
    return JSON.parse(stdout);
  };
  try {
    await mkdir(join(skills, 'sample'), { recursive: true });
    await writeFile(join(skills, 'sample/SKILL.md'), '---\nname: sample\ndescription: Cold restart fixture\n---\nCOLD_BODY_SENTINEL\n');
    const created = await run('create');
    assert.equal(created.requests.length, 2);
    assert.match(JSON.stringify(created.events), /COLD_BODY_SENTINEL/);
    assert.deepEqual((await run('read')).events, created.events);
    await rm(join(skills, 'sample'), { recursive: true });
    const resumed = await run('resume');
    assert.deepEqual(resumed.before.slice(0, created.events.length), created.events);
    assert.equal(resumed.requests.length, 2);
    const catalogs = resumed.events.filter(event => event.type === 'user/message' && event.data.source?.kind === 'skill-catalog');
    assert.ok(catalogs.length >= 2);
    assert.equal(catalogs[0].data.source.entries[0].name, 'sample');
    assert.deepEqual(catalogs.at(-1).data.source.entries, []);
    // Catalog retirement is an appended event; historical messages are retained.
    assert.equal(catalogs.at(-1).surfaceOp, 'append');
    const result = resumed.requests[1].find(message => message.role === 'tool' && message.toolCallId === 'skill-resume');
    assert.ok(result);
    assert.equal(result.isError, true);
    assert.doesNotMatch(JSON.stringify(result), /COLD_BODY_SENTINEL/);
    assert.match(JSON.stringify(resumed.events), /COLD_BODY_SENTINEL/);
    assert.deepEqual((await run('read')).events, resumed.events);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('managed import with resources survives a cold process and remains officially invocable', { timeout: 30000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-skill-import-cold-'));
  const agentsHome = join(root, 'agents'); const dshHome = join(root, 'dsh'); const incoming = join(root, 'incoming');
  const originalAgentsHome = process.env.DSH_AGENTS_HOME; const originalDshHome = process.env.DSH_HOME;
  const id = randomUUID();
  try {
    process.env.DSH_AGENTS_HOME = agentsHome; process.env.DSH_HOME = dshHome;
    await mkdir(join(incoming, 'references'), { recursive: true });
    await writeFile(join(incoming, 'SKILL.md'), '---\nname: sample\ndescription: Managed cold import fixture\n---\nMANAGED_COLD_BODY\nRead references/guide.md when supporting material is needed.\n');
    await writeFile(join(incoming, 'references/guide.md'), 'MANAGED_RESOURCE_SENTINEL\n');
    const managerContext = new Context();
    await managerContext.plugin(SkillRegistry);
    await managerContext.plugin(filesystem, { dshHome, agentsHome, watch: false });
    new SkillManager(managerContext);
    const installed = await managerContext.workdshSkills.installImport({ source: incoming, scope: 'shared-agents' });
    assert.equal(installed.path, join(agentsHome, 'skills/sample'));
    await managerContext.fiber.dispose();

    const { stdout } = await exec(process.execPath, [worker, 'create', join(root, 'sessions'), join(agentsHome, 'skills'), id], { timeout: 8000, maxBuffer: 4 * 1024 * 1024 });
    const invoked = JSON.parse(stdout);
    assert.match(JSON.stringify(invoked.requests), /Managed cold import fixture/);
    assert.match(JSON.stringify(invoked.events), /MANAGED_COLD_BODY/);
    assert.equal(await readFile(join(agentsHome, 'skills/sample/references/guide.md'), 'utf8'), 'MANAGED_RESOURCE_SENTINEL\n');
  } finally {
    if (originalAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = originalAgentsHome;
    if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
    await rm(root, { recursive: true, force: true });
  }
});
