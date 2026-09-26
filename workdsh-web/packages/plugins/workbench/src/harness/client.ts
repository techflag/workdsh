import { TaskExecutionNotice } from '../client/components/TaskExecutionNotice.js';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';
import { BusinessPanelIcon, businessPanels } from '../client/components/BusinessPanel.js';

/**
 * Keep the official Sidebar and Conversation occupants in place. WorkDSH only
 * contributes business navigation through public Slots, and every entry pairs
 * with a main panel registered by the owning feature plugin. Panels marked
 * pending (助理、定时任务、更多) have no domain implementation yet: they register
 * neither a sidebar entry nor a placeholder page until they actually ship.
 */
export const name = 'workdsh-workbench-client';
export const inject = ['slots'];

export function apply(ctx: Context): void {
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({ name: 'conversation.input.dock', id: 'workdsh-task-execution-notice' }, TaskExecutionNotice));
  for (const panel of businessPanels) {
    if (panel.pending) continue;
    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
      name: 'sidebar.panellist',
      id: panel.id,
      label: panel.label,
      order: panel.order,
      inject: () => ({ icon: panel.icon }),
    }, BusinessPanelIcon));
  }
}
