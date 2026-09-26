/** Authenticated local-user Fetch route for the Session-owned browser view. */

import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection';
import type { IdentityService } from 'workdsh-contracts';
import type { BrowserSessionView } from './index.js';

export const browserSessionPath = '/api/workdsh-browser-session';

type BrowserHost = Context & {
  connection: HostConnectionHandle;
  workdshIdentity: IdentityService;
  workdshBrowserSession: BrowserSessionView;
};

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}

function response(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** The official Connection has already admitted the local operator before invoking this route. */
export function registerBrowserSessionConnection(ctx: Context): void {
  const host = ctx as BrowserHost;
  const unregister = host.connection.fetch.register({
    path: browserSessionPath,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async request => {
      const profile = host.workdshIdentity.profile();
      if (profile.organization.kind !== 'personal'
        || profile.membership.principalId !== profile.principalId
        || profile.membership.organizationId !== profile.organization.id
        || profile.membership.state !== 'active') {
        return response({ error: 'browser access is unavailable for this identity' }, 403);
      }
      let payload: Record<string, unknown> | undefined;
      try { payload = record(await request.json()); }
      catch { return response({ error: 'invalid browser request' }, 400); }
      const sessionId = payload?.sessionId;
      const operation = payload?.operation;
      if (!payload || typeof sessionId !== 'string' || !sessionId || typeof operation !== 'string') {
        return response({ error: 'invalid browser request' }, 400);
      }
      const agent = ctx.agents.get(sessionId as Agent['id']);
      if (!agent || agent.id !== sessionId || !host.workdshBrowserSession.available(agent)) {
        return response({ error: 'browser Session is unavailable' }, 404);
      }
      if (operation === 'status') return response({ active: host.workdshBrowserSession.active(agent) });
      try {
        const view = host.workdshBrowserSession;
        const frame = operation === 'capture'
          ? await view.capture(agent, request.signal)
          : operation === 'click' && typeof payload.x === 'number' && typeof payload.y === 'number'
            ? await view.click(agent, payload.x, payload.y, request.signal)
          : operation === 'type' && typeof payload.text === 'string'
            ? await view.type(agent, payload.text, request.signal)
          : operation === 'press' && typeof payload.key === 'string'
            ? await view.press(agent, payload.key, request.signal)
          : operation === 'scroll' && typeof payload.deltaX === 'number' && typeof payload.deltaY === 'number'
            ? await view.scroll(agent, payload.deltaX, payload.deltaY, request.signal)
          : operation === 'navigate' && typeof payload.url === 'string'
            ? await view.navigate(agent, payload.url, request.signal)
          : undefined;
        if (frame === undefined) return response({ error: 'invalid browser request' }, 400);
        return response(frame);
      } catch (error) {
        if (request.signal.aborted) return response({ error: 'browser request canceled' }, 499);
        if (error instanceof Error && /invalid|unavailable|not a live browser owner/u.test(error.message)) {
          return response({ error: error.message }, 400);
        }
        return response({ error: 'browser operation failed' }, 500);
      }
    },
  });
  ctx.effect(() => unregister, 'workdsh.browserSession.fetch');
}
