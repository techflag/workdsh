import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const plugin = join(root, 'packages/plugins/library');
const destination = join(root, '.artifacts/library-release');
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
execFileSync('corepack', ['pnpm', '--filter', 'workdsh-plugin-library', 'build'], { cwd: root, stdio: 'inherit' });
const stage = await mkdtemp(join(destination, 'package-'));
const manifest = JSON.parse(await readFile(join(plugin, 'package.json'), 'utf8'));
delete manifest.devDependencies; delete manifest.scripts;
manifest.workdshRelease = {
  scope: 'local-library-alpha',
  storage: '$DSH_HOME/library',
  formats: ['md', 'markdown', 'txt', 'html', 'htm', 'pdf', 'docx', 'pptx'],
  preservesOriginals: true,
};
await writeFile(join(stage, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
for (const file of manifest.files) await cp(join(plugin, file), join(stage, file), { recursive: true });
execFileSync('corepack', ['pnpm', 'pack', '--pack-destination', destination], { cwd: stage, stdio: 'inherit' });
const filename = `${manifest.name}-${manifest.version}.tgz`;
const bytes = await readFile(join(destination, filename)); const sha256 = createHash('sha256').update(bytes).digest('hex');
await writeFile(join(destination, 'SHA256SUMS.txt'), `${sha256}  ${filename}\n`);
await writeFile(join(destination, 'release-manifest.json'), `${JSON.stringify({
  name: manifest.name, version: manifest.version, harness: '0.1.7-rc.2', filename, sha256, bytes: bytes.length,
  storage: manifest.workdshRelease.storage, formats: manifest.workdshRelease.formats,
  limitations: ['Local personal space only', 'Scanned PDF OCR is not included', 'DOCX/PPTX original preview requires the optional workdsh-plugin-office client'],
}, null, 2)}\n`);
await rm(stage, { recursive: true, force: true });
console.log(`Library release candidate: ${filename}; files: ${(await readdir(destination)).sort().join(', ')}`);
