import type { Context } from '@deepseek-ai/cordis';
import { defineTool } from '@deepseek-ai/dsh-tools';

const draftOutput = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    draftId: { type: 'string' as const, required: true as const },
    name: { type: 'string' as const, required: true as const },
    scope: { type: 'string' as const, required: true as const, enum: ['shared-agents', 'profile'] as const },
    revision: { type: 'string' as const, required: true as const },
    valid: { type: 'boolean' as const, required: true as const },
    diagnostics: { type: 'array' as const, required: true as const, items: { type: 'string' as const } },
  },
};

function draftProjection(draft: Awaited<ReturnType<Context['workdshSkills']['getDraft']>>) {
  return {
    draftId: draft.id,
    name: draft.name,
    scope: draft.scope,
    revision: draft.revision,
    valid: draft.validation.valid,
    diagnostics: draft.validation.diagnostics.map(item => `${item.code}: ${item.message}`),
  };
}

/** Model-facing authoring tools backed by the same Host authority as the UI. */
export function registerSkillLifecycleTools(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'workdsh_save_skill_draft',
    description: 'Create or revise a private WorkDSH skill draft. This never installs or overwrites a skill.',
    parameters: {
      name: { type: 'string', required: true, description: 'Exact kebab-case skill name.' },
      document: { type: 'string', required: true, description: 'Complete SKILL.md including YAML frontmatter and instructions.' },
      scope: { type: 'string', enum: ['shared-agents', 'profile'], description: 'shared-agents is visible to all compatible tasks; profile is limited to this Harness profile.' },
      draft_id: { type: 'string', description: 'Existing draft id when revising.' },
      expected_revision: { type: 'string', description: 'Required current revision when revising an existing draft.' },
    },
    output: {
      schema: draftOutput,
      render: (_args, value) => [{ type: 'text', text: `Skill draft ${value.draftId} saved for ${value.name}. Validation: ${value.valid ? 'valid' : value.diagnostics.join('; ')}` }],
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted();
      if ((args.draft_id === undefined) !== (args.expected_revision === undefined)) throw new Error('skill/draft-revision-required');
      const draft = await ctx.workdshSkills.saveDraft({
        name: args.name,
        document: args.document,
        ...(args.scope ? { scope: args.scope } : {}),
        ...(args.draft_id ? { id: args.draft_id, expectedRevision: args.expected_revision } : {}),
      });
      exec.signal.throwIfAborted();
      return draftProjection(draft);
    },
  }));

  ctx.tools.register(defineTool({
    name: 'workdsh_validate_skill_draft',
    description: 'Re-read and validate a persisted WorkDSH skill draft before publication.',
    parameters: { draft_id: { type: 'string', required: true, description: 'Draft id returned by workdsh_save_skill_draft.' } },
    output: {
      schema: draftOutput,
      render: (_args, value) => [{ type: 'text', text: value.valid ? `Skill draft ${value.draftId} is valid.` : `Skill draft ${value.draftId} is invalid: ${value.diagnostics.join('; ')}` }],
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted();
      return draftProjection(await ctx.workdshSkills.getDraft(args.draft_id));
    },
  }));

  ctx.tools.register(defineTool({
    name: 'workdsh_publish_skill_draft',
    description: 'Publish one valid, user-confirmed WorkDSH skill draft into an official Harness skill root. Fails closed on a name collision or stale revision.',
    parameters: {
      draft_id: { type: 'string', required: true, description: 'Validated draft id.' },
      expected_revision: { type: 'string', required: true, description: 'Exact validated draft revision.' },
      user_confirmed: { type: 'boolean', required: true, description: 'True only after the user explicitly confirmed name, scope and behavior.' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          state: { type: 'string', required: true, const: 'enabled' },
          path: { type: 'string', required: true },
          command: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `Published ${value.name} at ${value.path}. Invoke it with ${value.command}.` }],
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted();
      if (!args.user_confirmed) throw new Error('skill/publish-confirmation-required');
      const receipt = await ctx.workdshSkills.publishDraft(args.draft_id, args.expected_revision);
      exec.signal.throwIfAborted();
      return { ...receipt, state: 'enabled' as const, command: `/${receipt.name}` };
    },
  }));
}
