import type { Context } from '@deepseek-ai/cordis';
import type { ActivityPresentation } from 'workdsh-contracts/activity';
import { createPresentationRegistry } from './registry.js';

// Compatibility for identity contributors only. Native Harness owns process and Team UI.
declare module '@deepseek-ai/cordis' { interface Context { activityPresentation: ActivityPresentation; } }
export const name = 'workdsh-activity-client';
export function apply(ctx: Context): void {
  ctx.provide('activityPresentation', createPresentationRegistry());
}
