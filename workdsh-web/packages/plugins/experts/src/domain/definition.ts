import { validateResources } from '../authoring/package-resources.js';
import { z } from 'zod';
import type {
  DomainIssue,
  ExpertDefinition,
  ExpertExample,
  FutureRequirement,
  SkillRequirement,
} from 'workdsh-contracts';
import { EXPERT_LIMITS } from './values.js';
import { byteLength, codePointLength, digestOf } from './digest.js';
import { validateTeamWorkflow } from './team-workflow.js';

/**
 * Definition validation, normalization and persona-prefix compilation.
 *
 * The zod schema is structural (used by the storage domain to validate record
 * shape on read). Length limits follow `expert-definition.schema.json` (Unicode
 * code points for `maxLength`, total UTF-8 bytes checked at publish) and are
 * enforced manually so each problem carries a precise `DomainIssue` code.
 *
 * The persona prefix is a Harness template where a complete `{{…}}` group
 * interpolates a registered variable, so any literal `{{`/`}}` in authored text
 * is rejected here rather than silently reaching the compiler (G01, point 4).
 */

const exampleSchema: z.ZodType<ExpertExample> = z.object({
  id: z.string(),
  title: z.string().optional(),
  prompt: z.string(),
});

const skillRequirementSchema: z.ZodType<SkillRequirement> = z.object({
  name: z.string(),
  skillId: z.string().optional(),
});

const futureRequirementSchema: z.ZodType<FutureRequirement> = z.object({
  kind: z.string(),
  key: z.string(),
  required: z.boolean(),
  description: z.string(),
});

/**
 * Structural schema for storage-record validation: types and shape only, allowing
 * empty strings so a half-authored draft stays readable. Every business rule
 * (required, length, braces, duplicates, size) is enforced in `validateDefinition`.
 */
const singleDefinitionSchema = z.object({
  agentDocument: z.string().optional(),
  packageDocuments: z.record(z.string(), z.string()).optional(),
  packageAssets: z.record(z.string(), z.object({ base64: z.string(), executable: z.boolean().optional() }).strict()).optional(),
  name: z.string(),
  description: z.string(),
  avatarRef: z.string().optional(),
  role: z.string(),
  methodology: z.string(),
  boundaries: z.string(),
  deliverables: z.string(),
  tags: z.array(z.string()),
  categoryId: z.string().optional(),
  examples: z.array(exampleSchema),
  skillRequirements: z.array(skillRequirementSchema),
  futureRequirements: z.array(futureRequirementSchema),
});

export const teamDefinitionSchema = z.object({
  members: z.array(z.object({ key: z.string(), definition: singleDefinitionSchema.strict() })),
  workflows: z.array(z.object({
    id: z.string(), title: z.string(), trigger: z.string(), deliverable: z.string(),
    stages: z.array(z.object({ id: z.string(), worker: z.string(), reviewer: z.string().optional(), dependsOn: z.array(z.string()) })),
  })),
});
export const expertDefinitionSchema: z.ZodType<ExpertDefinition> = singleDefinitionSchema.extend({ team: teamDefinitionSchema.optional() });

/** Fields whose text becomes part of the persona prefix and must stay template-safe. */
const TEMPLATE_TEXT_FIELDS = ['name', 'description', 'role', 'methodology', 'boundaries', 'deliverables'] as const;

function hasTemplateBraces(value: string): boolean {
  return value.includes('{{') || value.includes('}}');
}

function checkLimit(issues: DomainIssue[], path: string, label: string, value: string, max: number): void {
  if (codePointLength(value) > max) {
    issues.push({ code: 'definition/limit', path, message: `${label}超过 ${max} 个字符上限。` });
  }
}

/**
 * Validate a candidate definition. Returns every problem found (no side effect);
 * an empty list means the definition is structurally publishable.
 */
export function validateDefinition(candidate: unknown): readonly DomainIssue[] {
  const issues: DomainIssue[] = [];
  const parsed = expertDefinitionSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({
        code: `definition/${issue.code}`,
        path: issue.path.join('.') || undefined,
        message: issue.message,
      });
    }
    return issues;
  }
  const definition = parsed.data;
  try { validateResources(definition.packageDocuments ?? {}, definition.packageAssets); } catch (error) { issues.push({ code: 'definition/package', message: String(error) }); }
  if (definition.packageDocuments) {
    const files = Object.entries(definition.packageDocuments);
    if (files.length > 64 || files.some(([path]) => path.startsWith('/') || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..')) || files.reduce((sum, [, text]) => sum + byteLength(text), 0) > 1_000_000) issues.push({ code: 'definition/package', message: '专家包资源路径、数量或总大小无效。' });
  }
  if (definition.agentDocument && (hasTemplateBraces(definition.agentDocument) || byteLength(definition.agentDocument) > 65536)) issues.push({ code: 'definition/document', message: '完整 Agent MD 过大或包含原生模板插值。' });

  const required = (path: string, label: string, value: string) => {
    if (value.trim().length === 0) issues.push({ code: 'definition/required', path, message: `${label}不能为空。` });
  };
  required('name', '名称', definition.name);
  required('description', '描述', definition.description);
  required('role', '角色定位', definition.role);
  required('methodology', '工作方法', definition.methodology);
  required('boundaries', '行为边界', definition.boundaries);
  required('deliverables', '交付物', definition.deliverables);
  definition.examples.forEach((example, index) => {
    required(`examples.${index}.id`, '示例 id', example.id);
    required(`examples.${index}.prompt`, '示例内容', example.prompt);
  });
  definition.skillRequirements.forEach((requirement, index) => required(`skillRequirements.${index}.name`, 'Skill 名称', requirement.name));
  definition.futureRequirements.forEach((requirement, index) => {
    required(`futureRequirements.${index}.kind`, '能力类型', requirement.kind);
    required(`futureRequirements.${index}.key`, '能力标识', requirement.key);
  });

  checkLimit(issues, 'name', '名称', definition.name, EXPERT_LIMITS.nameMax);
  checkLimit(issues, 'description', '描述', definition.description, EXPERT_LIMITS.descriptionMax);
  checkLimit(issues, 'role', '角色定位', definition.role, EXPERT_LIMITS.proseMax);
  checkLimit(issues, 'methodology', '工作方法', definition.methodology, definition.agentDocument ? 65536 : EXPERT_LIMITS.proseMax);
  checkLimit(issues, 'boundaries', '行为边界', definition.boundaries, EXPERT_LIMITS.proseMax);
  checkLimit(issues, 'deliverables', '交付物', definition.deliverables, EXPERT_LIMITS.proseMax);

  if (definition.tags.length > EXPERT_LIMITS.tagsMax) {
    issues.push({ code: 'definition/limit', path: 'tags', message: `标签数量超过 ${EXPERT_LIMITS.tagsMax} 个上限。` });
  }
  if (definition.examples.length > EXPERT_LIMITS.examplesMax) {
    issues.push({ code: 'definition/limit', path: 'examples', message: `示例数量超过 ${EXPERT_LIMITS.examplesMax} 个上限。` });
  }
  if (definition.skillRequirements.length > EXPERT_LIMITS.skillRequirementsMax) {
    issues.push({ code: 'definition/limit', path: 'skillRequirements', message: `Skill 依赖数量超过 ${EXPERT_LIMITS.skillRequirementsMax} 个上限。` });
  }
  if (definition.futureRequirements.length > EXPERT_LIMITS.futureRequirementsMax) {
    issues.push({ code: 'definition/limit', path: 'futureRequirements', message: `未来能力数量超过 ${EXPERT_LIMITS.futureRequirementsMax} 个上限。` });
  }

  definition.tags.forEach((tag, index) => checkLimit(issues, `tags.${index}`, '标签', tag, 40));
  definition.examples.forEach((example, index) => {
    checkLimit(issues, `examples.${index}.id`, '示例 id', example.id, 64);
    checkLimit(issues, `examples.${index}.prompt`, '示例内容', example.prompt, 4000);
    if (example.title !== undefined) checkLimit(issues, `examples.${index}.title`, '示例标题', example.title, 120);
  });

  for (const field of TEMPLATE_TEXT_FIELDS) {
    if (hasTemplateBraces(definition[field])) {
      issues.push({
        code: 'definition/template-braces',
        path: field,
        message: '文本不能包含字面量 {{ 或 }}，persona 模板会将其当作变量插值。',
      });
    }
  }
  definition.examples.forEach((example, index) => {
    if (hasTemplateBraces(example.prompt) || (example.title !== undefined && hasTemplateBraces(example.title))) {
      issues.push({ code: 'definition/template-braces', path: `examples.${index}.prompt`, message: '示例文本不能包含字面量 {{ 或 }}。' });
    }
  });

  const seenExampleIds = new Set<string>();
  definition.examples.forEach((example, index) => {
    if (seenExampleIds.has(example.id)) {
      issues.push({ code: 'definition/duplicate-example-id', path: `examples.${index}.id`, message: '示例 id 重复。' });
    }
    seenExampleIds.add(example.id);
  });
  const seenTags = new Set<string>();
  definition.tags.forEach((tag, index) => {
    const normalized = tag.trim();
    if (seenTags.has(normalized)) {
      issues.push({ code: 'definition/duplicate-tag', path: `tags.${index}`, message: '标签重复。' });
    }
    seenTags.add(normalized);
  });

  if (definition.team) {
    const { members, workflows } = definition.team;
    const memberKeys = new Set(members.map(member => member.key));
    if (members.length < 2 || members.length > 16 || memberKeys.size !== members.length) issues.push({ code: 'team/members', message: '专家团需要 2 至 16 位不同成员，另有主理人。' });
    members.forEach((member, i) => {
      if (!/^[a-z][a-z0-9-]{0,39}$/.test(member.key) || member.key === 'lead') issues.push({ code: 'team/member-key', path: `team.members.${i}.key`, message: '成员标识须为小写英文和连字符，lead 保留给主理人。' });
      issues.push(...validateDefinition(member.definition).map(issue => ({ ...issue, path: `team.members.${i}.definition.${issue.path ?? ''}` })));
    });
    if (!workflows.length || workflows.length > 12 || new Set(workflows.map(w => w.id)).size !== workflows.length) issues.push({ code: 'team/workflows', message: '需要 1 至 12 个标识不同的协作场景。' });
    workflows.forEach((workflow, i) => {
      for (const [field, value] of Object.entries(workflow)) if (typeof value === 'string' && (!value.trim() || hasTemplateBraces(value) || value.length > 4000)) issues.push({ code: 'team/workflow-text', path: `team.workflows.${i}.${field}`, message: '场景文字不能为空、过长或包含模板插值。' });
      if (workflow.stages.length) {
        try { validateTeamWorkflow(workflow.stages); }
        catch (error) { issues.push({ code: 'team/workflow-plan', path: `team.workflows.${i}.stages`, message: String(error) }); }
        for (const stage of workflow.stages) if (!memberKeys.has(stage.worker) || (stage.reviewer && !memberKeys.has(stage.reviewer))) issues.push({ code: 'team/unknown-member', message: `场景 ${workflow.title} 引用了不存在的成员。` });
      }
    });
  }
  const totalBytes = byteLength(JSON.stringify({ ...definition, team: undefined, packageDocuments: undefined, packageAssets: undefined, agentDocument: undefined }));
  if (totalBytes > EXPERT_LIMITS.publishedDefinitionMaxBytes) {
    issues.push({
      code: 'definition/too-large',
      message: `定义总大小 ${totalBytes} 字节超过上限 ${EXPERT_LIMITS.publishedDefinitionMaxBytes} 字节。`,
    });
  }
  return issues;
}

/** Stable digest of a validated definition. */
export function definitionDigest(definition: ExpertDefinition): string {
  return digestOf(definition);
}

/**
 * Trim whitespace and drop empty optional fields so two authoring passes that
 * differ only in spacing produce the same digest. Never reorders user lists.
 */
export function normalizeDefinition(candidate: ExpertDefinition): ExpertDefinition {
  const trim = (value: string) => value.replace(/^\s+/, '').replace(/\s+$/, '');
  const examples: ExpertExample[] = candidate.examples.map((example) => ({
    id: example.id,
    ...(example.title === undefined || example.title.trim() === '' ? {} : { title: trim(example.title) }),
    prompt: trim(example.prompt),
  }));
  const skillRequirements: SkillRequirement[] = candidate.skillRequirements.map((requirement) => ({
    name: trim(requirement.name),
    ...(requirement.skillId === undefined || requirement.skillId.trim() === '' ? {} : { skillId: trim(requirement.skillId) }),
  }));
  const futureRequirements: FutureRequirement[] = candidate.futureRequirements.map((requirement) => ({
    kind: requirement.kind,
    key: requirement.key,
    required: requirement.required,
    description: trim(requirement.description),
  }));
  return {
    ...(candidate.agentDocument ? { agentDocument: candidate.agentDocument } : {}),
    ...(candidate.packageDocuments ? { packageDocuments: candidate.packageDocuments } : {}),
    ...(candidate.packageAssets ? { packageAssets: candidate.packageAssets } : {}),
    name: trim(candidate.name),
    description: trim(candidate.description),
    ...(candidate.avatarRef === undefined || candidate.avatarRef.trim() === '' ? {} : { avatarRef: candidate.avatarRef }),
    role: trim(candidate.role),
    methodology: trim(candidate.methodology),
    boundaries: trim(candidate.boundaries),
    deliverables: trim(candidate.deliverables),
    tags: candidate.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
    ...(candidate.categoryId === undefined || candidate.categoryId.trim() === '' ? {} : { categoryId: candidate.categoryId }),
    examples,
    skillRequirements,
    futureRequirements,
    ...(candidate.team ? { team: { members: candidate.team.members.map(member => ({ key: member.key, definition: normalizeDefinition(member.definition) })), workflows: candidate.team.workflows } } : {}),
  };
}

/**
 * Compile the persona prefix carried by an expert preset. Values are substituted
 * here (not by persona templating); the output contains no `{{…}}` group because
 * validation already rejected literal braces in authored text.
 */
export function compilePersonaPrefix(definition: ExpertDefinition): string {
  if (definition.agentDocument) return definition.agentDocument.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
  const sections: string[] = [`你是「${definition.name}」。`, '', '## 角色定位', definition.role];
  if (definition.methodology.trim()) sections.push('', '## 工作方法', definition.methodology);
  if (definition.boundaries.trim()) sections.push('', '## 行为边界', definition.boundaries);
  if (definition.deliverables.trim()) sections.push('', '## 交付物', definition.deliverables);
  if (definition.tags.length) sections.push('', '## 适用标签', definition.tags.join('、'));
  return sections.join('\n');
}

/** Compile the persona suffix: keeps native guidance, adds a short reminder. */
export function compilePersonaSuffix(definition: ExpertDefinition): string {
  const lines = ['请始终以以上专家身份回应，并在超出能力边界时明确说明，不要臆造。'];
  if (definition.examples.length) {
    lines.push('可参考的启动示例：');
    for (const example of definition.examples) {
      lines.push(`- ${example.title ?? example.id}：${example.prompt.split('\n')[0]}`);
    }
  }
  return lines.join('\n');
}
