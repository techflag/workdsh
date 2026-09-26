import type { Context } from '@deepseek-ai/cordis';
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { setTimeout as delay } from 'node:timers/promises';

declare module '@deepseek-ai/cordis' {
  interface Context { workdshProbe: WorkdshProbe; }
}

/** Diagnostic counters only; no user, session or business data. */
export interface ProbeState {
  readonly active: number;
  readonly completed: number;
  readonly cancelled: number;
}

/** Local D01 fixture using the official Remote service and carrier cancellation. */
export class WorkdshProbe extends TypertRemoteService {
  private active = 0;
  private completed = 0;
  private cancelled = 0;
  private readonly lifetime = new AbortController();

  constructor(ctx: Context) {
    super(ctx, 'workdshProbe', { namespace: 'workdshProbe' });
    ctx.effect(() => () => this.lifetime.abort());
  }

  /** Observe actual Host cleanup independently from the client's cancellation result. */
  @Remote('state')
  state(): ProbeState {
    return { active: this.active, completed: this.completed, cancelled: this.cancelled };
  }

  /** Bound work duration; the last signal is supplied by the official carrier. */
  @Remote('wait')
  async wait(milliseconds: number, signal: AbortSignal): Promise<ProbeState> {
    if (!Number.isInteger(milliseconds) || milliseconds < 0 || milliseconds > 10000) {
      throw new RemoteError('gateway/bad-request', 'milliseconds must be an integer from 0 to 10000', {});
    }
    const combined = AbortSignal.any([signal, this.lifetime.signal]);
    combined.throwIfAborted();
    this.active++;
    try {
      await delay(milliseconds, undefined, { signal: combined });
      this.completed++;
    } finally {
      if (combined.aborted) this.cancelled++;
      this.active--;
    }
    return this.state();
  }
}
