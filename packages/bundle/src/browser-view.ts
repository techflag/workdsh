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

interface BrowserViewAction {
  kind: 'click' | 'scroll' | 'key' | 'type' | 'navigate' | 'back' | 'reload';
  x?: number;
  y?: number;
  deltaY?: number;
  key?: string;
  text?: string;
  url?: string;
}

function browserActionCall(value: unknown): { name: string; arguments: Record<string, unknown> } | undefined {
  if (value === null || typeof value !== 'object' || !('kind' in value)) return undefined;
  const action = value as BrowserViewAction;
  if (action.kind === 'click' && Number.isFinite(action.x) && Number.isFinite(action.y)
    && action.x! >= 0 && action.y! >= 0 && action.x! <= 10000 && action.y! <= 10000) {
    return { name: `${browserPrefix}run_code_unsafe`, arguments: { code: `async (page) => { await page.mouse.click(${Math.round(action.x!)}, ${Math.round(action.y!)}); }` } };
  }
  if (action.kind === 'scroll' && Number.isFinite(action.deltaY) && Math.abs(action.deltaY!) <= 3000) {
    return { name: `${browserPrefix}run_code_unsafe`, arguments: { code: `async (page) => { await page.mouse.wheel(0, ${Math.round(action.deltaY!)}); }` } };
  }
  if (action.kind === 'key' && typeof action.key === 'string' && /^[A-Za-z0-9]{1,24}$/.test(action.key)) {
    return { name: `${browserPrefix}press_key`, arguments: { key: action.key } };
  }
  if (action.kind === 'type' && typeof action.text === 'string' && action.text.length > 0 && action.text.length <= 2000) {
    return { name: `${browserPrefix}run_code_unsafe`, arguments: { code: `async (page) => { await page.keyboard.type(${JSON.stringify(action.text)}); }` } };
  }
  if (action.kind === 'navigate' && typeof action.url === 'string' && action.url.length <= 2048) {
    try {
      const url = new URL(action.url);
      if (url.protocol === 'http:' || url.protocol === 'https:') return { name: `${browserPrefix}navigate`, arguments: { url: url.href } };
    } catch { return undefined; }
  }
  if (action.kind === 'back') return { name: `${browserPrefix}navigate_back`, arguments: {} };
  if (action.kind === 'reload') return { name: `${browserPrefix}run_code_unsafe`, arguments: { code: 'async (page) => { await page.reload(); }' } };
  return undefined;
}

/** The image always comes from the same Session-owned MCP browser as the action. */
export function registerBrowserView(ctx: Context): void {
  const frames = new Map<string, BrowserViewFrame>();
  const agents = new Map<string, NonNullable<Parameters<typeof ctx.tools.execute>[0]['agent']>>();
  const queues = new Map<string, Promise<void>>();
  let disposed = false;
  ctx.effect(() => () => { disposed = true; frames.clear(); agents.clear(); queues.clear(); }, 'workdsh.browser-view');

  ctx.on('agent/created', ({ agent }) => {
    const sessionId = String(agent.session.id);
    agents.set(sessionId, agent);
    agent.ctx.effect(() => () => { frames.delete(sessionId); agents.delete(sessionId); queues.delete(sessionId); }, 'workdsh.browser-view.session');
    return undefined;
  });

  ctx.on('tools/post-execute', async (exec, result, next) => {
    const decision = await next();
    if (disposed || result.isError || exec.agent === undefined || !exec.name.startsWith(browserPrefix) || exec.name === screenshotName) return decision;
    const sessionId = String(exec.agent.session.id);
    const args = exec.arguments && typeof exec.arguments === 'object' ? exec.arguments as Record<string, unknown> : {};
    const prior = frames.get(sessionId);
    const pageLine = result.content.filter(block => block.type === 'text').map(block => block.text).join('\n').match(/^- Page URL: (https?:\/\/\S+)/m)?.[1];
    const url = pageLine ?? (typeof args.url === 'string' ? args.url : prior?.url);
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
      const body = await request.json().catch(() => undefined) as { sessionId?: unknown; afterRevision?: unknown; action?: BrowserViewAction } | undefined;
      const sessionId = body?.sessionId;
      if (typeof sessionId !== 'string' || sessionId.length > 128) return Response.json({ error: 'Invalid session' }, { status: 400 });
      if (body?.action !== undefined) {
        const action = browserActionCall(body.action);
        const agent = agents.get(sessionId);
        if (!action || !agent || !frames.has(sessionId)) return Response.json({ error: 'Browser action unavailable' }, { status: 400 });
        const result = await ctx.tools.execute({
          callId: ToolCallId(`workdsh-browser-input-${randomUUID()}`), name: action.name,
          arguments: action.arguments, agent, signal: AbortSignal.timeout(20_000),
        });
        if (result.isError) return Response.json({ error: 'Browser action failed' }, { status: 502 });
      }
      const frame = frames.get(sessionId) ?? null;
      const unchanged = frame !== null && body?.afterRevision === frame.revision;
      return Response.json({ frame: unchanged ? null : frame, unchanged }, { headers: { 'cache-control': 'no-store' } });
    },
  });
  ctx.effect(() => unregister, 'workdsh.browser-view.fetch');
}
