import type { Context } from '@deepseek-ai/cordis';
import { defineTool, type ToolRunContext } from '@deepseek-ai/dsh-tools';
import type { ActorContext } from 'workdsh-contracts';

async function actor(ctx: Context, exec: ToolRunContext): Promise<ActorContext> {
  const sessionId = exec.agent ? String(exec.agent.id) : undefined;
  return ctx.workdshIdentity.resolve(sessionId ? { sessionId } : undefined, exec.signal);
}

const isKind = (value: string): value is 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other' => ['document', 'image', 'video', 'audio', 'archive', 'other'].includes(value);
const isSource = (value: string): value is 'ai-generated' | 'user-upload' | 'tool-output' => ['ai-generated', 'user-upload', 'tool-output'].includes(value);
/** 可按 UTF-8 解码的文本类型；二进制按文本读会得到乱码，必须先拒绝。 */
const TEXT_LIKE = /^(?:text\/|application\/(?:json|xml|x-yaml|yaml|javascript|typescript))/i;

export function registerDriveTools(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'drive_save',
    description: '把当前任务生成的文档内容保存到个人网盘。保存新文件，不覆盖已有文件；同名自动追加序号。',
    parameters: { name: { type: 'string', required: true, description: '目标文件名（含扩展名，如 报告.md）。' }, content: { type: 'string', required: true, description: '要保存的 UTF-8 文本内容。本工具只接受文本；图片、PDF 等二进制请由用户直接上传网盘，不要以 base64 传入。' }, parent_id: { type: 'string', description: '网盘目标文件夹 id；省略保存到根目录。' } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { file_id: { type: 'string', required: true }, revision_id: { type: 'string', required: true }, node_id: { type: 'string', required: true }, name: { type: 'string', required: true } } }, render: (_args, value) => [{ type: 'text', text: `已保存到网盘：${value.name}` }] },
    async execute(args, exec) {
      const entry = await ctx.workdshDrive.save(await actor(ctx, exec), { name: args.name, bytes: new TextEncoder().encode(args.content), source: 'ai-generated', ...(args.parent_id ? { parentId: args.parent_id } : {}), operationId: `drive-tool-${String(exec.callId)}` }, exec.signal);
      return { file_id: entry.file!.id, revision_id: entry.revision!.id, node_id: entry.id, name: entry.name };
    },
  }));
  ctx.tools.register(defineTool({
    name: 'drive_list',
    description: '列出当前用户网盘中的文件与文件夹。可指定目录、来源与类型筛选。',
    parameters: { parent_id: { type: 'string', description: '网盘目录 id；省略列出根目录。' }, source: { type: 'string', enum: ['ai-generated', 'user-upload', 'tool-output'] }, kind: { type: 'string', enum: ['document', 'image', 'video', 'audio', 'archive', 'other'] } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { entries: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: { node_id: { type: 'string', required: true }, name: { type: 'string', required: true }, kind: { type: 'string', required: true }, file_id: { type: 'string' }, media_type: { type: 'string' }, byte_length: { type: 'integer' }, source: { type: 'string' }, updated_at: { type: 'string', required: true } } } } } }, render: (_args, value) => [{ type: 'text', text: value.entries.length ? value.entries.map(entry => `${entry.kind === 'folder' ? '[目录]' : `[${entry.kind}]`} ${entry.name}${entry.file_id ? ` (${entry.file_id})` : ''}`).join('\n') : '网盘为空。' }] },
    async execute(args, exec) {
      const current = await actor(ctx, exec);
      const entries = (await ctx.workdshDrive.list(current, args.parent_id, exec.signal))
        .filter(entry => entry.kind === 'folder' || (args.source ? entry.file?.source === args.source : true))
        .filter(entry => entry.kind === 'folder' || (args.kind ? entry.file?.kind === args.kind : true))
        .map(entry => ({ node_id: entry.id, name: entry.name, kind: entry.kind, ...(entry.file ? { file_id: entry.file.id, media_type: entry.file.mediaType, byte_length: entry.file.byteLength, source: entry.file.source } : {}), updated_at: entry.updatedAt }));
      return { entries };
    },
  }));
  ctx.tools.register(defineTool({
    name: 'drive_read',
    description: '读取网盘中文本文档的内容。仅支持文本类文件（document）；图片、PDF、音视频等二进制会被拒绝，请改用网盘预览或下载。',
    parameters: { file_id: { type: 'string', required: true }, offset: { type: 'integer', description: '从 0 开始的字符偏移量。' }, limit: { type: 'integer', description: '本次最多返回的字符数，范围 1–20000。' } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { file_id: { type: 'string', required: true }, content: { type: 'string', required: true }, offset: { type: 'integer', required: true }, next_offset: { type: 'integer' }, truncated: { type: 'boolean', required: true } } }, render: (_args, value) => [{ type: 'text', text: value.content }] },
    async execute(args, exec) {
      const offset = args.offset ?? 0; const limit = args.limit ?? 12_000;
      if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 20_000) throw new Error('drive/invalid-page');
      const current = await actor(ctx, exec);
      const entry = await ctx.workdshDrive.stat(current, args.file_id, exec.signal);
      const file = entry.file;
      if (entry.kind !== 'file' || !file || file.kind !== 'document' || !TEXT_LIKE.test(file.mediaType)) throw new Error('drive/unsupported-read');
      const bytes = await ctx.workdshDrive.readBytes(current, args.file_id, undefined, exec.signal);
      const complete = new TextDecoder('utf-8').decode(bytes);
      const content = complete.slice(offset, offset + limit); const next = offset + content.length; const truncated = next < complete.length;
      return { file_id: args.file_id, content, offset, ...(truncated ? { next_offset: next } : {}), truncated };
    },
  }));
  ctx.tools.register(defineTool({
    name: 'drive_search',
    description: '按文件名或文档正文关键词搜索当前用户网盘文件（文本类文件按内容匹配，返回内容片段）。支持来源、类型与会话筛选。',
    parameters: { query: { type: 'string', required: true }, source: { type: 'string', enum: ['ai-generated', 'user-upload', 'tool-output'] }, kind: { type: 'string', enum: ['document', 'image', 'video', 'audio', 'archive', 'other'] }, session_id: { type: 'string' } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { hits: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: { file_id: { type: 'string', required: true }, node_id: { type: 'string', required: true }, name: { type: 'string', required: true }, kind: { type: 'string', required: true }, source: { type: 'string', required: true }, session_id: { type: 'string' }, updated_at: { type: 'string', required: true }, folder_path: { type: 'string', required: true }, excerpt: { type: 'string', required: true } } } } } }, render: (_args, value) => [{ type: 'text', text: value.hits.length ? value.hits.map(hit => `${hit.name}: ${hit.excerpt}`).join('\n') : '没有找到匹配文件。' }] },
    async execute(args, exec) {
      const current = await actor(ctx, exec);
      const hits = await ctx.workdshDrive.search(current, args.query, { ...(args.source && isSource(args.source) ? { sources: [args.source] } : {}), ...(args.kind && isKind(args.kind) ? { kinds: [args.kind] } : {}), ...(args.session_id ? { sessionId: args.session_id } : {}) }, exec.signal);
      return { hits: hits.map(hit => ({ file_id: hit.fileId, node_id: hit.nodeId, name: hit.name, kind: hit.kind, source: hit.source, ...(hit.sessionId ? { session_id: hit.sessionId } : {}), updated_at: hit.updatedAt, folder_path: hit.folderPath, excerpt: hit.excerpt })) };
    },
  }));
  ctx.tools.register(defineTool({
    name: 'drive_rename',
    description: '重命名网盘中的文件或文件夹。同一目录不允许重名。',
    parameters: { node_id: { type: 'string', required: true }, name: { type: 'string', required: true } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { node_id: { type: 'string', required: true }, name: { type: 'string', required: true } } }, render: (_args, value) => [{ type: 'text', text: `已重命名为：${value.name}` }] },
    async execute(args, exec) { const node = await ctx.workdshDrive.rename(await actor(ctx, exec), args.node_id, args.name, exec.signal); return { node_id: node.id, name: node.name }; },
  }));
  ctx.tools.register(defineTool({
    name: 'drive_move',
    description: '移动网盘中的文件或文件夹到指定目录；省略 parent_id 移动回根目录。',
    parameters: { node_id: { type: 'string', required: true }, parent_id: { type: 'string' } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { node_id: { type: 'string', required: true }, parent_id: { type: 'string' } } }, render: (_args, value) => [{ type: 'text', text: '已移动。' }] },
    async execute(args, exec) { const node = await ctx.workdshDrive.move(await actor(ctx, exec), args.node_id, args.parent_id, exec.signal); return { node_id: node.id, ...(node.parentId ? { parent_id: node.parentId } : { parent_id: '' }) }; },
  }));
  ctx.tools.register(defineTool({
    name: 'drive_delete',
    description: '归档删除网盘中的文件或文件夹（移入归档，不物理删除，历史引用保留）。',
    parameters: { node_id: { type: 'string', required: true } },
    output: { schema: { type: 'object', additionalProperties: false, properties: { archived: { type: 'boolean', required: true } } }, render: (_args, value) => [{ type: 'text', text: '已归档删除。' }] },
    async execute(args, exec) { await ctx.workdshDrive.archive(await actor(ctx, exec), args.node_id, exec.signal); return { archived: true }; },
  }));
}
