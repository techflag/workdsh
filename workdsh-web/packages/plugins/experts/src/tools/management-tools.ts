import type {} from '@deepseek-ai/dsh-fs';
import { dirname } from 'node:path';
import { assetBytes, packagePath, type PackageAssets } from '../authoring/package-resources.js';
import { buildExport } from '../services/portability.js';
import type { Context } from '@deepseek-ai/cordis';
import { defineTool, type ToolRunContext } from '@deepseek-ai/dsh-tools';
import type { ActorContext, DomainIssue, ExpertDefinition, ExpertDetail, ExpertListQuery } from 'workdsh-contracts';
import type { ExpertsManager } from '../services/experts-manager.js';
import { expertDraftUrl } from '../domain/navigation.js';
import { authoringDocuments, definitionFromDocuments } from '../authoring/documents.js';
import { ExpertsError } from '../domain/values.js';

/**
 * Model-facing expert authoring tools (D04 / P1-02).
 *
 * These tools call the SAME `ctx.workdshExperts` Host authority as the UI; they
 * never hold a second state truth. The actor is resolved on the Host from the
 * trusted identity provider using the calling Session — the model never supplies
 * an actor, an owner or a confirmation boolean. Publishing is deliberately split:
 * `workdsh_expert_request_publish` only reports `needs-confirmation` and the exact
 * digests to be frozen; exchanging a challenge for a proof (`confirmPublish`) and
 * `publish` are trusted-UI Connection routes and are NOT exposed as tools, so a
 * model restatement or `confirmed:true` can never authorise a publish.
 */

const singleDefinitionParameters = {
  type: 'object' as const,
  additionalProperties: false,
  description: '专家定义的可编辑字段；未提供的字段保持不变。文本不能包含字面量 {{ 或 }}。',
  properties: {
    agent_document: { type: 'string' as const, description: '完整 Agent MD；包创作优先使用 save_documents。' },
    name: { type: 'string' as const, description: '专家名称，最多 80 个字符。' },
    description: { type: 'string' as const, description: '一句话描述用途，最多 300 个字符。' },
    role: { type: 'string' as const, description: '角色定位（prose）。' },
    methodology: { type: 'string' as const, description: '工作方法（prose）。' },
    boundaries: { type: 'string' as const, description: '行为边界（prose）。' },
    deliverables: { type: 'string' as const, description: '交付物（prose）。' },
    tags: { type: 'array' as const, items: { type: 'string' as const }, description: '适用标签，最多 8 个。' },
    examples: {
      type: 'array' as const,
      description: '启动示例，最多 6 个；仅用于填充任务草稿，不会自动发送。',
      items: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          id: { type: 'string' as const, required: true as const, description: '示例稳定 id。' },
          title: { type: 'string' as const, description: '可选标题。' },
          prompt: { type: 'string' as const, required: true as const, description: '示例提示词。' },
        },
      },
    },
    skill_requirements: {
      type: 'array' as const,
      description: '依赖的 Skill（本机已安装）；发布时冻结为不可变修订。',
      items: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          name: { type: 'string' as const, required: true as const, description: 'Skill 名称。' },
          skill_id: { type: 'string' as const, description: '可选：当本机 skillId 与名称不同时提供。' },
        },
      },
    },
    future_requirements: {
      type: 'array' as const,
      description: '声明但尚未满足的能力；不携带任何凭据。',
      items: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          kind: { type: 'string' as const, required: true as const },
          key: { type: 'string' as const, required: true as const },
          required: { type: 'boolean' as const, required: true as const },
          description: { type: 'string' as const, required: true as const },
        },
      },
    },
  },
};

const definitionParameters = { ...singleDefinitionParameters, properties: { ...singleDefinitionParameters.properties,
  team: { type: 'object' as const, additionalProperties: false, description: '整团制作；根定义是主理人。成员内容一起保存，一次预览发布。', properties: {
    members: { type: 'array' as const, required: true as const, items: { type: 'object' as const, additionalProperties: false, properties: {
      key: { type: 'string' as const, required: true as const }, definition: { ...singleDefinitionParameters, required: true as const },
    } } },
    workflows: { type: 'array' as const, required: true as const, items: { type: 'object' as const, additionalProperties: false, properties: {
      id: { type: 'string' as const, required: true as const }, title: { type: 'string' as const, required: true as const }, trigger: { type: 'string' as const, required: true as const }, deliverable: { type: 'string' as const, required: true as const },
      stages: { type: 'array' as const, required: true as const, description: '空数组表示主理人直接处理。协作阶段需要不同的执行者与评审者。', items: { type: 'object' as const, additionalProperties: false, properties: {
        id: { type: 'string' as const, required: true as const }, worker: { type: 'string' as const, required: true as const }, reviewer: { type: 'string' as const }, dependsOn: { type: 'array' as const, required: true as const, items: { type: 'string' as const } },
      } } },
    } } },
  } },
} };

type DefinitionArg = {
  agent_document?: string;
  name?: string;
  description?: string;
  role?: string;
  methodology?: string;
  boundaries?: string;
  deliverables?: string;
  tags?: string[];
  examples?: { id: string; title?: string; prompt: string }[];
  skill_requirements?: { name: string; skill_id?: string }[];
  future_requirements?: { kind: string; key: string; required: boolean; description: string }[];
  team?: { members: { key: string; definition: DefinitionArg }[]; workflows: NonNullable<ExpertDefinition['team']>['workflows'] };
};

const listOutput = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    total: { type: 'integer' as const, required: true as const },
    next_cursor: { type: 'string' as const },
    items: {
      type: 'array' as const,
      required: true as const,
      items: {
        type: 'object' as const,
        additionalProperties: false,
        properties: {
          id: { type: 'string' as const, required: true as const },
          name: { type: 'string' as const, required: true as const },
          description: { type: 'string' as const, required: true as const },
          origin: { type: 'string' as const, required: true as const },
          availability: { type: 'string' as const, required: true as const },
          readiness: { type: 'string' as const, required: true as const },
          can_use: { type: 'boolean' as const, required: true as const },
          pinned: { type: 'boolean' as const, required: true as const },
        },
      },
    },
  },
};

const detailOutput = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    id: { type: 'string' as const, required: true as const },
    name: { type: 'string' as const, required: true as const },
    description: { type: 'string' as const, required: true as const },
    origin: { type: 'string' as const, required: true as const },
    availability: { type: 'string' as const, required: true as const },
    readiness: { type: 'string' as const, required: true as const },
    revision: { type: 'string' as const, required: true as const, description: '乐观并发令牌；下次 update_draft 传 expected_revision。' },
    draft_revision: { type: 'string' as const, required: true as const, description: '草稿修订；validate 与 request_publish 传此值。' },
    draft_url: { type: 'string' as const, required: true as const, description: '同一 WorkDSH 页面打开草稿的链接；仅导航，不授权发布。' },
    definition: { ...definitionParameters, required: true as const, properties: {
      ...definitionParameters.properties,
      avatar_ref: { type: 'string' as const },
      category_id: { type: 'string' as const },
    } },
    published: { type: 'boolean' as const, required: true as const },
    can_use: { type: 'boolean' as const, required: true as const },
    can_edit: { type: 'boolean' as const, required: true as const },
    can_manage: { type: 'boolean' as const, required: true as const },
    issues: { type: 'array' as const, required: true as const, items: { type: 'string' as const } },
  },
};

const validateOutput = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    publishable: { type: 'boolean' as const, required: true as const },
    definition_digest: { type: 'string' as const, required: true as const },
    dependency_lock_digest: { type: 'string' as const, required: true as const },
    dependencies: { type: 'array' as const, required: true as const, items: { type: 'string' as const } },
    issues: { type: 'array' as const, required: true as const, items: { type: 'string' as const } },
  },
};

const requestPublishOutput = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    status: { type: 'string' as const, required: true as const, const: 'needs-confirmation' as const },
    expert_id: { type: 'string' as const, required: true as const },
    draft_revision: { type: 'string' as const, required: true as const },
    definition_digest: { type: 'string' as const, required: true as const },
    dependency_lock_digest: { type: 'string' as const, required: true as const },
    expires_at: { type: 'string' as const, required: true as const },
    instruction: { type: 'string' as const, required: true as const },
    draft_url: { type: 'string' as const, required: true as const },
  },
};

function issueText(issue: DomainIssue): string {
  return `${issue.code}${issue.path ? `@${issue.path}` : ''}: ${issue.message}`;
}

/** Resolve the trusted actor from the calling Session; the model never supplies it. */
async function resolveActor(ctx: Context, exec: ToolRunContext): Promise<ActorContext> {
  const sessionId = exec.agent ? String(exec.agent.id) : undefined;
  return ctx.workdshIdentity.resolve(sessionId === undefined ? undefined : { sessionId }, exec.signal);
}

/** Derive a stable idempotency key from the call id so pipeline retries replay instead of duplicating. */
function operationIdOf(exec: ToolRunContext): string {
  return `expert-tool-${String(exec.callId)}`;
}

/** Map the model-facing snake_case definition onto the camelCase domain patch. */
function toDefinitionPatch(input: DefinitionArg | undefined): Partial<ExpertDefinition> {
  if (!input) return {};
  const patch: Record<string, unknown> = {};
  if (input.agent_document !== undefined) patch.agentDocument = input.agent_document;
  if (input.team) patch.team = { members: input.team.members.map(member => ({ key: member.key, definition: { tags: [], examples: [], skillRequirements: [], futureRequirements: [], ...toDefinitionPatch(member.definition) } })), workflows: input.team.workflows };
  for (const field of ['name', 'description', 'role', 'methodology', 'boundaries', 'deliverables'] as const) {
    if (typeof input[field] === 'string') patch[field] = input[field];
  }
  if (Array.isArray(input.tags)) patch.tags = input.tags.filter((tag): tag is string => typeof tag === 'string');
  if (Array.isArray(input.examples)) {
    patch.examples = input.examples
      .filter((example) => typeof example?.id === 'string' && typeof example?.prompt === 'string')
      .map((example) => ({ id: example.id, prompt: example.prompt, ...(typeof example.title === 'string' ? { title: example.title } : {}) }));
  }
  if (Array.isArray(input.skill_requirements)) {
    patch.skillRequirements = input.skill_requirements
      .filter((requirement) => typeof requirement?.name === 'string')
      .map((requirement) => ({ name: requirement.name, ...(typeof requirement.skill_id === 'string' ? { skillId: requirement.skill_id } : {}) }));
  }
  if (Array.isArray(input.future_requirements)) {
    patch.futureRequirements = input.future_requirements.filter(
      (requirement) => typeof requirement?.kind === 'string' && typeof requirement?.key === 'string' && typeof requirement?.required === 'boolean' && typeof requirement?.description === 'string',
    );
  }
  return patch as Partial<ExpertDefinition>;
}

function definitionProjection(input: ExpertDefinition) {
  const { skillRequirements, futureRequirements, avatarRef, categoryId, team, agentDocument, packageDocuments, packageAssets, ...definition } = input;
  return {
    ...(input.agentDocument ? { agent_document: input.agentDocument } : {}),
    ...definition, tags: [...definition.tags], examples: definition.examples.map(example => ({ ...example })),
    ...(avatarRef ? { avatar_ref: avatarRef } : {}), ...(categoryId ? { category_id: categoryId } : {}),
    skill_requirements: skillRequirements.map(({ name, skillId }) => ({ name, ...(skillId ? { skill_id: skillId } : {}) })),
    future_requirements: futureRequirements.map(requirement => ({ ...requirement })),
    ...(team ? { team: { members: team.members.map(member => { const { skillRequirements: skills, futureRequirements: future, agentDocument: memberDocument, packageDocuments: memberPackage, packageAssets: memberAssets, ...fields } = member.definition; return { key: member.key, definition: { ...fields, ...(memberDocument ? { agent_document: memberDocument } : {}), tags: [...fields.tags], examples: fields.examples.map(example => ({ ...example })), skill_requirements: skills.map(req => ({ name: req.name, ...(req.skillId ? { skill_id: req.skillId } : {}) })), future_requirements: future.map(req => ({ ...req })) } }; }), workflows: team.workflows.map(workflow => ({ ...workflow, stages: workflow.stages.map(stage => ({ ...stage, dependsOn: [...stage.dependsOn] })) })) } } : {}),
  };
}
function detailProjection(detail: ExpertDetail) {
  return {
    id: detail.expert.id,
    name: detail.draft.definition.name,
    description: detail.draft.definition.description,
    origin: detail.expert.origin,
    availability: detail.expert.availability,
    readiness: detail.readiness,
    revision: detail.expert.revision,
    draft_revision: detail.draft.revision,
    draft_url: expertDraftUrl(detail.expert.id),
    definition: definitionProjection(detail.draft.definition),
    published: detail.expert.publishedRevisionRef !== undefined,
    can_use: detail.canUse,
    can_edit: detail.canEdit,
    can_manage: detail.canManage,
    issues: detail.draft.validationIssues.map(issueText),
  };
}

/** The loop sends rendered blocks to the model, not the canonical JSON itself.
 * Keep ids, CAS tokens and definitions available for subsequent authoring calls. */
function renderResult(summary: string, value: unknown, draftUrl?: string) {
  return [{ type: 'text' as const, text: `${summary}\n${JSON.stringify(value, null, 2)}${draftUrl ? `\n[打开专家草稿](${draftUrl})` : ''}` }];
}

function shellQuote(value: string): string { return "'" + value.replaceAll("'", "'\\''") + "'"; }
async function nativeTool(ctx: Context, exec: ToolRunContext, name: string, args: object, suffix: string) {
  const result = await ctx.tools.execute({ name, arguments: args, agent: exec.agent, signal: exec.signal, parent: exec.token, rootCallId: exec.rootCallId, callId: `${exec.callId}-${suffix}` as ToolRunContext['callId'] });
  if (result.isError) throw new ExpertsError('experts/forbidden', `原生工具${name}拒绝操作：${result.error.message}`);
  for (const context of result.additionalContexts ?? []) exec.deferContext(context);
  return result;
}
async function workspaceTarget(ctx: Context, exec: ToolRunContext, path: string) {
  const cwd = exec.agent?.session.header.cwd;
  if (!cwd || !ctx.fs) throw new ExpertsError('experts/unavailable', '此操作需要原生工作区和文件服务。');
  const root = await ctx.fs.resolve(cwd, { signal: exec.signal });
  const target = await ctx.fs.resolve(path, { cwd, signal: exec.signal });
  if (!ctx.fs.contains(root, target) || root.targetKey === target.targetKey) throw new ExpertsError('experts/forbidden', '文件必须位于当前工作区内。');
  return target;
}

/** Register the model-facing expert management tools against the same Host authority as the UI. */
export function registerExpertManagementTools(ctx: Context): void {
  const manager: ExpertsManager = ctx.workdshExperts;

  ctx.tools.register(defineTool({
    name: 'workdsh_expert_save_resources',
    description: '从当前工作区的真实文件保存完整专家资源。支持头像、程序、二进制参考文件；与Markdown制作稿统一保存及校验。修改已有作品时保留未改文件、带expected_revision；保存不等于执行授权。',
    parameters: { expert_id: { type: 'string' }, expected_revision: { type: 'string' }, documents: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { path: { type: 'string', required: true }, content: { type: 'string', required: true } } } }, resources: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { path: { type: 'string', required: true }, source_path: { type: 'string', required: true }, executable: { type: 'boolean' } } } }, remove_paths: { type: 'array', items: { type: 'string' } } },
    output: { schema: detailOutput, render: (_args, value) => renderResult('完整作品与真实资源已保存。', value, value.draft_url) },
    async execute(args, exec) {
      const actor = await resolveActor(ctx, exec);
      if (args.expert_id && !args.expected_revision) throw new ExpertsError('experts/conflict', '修改作品需要expected_revision。');
      const prior = args.expert_id ? (await manager.get(actor, args.expert_id, undefined, exec.signal)).draft.definition : undefined;
      const documents = { ...(prior?.packageDocuments ?? {}) };
      const assets: Record<string, PackageAssets[string]> = { ...(prior?.packageAssets ?? {}) };
      const changed = [...(args.documents ?? []).map(file => file.path), ...(args.resources ?? []).map(file => file.path), ...(args.remove_paths ?? [])];
      if (new Set(changed).size !== changed.length) throw new ExpertsError('experts/invalid-definition', '修改路径重复。');
      for (const path of args.remove_paths ?? []) { packagePath(path); delete documents[path]; delete assets[path]; }
      for (const file of args.documents ?? []) { packagePath(file.path); documents[file.path] = file.content; delete assets[file.path]; }
      for (const file of args.resources ?? []) {
        packagePath(file.path);
        const target = await workspaceTarget(ctx, exec, file.source_path);
        const bytes = await ctx.fs.readBytes(target, exec.signal, 2 * 1024 * 1024);
        const asset = { base64: Buffer.from(bytes).toString('base64'), ...(file.executable ? { executable: true } : {}) };
        assetBytes(file.path, asset); assets[file.path] = asset; delete documents[file.path];
      }
      const definition = definitionFromDocuments(documents, assets);
      const context = { operationId: operationIdOf(exec), ...(args.expected_revision ? { expectedRevision: args.expected_revision } : {}) };
      const draft = args.expert_id ? await manager.updateDraft(actor, args.expert_id, definition, context, exec.signal) : await manager.createDraft(actor, definition, context, exec.signal);
      return detailProjection(await manager.get(actor, draft.expertId, undefined, exec.signal));
    },
  }));
  ctx.tools.register(defineTool({
    name: 'workdsh_expert_export_file',
    description: '实际生成并呈现完整.expert.zip文件，包含角色MD、原资源和二进制文件。所有文件写入与展示经过原生bash/present及沙箱；不是仅返回下载说明。已有不同内容的文件不会覆盖。',
    parameters: { expert_id: { type: 'string', required: true }, revision_id: { type: 'string' }, file_path: { type: 'string', required: true, description: '当前工作区内的目标ZIP文件路径。' } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { path: { type: 'string', required: true }, bytes: { type: 'integer', required: true }, digest: { type: 'string', required: true }, presented: { type: 'boolean', required: true } } }, render: (_args, value) => renderResult('完整专家文件包已生成并展示。', value) },
    async execute(args, exec) {
      const descriptor = await manager.export(await resolveActor(ctx, exec), args.expert_id, args.revision_id, exec.signal);
      const { archive } = buildExport(descriptor.definition, descriptor.sourceAttribution);
      const target = await workspaceTarget(ctx, exec, args.file_path);
      const path = ctx.fs.processPath(target);
      const existing = await ctx.fs.stat(target, exec.signal);
      if (existing) {
        const bytes = await ctx.fs.readBytes(target, exec.signal, 10 * 1024 * 1024);
        if (Buffer.from(bytes).compare(Buffer.from(archive)) !== 0) throw new ExpertsError('experts/conflict', '目标文件存在且内容不同，请使用新文件名。');
      } else {
        const command = `umask 077; mkdir -p ${shellQuote(dirname(path))} && printf %s ${shellQuote(Buffer.from(archive).toString('base64'))} | base64 -d > ${shellQuote(path)}`;
        await nativeTool(ctx, exec, 'bash', { command, description: '生成完整专家交付包' }, 'package-write');
      }
      const actual = await ctx.fs.readBytes(target, exec.signal, 10 * 1024 * 1024);
      if (Buffer.from(actual).compare(Buffer.from(archive)) !== 0) throw new ExpertsError('experts/conflict', '交付文件字节与专家包不一致。');
      await nativeTool(ctx, exec, 'present', { files: [{ path, description: '完整专家/专家团作品包' }] }, 'package-present');
      return { path, bytes: actual.length, digest: descriptor.digest, presented: true };
    },
  }));
  ctx.tools.register(defineTool({
    name: 'workdsh_expert_save_documents', description: '将单专家或整个专家团的 Markdown 制作稿保存为一个作品草稿。读取并提交 agents/*.md 与 team.md 的内容；不会发布、授权或执行脚本。',
    parameters: { expert_id: { type: 'string' }, expected_revision: { type: 'string' }, documents: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: { path: { type: 'string', required: true }, content: { type: 'string', required: true } } } } },
    output: { schema: detailOutput, render: (_args, value) => renderResult('整套制作稿已保存，可打开预览。', value, value.draft_url) },
    async execute(args, exec) {
      if (new Set(args.documents.map(file => file.path)).size !== args.documents.length) throw new ExpertsError('experts/invalid-definition', '制作文件路径重复。');
      const actor = await resolveActor(ctx, exec);
      const prior = args.expert_id ? await manager.get(actor, args.expert_id, undefined, exec.signal) : undefined;
      const definition = definitionFromDocuments(Object.fromEntries(args.documents.map(file => [file.path, file.content])), prior?.draft.definition.packageAssets);
      if (args.expert_id && !args.expected_revision) throw new ExpertsError('experts/conflict', '修改制作稿需要 expected_revision。');
      const context = { operationId: operationIdOf(exec), ...(args.expected_revision ? { expectedRevision: args.expected_revision } : {}) };
      const draft = args.expert_id ? await manager.updateDraft(actor, args.expert_id, definition, context, exec.signal) : await manager.createDraft(actor, definition, context, exec.signal);
      return detailProjection(await manager.get(actor, draft.expertId, undefined, exec.signal));
    },
  }));
  ctx.tools.register(defineTool({
    name: 'workdsh_expert_get_documents', description: '读取已保存作品的 Markdown 制作稿，用于修改或通过原生 write/present 交付文件。返回内容不代表已经写入工作区。',
    parameters: { expert_id: { type: 'string', required: true } },
    output: { schema: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { path: { type: 'string', required: true }, content: { type: 'string', required: true } } } }, render: (_args, value) => renderResult('制作稿内容：', value) },
    async execute(args, exec) {
      const detail = await manager.get(await resolveActor(ctx, exec), args.expert_id, undefined, exec.signal);
      return Object.entries(authoringDocuments(detail.draft.definition)).map(([path, content]) => ({ path, content }));
    },
  }));

  ctx.tools.register(defineTool({
    name: 'workdsh_expert_list_skills',
    description: '查询可编辑专家的真实本地已安装技能目录，返回稳定标识、简介与可配备状态。只读；创建或获取草稿后选择 selectable=true 的项，不能猜测技能名称。',
    parameters: { expert_id: { type: 'string', required: true, description: '当前主体可编辑的目标专家 id。' } },
    output: {
      schema: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
        skill_id: { type: 'string', required: true }, name: { type: 'string', required: true },
        description: { type: 'string', required: true }, state: { type: 'string', required: true },
        selectable: { type: 'boolean', required: true },
      } } },
      render: (_args, value) => renderResult(`已安装技能 ${value.length} 个；仅 selectable=true 的项可以新增配备。`, value),
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted();
      const actor = await resolveActor(ctx, exec);
      const catalog = await manager.listSkills(actor, args.expert_id, 'available', exec.signal);
      exec.signal.throwIfAborted();
      return catalog.map(skill => ({ skill_id: skill.skillId, name: skill.name, description: skill.description, state: skill.state, selectable: skill.selectable }));
    },
  }));

  ctx.tools.register(defineTool({
    name: 'workdsh_expert_list',
    description: '列出当前主体可见的 WorkDSH 专家（我的专家、内置专家），可按名称/描述/标签搜索与筛选。只读，不修改任何数据。',
    parameters: {
      search: { type: 'string', description: '可选搜索词，最多 200 字。' },
      origin: { type: 'string', enum: ['default', 'personal', 'organization'], description: '可选来源筛选。' },
      availability: { type: 'string', enum: ['enabled', 'disabled', 'archived'], description: '可选可用性筛选。' },
      limit: { type: 'integer', description: '可选返回条数，最多 100。' },
      cursor: { type: 'string', description: '可选分页游标，来自上次结果的 next_cursor。' },
    },
    output: {
      schema: listOutput,
      render: (_args, value) => renderResult(`找到 ${value.total} 个专家：${value.items.map((item) => item.name).join('、') || '（无）'}`, value),
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted();
      const actor = await resolveActor(ctx, exec);
      const query: ExpertListQuery = {
        ...(args.search === undefined ? {} : { search: args.search }),
        ...(args.origin === undefined ? {} : { origin: args.origin }),
        ...(args.availability === undefined ? {} : { availability: args.availability }),
        ...(args.limit === undefined ? {} : { limit: args.limit }),
        ...(args.cursor === undefined ? {} : { cursor: args.cursor }),
      };
      const result = await manager.list(actor, query, exec.signal);
      exec.signal.throwIfAborted();
      return {
        total: result.total,
        ...(result.nextCursor === undefined ? {} : { next_cursor: result.nextCursor }),
        items: result.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          origin: item.origin,
          availability: item.availability,
          readiness: item.readiness,
          can_use: item.canUse,
          pinned: item.pinned,
        })),
      };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'workdsh_expert_get',
    description: '读取一个 WorkDSH 专家的完整详情：草稿定义、并发令牌 revision、草稿修订 draft_revision、就绪状态与校验问题。只读。',
    parameters: {
      expert_id: { type: 'string', required: true, description: '专家 id。' },
      revision_id: { type: 'string', description: '可选：读取某个已发布修订而非当前草稿。' },
    },
    output: {
      schema: detailOutput,
      render: (_args, value) => renderResult(`专家「${value.name}」（${value.availability}/${value.readiness}）：${value.description}${value.issues.length ? `；校验问题 ${value.issues.length} 项` : ''}`, value, value.draft_url),
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted();
      const actor = await resolveActor(ctx, exec);
      const detail = await manager.get(actor, args.expert_id, args.revision_id, exec.signal);
      exec.signal.throwIfAborted();
      return detailProjection(detail);
    },
  }));

  ctx.tools.register(defineTool({
    name: 'workdsh_expert_create_draft',
    description: '创建一个新的「我的专家」草稿。这只写入私有草稿，绝不发布、不安装、不召唤任务。返回并发令牌 revision 与草稿修订 draft_revision。',
    parameters: { definition: definitionParameters },
    output: {
      schema: detailOutput,
      render: (_args, value) => renderResult(`已创建专家草稿 ${value.id}「${value.name}」（draft_revision=${value.draft_revision}）；校验问题 ${value.issues.length} 项。`, value, value.draft_url),
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted();
      const actor = await resolveActor(ctx, exec);
      const draft = await manager.createDraft(actor, toDefinitionPatch(args.definition), { operationId: operationIdOf(exec) }, exec.signal);
      const detail = await manager.get(actor, draft.expertId, undefined, exec.signal);
      exec.signal.throwIfAborted();
      return detailProjection(detail);
    },
  }));

  ctx.tools.register(defineTool({
    name: 'workdsh_expert_update_draft',
    description: '修改一个已存在的专家草稿。必须传入上次看到的并发令牌 expected_revision，冲突时会失败并要求刷新。绝不改动已发布修订或运行中的任务。',
    parameters: {
      expert_id: { type: 'string', required: true, description: '专家 id。' },
      expected_revision: { type: 'string', required: true, description: '并发令牌，来自 get/create/update 返回的 revision。' },
      definition: { ...definitionParameters, required: true as const },
    },
    output: {
      schema: detailOutput,
      render: (_args, value) => renderResult(`已更新专家草稿 ${value.id}「${value.name}」（draft_revision=${value.draft_revision}）；校验问题 ${value.issues.length} 项。`, value, value.draft_url),
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted();
      const actor = await resolveActor(ctx, exec);
      const draft = await manager.updateDraft(
        actor,
        args.expert_id,
        toDefinitionPatch(args.definition),
        { operationId: operationIdOf(exec), expectedRevision: args.expected_revision },
        exec.signal,
      );
      const detail = await manager.get(actor, draft.expertId, undefined, exec.signal);
      exec.signal.throwIfAborted();
      return detailProjection(detail);
    },
  }));

  ctx.tools.register(defineTool({
    name: 'workdsh_expert_validate',
    description: '校验一个专家草稿是否可发布，并解析其 Skill 依赖，返回定义摘要与依赖锁摘要。无副作用。发布前应先调用它。',
    parameters: {
      expert_id: { type: 'string', required: true, description: '专家 id。' },
      draft_revision: { type: 'string', required: true, description: '要校验的草稿修订，来自 get/create/update 返回的 draft_revision。' },
    },
    output: {
      schema: validateOutput,
      render: (_args, value) => renderResult(value.publishable ? `草稿可发布（依赖 ${value.dependencies.length} 个）。` : `草稿尚不可发布：${value.issues.join('；')}`, value),
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted();
      const actor = await resolveActor(ctx, exec);
      const validation = await manager.validate(actor, args.expert_id, args.draft_revision, exec.signal);
      exec.signal.throwIfAborted();
      return {
        publishable: validation.publishable,
        definition_digest: validation.definitionDigest,
        dependency_lock_digest: validation.dependencyLockDigest,
        dependencies: validation.dependencyLock.map((dependency) => `${dependency.name}@${dependency.revisionId}`),
        issues: validation.issues.map(issueText),
      };
    },
  }));

  ctx.tools.register(defineTool({
    name: 'workdsh_expert_request_publish',
    description: '对已通过校验的草稿发起发布前检查，返回 needs-confirmation 与将被冻结的精确摘要。此工具不会发布：用户必须在专家界面亲自确认，确认与发布只能由受信 UI 完成。',
    parameters: {
      expert_id: { type: 'string', required: true, description: '专家 id。' },
      draft_revision: { type: 'string', required: true, description: '要发布的草稿修订。' },
    },
    output: {
      schema: requestPublishOutput,
      render: (_args, value) => renderResult(`草稿已通过发布前校验，等待用户在专家界面确认发布（definition=${value.definition_digest}，dependencies=${value.dependency_lock_digest}）。不要声称已发布。`, value, value.draft_url),
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted();
      const actor = await resolveActor(ctx, exec);
      // Publishability gate only. The returned challenge is inert for the model:
      // exchanging it for a proof and publishing are trusted-UI routes, not tools.
      const confirmation = await manager.requestPublishConfirmation(actor, args.expert_id, args.draft_revision, exec.signal);
      exec.signal.throwIfAborted();
      return {
        status: 'needs-confirmation' as const,
        expert_id: confirmation.expertId,
        draft_revision: confirmation.draftRevision,
        definition_digest: confirmation.definitionDigest,
        dependency_lock_digest: confirmation.dependencyLockDigest,
        expires_at: confirmation.expiresAt,
        draft_url: expertDraftUrl(confirmation.expertId),
        instruction: '请在回复中提供 draft_url 对应的打开草稿链接，引导用户前往专家界面查看将发布的名称、定义摘要与依赖锁，并由用户点击确认后发布；不要代替用户确认，也不要声称已发布。',
      };
    },
  }));
}
