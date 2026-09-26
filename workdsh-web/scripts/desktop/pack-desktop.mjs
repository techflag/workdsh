#!/usr/bin/env node
/**
 * WorkDSH 桌面打包入口（macOS arm64，未签名本地测试版）。
 *
 * 基于官方 apps/desktop 流水线（deepseek-ai/deepseek-harness，tag dsh-v0.1.5-rc.1）的
 * 隔离快照 + WORKDSH TEST PATCH 补丁（存档见 scripts/desktop/patches/，完整指南见 docs/DESKTOP-PACKAGING.md）。
 *
 * 用法:
 *   node scripts/desktop/pack-desktop.mjs                # 校验快照补丁 → build:desktop → electron-builder → 产物校验
 *   node scripts/desktop/pack-desktop.mjs --skip-build   # 跳过 build:desktop（只重跑 electron-builder）
 *   node scripts/desktop/pack-desktop.mjs --check-only   # 只做前置检查（不构建）
 *   node scripts/desktop/pack-desktop.mjs --sync-patches # 用快照当前文件同步补丁存档（补丁改动后）
 *   node scripts/desktop/pack-desktop.mjs --restart      # 打包并校验通过后重启应用
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(SCRIPT_DIR, '..', '..');
const SNAPSHOT = join(WORKSPACE_ROOT, '.artifacts', 'desktop-pack-test', 'upstream');
const DESKTOP_APP = join(SNAPSHOT, 'apps', 'desktop');
const PATCH_STORE = join(SCRIPT_DIR, 'patches', 'upstream');
const TARGET_NAME = 'mac-arm64';
const APP_BUNDLE = join(DESKTOP_APP, '.desktop-build', 'targets', TARGET_NAME, 'artifacts', TARGET_NAME, 'WorkDSH.app');
const ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/';
const REQUIRED_NODE = [22, 19];

const args = new Set(process.argv.slice(2));
const flag = (name) => args.has(name);

function fail(message) {
  console.error(`\n[pack-desktop] ERROR: ${message}`);
  process.exit(1);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', ...options });
  if (result.error !== undefined) fail(`${command} 无法执行: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} ${commandArgs.join(' ')} 退出码 ${result.status}`);
}

function runCapture(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { encoding: 'utf8', ...options });
  if (result.error !== undefined) fail(`${command} 无法执行: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} ${commandArgs.join(' ')} 退出码 ${result.status}: ${result.stderr?.trim()}`);
  return result.stdout.trim();
}

// --- Node 自举：shell 默认 Node 可能低于 22.19，脚本自动切换到 nvm 中的合格版本重跑 ---
function needsNodeBootstrap() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  return major < REQUIRED_NODE[0] || (major === REQUIRED_NODE[0] && minor < REQUIRED_NODE[1]);
}

function findNode22Bin() {
  const nvmRoot = join(homedir(), '.nvm', 'versions', 'node');
  if (!existsSync(nvmRoot)) return undefined;
  const candidates = readdirSync(nvmRoot)
    .filter((name) => /^v22\.\d+\.\d+$/.test(name))
    .filter((name) => {
      const [major, minor] = name.slice(1).split('.').map(Number);
      return major > REQUIRED_NODE[0] || minor >= REQUIRED_NODE[1];
    })
    .sort((a, b) => {
      const pa = a.slice(1).split('.').map(Number);
      const pb = b.slice(1).split('.').map(Number);
      return pb[0] - pa[0] || pb[1] - pa[1] || pb[2] - pa[2];
    });
  const bin = candidates.length > 0 ? join(nvmRoot, candidates[0], 'bin', 'node') : undefined;
  return bin !== undefined && existsSync(bin) ? bin : undefined;
}

if (needsNodeBootstrap()) {
  const node22 = findNode22Bin();
  if (node22 === undefined) fail(`需要 Node >= ${REQUIRED_NODE.join('.')}，当前 ${process.versions.node}，且未在 ~/.nvm/versions/node 找到 v22.${REQUIRED_NODE[1]}+`);
  console.log(`[pack-desktop] Node ${process.versions.node} 不满足要求，切换到 ${node22} 重跑`);
  run(node22, [fileURLToPath(import.meta.url), ...process.argv.slice(2)]);
  process.exit(0);
}

// --- 快照与 pnpm ---
function snapshotPnpmVersion() {
  const manifest = JSON.parse(readFileSync(join(SNAPSHOT, 'package.json'), 'utf8'));
  const declared = /^pnpm@(.+)$/.exec(manifest.packageManager ?? '');
  return declared?.[1];
}

function resolvePnpmEntry() {
  const cacheRoot = join(homedir(), '.cache', 'node', 'corepack', 'v1', 'pnpm');
  const declared = snapshotPnpmVersion();
  const candidates = existsSync(cacheRoot) ? readdirSync(cacheRoot) : [];
  const pick = declared !== undefined && candidates.includes(declared) ? declared : candidates.sort().at(-1);
  if (pick === undefined) fail(`未找到 pnpm corepack 缓存（${cacheRoot}），请先安装 pnpm@${declared ?? '11.7.0'}`);
  const entry = join(cacheRoot, pick, 'bin', 'pnpm.mjs');
  if (!existsSync(entry)) fail(`pnpm 入口不存在: ${entry}`);
  return entry;
}

function snapshotEnv() {
  return {
    ...process.env,
    PATH: `${dirname(process.execPath)}:${process.env.PATH ?? ''}`,
    DSH_DESKTOP_TARGET_PLATFORM: 'darwin',
    DSH_DESKTOP_TARGET_ARCH: 'arm64',
    WORKDSH_DESKTOP_UNSIGNED: '1',
    DSH_DESKTOP_APP_ID: 'com.workdsh.app',
    DSH_DESKTOP_AUTO_UPDATE_ENV: 'production',
    ELECTRON_MIRROR,
  };
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function listFiles(root) {
  const entries = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else entries.push(path);
    }
  };
  walk(root);
  return entries;
}

function checkPrerequisites() {
  if (!existsSync(join(DESKTOP_APP, 'package.json'))) {
    fail(`官方快照缺失: ${SNAPSHOT}\n  重建步骤见 docs/DESKTOP-PACKAGING.md「快照重建」`);
  }
  const drift = [];
  for (const patchFile of listFiles(PATCH_STORE)) {
    const target = join(SNAPSHOT, relative(PATCH_STORE, patchFile));
    if (!existsSync(target)) drift.push(`${relative(PATCH_STORE, patchFile)} (快照缺失)`);
    else if (sha256(patchFile) !== sha256(target)) drift.push(`${relative(PATCH_STORE, patchFile)} (内容不一致)`);
  }
  if (drift.length > 0 && flag('--sync-patches')) {
    for (const patchFile of listFiles(PATCH_STORE)) {
      const target = join(SNAPSHOT, relative(PATCH_STORE, patchFile));
      if (existsSync(target)) copyFileSync(target, patchFile);
    }
    console.log(`[pack-desktop] 已将快照差异同步到补丁存档（${drift.length} 处），注意随代码提交。`);
  } else if (drift.length > 0) {
    fail(`快照与补丁存档不一致（${drift.length} 处）:\n  ${drift.join('\n  ')}\n  若确认快照为最新补丁，运行 --sync-patches 同步存档；否则检查快照是否被改动。`);
  } else {
    console.log(`[pack-desktop] 快照与补丁存档一致（${listFiles(PATCH_STORE).length} 个补丁文件）`);
  }
}

// --- 产物校验 ---
function findAsarModule() {
  const pnpmRoot = join(SNAPSHOT, 'node_modules', '.pnpm');
  if (!existsSync(pnpmRoot)) return undefined;
  const entry = readdirSync(pnpmRoot).filter((name) => name.startsWith('@electron+asar@')).sort().at(-1);
  if (entry === undefined) return undefined;
  const moduleRoot = join(pnpmRoot, entry, 'node_modules', '@electron', 'asar');
  const manifest = JSON.parse(readFileSync(join(moduleRoot, 'package.json'), 'utf8'));
  return join(moduleRoot, manifest.main ?? 'lib/asar.js');
}

function plistValue(key) {
  return runCapture('plutil', ['-extract', key, 'raw', join(APP_BUNDLE, 'Contents', 'Info.plist')]);
}

function verifyArtifact() {
  if (!existsSync(APP_BUNDLE)) fail(`产物不存在: ${APP_BUNDLE}`);
  const problems = [];
  const expect = (label, actual, wanted) => {
    if (actual !== wanted) problems.push(`${label}: 期望 ${wanted}，实际 ${actual}`);
  };
  expect('CFBundleIdentifier', plistValue('CFBundleIdentifier'), 'com.workdsh.app');
  expect('CFBundleDisplayName', plistValue('CFBundleDisplayName'), 'WorkDSH');
  expect('CFBundleIconFile', plistValue('CFBundleIconFile'), 'icon.icns');
  const iconSource = join(DESKTOP_APP, 'workdsh-icon.icns');
  const iconPacked = join(APP_BUNDLE, 'Contents', 'Resources', 'icon.icns');
  if (!existsSync(iconPacked) || sha256(iconSource) !== sha256(iconPacked)) problems.push('icon.icns 与品牌源不一致');

  const asarPath = join(APP_BUNDLE, 'Contents', 'Resources', 'app.asar');
  const asarMain = findAsarModule();
  if (asarMain === undefined) {
    problems.push('未找到 @electron/asar 模块，无法校验 app.asar');
  } else {
    const require = createRequire(import.meta.url);
    const asar = require(asarMain);
    const main = asar.extractFile(asarPath, 'lib/main.js').toString();
    const preload = asar.extractFile(asarPath, 'lib/preload-app.cjs').toString();
    if (!main.includes('hiddenInset') || !main.includes('shellFrame')) problems.push('app.asar lib/main.js 缺少窗口壳补丁（hiddenInset/shellFrame）');
    if (!preload.includes('workdshShell') || !preload.includes('_logoRow')) problems.push('app.asar lib/preload-app.cjs 缺少外壳适配样式补丁');
  }
  if (problems.length > 0) fail(`产物校验失败:\n  ${problems.join('\n  ')}`);
  console.log('[pack-desktop] 产物校验通过（Info.plist / 图标 / app.asar 补丁断言）');
}

function appSize() {
  const result = spawnSync('du', ['-sh', APP_BUNDLE], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.split('\t')[0] : 'unknown';
}

// --- 主流程 ---
console.log(`[pack-desktop] 快照: ${SNAPSHOT}`);
checkPrerequisites();
if (flag('--check-only')) {
  console.log('[pack-desktop] --check-only 完成，未执行构建。');
  process.exit(0);
}

const pnpm = resolvePnpmEntry();
if (spawnSync('pgrep', ['-f', 'WorkDSH.app/Contents/MacOS/WorkDSH']).status === 0) {
  console.log('[pack-desktop] 停止运行中的 WorkDSH 实例（避免覆盖运行中的应用）');
  spawnSync('pkill', ['-f', 'WorkDSH.app/Contents/MacOS/WorkDSH']);
}
if (!flag('--skip-build')) {
  console.log('[pack-desktop] 1/2 build:desktop（tsc + tsdown）');
  run(process.execPath, [pnpm, 'run', 'build:desktop'], { cwd: SNAPSHOT, env: snapshotEnv() });
} else {
  console.log('[pack-desktop] 1/2 跳过 build:desktop（--skip-build）');
}
console.log('[pack-desktop] 2/2 electron-builder --dir（未签名，--publish never）');
run(process.execPath, [pnpm, 'exec', 'electron-builder', '--config', 'electron-builder.config.mjs', '--dir', '--publish', 'never'], {
  cwd: DESKTOP_APP,
  env: snapshotEnv(),
});
verifyArtifact();

console.log(`\n[pack-desktop] 完成: ${APP_BUNDLE}（${appSize()}）`);
if (flag('--restart')) {
  console.log('[pack-desktop] 重新打开应用');
  spawnSync('open', [APP_BUNDLE], { stdio: 'inherit' });
}
