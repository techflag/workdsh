import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-storage-domain';
import type {} from '@deepseek-ai/dsh-client-connection';
import type {} from '@deepseek-ai/dsh-tools';
import { LibraryManager, type LibraryManagerOptions } from './services/library-manager.js';
import { registerLibraryConnection } from './remote/connection-api.js';
import { registerLibraryTools } from './tools/library-tools.js';
import { registerLibraryContextInjection } from './runtime/context-injection.js';

export * from './services/library-manager.js';
export * from './services/converters.js';
export * from './storage/domain.js';
export * from './runtime/context-injection.js';

export const name = 'workdsh-plugin-library';
export const inject = ['storageDomain', 'connection', 'tools', 'systemPrompt', 'workdshIdentity'];

export async function apply(ctx: Context, options: LibraryManagerOptions = {}): Promise<void> {
  await ctx.plugin(LibraryManager, options);
  await ctx.plugin({ name: 'workdsh-library-integration', inject: [...inject, 'workdshLibrary'], apply(integration: Context) { registerLibraryConnection(integration); registerLibraryTools(integration); registerLibraryContextInjection(integration); } });
}
