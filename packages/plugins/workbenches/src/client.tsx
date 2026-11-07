import { WorkbenchCatalogPanel } from './client/WorkbenchCatalogPanel.js';
import React,{useSyncExternalStore} from 'react';
import {createAuthoringNavigation} from './client/authoring-navigation.js';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-layout/client';
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client';
import { WorkbenchIdentityAuthoringPanel } from './client/WorkbenchIdentityAuthoringPanel.js';
import { WORKBENCH_AUTHORING_PANEL } from './client/native-authoring.js';
import { ClientWorkbenchRegistration } from './client/client-registration.js';
import { createWorkbenchRegistrationClient } from './client/registration-client.js';
import { createNativeWorkbenchPagePorts, type WorkbenchPageComponent } from './client/native-page.js';
import type { WorkbenchLoader } from './runtime/loader-source.js';
import { WORKBENCH_MANAGER_PANEL } from './client/native-page.js';
import {createWorkbenchShortcuts} from './client/shortcuts.js';

export const name = 'workdsh-workbenches-client';
export const inject = ['slots', 'layout', 'sessions', 'conversation', 'uiWorkspace'];
/** Native management, authoring and business page registration entry.
 * Registration and installation receipts remain owned by Host services. */
export function apply(ctx: Context) {
  const shortcuts=createWorkbenchShortcuts();
  ctx.effect(()=>{void shortcuts.refresh();const refresh=()=>void shortcuts.refresh();window.addEventListener('focus',refresh);return()=>{window.removeEventListener('focus',refresh);shortcuts.close();};},'workdsh.shortcuts.client');
  const authoringNavigation=createAuthoringNavigation();
  // `loader` is provided by the Host (Desktop carrier / Web Host), not by any
  // WorkDSH plugin package. Treat it as optional so a missing loader in a given
  // runtime profile degrades the native authoring surface instead of blocking the
  // whole client entry from activating.
  let loader: WorkbenchLoader | undefined;
  try { loader = ctx.get('loader') as WorkbenchLoader | undefined; } catch { loader = undefined; }
  const hasLoader = loader !== undefined;
  let pagePorts: ReturnType<typeof createNativeWorkbenchPagePorts> | undefined;
  let registration: ClientWorkbenchRegistration<WorkbenchPageComponent> | undefined;
  // Build the native authoring surface only when a Host-provided `loader`
  // exists. Inside this block `loader` is narrowed to a defined value, so it is
  // safe to hand to the registration constructor.
  if (loader) {
    pagePorts = createNativeWorkbenchPagePorts(ctx, shortcuts);
    registration = new ClientWorkbenchRegistration<WorkbenchPageComponent>(loader, createWorkbenchRegistrationClient(), pagePorts);
  }
  const openAuthoring=(view:'create'|'developments',target?:{developmentId?:string;creationId?:string})=>{if(!hasLoader||!pagePorts)return;authoringNavigation.open(view,target);ctx.layout.selectPanel(WORKBENCH_AUTHORING_PANEL as MainPanelId);};
  function AuthoringPage(){
    const entryRequest=useSyncExternalStore(authoringNavigation.subscribe,authoringNavigation.getSnapshot,authoringNavigation.getSnapshot);
    return <WorkbenchIdentityAuthoringPanel native={ctx} entryRequest={entryRequest} onClose={close}
      canOpen={id=>ctx.slots.entriesOfSlot('main').some(row=>row.options.key===`workdsh-workbench:${id}`)}
      onOpen={id=>{const key=`workdsh-workbench:${id}`;if(ctx.slots.entriesOfSlot('main').some(row=>row.options.key===key))ctx.layout.selectPanel(key as MainPanelId);}}/>;
  }
  if (registration) {
    ctx.effect(() => () => registration.close(), 'workdsh.workbench.client-registration.close');
    ctx.provide('workdshWorkbenchClientRegistration', registration);
  }
  const close = () => {
    const manager = ctx.slots.entriesOfSlot('main').some(entry => entry.options.key === WORKBENCH_MANAGER_PANEL);
    ctx.layout.selectPanel(manager ? WORKBENCH_MANAGER_PANEL as MainPanelId : null);
  };
  ctx.slots.inject('main', () => ctx.slots.inject('sidebar.panellist', () => {
    const page = ctx.slots.register({ name: 'main', key: WORKBENCH_MANAGER_PANEL }, () => <WorkbenchCatalogPanel
      shortcuts={shortcuts}
      onCreate={() => openAuthoring('create')} onDevelopments={() => openAuthoring('developments')}
      onContinue={developmentId=>openAuthoring('developments',{developmentId})} onDiscuss={creationId=>openAuthoring('create',{creationId})}
      canOpen={id => ctx.slots.entriesOfSlot('main').some(row => row.options.key === `workdsh-workbench:${id}`)}
      onOpen={id => { const key = `workdsh-workbench:${id}`; if (ctx.slots.entriesOfSlot('main').some(row => row.options.key === key)) ctx.layout.selectPanel(key as MainPanelId); }} />);
    let navigation: () => void;
    try { navigation = ctx.slots.register({ name: 'sidebar.panellist', id: WORKBENCH_MANAGER_PANEL, label: '工作台', order: 44 },
      ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>); }
    catch (cause) { page(); throw cause; }
    return () => { try { if (ctx.layout.panelInfo.getSnapshot().activePanelId === WORKBENCH_MANAGER_PANEL) ctx.layout.selectPanel(null); } finally { try { navigation(); } finally { page(); } } };
  }));
  if (hasLoader && pagePorts) ctx.slots.inject('main', () => {
    const lifetime=new AbortController();
    // This is the platform's own authoring surface, not an unverified business
    // registration. Reuse the one native frame and its original Conversation.
    const page = pagePorts.mountPage({panelKey:WORKBENCH_AUTHORING_PANEL,signal:lifetime.signal,descriptor:{id:'workdsh.authoring',title:'制作应用',description:'',protocolVersion:'1.0',layout:'full-page',hostCompatibility:{sdk:'^1.0.0',harness:'0.2.1-rc.5'},capabilities:[]}},
      AuthoringPage);
    return () => { lifetime.abort();try { if (pagePorts.selectedPanel() === WORKBENCH_AUTHORING_PANEL) close(); } finally { page(); } };
  });
}

/** Public draft adapter: callers must supply a Host-authorized Session receipt. */
export {handoffNativeWorkbenchDraft} from './client/native-development-draft.js';
export { NativeWorkbenchConversation } from './client/native-conversation.js';
export type { NativeWorkbenchConversationProps, NativeWorkbenchConversationDraft, NativeWorkbenchToolSettled } from './client/native-conversation.js';
export { NativeWorkbenchSessionBridge } from './client/native-session-bridge.js';
export type { NativeWorkbenchSessionBridgeProps } from './client/native-session-bridge.js';

/** Public registration contract for business Client entries. */
export type {ClientWorkbenchRegistration} from './client/client-registration.js';
export type {WorkbenchPageProps,WorkbenchPageComponent} from './client/native-page.js';
export type {WorkbenchPageMount} from './client/page-lifecycle.js';
export { WorkbenchButton } from './client/WorkbenchButton.js';
