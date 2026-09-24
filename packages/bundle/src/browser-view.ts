import { randomUUID } from 'node:crypto';
import type { Context } from '@deepseek-ai/cordis';
import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
import { ToolCallId } from '@deepseek-ai/dsh-llm';
import type {} from '@deepseek-ai/dsh-tools';
import type {} from '@deepseek-ai/dsh-agent';
import type {} from '@deepseek-ai/dsh-attachment';

export const browserViewPath = '/api/workdsh-agent-browser';
const browserPrefix = 'mcp__playwright-mcp__browser_';
const screenshotName = `${browserPrefix}take_screenshot`;

export interface BrowserViewFrame {
  sessionId: string;
  revision: number;
  url?: string;
  image?: string;
  error?: string;
}

/** The image always comes from the same Session-owned MCP browser as the action. */
export function registerBrowserView(ctx: Context): void {
  const frames = new Map<string, BrowserViewFrame>();
  const queues = new Map<string, Promise<void>>();
  let disposed = false;
  ctx.effect(() => () => { disposed = true; frames.clear(); queues.clear(); }, 'workdsh.browser-view');

  ctx.on('agent/created', ({ agent }) => {
    const sessionId = String(agent.session.id);
    agent.ctx.effect(() => () => { frames.delete(sessionId); queues.delete(sessionId); }, 'workdsh.browser-view.session');
    return undefined;
  });

  ctx.on('tools/post-execute', async (exec, result, next) => {
    const decision = await next();
    if (disposed || result.isError || exec.agent === undefined || !exec.name.startsWith(browserPrefix) || exec.name === screenshotName) return decision;
    const sessionId = String(exec.agent.session.id);
    const args = exec.arguments && typeof exec.arguments === 'object' ? exec.arguments as Record<string, unknown> : {};
    const prior = frames.get(sessionId);
    const url = typeof args.url === 'string' ? args.url : prior?.url;
    const revision = (prior?.revision ?? 0) + 1;
    frames.set(sessionId, { sessionId, revision, ...(url ? { url } : {}), image: prior?.image });
    const preceding = queues.get(sessionId) ?? Promise.resolve();
    const queued = preceding.catch(() => undefined).then(async () => {
      if (disposed) return;
      const screenshot = await ctx.tools.execute({
        callId: ToolCallId(`workdsh-browser-view-${randomUUID()}`),
        rootCallId: exec.rootCallId,
        parent: exec.token,
        name: screenshotName,
        arguments: {},
        agent: exec.agent,
        signal: AbortSignal.timeout(15_000),
      });
      if (disposed) return;
      const current = frames.get(sessionId);
      if (!current || current.revision !== revision) return;
      // MCP keeps its canonical raw image even when the active model route is
      // text-only. The sidebar is a UI consumer, so it must not depend on the
      // model-facing image projection admitting an attachment.
      const raw = screenshot.value && typeof screenshot.value === 'object' && 'content' in screenshot.value
        ? (screenshot.value as { content?: unknown }).content : undefined;
      const rawImage = Array.isArray(raw) ? raw.find((block): block is { type: 'image'; mimeType: string; data: string } =>
        block !== null && typeof block === 'object' && block.type === 'image'
        && typeof block.mimeType === 'string' && typeof block.data === 'string') : undefined;
      if (rawImage && ['image/png', 'image/jpeg', 'image/webp'].includes(rawImage.mimeType)
        && rawImage.data.length < 11_000_000 && /^[A-Za-z0-9+/]*={0,2}$/.test(rawImage.data)) {
        frames.set(sessionId, { ...current, image: `data:${rawImage.mimeType};base64,${rawImage.data}`, error: undefined });
        return;
      }
      const image = screenshot.content.find(block => block.type === 'image');
      if (image?.type === 'image' && image.attachment.bytes < 8_000_000) {
        const stored = await ctx.attachments.readImage(image.attachment);
        frames.set(sessionId, { ...current, image: `data:${image.attachment.mediaType};base64,${Buffer.from(stored.data).toString('base64')}`, error: undefined });
      } else if (screenshot.isError) {
        frames.set(sessionId, { ...current, error: '浏览器画面暂时不可用。' });
      }
    }).catch(() => {
      const current = frames.get(sessionId);
      if (current?.revision === revision) frames.set(sessionId, { ...current, error: '浏览器画面暂时不可用。' });
    });
    queues.set(sessionId, queued);
    return decision;
  });

  const connection = (ctx as Context & { connection: HostConnectionHandle }).connection;
  const unregister = connection.fetch.register({
    path: browserViewPath,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async request => {
      const body = await request.json().catch(() => undefined) as { sessionId?: unknown; afterRevision?: unknown } | undefined;
      const sessionId = body?.sessionId;
      if (typeof sessionId !== 'string' || sessionId.length > 128) return Response.json({ error: 'Invalid session' }, { status: 400 });
      const frame = frames.get(sessionId) ?? null;
      const unchanged = frame !== null && body?.afterRevision === frame.revision;
      return Response.json({ frame: unchanged ? null : frame, unchanged }, { headers: { 'cache-control': 'no-store' } });
    },
  });
  ctx.effect(() => unregister, 'workdsh.browser-view.fetch');
}
