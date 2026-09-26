import { validateAcceptance } from './validate-acceptance.mjs';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
failures.push(...validateAcceptance(root).failures);
const read = (name) => readFileSync(resolve(root, name), 'utf8');
const requirePath = (name) => {
  if (!existsSync(resolve(root, name))) failures.push(`Missing: ${name}`);
};
const documents = [
  'docs/adr/0018-composable-feature-plugins-and-shared-skills.md',
  'docs/evidence/skills-standalone-package.md',
  'docs/design/experts/PLUGIN-DELIVERY-REVIEW.md',
  'docs/adr/0017-expert-definition-and-runtime-binding.md',
  'docs/design/experts/CONTRACTS.md',
  'docs/design/experts/EXPERT-TEAMS.md',
  'docs/design/experts/HLD.md',
  'docs/design/experts/IMPLEMENTATION-AND-ACCEPTANCE.md',
  'docs/design/experts/PRD.md',
  'docs/design/experts/README.md',
  'docs/design/experts/REFERENCES.md',
  'docs/design/experts/UX.md',
  'docs/design/experts/references/README.md',
  'docs/HARNESS-OFFICIAL-DEVELOPMENT.md',
  'docs/MODULE-VERSIONS.md',
  'docs/UI-DESIGN.md',
  'docs/PLUGIN-DELIVERY.md', 'docs/adr/0006-plugin-delivery-order.md',
  'docs/adr/0007-execution-and-transfer-boundaries.md',
  'docs/adr/0010-immutable-preset-revisions.md',
  'docs/adr/0011-use-official-storage-domains.md',
  'docs/adr/0012-session-and-business-fact-boundaries.md',
  'docs/research/deepseek-harness-capability-review.md',
  'docs/research/deepseek-harness-review.json',
  'docs/research/harness-execution-capability-matrix.md',
  'docs/research/harness-governance-capability-matrix.md',
  'docs/research/harness-agent-composition-matrix.md',
  'docs/research/harness-extension-delivery-checklist.md',
  'docs/research/harness-review-closure.md',
  'docs/DEPLOYMENT-AND-STORAGE.md',
  'docs/ENTERPRISE-EDITION.md',
  'AGENTS.md', 'README.md', 'docs/PLAN.md', 'docs/STATUS.md',
  'docs/ARCHITECTURE.md', 'docs/CONTRACTS.md', 'docs/TEAM-DESIGN.md',
  'docs/research/workbuddy-project-screens.md', 'docs/PROJECT-DESIGN.md', 'docs/research/workbuddy-core-domains.md',
  'docs/ADMIN-DESIGN.md', 'docs/ACCEPTANCE.md', 'docs/DEVELOPMENT.md',
  'docs/COMPATIBILITY.md', 'docs/adr/0001-plugin-and-object-model.md',
  'docs/adr/0002-public-runtime-and-composition.md',
  'docs/adr/0003-state-and-cross-plugin-services.md',
  'docs/adr/0004-complete-scaffold-and-phases.md',
  'docs/adr/0005-team-foundation-from-day-one.md',
];
documents.forEach(requirePath);
const officialStandard = read('docs/HARNESS-OFFICIAL-DEVELOPMENT.md');
for (const required of ['sidebar.panellist', 'rightbar.session', 'ctx.slots.inject', 'peerDependencies', 'ctx.effect']) {
  if (!officialStandard.includes(required)) failures.push(`Harness standard missing rule: ${required}`);
}
const modules = JSON.parse(read('docs/modules.json'));
const ledger = read('docs/STATUS.md');
const order = JSON.parse(read('docs/development-order.json'));
const steps = new Map(order.steps.map((s) => [s.id, s]));
if (order.activeSlice) {
  const slice = order.activeSlice;
  if (!slice.id || !slice.scope || !ledger.includes(`| ${slice.task} |`)) failures.push('Invalid approved feature slice');
  if (!['in_progress', 'completed'].includes(slice.status)) failures.push('Invalid feature slice status');
  requirePath(slice.decision);
}
if (steps.size !== order.steps.length) failures.push('Duplicate delivery step');
if (order.steps.length !== 16) failures.push('Expected D00-D15 delivery steps');
for (let i = 0; i < order.steps.length; i += 1) {
  const step = order.steps[i];
  const expected = `D${String(i).padStart(2, '0')}`;
  if (step.id !== expected) failures.push(`Unexpected delivery order: ${step.id}`);
  if (!['todo', 'in_progress', 'blocked', 'completed'].includes(step.status)) failures.push(`Invalid step status: ${step.id}`);
  const required = i === 0 ? [] : [order.steps[i - 1].id];
  if (JSON.stringify(step.dependsOn) !== JSON.stringify(required)) failures.push(`Invalid prerequisites: ${step.id}`);
  for (const task of step.tasks) if (!ledger.includes(`| ${task} |`)) failures.push(`Missing delivery task: ${task}`);
  if (step.status !== 'todo' && step.dependsOn.some((id) => steps.get(id)?.status !== 'completed')) failures.push(`Prerequisite incomplete: ${step.id}`);
  if (step.status === 'completed' && !step.evidence.length) failures.push(`Missing delivery evidence: ${step.id}`);
  for (const evidence of step.evidence) requirePath(evidence);
}
const nextStep = order.steps.find((s) => s.status !== 'completed');
if (order.currentStep !== (nextStep?.id ?? null)) failures.push('currentStep must be first unfinished delivery step');
if (order.steps.filter((s) => s.status === 'in_progress').length > 1) failures.push('Multiple active delivery steps');
const seen = new Set();
for (const entry of modules) {
  if (seen.has(entry.path)) failures.push(`Duplicate module: ${entry.path}`);
  seen.add(entry.path);
  if (!/^(?:packages\/(?:(?:plugins|providers)\/)?|examples\/)[a-z][a-z0-9-]*$/.test(entry.path)) {
    failures.push(`Invalid module path: ${entry.path}`); continue;
  }
  if (!['planned', 'in_progress', 'implemented'].includes(entry.status)) failures.push(`Invalid status: ${entry.path}`);
  requirePath(`${entry.path}/README.md`);
  for (const sub of entry.directories) requirePath(`${entry.path}/${sub}`);
  if (!ledger.includes(`| ${entry.task} |`)) failures.push(`Missing task: ${entry.task}`);
  const manifestPath = `${entry.path}/package.json`;
  if (entry.moduleVersion !== undefined && !/^\d+\.\d+$/.test(entry.moduleVersion)) failures.push(`Invalid module version: ${entry.path}`);
  if (entry.moduleVersion && existsSync(resolve(root, manifestPath))) {
    const manifest = JSON.parse(read(manifestPath));
    const packageLine = String(manifest.version ?? '').split('.').slice(0, 2).join('.');
    if (packageLine !== entry.moduleVersion) failures.push(`Module/package version mismatch: ${entry.path}`);
  }
  if (entry.status === 'planned' && existsSync(resolve(root, manifestPath))) {
    const manifest = JSON.parse(read(manifestPath));
    if (manifest.dsh?.bundle || manifest.exports || manifest.main || manifest.bin) failures.push(`Planned module declares executable entry: ${entry.path}`);
  }
}
if (order.activeSlice && !modules.some((entry) => entry.task === order.activeSlice.task && entry.moduleVersion)) {
  failures.push(`Active slice has no module version: ${order.activeSlice.task}`);
}
for (const category of ['plugins', 'providers']) {
  requirePath(`packages/${category}/README.md`);
  if (existsSync(resolve(root, `packages/${category}/package.json`))) failures.push(`${category} category must not be a workspace package`);
}
for (const base of ['packages', 'packages/plugins', 'packages/providers', 'examples']) {
  for (const item of readdirSync(resolve(root, base), { withFileTypes: true })) {
    if (base === 'packages' && ['plugins', 'providers'].includes(item.name)) continue;
    if (item.isDirectory() && !seen.has(`${base}/${item.name}`)) failures.push(`Unregistered module: ${base}/${item.name}`);
  }
}
for (const id of ['P0-05', 'P1-09', 'P1-10', 'P1-11', 'P2-01', 'P3-06']) {
  if (!ledger.includes(`| ${id} |`)) failures.push(`Required milestone missing: ${id}`);
}
for (let i = 1; i <= 13; i += 1) {
  const id = `T${String(i).padStart(2, '0')}`;
  if (!read('docs/ACCEPTANCE.md').includes(`${id}：`)) failures.push(`Team acceptance missing: ${id}`);
}
for (let i = 1; i <= 10; i += 1) {
  const id = `J${String(i).padStart(2, '0')}`;
  if (!read('docs/ACCEPTANCE.md').includes(`${id}：`)) failures.push(`Project acceptance missing: ${id}`);
}
for (let i = 1; i <= 10; i += 1) {
  const id = `UI${String(i).padStart(2, '0')}`;
  if (!read('docs/ACCEPTANCE.md').includes(`| ${id} |`)) failures.push(`Project UI acceptance missing: ${id}`);
}
for (const name of [...documents, 'packages/plugins/README.md', 'packages/providers/README.md', ...modules.map((m) => `${m.path}/README.md`)]) {
  if (!existsSync(resolve(root, name))) continue;
  for (const match of read(name).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    const destination = resolve(root, dirname(name), decodeURIComponent(target));
    if (!existsSync(destination)) failures.push(`Broken link in ${name}: ${relative(root, destination)}`);
  }
}
if (failures.length) {
  process.stderr.write(failures.join('\n') + '\n'); process.exitCode = 1;
} else {
  process.stdout.write(`PASS: ${modules.length} modules; ${documents.length} documents; task references, team acceptance and relative links checked.\n`);
  process.stdout.write('Planning/scaffold integrity only; product and Harness integration remain unverified.\n');
}
