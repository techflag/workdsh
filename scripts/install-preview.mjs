import { execFile } from 'node:child_process';
import { access, copyFile, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { withoutRedundantAgentTeamProfile } from './preview-agent-team.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const rootManifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const baseVersion = rootManifest.pnpm?.overrides?.['@deepseek-ai/dsh-base'];
const webAppVersion = rootManifest.pnpm?.overrides?.['@deepseek-ai/dsh-web-app'];
if (typeof baseVersion !== 'string') throw new Error('Missing pinned @deepseek-ai/dsh-base version in package.json pnpm.overrides.');
if (typeof webAppVersion !== 'string') throw new Error('Missing pinned @deepseek-ai/dsh-web-app version in package.json pnpm.overrides.');
const baseSpec = `@deepseek-ai/dsh-base@${baseVersion}`;
const webAppSpec = `@deepseek-ai/dsh-web-app@${webAppVersion}`;
const cliVersion = JSON.parse(await readFile(join(root, 'node_modules/@deepseek-ai/dsh/package.json'), 'utf8')).version;
if (cliVersion !== baseVersion) throw new Error('Preview CLI and Base must use the same pinned version.');
const home = resolve(process.env.WORKDSH_PREVIEW_HOME ?? join(root, '.test-runtime/preview'));
const artifacts = join(root, '.artifacts');
const env = { ...process.env, DSH_HOME: home, PATH: `${join(root, 'node_modules/.bin')}:${dirname(process.execPath)}:${process.env.PATH}` };
const exec = promisify(execFile);
const run = async (tool, args) => {
  await exec(process.execPath, [join(root, 'node_modules', tool), ...args], { cwd: root, env, timeout: 600_000, maxBuffer: 8 * 1024 * 1024 });
};
await mkdir(home, { recursive: true }); await mkdir(artifacts, { recursive: true });
const tarballs = [];
const packages = [];
for (const directory of ['packages/providers/identity-local', 'packages/plugins/audit', 'packages/plugins/access', 'packages/plugins/skills', 'packages/plugins/experts', 'packages/plugins/connectors', 'packages/plugins/office', 'packages/plugins/library', 'packages/plugins/projects', 'packages/plugins/activity', 'packages/bundle']) {
  const manifest = JSON.parse(await readFile(join(root, directory, 'package.json'), 'utf8'));
  await access(join(root, directory, manifest.exports['.'].default));
  await run('pnpm/bin/pnpm.cjs', ['--filter', manifest.name, 'pack', '--pack-destination', artifacts]);
  const packed = join(artifacts, `${manifest.name}-${manifest.version}.tgz`);
  // Preview candidates can change before their next release. A stable file:
  // address lets the package manager reuse an older archive, even after pack.
  // Keep official CLI installation, but address each archive by its content.
  const digest = createHash('sha256').update(await readFile(packed)).digest('hex');
  const destination = join(artifacts, 'preview', digest);
  await mkdir(destination, { recursive: true });
  const immutableArchive = join(destination, `${manifest.name}-${manifest.version}.tgz`);
  await copyFile(packed, immutableArchive);
  tarballs.push(immutableArchive);
  packages.push({ directory, manifest });
}
let initialized = false;
try { await access(join(home, 'profiles/preview/package.json')); initialized = true; }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!initialized) await run('@deepseek-ai/dsh/lib/bin.js', ['--profile', 'preview', '--from-default-profile', 'web', '--dump-config']);
// Experts already contributes the official Team service, tools and Web action.
// The standalone Team profile adds the same loader ids again and can be toggled
// on from the upstream plugin gallery. Keep this preview's bundle list singular.
const previewManifestPath = join(home, 'profiles/preview/package.json');
const previewManifest = JSON.parse(await readFile(previewManifestPath, 'utf8'));
const normalizedManifest = withoutRedundantAgentTeamProfile(previewManifest);
if (normalizedManifest) {
  await writeFile(previewManifestPath, `${JSON.stringify(normalizedManifest, null, 2)}\n`);
  console.log('Removed redundant standalone Agent Team profile from preview; WorkDSH experts owns Team composition.');
}
// Reinstall the pinned official Web bundle as well as the WorkDSH layers. An
// existing preview Profile may have been created by an older DSH release; its
// bundle list alone does not upgrade the packages that provide newly added Web
// surfaces such as Terminal and archived-session recovery.
const currentDependencies = JSON.parse(await readFile(previewManifestPath, 'utf8')).dependencies ?? {};
const layersMatch = currentDependencies['@deepseek-ai/dsh-base'] === baseVersion
  && currentDependencies['@deepseek-ai/dsh-web-app'] === webAppVersion
  && packages.every(({ manifest }, index) => currentDependencies[manifest.name] === `file:${tarballs[index]}`);
if (!layersMatch) {
  await run('@deepseek-ai/dsh/lib/bin.js', ['plugin', '--profile', 'preview', 'add', baseSpec, webAppSpec, ...tarballs]);
}
// Boot and ConfigEditor share module-local registration in dsh-app-boot.
// Keep the official CLI in the Profile dependency graph as well: launching the
// workspace CLI beside separately installed Profile packages splits that state.
// Profiles disable automatic peer installation. The platform account adapter
// also needs its declared native account peer in this standalone runtime.
const installedVersion = async (name) => {
  try { return JSON.parse(await readFile(join(home, 'profiles/preview/node_modules/@deepseek-ai', name, 'package.json'), 'utf8')).version; }
  catch (error) { if (error.code === 'ENOENT') return undefined; throw error; }
};
if (await installedVersion('dsh') !== cliVersion || await installedVersion('dsh-deepseek-account') !== cliVersion) {
  await run('pnpm/bin/pnpm.cjs', ['--dir', join(home, 'profiles/preview'), 'add', '--save-exact', `@deepseek-ai/dsh@${cliVersion}`, `@deepseek-ai/dsh-deepseek-account@${cliVersion}`]);
}
const installedBase = JSON.parse(await readFile(join(home, 'profiles/preview/node_modules/@deepseek-ai/dsh-base/package.json'), 'utf8'));
if (installedBase.version !== baseVersion) throw new Error(`Installed @deepseek-ai/dsh-base ${installedBase.version} does not match pinned ${baseVersion}.`);
const installedWebApp = JSON.parse(await readFile(join(home, 'profiles/preview/node_modules/@deepseek-ai/dsh-web-app/package.json'), 'utf8'));
if (installedWebApp.version !== webAppVersion) throw new Error(`Installed @deepseek-ai/dsh-web-app ${installedWebApp.version} does not match pinned ${webAppVersion}.`);
// DSH scopes are module-instance local. Installing only the Web bundle
// beside a CLI-provided Base bundle can load two physical dsh-scope copies: the
// Agent consumers must resolve one shared scope module; otherwise new
// session fails as an "unscoped context". Resolve both consumers from the
// Profile and fail installation unless they share the exact same module file.
const profileRequire = createRequire(join(home, 'profiles/preview/package.json'));
const resolveProfileDependency = async (consumer, dependency) => {
  const consumerManifest = profileRequire.resolve(`${consumer}/package.json`);
  const consumerRequire = createRequire(consumerManifest);
  return realpath(consumerRequire.resolve(`${dependency}/package.json`));
};
const cliBoot = await resolveProfileDependency('@deepseek-ai/dsh', '@deepseek-ai/dsh-app-boot');
const settingsBoot = await resolveProfileDependency('@deepseek-ai/dsh-config-editor', '@deepseek-ai/dsh-app-boot');
if (cliBoot !== settingsBoot) throw new Error('Preview CLI and ConfigEditor resolve different dsh-app-boot instances; settings cannot persist.');
const loopScope = await resolveProfileDependency('@deepseek-ai/dsh-agent-loop', '@deepseek-ai/dsh-scope');
const presetScope = await resolveProfileDependency('@deepseek-ai/dsh-agent-preset-registry', '@deepseek-ai/dsh-scope');
if (loopScope !== presetScope) throw new Error(`Preview loaded split @deepseek-ai/dsh-scope instances: agent-loop=${loopScope}; agent-preset-registry=${presetScope}.`);
for (const { directory, manifest } of packages) {
  for (const face of ['.', './client']) {
    const entry = manifest.exports[face]?.default;
    if (!entry) continue;
    const expected = await readFile(join(root, directory, entry));
    const installed = await readFile(join(home, 'profiles/preview/node_modules', manifest.name, entry));
    if (!expected.equals(installed)) throw new Error(`Installed ${manifest.name} ${face} differs from the current build; refusing to report a successful preview update.`);
  }
}
console.log('Installed Skill, Expert, Connector, Office, Library, Projects and WorkDSH presentation as separate official Profile layers.');
console.log('Start the stopped preview with: corepack pnpm preview');
