import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const previewHome = process.env.WORKDSH_PREVIEW_HOME ?? resolve(root, '.test-runtime/preview');
const agentsHome = process.env.DSH_AGENTS_HOME ?? resolve(homedir(), '.agents');
const port = process.env.WORKDSH_PREVIEW_PORT ?? '3031';
// Preview currently needs a larger startup heap; this does not fix the underlying growth.
const heapMb = process.env.WORKDSH_PREVIEW_HEAP_MB ?? '8192';
if (!/^\d+$/.test(heapMb) || Number(heapMb) < 512) throw new Error('WORKDSH_PREVIEW_HEAP_MB must be an integer >= 512');
const dsh = resolve(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js');

mkdirSync(previewHome, { recursive: true });
const child = spawn(process.execPath, [`--max-old-space-size=${heapMb}`, dsh, '--profile', 'preview', '--host', '127.0.0.1', '--port', port, '--no-open'], {
  cwd: root,
  env: { ...process.env, DSH_HOME: previewHome, DSH_AGENTS_HOME: agentsHome },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
