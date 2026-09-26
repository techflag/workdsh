import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection/client';
import type {} from '@deepseek-ai/dsh-client-ui-layout/client';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-slots';
import { ConnectorsPanel } from './client/ConnectorsPanel.js';
import { ConnectorPicker } from './client/ConnectorPicker.js';
import { createConnectorManagementClient } from './client/management.js';

export const name = 'workdsh-connectors-client';
export const inject = ['slots', 'layout', 'connection'];

export function apply(ctx: Context): void {
  const lifetime = new AbortController();
  ctx.effect(() => () => lifetime.abort(), 'workdsh.connectors.client');
  const management = createConnectorManagementClient(ctx, lifetime.signal);
  const openCapability = (key: string) => ctx.layout.selectPanel(key as Parameters<typeof ctx.layout.selectPanel>[0]);
  const hasCapability = (key: string) => ctx.slots.entriesOfSlot('main').some(entry => entry.options.key === key);
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: 'workdsh-connectors',
    inject: () => ({ toggleNavigation: () => ctx.layout.toggleSidebar(), management, openCapability, hasCapability }),
  }, ConnectorsPanel));
  ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
    name: 'conversation.input.left', id: 'workdsh-connectors-picker', order: 30,
    inject: () => ({ management, openManagement: () => openCapability('workdsh-connectors') }),
  }, ConnectorPicker));
}
