import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection';
import type {} from '@deepseek-ai/dsh-tools';
import type {} from '@deepseek-ai/dsh-agent';
import type {} from '@deepseek-ai/dsh-attachment';
import { registerBrowserView } from './browser-view.js';

/** Product diagnostics only. Feature packages are installed as separate Profile layers. */
export const name = 'workdsh-installation-probe';
export const inject = ['connection', 'tools', 'agents', 'attachments'];

export function apply(ctx: Context): void {
  registerBrowserView(ctx);
  ctx.effect(() => {
    process.stdout.write('[workdsh:probe] activated\n');
    return () => process.stdout.write('[workdsh:probe] disposed\n');
  });
}
