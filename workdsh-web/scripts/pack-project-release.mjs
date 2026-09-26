import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const project = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const tag = `v${project.version}`;
const releaseNotes = join(root, 'RELEASE-NOTES.md');
const destination = join(root, '.artifacts', `project-${tag}`);
const packageDirectories = [
  'packages/providers/identity-local',
  'packages/providers/browser-session',
  'packages/plugins/audit',
  'packages/plugins/access',
  'packages/plugins/skills',
  'packages/plugins/experts',
  'packages/plugins/connectors',
  'packages/plugins/office',
  'packages/plugins/library',
  'packages/plugins/projects',
  'packages/plugins/activity',
  'packages/bundle',
];

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

for (const directory of packageDirectories) {
  execFileSync(process.platform === 'win32' ? 'corepack.cmd' : 'corepack', ['pnpm', 'pack', '--pack-destination', destination], {
    cwd: join(root, directory),
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });
}

const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
let sourceDirty = false;
try {
  // Build tools may create untracked platform-specific files. A release is
  // dirty only when committed source or the pinned submodule gitlink changes.
  execFileSync('git', ['diff', '--quiet', '--ignore-submodules=dirty', 'HEAD', '--'], { cwd: root, stdio: 'ignore' });
} catch (error) {
  if (error.status !== 1) throw error;
  sourceDirty = true;
}
const packages = [];
for (const directory of packageDirectories) {
  const manifest = JSON.parse(await readFile(join(root, directory, 'package.json'), 'utf8'));
  const filename = `${manifest.name}-${manifest.version}.tgz`;
  const bytes = await readFile(join(destination, filename));
  packages.push({
    name: manifest.name,
    version: manifest.version,
    filename,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}

packages.sort((left, right) => left.name.localeCompare(right.name));
await writeFile(join(destination, 'SHA256SUMS'), packages.map(item => `${item.sha256}  ${item.filename}`).join('\n') + '\n');
await writeFile(join(destination, 'release-manifest.json'), JSON.stringify({
  project: 'WorkDSH',
  version: project.version,
  tag,
  channel: 'github-release',
  sourceCommit,
  sourceDirty,
  harness: '0.1.7-rc.2',
  node: process.version,
  packageManager: project.packageManager,
  runtimeOverrides: Object.fromEntries(Object.entries(project.pnpm.overrides).filter(([name]) => name.startsWith('@deepseek-ai/'))),
  packages,
  verified: ['Package checksums generated; CI validates build, types, DSH version alignment and integration tests'],
  limitations: [
    'alpha preview; package APIs and stored data may change',
    'interactive OAuth, connector multi-account switching and public authorization are not complete',
    'hour-scale expert-team soak, official fork-member browser history, arbitrary Office fidelity and cross-platform acceptance remain incomplete',
    'real-model end-to-end workflows and every third-party Skill or plugin remain outside automated release checks',
    'packages are GitHub assets and are not published to the npm registry',
  ],
}, null, 2) + '\n');
await copyFile(join(root, 'scripts/install-project-release.mjs'), join(destination, 'install-workdsh.mjs'));
await copyFile(releaseNotes, join(destination, 'RELEASE-NOTES.md'));

const files = (await readdir(destination)).sort();
console.log(`Project release candidate ${tag}: ${packages.length} packages; files: ${files.join(', ')}`);
