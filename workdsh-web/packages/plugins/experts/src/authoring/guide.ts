/**
 * Bundled authoring guidance for the `workdsh-expert-manager` skill.
 *
 * The prompt text lives in `resources/skills/workdsh-expert-manager/SKILL.md` so it ships as
 * readable Markdown next to the references it cites, and edits happen in the same
 * file the model eventually reads. This module only loads and validates that
 * document for `ctx.skills.register`; it holds no second copy of the wording.
 * The URL resolves against this module, so `src/`, the compiled `dist/` layout
 * and an unpacked install all read the packaged resource without a build step.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

/** Registry routing fields parsed from the packaged skill's YAML frontmatter. */
export interface ExpertManagerSkillMeta {
  readonly name: string;
  readonly description: string;
  readonly whenToUse: string;
}

const skillUrl = new URL('../../resources/skills/workdsh-expert-manager/SKILL.md', import.meta.url);

function requiredText(frontmatter: Record<string, unknown>, key: string): string {
  const value = frontmatter[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`expert-skill/invalid-frontmatter: "${key}" must be a non-empty string in ${skillUrl.href}`);
  }
  return value.trim();
}

function load(): { meta: ExpertManagerSkillMeta; content: string } {
  let document: string;
  try {
    document = readFileSync(skillUrl, 'utf8');
  } catch (error) {
    throw new Error(`expert-skill/missing: cannot read ${skillUrl.href} (${error instanceof Error ? error.message : String(error)})`);
  }
  const match = document.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`expert-skill/invalid-frontmatter: missing YAML frontmatter in ${skillUrl.href}`);
  let frontmatter: unknown;
  try {
    frontmatter = parse(match[1]);
  } catch {
    throw new Error(`expert-skill/invalid-frontmatter: unreadable YAML in ${skillUrl.href}`);
  }
  if (frontmatter === null || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    throw new Error(`expert-skill/invalid-frontmatter: expected a mapping in ${skillUrl.href}`);
  }
  const content = document.slice(match[0].length).trim();
  if (!content) throw new Error(`expert-skill/empty-body: no instructions after the frontmatter in ${skillUrl.href}`);
  return {
    meta: {
      name: requiredText(frontmatter as Record<string, unknown>, 'name'),
      description: requiredText(frontmatter as Record<string, unknown>, 'description'),
      whenToUse: requiredText(frontmatter as Record<string, unknown>, 'when-to-use'),
    },
    content,
  };
}

const skill = load();

/** Routing metadata for `ctx.skills.register`, derived from the SKILL.md frontmatter. */
export const expertManagerSkillMeta: ExpertManagerSkillMeta = skill.meta;

/**
 * The instruction body registered with `ctx.skills.register`. Kept as a
 * compatibility export: it is always the packaged SKILL.md body, never an
 * independently maintained copy.
 */
export const expertManagerSkillContent: string = skill.content;
