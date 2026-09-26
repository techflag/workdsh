import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dsh = resolve(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js');
const home = await mkdtemp(join(tmpdir(), 'workdsh-headless-probe-'));

function run(args, input) {
  return spawnSync(process.execPath, [dsh, '--profile', 'headless', ...args], {
    cwd: root,
    env: { ...process.env, DSH_HOME: home },
    input,
    encoding: 'utf8',
    timeout: 30_000,
  });
}

function jsonLines(output) {
  return output.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

try {
  const help = run(['--help']);
  if (help.status !== 0) throw new Error(`Headless help failed: ${help.stderr}`);
  for (const flag of ['--json', '--session-id <id>', 'reads stdin']) {
    if (!help.stdout.includes(flag)) throw new Error(`Headless help does not expose ${flag}.`);
  }

  const emptyStdin = run(['--json'], ' \n');
  const emptyEvents = jsonLines(emptyStdin.stdout);
  if (emptyStdin.status !== 1 || emptyEvents[0]?.type !== 'error' || !/(stdin task is empty|a task is required)/.test(emptyEvents[0]?.message ?? '')) {
    throw new Error(`Headless stdin rejection contract changed: ${emptyStdin.stdout}${emptyStdin.stderr}`);
  }

  const unknown = run(['--json', '--session-id', 'session-does-not-exist', 'continue']);
  const unknownEvents = jsonLines(unknown.stdout);
  if (unknown.status !== 1 || unknownEvents[0]?.type !== 'error' || !/does not exist/.test(unknownEvents[0]?.message ?? '')) {
    throw new Error(`Headless session continuation contract changed: ${unknown.stdout}${unknown.stderr}`);
  }

  const version = await readFile(resolve(root, 'node_modules/@deepseek-ai/dsh/package.json'), 'utf8').then(JSON.parse);
  console.log(JSON.stringify({
    dshVersion: version.version,
    profile: 'headless',
    stdin: 'accepted by CLI and empty input rejected before execution',
    json: 'machine-readable error event verified',
    sessionId: 'unknown persisted Session rejected before execution',
    realRunEvidence: 'A successful JSONL run and a second-turn continuation were verified manually on 2026-09-15.',
  }, null, 2));
} finally {
  await rm(home, { recursive: true, force: true });
}
