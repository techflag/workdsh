import { validateResources, packageAvatar, type PackageAssets } from './package-resources.js';
import { parse, stringify } from 'yaml';
import type { ExpertDefinition } from 'workdsh-contracts';
import { expertDefinitionSchema, normalizeDefinition, validateDefinition } from '../domain/definition.js';
import { ExpertsError } from '../domain/values.js';

const sections = { role: '身份与专业职责', methodology: '专业方法与场景', boundaries: '能力与协作边界', deliverables: '成果与交付标准' } as const;
export type AuthoringDocuments = Readonly<Record<string, string>>;

function fail(message: string): never { throw new ExpertsError('experts/invalid-definition', message); }

/** Professional prose lives in Markdown; front matter carries only discovery/dependency data. */
export function expertDocument(definition: ExpertDefinition): string {
  if (definition.agentDocument) return definition.agentDocument;
  const { role, methodology, boundaries, deliverables, team, ...metadata } = definition;
  return `---\n${stringify({ format: 'workdsh-expert-document', version: 1, ...metadata })}---\n\n`
    + Object.entries(sections).map(([key, title]) => `<!-- workdsh:${key} -->\n## ${title}\n\n${definition[key as keyof typeof sections]}\n`).join('\n');
}

function parseHeader(text: string): { metadata: Record<string, unknown>; body: string } {
  if (typeof text !== 'string' || text.length > 512_000) fail('制作文档为空或过大。');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (!match) fail('制作文档需要 YAML 头部。');
  let metadata: unknown;
  try { metadata = parse(match[1], { maxAliasCount: 0 }); } catch { fail('制作文档 YAML 无效或包含别名。'); }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) fail('制作文档头部必须是对象。');
  return { metadata: metadata as Record<string, unknown>, body: match[2] };
}

export function parseExpertDocument(text: string): ExpertDefinition {
  const { metadata, body } = parseHeader(text);
  if (!metadata.format) {
    if (typeof metadata.name !== 'string' || !/^[a-z][a-z0-9-]{1,63}$/.test(metadata.name) || typeof metadata.description !== 'string' || !body.trim() || 'tools' in metadata) fail('Agent MD 需要稳定英文 name、description、完整正文，不能声明 tools 权限。');
    const display = metadata.displayName as { zh?: string; en?: string } | undefined;
    const profession = metadata.profession as { zh?: string; en?: string } | undefined;
    return { name: display?.zh ?? display?.en ?? metadata.name, description: metadata.description, role: profession?.zh ?? profession?.en ?? metadata.name, methodology: body.trim(), boundaries: '遵循完整 Agent MD 与系统授权。', deliverables: '按完整 Agent MD 的输出规范交付。', tags: [], examples: [], skillRequirements: Array.isArray(metadata.skills) ? metadata.skills.map(name => { if (typeof name !== 'string') fail('skills 必须是名称数组。'); return { name }; }) : [], futureRequirements: [], agentDocument: text };
  }
  const { format, version, ...fields } = metadata;
  if (format !== 'workdsh-expert-document' || version !== 1 || 'team' in fields) fail('不支持的专家文档格式。团队信息请写在 team.md。');
  const markers = [...body.matchAll(/<!-- workdsh:(role|methodology|boundaries|deliverables) -->/g)];
  if (markers.length !== 4 || new Set(markers.map(m => m[1])).size !== 4) fail('四个专业内容区段必须各出现一次。');
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index! + markers[i][0].length;
    fields[markers[i][1]] = body.slice(start, markers[i + 1]?.index ?? body.length).replace(/^\s*## [^\n]*\n/, '').trim();
  }
  const parsed = expertDefinitionSchema.safeParse(fields);
  if (!parsed.success) fail('专家文档缺少必要字段或字段类型不正确。');
  return normalizeDefinition(parsed.data);
}

export function authoringDocuments(definition: ExpertDefinition): Record<string, string> {
  if (definition.packageDocuments) return { ...definition.packageDocuments };
  const documents: Record<string, string> = {};
  const root = definition.team ? 'agents/lead.md' : 'agents/expert.md';
  documents[root] = expertDocument(definition);
  if (definition.team) {
    for (const member of definition.team.members) documents[`agents/${member.key}.md`] = expertDocument(member.definition);
    documents['team.md'] = `---\n${stringify({ format: 'workdsh-team-document', version: 1, lead: root, members: definition.team.members.map(member => ({ key: member.key, file: `agents/${member.key}.md` })), workflows: definition.team.workflows })}---\n\n# ${definition.name}\n\n${definition.description}\n\n成员方法保存在 agents/；场景触发、执行依赖和成果要求保存在本文件头部。\n`;
  }
  documents['README.md'] = `# ${definition.name}\n\n${definition.description}\n\n## 使用\n\n在 WorkDSH「我的专家」导入此专家包，预览整套内容并确认发布。选择示例开始新任务。导入不授予权限，不运行脚本，不安装依赖；缺少技能会在发布校验中指出。\n\n## 修改\n\n编辑 agents/ 中的 Markdown 专业内容${definition.team ? '及 team.md 的场景' : ''}，保留文档头部和区段标记。在制作对话中让 AI 读取修改后的文件，通过 workdsh_expert_save_documents 保存整套文档为草稿，再统一预览发布。原 ZIP 的 manifest 校验不可手工绕过；保存后从界面重新导出。\n\n## 版本\n\nexpert.json 是此交付包的结构化快照；Markdown 是同一份内容的可编辑制作稿。已有任务保持原修订。团队成员来自内容快照，不随来源专家自动更新。\n`;
  return documents;
}

export function definitionFromDocuments(documents: AuthoringDocuments, assets: PackageAssets = {}): ExpertDefinition {
  validateResources(documents, assets);
  const paths = Object.keys(documents);
  const packageMeta = documents['.workdsh-expert/plugin.json'] ?? documents['.codebuddy-plugin/plugin.json'];
  if (packageMeta) {
    if (paths.length > 64 || paths.some(path => path.startsWith('/') || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..')) || Object.values(documents).some(content => typeof content !== 'string') || Object.values(documents).reduce((sum, text) => sum + text.length, 0) > 1_000_000) fail('专家包路径或大小无效。');
    let meta: Record<string, any>;
    try { meta = JSON.parse(packageMeta); } catch { fail('plugin.json 无效。'); }
    if (!meta || typeof meta !== 'object' || !Array.isArray(meta.tags ?? []) || !Array.isArray(meta.quickPrompts ?? []) || !Array.isArray(meta.skills ?? [])) fail('专家包元数据结构无效。');
    if (!Array.isArray(meta.agents) || typeof meta.agentName !== 'string' || !['agent', 'team'].includes(meta.expertType)) fail('专家包需要 expertType、agents 与 agentName。');
    const agents = new Map<string, ExpertDefinition>();
    for (const entry of meta.agents) {
      if (typeof entry !== 'string') fail('agents 必须是路径数组。');
      const path = entry.replace(/^\.\//, '');
      if (!/^agents\/[a-z][a-z0-9-]{1,63}\.md$/.test(path) || !documents[path]) fail('声明的 Agent MD 缺失。');
      const id = path.slice(7, -3);
      const parsed = parseHeader(documents[path]);
      if (parsed.metadata.name !== id || agents.has(id)) fail('Agent 标识与文件名不一致或重复。');
      agents.set(id, parseExpertDocument(documents[path]));
    }
    if (meta.members !== undefined) {
      if (!Array.isArray(meta.members) || new Set(meta.members.map((member: any) => member.id)).size !== meta.members.length) fail('成员展示信息重复或无效。');
      for (const member of meta.members) {
        const role = agents.get(member.id);
        if (!role || (member.role === 'lead') !== (member.id === meta.agentName)) fail('成员展示与角色文件或主理人身份不一致。');
        const avatar = member.avatar ? packageAvatar({ '.workdsh-expert/plugin.json': JSON.stringify({ avatar: member.avatar }) }, assets) : undefined;
        agents.set(member.id, { ...role, name: member.displayName?.zh ?? member.displayName?.en ?? member.name?.zh ?? member.name?.en ?? role.name, role: member.profession?.zh ?? member.profession?.en ?? role.role, ...(avatar ? { avatarRef: avatar } : {}) });
      }
      if (meta.members.length !== agents.size) fail('成员展示必须覆盖所有声明角色。');
    }
    const lead = agents.get(meta.agentName);
    if (!lead) fail('默认 Agent 不存在。');
    if (meta.expertType === 'agent' && agents.size !== 1) fail('单专家包只能声明一个 Agent。');
    let definition: ExpertDefinition = { ...lead, name: meta.displayName?.zh ?? meta.displayName?.en ?? lead.name, description: meta.displayDescription?.zh ?? meta.displayDescription?.en ?? lead.description, categoryId: meta.categoryId, tags: (meta.tags ?? []).map((tag: any) => typeof tag === 'string' ? tag : tag.zh ?? tag.en), examples: (meta.quickPrompts ?? []).map((prompt: any, i: number) => ({ id: `prompt-${i + 1}`, prompt: typeof prompt === 'string' ? prompt : prompt.zh ?? prompt.en })) };
    if (meta.expertType === 'team') {
      if (meta.teamInfo?.leadAgent !== meta.agentName || !Array.isArray(meta.teamInfo?.memberAgents)) fail('团队入口与成员声明不一致。');
      const ids = meta.teamInfo.memberAgents as string[];
      if (ids.includes(meta.agentName) || new Set(ids).size !== ids.length || ids.length !== agents.size - 1 || ids.some(id => !agents.has(id))) fail('团队成员声明与 Agent 文件不一致。');
      let settings: any; try { settings = JSON.parse(documents['settings.json']); } catch { fail('团队需要 settings.json。'); }
      if (settings.agent !== meta.agentName && settings.agent !== `${meta.name}.${meta.agentName}`) fail('settings 默认入口不一致。');
      definition = { ...definition, team: { members: ids.map(key => ({ key, definition: agents.get(key)! })), workflows: meta.workflows ?? [{ id: 'consult', title: '团队咨询', trigger: '主理人说明团队能力及处理范围', deliverable: '问题处理建议', stages: [] }] } };
    }
    for (const skill of meta.skills ?? []) { const path = String(skill).replace(/^\.\//, ''); if (!/^skills\/[a-z][a-z0-9-]+$/.test(path) || !documents[`${path}/SKILL.md`]) fail('附带 Skill 声明缺少 SKILL.md。'); }
    const avatar = packageAvatar(documents, assets);
    definition = { ...definition, ...(avatar ? { avatarRef: avatar } : {}), packageDocuments: { ...documents }, ...(Object.keys(assets).length ? { packageAssets: { ...assets } } : {}) };
    for (const member of meta.members ?? []) if (member.avatar && !assets[String(member.avatar).replace(/^\.\//, '')]) fail('成员头像资源缺失。');
    const issues = validateDefinition(definition);
    if (issues.length) throw new ExpertsError('experts/invalid-definition', '专家包未通过校验。', { issues });
    return normalizeDefinition(definition);
  }
  if (!paths.length || paths.length > 12 || paths.some(path => !/^(README\.md|team\.md|agents\/[a-z][a-z0-9-]{0,39}\.md)$/.test(path))) fail('制作文件路径无效或数量超限。');
  if (Object.values(documents).reduce((sum, value) => sum + (typeof value === 'string' ? value.length : 512_001), 0) > 512_000) fail('制作文件总大小超限。');
  let definition: ExpertDefinition;
  const expected = new Set(['README.md']);
  if (documents['team.md']) {
    const { metadata } = parseHeader(documents['team.md']);
    if (metadata.format !== 'workdsh-team-document' || metadata.version !== 1 || metadata.lead !== 'agents/lead.md' || !Array.isArray(metadata.members)) fail('团队文档格式无效。');
    expected.add('team.md'); expected.add('agents/lead.md');
    const members = metadata.members.map((member: { key?: unknown; file?: unknown }) => {
      if (typeof member?.key !== 'string' || member.key === 'lead' || member.file !== `agents/${member.key}.md` || typeof documents[String(member.file)] !== 'string') fail('团队成员文件缺失或引用不一致。');
      expected.add(String(member.file));
      return { key: member.key, definition: parseExpertDocument(documents[String(member.file)]) };
    });
    const candidate = { ...parseExpertDocument(documents['agents/lead.md']), team: { members, workflows: metadata.workflows } };
    const parsed = expertDefinitionSchema.safeParse(candidate);
    if (!parsed.success) fail('团队场景或成员结构无效。');
    definition = parsed.data;
  } else {
    expected.add('agents/expert.md');
    definition = parseExpertDocument(documents['agents/expert.md']);
  }
  if (paths.some(path => !expected.has(path))) fail('制作包包含未被引用的成员文件。');
  const issues = validateDefinition(definition);
  if (issues.length) throw new ExpertsError('experts/invalid-definition', '制作文档未通过校验。', { issues });
  return normalizeDefinition(definition);
}
