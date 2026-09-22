import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = readFileSync(new URL('../pnpm-lock.yaml', import.meta.url), 'utf8');
const expected = '0.1.6-alpha.2';
const entries = [...lock.matchAll(/^  '?(@deepseek-ai\/dsh[^@\s']*)@([^\s:'(]+)(?:[^\n]*):$/gm)];
assert.ok(entries.length > 0, 'DSH lockfile entries must exist');
for (const [, name, version] of entries) {
  assert.equal(version, expected, `${name} version mismatch`);
  assert.equal(pkg.pnpm.overrides[name], expected, `${name} missing exact override`);
}
const resolved = new Set(entries.map(([, name]) => name));
for (const name of Object.keys(pkg.pnpm.overrides).filter(name => name.startsWith('@deepseek-ai/dsh'))) {
  assert.ok(resolved.has(name), `${name} override has no resolved lock entry (retired or renamed package)`);
}
const cordis = [...lock.matchAll(/^  '?@deepseek-ai\/cordis@([^\s:'(]+)(?:[^\n]*):$/gm)];
assert.ok(cordis.length > 0);
assert.deepEqual([...new Set(cordis.map(m => m[1]))], ['4.0.2']);
console.log(`PASS: ${entries.length} DSH lock entries pinned to ${expected}; Cordis 4.0.2 only`);
