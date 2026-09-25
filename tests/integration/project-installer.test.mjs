import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '../..');
const installer = join(root, 'scripts/install-project-release.mjs');
const harnessVersion = '0.1.7-alpha.1';
const packageNames = [
  'workdsh-provider-identity-local', 'workdsh-provider-browser-session', 'workdsh-plugin-audit', 'workdsh-plugin-access',
  'workdsh-plugin-skills', 'workdsh-plugin-experts', 'workdsh-plugin-connectors',
  'workdsh-plugin-activity', 'workdsh-plugin-office', 'workdsh-plugin-library', 'workdsh-plugin-projects', 'workdsh-bundle',
];

async function fixture(version = harnessVersion) {
  const home = await mkdtemp(join(tmpdir(), 'workdsh-installer-'));
  const release = join(home, 'release');
  await mkdir(release, { recursive: true });
  const packages = [];
  for (const name of packageNames) {
    const filename = `${name}-fixture.tgz`;
    const bytes = Buffer.from(`fixture:${name}`);
    await writeFile(join(release, filename), bytes);
    packages.push({ name, filename, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  await writeFile(join(release, 'release-manifest.json'), JSON.stringify({ version: 'test', harness: harnessVersion, packageManager: 'pnpm@10.34.5', runtimeOverrides: {'@deepseek-ai/dsh-mcp-client': harnessVersion}, packages }));
  const fakeDsh = join(home, 'fake-dsh.mjs');
  await writeFile(fakeDsh, `#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const args = process.argv.slice(2);
appendFileSync(process.env.INSTALL_LOG, JSON.stringify(args) + '\\n');
if (args[0] === '--version') { console.log(${JSON.stringify(version)}); process.exit(0); }
if (args[0] === 'pnpm') {
  const dir = args[args.indexOf('--dir') + 1];
  for (const arg of args.filter(value => value.startsWith('@deepseek-ai/'))) {
    const name = arg.slice(0, arg.lastIndexOf('@'));
    const target = join(dir, 'node_modules', name);
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, 'package.json'), JSON.stringify({name}));
  }
}
const profile = args[args.indexOf('--profile') + 1];
if (args.includes('--from-default-profile')) {
  const dir = join(process.env.DSH_HOME, 'profiles', profile);
  if (existsSync(join(dir, 'package.json'))) process.exit(9);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{}');
  writeFileSync(join(dir, 'pnpm-workspace.yaml'), 'packages: []\\n');
}
`);
  await chmod(fakeDsh, 0o755);
  return { home, release, fakeDsh, log: join(home, 'calls.jsonl'), dshHome: join(home, 'dsh-home') };
}

function run(input, profile) {
  return spawnSync(process.execPath, [installer, '--directory', input.release, '--profile', profile, '--dsh', input.fakeDsh, '--corepack', input.fakeDsh], {
    encoding: 'utf8',
    env: { ...process.env, DSH_HOME: input.dshHome, INSTALL_LOG: input.log },
  });
}

const calls = async input => (await readFile(input.log, 'utf8')).trim().split('\n').map(line => JSON.parse(line));

test('project installer initializes a new profile exactly once', async () => {
  const input = await fixture();
  try {
    const result = run(input, 'fresh');
    assert.equal(result.status, 0, result.stderr);
    const recorded = await calls(input);
    assert.deepEqual(recorded[0], ['--version']);
    assert.deepEqual(recorded[1], ['--profile', 'fresh', '--from-default-profile', 'web', '--dump-config']);
    assert.equal(recorded.filter(args => args[0] === 'plugin').length, 13);
    assert.ok(recorded.some(args => args.includes(`@deepseek-ai/dsh@${harnessVersion}`) && args.includes(`@deepseek-ai/dsh-deepseek-account@${harnessVersion}`)));
  } finally { await rm(input.home, { recursive: true, force: true }); }
});

test('project installer upgrades an existing profile without reinitializing it', async () => {
  const input = await fixture();
  try {
    const profileDir = join(input.dshHome, 'profiles', 'existing');
    await mkdir(profileDir, { recursive: true });
    await writeFile(join(profileDir, 'package.json'), '{"marker":"preserve"}');
    await writeFile(join(profileDir, 'pnpm-workspace.yaml'), 'packages: []\n');
    const result = run(input, 'existing');
    assert.equal(result.status, 0, result.stderr);
    const recorded = await calls(input);
    assert.deepEqual(recorded[1], ['--profile', 'existing', '--dump-config']);
    assert.ok(recorded.every(args => !args.includes('--from-default-profile')));
    assert.match(await readFile(join(profileDir, 'package.json'), 'utf8'), /preserve/);
    assert.equal(recorded.filter(args => args[0] === 'plugin').length, 13);
    assert.ok(recorded.some(args => args.includes(`@deepseek-ai/dsh@${harnessVersion}`) && args.includes(`@deepseek-ai/dsh-deepseek-account@${harnessVersion}`)));
  } finally { await rm(input.home, { recursive: true, force: true }); }
});

test('project installer rejects an incompatible Harness before changing a profile', async () => {
  const input = await fixture('0.1.5-rc.1');
  try {
    const result = run(input, 'blocked');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`requires dsh ${harnessVersion.replaceAll('.', '\\.')}; found 0\\.1\\.5-rc\\.1`));
    assert.deepEqual(await calls(input), [['--version']]);
  } finally { await rm(input.home, { recursive: true, force: true }); }
});


test('installer supplies native build decisions and preserves explicit user choices', async () => {
  const input = await fixture();
  try {
    const dir = join(input.dshHome, 'profiles', 'builds');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'package.json'), '{}');
    const workspace = join(dir, 'pnpm-workspace.yaml');
    await writeFile(workspace, "packages: []\nallowBuilds:\n  koffi: false\n  'node-pty': set this to true or false\n");
    const result = run(input, 'builds');
    assert.equal(result.status, 0, result.stderr);
    const settings = await readFile(workspace, 'utf8');
    assert.equal(JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')).packageManager, 'pnpm@10.34.5');
    assert.ok(settings.includes(`\"@deepseek-ai/dsh-mcp-client\": \"${harnessVersion}\"`));
    assert.match(settings, /koffi: false/);
    assert.match(settings, /'node-pty': true/);
    assert.match(settings, /'@deepseek-ai\/dsh-subprocess-local': true/);
    assert.match(settings, /'@google\/genai': false/);
    assert.match(settings, /'protobufjs': false/);
    assert.doesNotMatch(settings, /set this/);
    const again = run(input, 'builds');
    assert.equal(again.status, 0, again.stderr);
    const repeated = await readFile(workspace, 'utf8');
    assert.equal(repeated.match(/@deepseek-ai\/dsh-mcp-client/g).length, 1);
  } finally { await rm(input.home, { recursive: true, force: true }); }
});


test('installer resolves required official peers without fetching bundled workspace or optional peers', async () => {
  const input = await fixture();
  try {
    const dir = join(input.dshHome, 'profiles', 'peers');
    const consumer = join(dir, 'node_modules', '@deepseek-ai', 'test-consumer');
    await mkdir(consumer, {recursive: true});
    await writeFile(join(dir, 'package.json'), '{}');
    await writeFile(join(dir, 'pnpm-workspace.yaml'), 'packages: []\n');
    await writeFile(join(consumer, 'package.json'), JSON.stringify({peerDependencies: {
      '@deepseek-ai/dsh-scope': '^0.1.7-alpha.1', 'workdsh-ui': '*', '@deepseek-ai/dsh-optional': '*',
    }, peerDependenciesMeta: {'@deepseek-ai/dsh-optional': {optional: true}}}));
    const result = run(input, 'peers');
    assert.equal(result.status, 0, result.stderr);
    const recorded = await calls(input);
    assert.ok(recorded.some(args => args.includes(`@deepseek-ai/dsh-scope@${harnessVersion}`)));
    assert.ok(recorded.every(args => !args.some(arg => arg.startsWith('workdsh-ui@') || arg.startsWith('@deepseek-ai/dsh-optional@'))));
  } finally { await rm(input.home, {recursive: true, force: true}); }
});
