import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Context } from '@deepseek-ai/cordis';
import SkillRegistry from '@deepseek-ai/dsh-skill';
import { expertManagerSkillContent, expertManagerSkillMeta } from '../../packages/plugins/experts/dist/authoring/guide.js';
import { registerExpertManagerSkill } from '../../packages/plugins/experts/dist/index.js';

// ── Bundled expert-manager skill: one Markdown source, no second copy (S1) ─────
//
// The authoring prompt used to be a TS string inside `src/authoring/guide.ts`. It
// now ships as `resources/skills/workdsh-expert-manager/SKILL.md` (frontmatter + body) and
// guide.ts only loads and validates that packaged file. These tests pin the move:
// the exported body stays byte-identical to the file, and the real registry path
// serves exactly that body on demand — catalog summaries never carry it, so an
// ordinary task only ever receives the skill when it is actually loaded.

const skillFile = fileURLToPath(new URL('../../packages/plugins/experts/resources/skills/workdsh-expert-manager/SKILL.md', import.meta.url));

function parseSkillFile() {
  const document = readFileSync(skillFile, 'utf8');
  const match = document.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  assert.ok(match, 'the packaged SKILL.md opens with YAML frontmatter');
  const field = key => match[1].match(new RegExp(`^${key}:[ \t]*(.+)$`, 'm'))?.[1]?.trim();
  return { body: document.slice(match[0].length).trim(), field };
}

test('bundled expert-manager body is byte-identical to the packaged SKILL.md', () => {
  const { body, field } = parseSkillFile();
  assert.ok(body.length > 1000, 'the packaged file carries the full authoring guidance');
  assert.equal(expertManagerSkillContent, body);
  assert.equal(expertManagerSkillMeta.name, field('name'));
  assert.equal(expertManagerSkillMeta.description, field('description'));
  assert.equal(expertManagerSkillMeta.whenToUse, field('when-to-use'));
  assert.equal(expertManagerSkillMeta.name, 'workdsh-expert-manager');
});

test('registration serves the packaged body on demand and disposes cleanly', async () => {
  const ctx = new Context();
  try {
    await ctx.plugin(SkillRegistry);
    const dispose = registerExpertManagerSkill(ctx);
    const listed = await ctx.skills.list();
    const row = listed.find(item => item.name === expertManagerSkillMeta.name);
    assert.ok(row, 'the bundled skill is discoverable');
    assert.equal(row.source, 'bundled');
    assert.equal(row.description, expertManagerSkillMeta.description);
    assert.equal(row.whenToUse, expertManagerSkillMeta.whenToUse);
    assert.equal(JSON.stringify(listed).includes(expertManagerSkillContent.slice(0, 32)), false, 'catalog summaries never carry the instruction body');
    assert.equal(row.resourceBase?.kind, 'directory');
    assert.ok(existsSync(join(row.resourceBase.path, 'SKILL.md')), 'the resource base resolves inside the package');
    assert.ok(existsSync(join(row.resourceBase.path, 'references', 'agent-md-spec.md')));
    assert.ok(existsSync(join(row.resourceBase.path, 'references', 'authoring-api.md')));
    const loaded = await ctx.skills.get(expertManagerSkillMeta.name);
    assert.equal(loaded.content, expertManagerSkillContent);
    await dispose();
    assert.equal((await ctx.skills.list()).some(item => item.name === expertManagerSkillMeta.name), false, 'disposal removes the bundled skill');
  } finally {
    await ctx.fiber.dispose();
  }
});
