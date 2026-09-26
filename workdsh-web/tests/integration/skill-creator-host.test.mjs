import test from 'node:test';
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import SkillRegistry, { renderSkillContent } from '@deepseek-ai/dsh-skill';
import Tools from '@deepseek-ai/dsh-tools';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as skillsHost from '../../packages/plugins/skills/dist/index.js';

test('skills Host owns a disposable manager and official skill registration', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workdsh-skill-api-'));
  const originalAgentsHome = process.env.DSH_AGENTS_HOME; const originalDshHome = process.env.DSH_HOME;
  const ctx = new Context();
  try {
    process.env.DSH_AGENTS_HOME = join(root, 'agents'); process.env.DSH_HOME = join(root, 'dsh');
    const routes = [];
    ctx.provide('connection', { fetch: { register(route) { routes.push(route); return async () => {}; } } });
    ctx.provide('systemPrompt', { tools() {}, section() {}, getSectionOrder() { return 0; } });
    await ctx.plugin(Tools);
    await ctx.plugin(SkillRegistry);
    ctx.effect(() => ctx.skills.register({ name: 'skill-creator', source: 'bundled', description: 'Original user guide fixture', content: 'ORIGINAL_GUIDE_SENTINEL' }));
    await ctx.plugin(skillsHost);
    assert.equal((await ctx.skills.get('skill-creator')).content, 'ORIGINAL_GUIDE_SENTINEL');
    const registered = await ctx.skills.get('workdsh-skill-creator');
    assert.equal(registered.name, 'workdsh-skill-creator');
    assert.equal(registered.source, 'bundled');
    for (const step of ['Understanding the Skill with Concrete Examples', 'Planning the Reusable Skill Contents', 'Initializing the Skill', 'Edit the Skill', 'Packaging a Skill', 'Iterate']) {
      assert.ok(registered.content.includes(step));
    }
    assert.match(registered.content, /scripts\/init_skill\.py/);
    assert.match(registered.content, /references\/dsh-authoring\.md/);
    assert.equal(registered.content, skillsHost.skillCreatorContent);
    assert.equal(registered.resourceBase.kind, 'directory');
    for (const reference of ['dsh-authoring.md', 'bundle-production.md']) {
      const resource = join(registered.resourceBase.path, 'references', reference);
      assert.ok((await readFile(resource, 'utf8')).length > 100);
    }
    assert.ok(renderSkillContent(registered).includes(registered.resourceBase.path));
    for (const skillName of ['workdsh-ppt-design', 'workdsh-word-design', 'workdsh-excel-design', 'workdsh-web-design']) {
      const guidance = await ctx.skills.get(skillName);
      assert.equal(guidance.source, 'bundled');
      assert.equal(guidance.resourceBase.kind, 'directory');
      const references = [...guidance.content.matchAll(/references\/([a-z-]+\.md)/g)];
      assert.equal(references.length, skillName === 'workdsh-ppt-design' ? 6 : skillName === 'workdsh-web-design' ? 3 : 2);
      for (const [, reference] of references) {
        assert.ok((await readFile(join(guidance.resourceBase.path, 'references', reference), 'utf8')).length > 100);
      }
      assert.ok(renderSkillContent(guidance).includes(guidance.resourceBase.path));
    }
    assert.equal(await ctx.skills.get('tencent-pptx'), undefined, 'only one built-in PPT skill is registered');
    assert.equal(typeof ctx.workdshSkills.detail, 'function');
    assert.ok(ctx.tools.get('workdsh_save_skill_draft'));
    assert.ok(ctx.tools.get('workdsh_validate_skill_draft'));
    assert.ok(ctx.tools.get('workdsh_publish_skill_draft'));
    const controller = new AbortController();
    const runTool = async (name, args) => ctx.tools.execute({ callId: `call-${name}`, name, arguments: args, signal: controller.signal });
    const documentFromTool = '---\nname: managed-authoring\ndescription: Managed authoring test\n---\nAlways return a deterministic fixture.\n';
    const drafted = await runTool('workdsh_save_skill_draft', { name: 'managed-authoring', document: documentFromTool, scope: 'shared-agents' });
    assert.equal(drafted.isError, false);
    assert.equal(drafted.value.valid, true);
    const validated = await runTool('workdsh_validate_skill_draft', { draft_id: drafted.value.draftId });
    assert.equal(validated.isError, false);
    assert.equal(validated.value.revision, drafted.value.revision);
    const unconfirmed = await runTool('workdsh_publish_skill_draft', { draft_id: drafted.value.draftId, expected_revision: drafted.value.revision, user_confirmed: false });
    assert.equal(unconfirmed.isError, true);
    const published = await runTool('workdsh_publish_skill_draft', { draft_id: drafted.value.draftId, expected_revision: drafted.value.revision, user_confirmed: true });
    assert.equal(published.isError, false);
    assert.equal(published.value.command, '/managed-authoring');
    assert.match(await readFile(join(root, 'agents/skills/managed-authoring/SKILL.md'), 'utf8'), /deterministic fixture/);
    const managementRoute = routes.find(route => route.path === '/api/workdsh-skills');
    const importRoute = routes.find(route => route.path === '/api/workdsh-skills/import');
    assert.equal(managementRoute.path, '/api/workdsh-skills');
    assert.deepEqual(managementRoute.methods, ['POST']);
    assert.equal(managementRoute.requestBody, 'buffered');
    assert.equal(importRoute.requestBody, 'streaming');
    const invoke = async (endpoint, payload) => {
      const response = await managementRoute.fetch(new Request('http://localhost/api/workdsh-skills', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint, payload }),
      }));
      return response.json();
    };
    const catalog = await invoke('list', {});
    assert.equal(catalog.ok, true);
    assert.ok(catalog.value.some(skill => skill.name === 'workdsh-skill-creator'));
    const invalid = await invoke('update', { name: 'workdsh-skill-creator' });
    assert.deepEqual(invalid, { ok: false, error: { code: 'skill/invalid-request', message: '技能文档或版本信息无效。', details: {} } });
    const document = '---\nname: api-import\ndescription: Uploaded through exact Fetch\n---\nKeep inert.\n';
    const uploadResponse = await importRoute.fetch(new Request('http://localhost/api/workdsh-skills/import', {
      method: 'POST', headers: { 'x-workdsh-file-name': encodeURIComponent('SKILL.md'), 'content-type': 'text/markdown' }, body: document,
    }));
    const upload = await uploadResponse.json();
    assert.equal(upload.ok, true); assert.equal(upload.value.inspection.name, 'api-import');
    assert.equal(Object.hasOwn(upload.value.inspection, 'source'), false, 'Host staging path stays private');
    const committed = await invoke('commit-import', { id: upload.value.id, scope: 'shared-agents' });
    assert.equal(committed.ok, true);
    assert.match(await readFile(join(root, 'agents/skills/api-import/SKILL.md'), 'utf8'), /Keep inert/);
  } finally {
    await ctx.fiber.dispose();
    if (originalAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME; else process.env.DSH_AGENTS_HOME = originalAgentsHome;
    if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
    await rm(root, { recursive: true, force: true });
  }
  assert.equal(ctx.workdshSkills, undefined);
});
