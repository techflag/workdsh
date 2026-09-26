import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { WorkspaceAnalyzer, WorkspaceTypertGenerator } from '@deepseek-ai/dsh-typert-generator';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = resolve(root, 'examples/remote-probe');
const evidence = resolve(root, '.artifacts');
mkdirSync(evidence, { recursive: true });
const model = new WorkspaceAnalyzer({ root: fixture, faces: ['host'] }).analyze();
writeFileSync(resolve(evidence, 'workdsh-typert-model.json'), JSON.stringify(model, null, 2));
let artifacts;
try {
  artifacts = new WorkspaceTypertGenerator(fixture).generate(['workdsh-remote-probe-fixture'], ['host']);
  assert.equal(artifacts.length, 1, 'generator must discover exactly one fixture');
  assert.ok(artifacts[0].remote, 'generator must discover Remote methods');
} catch (error) {
  writeFileSync(resolve(evidence, 'workdsh-typert-error.txt'), String(error));
  throw error; // A known gap remains a failing gate, never a simulated pass.
}
for (const artifact of artifacts) {
  assert.ok(artifact.remote, 'WorkDSH must publish generated Remote descriptors');
  const out = resolve(artifact.packageRoot, 'lib');
  mkdirSync(out, { recursive: true });
  for (const [name, content] of Object.entries({
    'typert.host.js': artifact.js,
    'typert.host.d.ts': artifact.dts,
    'typert.remote-client.js': artifact.remote.js,
    'typert.remote-client.d.ts': artifact.remote.dts,
    'typert.remote-client.d.ts.map': artifact.remote.dtsMap,
  })) writeFileSync(resolve(out, name), content);
}
console.log('PASS: official generator emitted WorkDSH Host and Remote Client artifacts');
