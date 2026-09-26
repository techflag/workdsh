import type { Context } from '@deepseek-ai/cordis';
import { defineTool, type ToolRunContext } from '@deepseek-ai/dsh-tools';
import type { ActorContext } from 'workdsh-contracts';

async function actor(ctx: Context, exec: ToolRunContext): Promise<ActorContext> {
  const sessionId = exec.agent ? String(exec.agent.id) : undefined;
  return ctx.workdshIdentity.resolve(sessionId ? { sessionId } : undefined, exec.signal);
}

export function registerLibraryTools(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'library_search',
    description: '搜索本次对话已显式选择的虚拟资料正文。资料不位于工作区文件系统；无需也不得先用 Bash、Glob 或文件读取工具定位。返回固定资料与修订引用；不自动扩大读取范围。',
    parameters: { query: { type: 'string', required: true, description: '要查找的标题或正文关键词。' }, kind: { type: 'string', enum: ['markdown', 'text', 'pdf', 'docx', 'pptx', 'html'] }, source: { type: 'string', enum: ['upload', 'task', 'created'] } },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: { hits: { type: 'array', required: true, items: {
          type: 'object', additionalProperties: false,
          properties: { asset_id: { type: 'string', required: true }, revision_id: { type: 'string', required: true }, name: { type: 'string', required: true }, kind: { type: 'string', required: true }, source: { type: 'string', required: true }, updated_at: { type: 'string', required: true }, folder_path: { type: 'string', required: true }, location: { type: 'string' }, excerpt: { type: 'string', required: true } },
        } } },
      },
      render: (_args, value) => [{ type: 'text', text: value.hits.length ? value.hits.map(hit => `${hit.name}: ${hit.excerpt}`).join('\n') : '没有找到匹配资料。' }],
    },
    async execute(args, exec) {
      const current = await actor(ctx, exec); const sessionId = current.sessionId ?? (exec.agent ? String(exec.agent.id) : undefined); if (!sessionId) throw new Error('library/session-required');
      const selected = new Map((await ctx.workdshLibrary.taskSelection(current, sessionId, exec.signal)).map(row => [row.assetId, row.revisionId]));
      const hits = (await ctx.workdshLibrary.search(current, args.query, { ...(args.kind ? { kinds: [args.kind] } : {}), ...(args.source ? { sources: [args.source] } : {}) }, exec.signal)).filter(hit => selected.get(hit.assetId) === hit.revisionId);
      return { hits: hits.map(hit => ({ asset_id: hit.assetId, revision_id: hit.revisionId, name: hit.name, kind: hit.kind, source: hit.source, updated_at: hit.updatedAt, folder_path: hit.folderPath, ...(hit.location ? { location: hit.location } : {}), excerpt: hit.excerpt })) };
    },
  }));
  ctx.tools.register(defineTool({
    name: 'library_read',
    description: '通过 asset_id 直接读取当前用户已授权的虚拟资料固定 Markdown 检索视图。资料不位于工作区文件系统；无需也不得先用 Bash、Glob 或文件读取工具定位。可指定 revision_id。',
    parameters: { asset_id: { type: 'string', required: true }, revision_id: { type: 'string' }, offset: { type: 'integer', description: '从 0 开始的字符偏移量。' }, limit: { type: 'integer', description: '本次最多返回的字符数，范围 1–20000。' } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { asset_id: { type: 'string', required: true }, revision_id: { type: 'string' }, content: { type: 'string', required: true }, offset: { type: 'integer', required: true }, next_offset: { type: 'integer' }, truncated: { type: 'boolean', required: true } } }, render: (_args, value) => [{ type: 'text', text: value.content }] },
    async execute(args, exec) {
      const current = await actor(ctx, exec); const sessionId = current.sessionId ?? (exec.agent ? String(exec.agent.id) : undefined); if (!sessionId) throw new Error('library/session-required');
      const reference = (await ctx.workdshLibrary.taskSelection(current, sessionId, exec.signal)).find(row => row.assetId === args.asset_id && (!args.revision_id || row.revisionId === args.revision_id));
      if (!reference) throw new Error('library/not-selected');
      const complete = await ctx.workdshLibrary.readText(current, args.asset_id, reference.revisionId, exec.signal); const offset = args.offset ?? 0; const limit = args.limit ?? 12_000;
      if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 20_000) throw new Error('library/invalid-page');
      const content = complete.slice(offset, offset + limit); const next = offset + content.length; const truncated = next < complete.length;
      return { asset_id: args.asset_id, revision_id: reference.revisionId, content, offset, ...(truncated ? { next_offset: next } : {}), truncated };
    },
  }));
  ctx.tools.register(defineTool({
    name: 'library_save_markdown',
    description: '把当前任务生成的 Markdown 成果保存到个人资料库。保存新文件，不覆盖已有资料。',
    parameters: { name: { type: 'string', required: true, description: '以 .md 或 .markdown 结尾的文件名。' }, content: { type: 'string', required: true }, parent_id: { type: 'string', description: '资料库目标文件夹 id；省略保存到根目录。' } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { asset_id: { type: 'string', required: true }, revision_id: { type: 'string', required: true }, node_id: { type: 'string', required: true }, name: { type: 'string', required: true } } }, render: (_args, value) => [{ type: 'text', text: `已保存到资料库：${value.name}` }] },
    async execute(args, exec) {
      const name = /\.md(?:arkdown)?$/i.test(args.name) ? args.name : `${args.name}.md`;
      const entry = await ctx.workdshLibrary.importAsset(await actor(ctx, exec), { name, bytes: new TextEncoder().encode(args.content), operationId: `library-tool-${String(exec.callId)}`, source: 'task', sourceTaskId: exec.agent ? String(exec.agent.id) : undefined, ...(args.parent_id ? { parentId: args.parent_id } : {}) }, exec.signal);
      return { asset_id: entry.asset!.id, revision_id: entry.revision!.id, node_id: entry.id, name: entry.name };
    },
  }));
  ctx.tools.register(defineTool({
    name: 'library_create_draft',
    description: '从一个 Markdown/TXT 资料的固定修订创建待审草稿。不会替换当前正式修订。',
    parameters: { asset_id: { type: 'string', required: true }, base_revision_id: { type: 'string' } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { draft_id: { type: 'string', required: true }, asset_id: { type: 'string', required: true }, base_revision_id: { type: 'string', required: true }, revision: { type: 'string', required: true }, content: { type: 'string', required: true } } }, render: (_args, value) => [{ type: 'text', text: `已创建待审草稿 ${value.draft_id}，尚未发布。` }] },
    async execute(args, exec) { const draft = await ctx.workdshLibrary.createDraft(await actor(ctx, exec), args.asset_id, args.base_revision_id, exec.signal); return { draft_id: draft.id, asset_id: draft.assetId, base_revision_id: draft.baseRevisionId, revision: draft.revision, content: draft.content }; },
  }));
  ctx.tools.register(defineTool({
    name: 'library_update_draft',
    description: '更新待审草稿。expected_revision 不匹配时拒绝覆盖；不会发布正式修订。',
    parameters: { draft_id: { type: 'string', required: true }, content: { type: 'string', required: true }, expected_revision: { type: 'string', required: true } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { draft_id: { type: 'string', required: true }, revision: { type: 'string', required: true }, updated_at: { type: 'string', required: true } } }, render: (_args, value) => [{ type: 'text', text: `草稿已保存：${value.draft_id}。` }] },
    async execute(args, exec) { const draft = await ctx.workdshLibrary.updateDraft(await actor(ctx, exec), args.draft_id, args.content, args.expected_revision, exec.signal); return { draft_id: draft.id, revision: draft.revision, updated_at: draft.updatedAt }; },
  }));
  ctx.tools.register(defineTool({
    name: 'library_publish_revision',
    description: '把待审草稿发布为不可变新修订。只有用户已明确确认发布时，user_confirmed 才能为 true。',
    parameters: { draft_id: { type: 'string', required: true }, expected_revision: { type: 'string', required: true }, user_confirmed: { type: 'boolean', required: true, description: '仅当用户明确确认发布这个草稿时传 true。' } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { asset_id: { type: 'string', required: true }, revision_id: { type: 'string', required: true }, revision_number: { type: 'integer', required: true }, name: { type: 'string', required: true } } }, render: (_args, value) => [{ type: 'text', text: `已发布新修订：${value.name} · 修订 ${value.revision_number}` }] },
    async execute(args, exec) { if (!args.user_confirmed) throw new Error('library/user-confirmation-required'); const entry = await ctx.workdshLibrary.publishDraft(await actor(ctx, exec), args.draft_id, args.expected_revision, exec.signal); return { asset_id: entry.asset!.id, revision_id: entry.revision!.id, revision_number: entry.revision!.number, name: entry.name }; },
  }));
  ctx.tools.register(defineTool({
    name: 'library_register_deliverable',
    description: '把当前任务实际生成的 Markdown 成果幂等登记为资料库正式资产。operation_id 重试必须保持相同。',
    parameters: { name: { type: 'string', required: true }, content: { type: 'string', required: true }, operation_id: { type: 'string', required: true }, parent_id: { type: 'string' } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { asset_id: { type: 'string', required: true }, revision_id: { type: 'string', required: true }, node_id: { type: 'string', required: true }, name: { type: 'string', required: true }, registered: { type: 'boolean', required: true } } }, render: (_args, value) => [{ type: 'text', text: `任务成果已登记：${value.name}` }] },
    async execute(args, exec) { const name = /\.md(?:arkdown)?$/i.test(args.name) ? args.name : `${args.name}.md`; const entry = await ctx.workdshLibrary.importAsset(await actor(ctx, exec), { name, bytes: new TextEncoder().encode(args.content), operationId: `deliverable-${args.operation_id}`, source: 'task', sourceTaskId: exec.agent ? String(exec.agent.id) : undefined, ...(args.parent_id ? { parentId: args.parent_id } : {}) }, exec.signal); return { asset_id: entry.asset!.id, revision_id: entry.revision!.id, node_id: entry.id, name: entry.name, registered: true }; },
  }));
}
