import test from 'node:test';
import assert from 'node:assert/strict';
import { definitionFromDocuments, authoringDocuments } from '../../packages/plugins/experts/dist/authoring/documents.js';
import { compilePersonaPrefix } from '../../packages/plugins/experts/dist/domain/definition.js';
import { buildExport, preflightPackage } from '../../packages/plugins/experts/dist/services/portability.js';

function fixture(team = false) {
  const agent = id => `---\nname: ${id}\ndescription: Research professional\ndisplayName:\n  zh: 研究专家\nprofession:\n  zh: 研究员\n---\n\n# 专业研究\n\n## 分析框架\n\n完整自由 Markdown，无四段标记。\n\n|证据|判断|\n|---|---|\n|来源|比较反例|\n`;
  const ids = team ? ['research-team-lead', 'market-analyst', 'user-researcher'] : ['researcher'];
  const meta = { name: 'research', expertType: team ? 'team' : 'agent', agentName: ids[0], agents: ids.map(id => `./agents/${id}.md`), skills: ['./skills/research-method'], ...(team ? { teamInfo: { leadAgent: ids[0], memberAgents: ids.slice(1) } } : {}) };
  return { '.workdsh-expert/plugin.json': JSON.stringify(meta), ...Object.fromEntries(ids.map(id => [`agents/${id}.md`, agent(id)])), 'skills/research-method/SKILL.md': '---\nname: research-method\ndescription: Method\n---\nUse references.', 'skills/research-method/references/evidence.md': '真实领域资料。', ...(team ? { 'settings.json': JSON.stringify({ agent: ids[0] }) } : {}) };
}

for (const team of [false, true]) test(`free Agent MD and ${team ? 'team' : 'single'} package round trip preserves complete resources`, () => {
  const files = fixture(team);
  const definition = definitionFromDocuments(files);
  assert.deepEqual(authoringDocuments(definition), files);
  assert.match(compilePersonaPrefix(definition), /完整自由 Markdown/);
  assert.doesNotMatch(compilePersonaPrefix(definition), /遵循完整 Agent MD/);
  const { archive } = buildExport(definition);
  assert.deepEqual(preflightPackage(archive).candidate, definition);
  if (team) assert.equal(definition.team.members.length, 2);
});

test('package rejects identity mismatch, missing role, unsafe resources and tools authority', () => {
  let files = fixture();
  files['agents/researcher.md'] = files['agents/researcher.md'].replace('name: researcher', 'name: changed-id');
  assert.throws(() => definitionFromDocuments(files));
  files = fixture(); delete files['agents/researcher.md']; assert.throws(() => definitionFromDocuments(files));
  files = fixture(); files['../escape.md'] = 'bad'; assert.throws(() => definitionFromDocuments(files));
  files = fixture(); files['agents/researcher.md'] = files['agents/researcher.md'].replace('name: researcher', 'tools: [bash]\nname: researcher'); assert.throws(() => definitionFromDocuments(files));
});


test('binary avatar and executable CLI survive complete export/import with exact bytes', () => {
  const files = fixture(true);
  const meta = JSON.parse(files['.workdsh-expert/plugin.json']);
  meta.avatar = './avatars/team.png';
  files['.workdsh-expert/plugin.json'] = JSON.stringify(meta);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=', 'base64');
  const assets = { 'avatars/team.png': { base64: png.toString('base64') }, 'bin/inspect': { base64: Buffer.from('#!/bin/sh\necho inspect\n').toString('base64'), executable: true } };
  const definition = definitionFromDocuments(files, assets);
  assert.match(definition.avatarRef, /^data:image\/png;base64,/);
  assert.deepEqual(preflightPackage(buildExport(definition).archive).candidate, definition);
  assert.throws(() => definitionFromDocuments(files, { ...assets, 'BIN/inspect': assets['bin/inspect'] }));
  assert.throws(() => definitionFromDocuments(files, { ...assets, 'assets/cmd': { ...assets['bin/inspect'], executable: true } }));
  assert.throws(() => definitionFromDocuments(files, { ...assets, 'avatars/team.png': { base64: Buffer.from('fake image').toString('base64') } }));
});


test('full professional MD is not constrained by the legacy summary-field length', () => {
  const files = fixture();
  files['agents/researcher.md'] += '\n## Detailed framework\n' + 'Professional method with conditions.\n'.repeat(600);
  const definition = definitionFromDocuments(files);
  assert.equal(definition.agentDocument, files['agents/researcher.md']);
  assert.deepEqual(preflightPackage(buildExport(definition).archive).candidate, definition);
});

test('binary package round trip permits its full encoded definition without a false single-file limit', () => {
  const assets = { 'assets/reference.bin': { base64: Buffer.alloc(1600 * 1024, 7).toString('base64') } };
  const definition = definitionFromDocuments(fixture(), assets);
  const imported = preflightPackage(buildExport(definition).archive);
  assert.deepEqual(imported.candidate.packageAssets, assets);
});
