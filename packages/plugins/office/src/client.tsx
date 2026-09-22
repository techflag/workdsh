import { createElement, useEffect, useState, type ComponentType, type ReactElement } from "react";
import type {} from "@deepseek-ai/dsh-client-ui-input-trigger/client";
import { officeInputSources } from "./input.js";
import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-client-ui-renderer/client";
import type {} from "@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client";
import type {} from "@deepseek-ai/dsh-client-ui-sidebar-right/client";
import type { ISessions } from "@deepseek-ai/dsh-api-session-controller/client";
import type {} from "@deepseek-ai/dsh-client-ui-session/client";
import type { OfficeContentSnapshot } from "workdsh-contracts/office";
import type { LibraryOriginalPreviewRegistry } from "workdsh-contracts/library";
import { loadOfficeRuntime, type OfficeRuntime } from "./runtime-loader.js";
import type { OfficeClient, Rpc } from "./live/model.js";
declare module "@deepseek-ai/dsh-client-ui-sidebar-right/client" {
  interface SidebarRightTabParamsMap {
    "workdsh-office-live": { documentId?: string; requestId?: string };
  }
}
declare module "@deepseek-ai/cordis" { interface Context { workdshLibraryPreview: LibraryOriginalPreviewRegistry; } }
/** Slot registrations take `(props: never) => ReactNode`; the shell forwards whatever the owner passes. */
type OfficeSlotComponent = (props: any) => ReactElement | null;
/**
 * Office registration shell.
 *
 * This bundle is preloaded on every first paint, so it owns only the
 * registration surface: slot keys, preview metadata, input sources, the RPC
 * transport and the width of the Office client contract. Every editor
 * implementation is deferred to the lazy runtime artifact (see runtime.tsx),
 * which the Host serves and this shell injects when a document is opened.
 */
export const name = "workdsh-office-client";
declare const __WORKDSH_WORD_ONLY__: boolean;
// Word-only releases claim DOCX only (dist/release-scope.json); every Client
// registration below must stay inside that scope.
const wordOnlyRelease = typeof __WORKDSH_WORD_ONLY__ !== "undefined" && __WORKDSH_WORD_ONLY__;
export const inject = [
  "slots",
  "documentPreviews",
  "sidebarRightTabs",
  "sidebarRight",
  "sessions",
  "uiConversation",
  "inputTriggers",
  // The lazy artifact is materialized through the kernel's client module table.
  "modules",
];
export function apply(ctx: Context): void {
  /** Set once the lazy artifact is materialized; every heavy entry point runs after that. */
  let materialized: OfficeRuntime | undefined;
  const runtime = async (): Promise<OfficeRuntime> =>
    (materialized ??= await loadOfficeRuntime(ctx));
  const loaded = (): OfficeRuntime => {
    if (!materialized) throw new Error("Office 编辑器尚未加载完成，请稍候重试。");
    return materialized;
  };
  /**
   * Slot owners need a component at registration time. The wrapper keeps that
   * contract and renders the real editor as soon as the artifact arrives.
   */
  const deferred = (pick: (value: OfficeRuntime) => ComponentType<any>): OfficeSlotComponent => {
    function DeferredOfficeComponent(props: Record<string, unknown>): ReactElement | null {
      const [state, setState] = useState<{ editor?: ComponentType<any>; failure?: string }>({});
      useEffect(() => {
        let active = true;
        runtime()
          .then(value => { if (active) setState({ editor: pick(value) }); })
          .catch((error: unknown) => {
            if (active) setState({ failure: error instanceof Error ? error.message : String(error) });
          });
        return () => { active = false; };
      }, []);
      if (state.failure)
        return createElement("div", { role: "alert", style: { padding: "16px" } }, state.failure);
      if (!state.editor)
        return createElement("div", { role: "status", style: { padding: "16px", opacity: 0.7 } }, "正在加载 Office 编辑器…");
      return createElement(state.editor, props);
    }
    return DeferredOfficeComponent as OfficeSlotComponent;
  };
  ctx.inject(["workdshLibraryPreview"], scope => scope.effect(() => scope.workdshLibraryPreview.register(["docx", "pptx"], async (target, input) => (await runtime()).mountOriginalPreview(target, input))));
  ctx.effect(() =>
    ctx.documentPreviews.register({
      id: "workdsh-office",
      extensions: wordOnlyRelease ? ["docx"] : ["xlsx", "docx", "pptx"],
      title: () => "Office 浏览器编辑",
      loading: "bytes-complete",
    }),
  );
  ctx.slots.inject("sidebar.right.tab.document", () =>
    ctx.slots.register(
      { name: "sidebar.right.tab.document", key: "workdsh-office", inject: () => ({office}) },
      deferred(value => value.OfficeDocument),
    ),
  );
  if (!wordOnlyRelease) {
    ctx.effect(() =>
      ctx.documentPreviews.register({
        id: "workdsh-office-csv",
        extensions: ["csv"],
        title: () => "CSV 表格",
        loading: "bytes-complete",
        wrap: true,
      }),
    );
    ctx.slots.inject("sidebar.right.tab.document", () =>
      ctx.slots.register(
        { name: "sidebar.right.tab.document", key: "workdsh-office-csv" },
        deferred(value => value.CsvDocument),
      ),
    );
  }
  const lifetime = new AbortController();
  const rpc: Rpc = async <T,>(
    sessionId: string,
    request: unknown,
    signal?: AbortSignal,
  ): Promise<T> => {
    const response = await fetch("/api/workdsh-office", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, request }),
      signal: AbortSignal.any([lifetime.signal, ...(signal ? [signal] : [])]),
    });
    const result = await response.json();
    if (!response.ok || !result.ok)
      throw new Error(
        `${result.error?.code ?? "UNAVAILABLE"}: ${result.error?.message ?? "Office 暂时不可用。"}`,
      );
    return result.value as T;
  };
  const activeDocuments = new Map<string, ReturnType<OfficeRuntime["createDocumentModel"]>>();
  // alpha.2: the list snapshot has no `current`; the view owner's mainView retention
  // marks the selected Session (same derivation as the official ui-session publishMain).
  const currentSessionId = () => {
    const state = (ctx.sessions as unknown as ISessions).list.getSnapshot();
    return Object.values(state.byId).find(row => (row.retainedBy.mainView ?? 0) > 0)?.id;
  };
  const office: OfficeClient = {
    request:rpc,
    createPresentation:options=>(loaded().createPresentationModel(options,rpc)),
    importDocument: (sessionId, input, signal) => rpc(sessionId, {endpoint: "open", input}, signal),
    list: (sessionId, signal) => rpc(sessionId, { endpoint: "list" }, signal),
    download: async (sessionId, documentId) => {
      const current = activeDocuments.get(sessionId + ":" + documentId);
      if (current) await current.download();
      else {
        const snapshot = await rpc<OfficeContentSnapshot>(sessionId, {endpoint: "read", documentId});
        await (await runtime()).downloadOriginal(office, sessionId, snapshot);
      }
    },
    open: (sessionId, documentId) => ctx.sidebarRight.openTabIn(sessionId as never, "workdsh-office-live", {params: {documentId}}),
    createDocument: (options) => {
      const model = loaded().createDocumentModel(options, rpc), key = options.sessionId + ":" + options.documentId;
      return {...model, attach: element => {
        activeDocuments.set(key, model);
        const dispose = model.attach(element);
        return () => {dispose(); if (activeDocuments.get(key) === model) activeDocuments.delete(key);};
      }};
    },
  };
  for (const source of officeInputSources(office, () => {
    const id = currentSessionId();
    return id ? String(id) : undefined;
  },!wordOnlyRelease,!wordOnlyRelease)) ctx.effect(() => ctx.inputTriggers.registerSource(source));
  ctx.effect(() =>
    ctx.sidebarRightTabs.register({
      id: "workdsh-office-live",
      kind: "workdsh-office-live",
      title: () => "文档 · 实时编辑",
      guide: [
        {
          id: "workdsh-office-live",
          order: 45,
          title: () => "文档",
          description: () => "查看并编辑 AI 正在编写的工作副本",
        },
      ],
    }),
  );
  ctx.slots.inject("sidebar.right.pane.tab", () =>
    ctx.slots.register(
      {
        name: "sidebar.right.pane.tab",
        key: "workdsh-office-live",
        inject: () => ({ office }),
      },
      deferred(value => value.DocumentPage),
    ),
  );
  ctx.effect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const seen = new Set<string>();
    async function poll() {
      const sessionId = currentSessionId();
      try {
        if (sessionId && document.visibilityState !== "hidden") {
          const requests = await rpc<
            { documentId: string; requestId: string }[]
          >(String(sessionId), { endpoint: "pending" });
          if (
            lifetime.signal.aborted ||
            currentSessionId() !== sessionId
          )
            return;
          for (const request of requests)
            if (!seen.has(request.requestId)) {
              await ctx.sidebarRight.openTabIn(sessionId, "workdsh-office-live", {
                params: {
                  documentId: request.documentId,
                  requestId: request.requestId,
                },
              });
              seen.add(request.requestId);
            }
        }
      } catch {
        /* Unbound Sessions/temporarily unavailable Host do not affect the conversation. */
      } finally {
        if (!lifetime.signal.aborted)
          timer = setTimeout(
            poll,
            document.visibilityState === "hidden" ? 5000 : 500,
          );
      }
    }
    void poll();
    return () => {
      lifetime.abort();
      clearTimeout(timer);
    };
  });
}
