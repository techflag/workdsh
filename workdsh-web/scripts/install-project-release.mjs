#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const value = (name, fallback) => {
  const index = argv.indexOf(name);
  return index === -1 ? fallback : argv[index + 1];
};
const has = name => argv.includes(name);
const profile = value('--profile', 'workdsh');
const directory = resolve(value('--directory', dirname(fileURLToPath(import.meta.url))));
const dsh = value('--dsh', 'dsh');
const dryRun = has('--dry-run');
const corepack = value('--corepack', 'corepack');
const manifestPath = join(directory, 'release-manifest.json');

if (!existsSync(manifestPath)) {
  throw new Error(`Missing ${manifestPath}. Put this installer beside release-manifest.json and all release .tgz files.`);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const expectedHarness = manifest.harness;
if (typeof expectedHarness !== 'string' || expectedHarness.length === 0) {
  throw new Error('Release manifest does not declare the required Harness version.');
}
const packages = new Map(manifest.packages.map(item => [item.name, item]));
const installOrder = [
  'workdsh-provider-identity-local',
  'workdsh-provider-browser-session',
  'workdsh-plugin-audit',
  'workdsh-plugin-access',
  'workdsh-plugin-skills',
  // The experts layer installs and activates the three official DSH Agent Team modules.
  'workdsh-plugin-experts',
  'workdsh-plugin-connectors',
  'workdsh-plugin-activity',
  'workdsh-plugin-office',
  'workdsh-plugin-library',
  'workdsh-plugin-projects',
  'workdsh-bundle',
];

for (const name of installOrder) {
  const item = packages.get(name);
  if (!item) throw new Error(`Release manifest is missing required package ${name}.`);
  const path = join(directory, item.filename);
  if (!existsSync(path)) throw new Error(`Missing release asset ${path}.`);
  const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
  if (actual !== item.sha256) throw new Error(`SHA-256 mismatch for ${item.filename}.`);
}

function execute(args, options = {}) {
  console.log(`> ${dsh} ${args.join(' ')}`);
  if (dryRun && !options.always) return undefined;
  const result = spawnSync(dsh, args, options.capture
    ? { encoding: 'utf8' }
    : { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result;
}

// pnpm blocks dependency lifecycle scripts until the profile makes an explicit
// decision. protobufjs only runs a version-range warning in postinstall; the
// runtime library remains installed when this script is disabled.
const dshHome = resolve(process.env.DSH_HOME || join(homedir(), '.dsh'));
const versionResult = execute(['--version'], { always: true, capture: true });
const actualHarness = versionResult?.stdout?.trim();
if (actualHarness !== expectedHarness) {
  throw new Error(`WorkDSH ${manifest.version} requires dsh ${expectedHarness}; found ${actualHarness || 'unknown'}. Pass --dsh /absolute/path/to/a-compatible-dsh.`);
}

const profileManifest = join(dshHome, 'profiles', profile, 'package.json');
if (existsSync(profileManifest)) {
  console.log(`Existing profile ${profile} detected; preserving its configuration and stored data.`);
  execute(['--profile', profile, '--dump-config']);
} else {
  execute(['--profile', profile, '--from-default-profile', 'web', '--dump-config']);
}

// Use the release's tested package manager rather than the machine's global pnpm.
if (!dryRun && existsSync(profileManifest) && /^pnpm@\d+\.\d+\.\d+$/.test(manifest.packageManager ?? '')) {
  const profilePackage = JSON.parse(readFileSync(profileManifest, 'utf8'));
  profilePackage.packageManager = manifest.packageManager;
  writeFileSync(profileManifest, JSON.stringify(profilePackage, null, 2) + '\n');
}

const workspaceFile = join(dshHome, 'profiles', profile, 'pnpm-workspace.yaml');
if (!dryRun && existsSync(workspaceFile)) {
  let current = readFileSync(workspaceFile, 'utf8');
  // Native helpers are required by the official runtime; the other two scripts
  // are informational/no-op. Preserve any explicit decision made by the owner.
  const defaults = {
    '@deepseek-ai/dsh-subprocess-local': true,
    '@google/genai': false,
    koffi: true,
    'node-pty': true,
    protobufjs: false,
  };
  if (!/^allowBuilds:/m.test(current)) current = `${current.trimEnd()}\n\nallowBuilds:\n`;
  for (const [name, allowed] of Object.entries(defaults)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const row = new RegExp(`^  ['"]?${escaped}['"]?:[^\\n]*$`, 'm');
    const existing = current.match(row)?.[0];
    if (existing && /: (true|false)\s*$/.test(existing)) continue;
    const decision = `  '${name}': ${allowed}`;
    current = existing ? current.replace(row, decision) : current.replace(/^allowBuilds:\s*$/m, `allowBuilds:\n${decision}`);
  }
  if (manifest.runtimeOverrides) {
    if (/^overrides:[^\n]*\S[^\n]*$/m.test(current)) {
      throw new Error('Profile uses inline overrides; convert them to a YAML block before installing.');
    }
    if (!/^overrides:/m.test(current)) current += '\n\noverrides:\n';
    current = current.replace(/^overrides:[ \t]*\n(?:[ \t]+[^\n]*\n|\n)*/m, block => {
      let result = block;
      for (const [name, version] of Object.entries(manifest.runtimeOverrides)) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(`^  ['"]?${escaped}['"]?:[^\\n]*\\n?`, 'm'), '');
        result += `  ${JSON.stringify(name)}: ${JSON.stringify(version)}\n`;
      }
      return result;
    });
  }
  writeFileSync(workspaceFile, current);
}

execute(['plugin', '--profile', profile, 'add', `@deepseek-ai/dsh-base@${expectedHarness}`, `@deepseek-ai/dsh-web-app@${expectedHarness}`]);

for (const name of installOrder) {
  const item = packages.get(name);
  execute(['plugin', '--profile', profile, 'add', join(directory, item.filename)]);
  // Installing a package does not guarantee that DSH loads its bundle. The
  // browser-session provider is inserted by workdsh-bundle's patch instead.
  if (!dryRun && name !== 'workdsh-provider-browser-session') {
    const profilePackage = JSON.parse(readFileSync(profileManifest, 'utf8'));
    const bundles = profilePackage.dsh?.profile?.bundles ?? [];
    if (!bundles.includes(name)) bundles.push(name);
    profilePackage.dsh = { ...profilePackage.dsh, profile: { ...profilePackage.dsh?.profile, bundles } };
    writeFileSync(profileManifest, JSON.stringify(profilePackage, null, 2) + '\n');
  }
}

// Keep CLI and ConfigEditor in the same Profile dependency graph (0.1.7).
const runtimeArgs = ['pnpm', '--dir', join(dshHome, 'profiles', profile), 'add', '--save-exact', `@deepseek-ai/dsh@${expectedHarness}`, `@deepseek-ai/dsh-deepseek-account@${expectedHarness}`, '@deepseek-ai/cordis-plugin-group@1.0.4'];
console.log(`> ${corepack} ${runtimeArgs.join(' ')}`);
if (!dryRun) {
  const result = spawnSync(corepack, runtimeArgs, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
// Profiles disable automatic peers, because WorkDSH's build-only workspace peers
// are bundled and not published to npm. Install the official runtime peer closure
// explicitly so a clean Profile can boot without relying on the developer repo.
if (!dryRun) {
  const scope = join(dshHome, 'profiles', profile, 'node_modules', '@deepseek-ai');
  for (let pass = 0; existsSync(scope); pass++) {
    const missing = new Map();
    for (const entry of readdirSync(scope)) {
      const path = join(scope, entry, 'package.json');
      if (!existsSync(path)) continue;
      const pkg = JSON.parse(readFileSync(path, 'utf8'));
      for (const [name, range] of Object.entries(pkg.peerDependencies ?? {})) {
        if (!name.startsWith('@deepseek-ai/') || pkg.peerDependenciesMeta?.[name]?.optional) continue;
        if (existsSync(join(scope, name.slice('@deepseek-ai/'.length), 'package.json'))) continue;
        const version = manifest.runtimeOverrides?.[name] ?? (name.startsWith('@deepseek-ai/dsh-') ? expectedHarness : range);
        missing.set(name, `${name}@${version}`);
      }
    }
    if (!missing.size) break;
    if (pass >= 8) throw new Error('Official runtime peer dependencies did not converge.');
    const result = spawnSync(corepack, ['pnpm', '--dir', join(dshHome, 'profiles', profile), 'add', '--save-exact', ...missing.values()], { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
const profileCli = join(dshHome, 'profiles', profile, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js');
console.log(`\nWorkDSH ${manifest.version} ${dryRun ? 'installation plan verified' : 'is installed'} in profile ${profile}.`);
console.log(`Start it with: node ${JSON.stringify(profileCli)} --profile ${JSON.stringify(profile)}`);
