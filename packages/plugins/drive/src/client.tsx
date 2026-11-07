import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection/client';
import type {} from '@deepseek-ai/dsh-client-ui-layout/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client';
import type {} from '@deepseek-ai/dsh-client-ui-slots';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { Icon } from 'workdsh-ui';
import type { DriveEditorRegistry } from 'workdsh-contracts/drive';
import { createDriveClient, type DriveClient } from './client/management.js';
import { createDriveEditorRegistry } from './client/editor-registry.js';
import { DrivePanel } from './client/DrivePanel.js';
import { DrivePreview, type DrivePreviewInput } from './client/DrivePreview.js';
import { driveCss } from './client/styles.js';

declare module '@deepseek-ai/cordis' { interface Context { workdshDriveEditors: DriveEditorRegistry; } }

declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
  interface SidebarRightTabParamsMap {
    'workdsh-drive-preview': { fileId: string; revisionId?: string; name: string; kind: string; mediaType?: string; byteLength?: number; source?: string; sessionId?: string; folderPath?: string };
  }
}

export const name = 'workdsh-drive-client';
export const inject = ['slots', 'layout', 'connection', 'sidebarRightTabs', 'sidebarRight'];

export function apply(ctx: Context): void {
  const lifetime = new AbortController();
  ctx.effect(() => () => lifetime.abort(), 'workdsh.drive.client');
  const management = createDriveClient(ctx, lifetime.signal);
  // 在线编辑能力由编辑类插件注入（Office 等），网盘只持有按扩展名路由的公开注册表。
  const editors = createDriveEditorRegistry();
  ctx.provide('workdshDriveEditors', editors);
  ctx.effect(() => ctx.sidebarRightTabs.register({ id: 'workdsh-drive-preview', kind: 'workdsh-drive-preview', title: () => '网盘预览' }));
  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({ name: 'sidebar.right.pane.tab', key: 'workdsh-drive-preview', inject: () => ({ management, editors }) }, DriveReferencePage));
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'workdsh-drive', inject: () => ({ management, editors, toggleNavigation: () => ctx.layout.toggleSidebar() }) }, DrivePanel));
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'workdsh-drive', label: '网盘', order: 55 }, DriveNavigationIcon));
}

/** 侧栏 tab 预览页：由会话引用或外部打开时复用同一预览组件（自带样式）。 */
function DriveReferencePage({ management, editors, useTabInfo }: PropsRuntime<'sidebar.right.pane.tab'> & { management: DriveClient; editors: DriveEditorRegistry }) {
  const info = useTabInfo();
  const params = info.tab.navigation.params as Record<string, unknown> | undefined;
  if (!params || typeof params.fileId !== 'string') return <><style>{driveCss}</style><section className="wd-drive-preview"><div className="wd-drive-state">网盘预览参数不完整。</div></section></>;
  const input: DrivePreviewInput = {
    fileId: params.fileId,
    ...(typeof params.revisionId === 'string' ? { revisionId: params.revisionId } : {}),
    name: typeof params.name === 'string' ? params.name : '文件',
    kind: typeof params.kind === 'string' ? params.kind : 'other',
    ...(typeof params.mediaType === 'string' ? { mediaType: params.mediaType } : {}),
    ...(typeof params.byteLength === 'number' ? { byteLength: params.byteLength } : {}),
    ...(typeof params.source === 'string' ? { source: params.source } : {}),
    ...(typeof params.sessionId === 'string' ? { sessionId: params.sessionId } : {}),
    ...(typeof params.folderPath === 'string' ? { folderPath: params.folderPath } : {}),
  };
  return <><style>{driveCss}</style><DrivePreview management={management} editors={editors} input={input} /></>;
}

/**
 * 网盘自持的侧栏入口：与 `main` 同 key 配对，插件缺席时不会留下「有入口、无页面」的行。
 * order 55 使网盘排在资料库（50）之后、官方「更多」之前。
 */
export function DriveNavigationIcon() {
  return <Icon name="drive" />;
}
