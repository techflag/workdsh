import {downloadPdf} from "./pdf/download.js";
import {downloadHtml} from "./html/preview.js";
import {createPresentationModel} from "./presentation/client-model.js";
import type {} from "@deepseek-ai/dsh-client-ui-input-trigger/client";
import { officeInputSources } from "./input.js";
import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-client-ui-renderer/client";
import type {} from "@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client";
import { OfficeDocument } from "./OfficeDocument.js";
import type {} from "@deepseek-ai/dsh-client-ui-sidebar-right/client";
import type { ISessions } from "@deepseek-ai/dsh-api-session-controller/client";
import type {} from "@deepseek-ai/dsh-client-ui-session/client";
import { downloadSpreadsheet } from "./spreadsheet/xlsx.js";
import { downloadDocument } from "./live/docx.js";
import type { OfficeContentSnapshot } from "workdsh-contracts/office";
import type { LibraryOriginalPreviewRegistry } from "workdsh-contracts/library";
import { renderAsync } from "docx-preview";
import { mountPptx } from "./presentation/native-react/editor.js";
import nativeCss from "./presentation/native-react/native.css";
import ribbonCss from "./presentation/native-react/ribbon.css";
import { DocumentPage } from "./live/DocumentPage.js";
import {
  createDocumentModel,
  type Rpc,
  type OfficeClient,
} from "./live/model.js";
declare module "@deepseek-ai/dsh-client-ui-sidebar-right/client" {
  interface SidebarRightTabParamsMap {
    "workdsh-office-live": { documentId?: string; requestId?: string };
  }
}
declare module "@deepseek-ai/cordis" { interface Context { workdshLibraryPreview: LibraryOriginalPreviewRegistry; } }
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
];
export function apply(ctx: Context): void {
  ctx.inject(["workdshLibraryPreview"], scope => scope.effect(() => scope.workdshLibraryPreview.register(["docx", "pptx"], async (target, input) => {
    target.replaceChildren();
    if (input.kind === "docx") {
      const style = document.createElement("style"); style.textContent = ".docx-wrapper{background:#e9ecf1!important;padding:24px!important;min-height:100%;box-sizing:border-box}.docx-wrapper>section.docx{width:min(816px,calc(100% - 20px))!important;min-height:1056px!important;margin:0 auto 20px!important;padding:72px 80px!important;box-sizing:border-box!important;box-shadow:0 2px 14px #0003}.docx-wrapper table{width:100%!important;table-layout:auto!important}.docx-wrapper td,.docx-wrapper th{min-width:72px!important;word-break:normal!important;overflow-wrap:break-word!important;white-space:normal!important}.docx-wrapper p{word-break:normal!important;overflow-wrap:break-word!important}";
      target.append(style);
      const host = document.createElement("div"); host.style.cssText = "height:100%;overflow:auto;background:#e9ecf1"; target.append(host);
      await renderAsync(input.bytes.slice().buffer, host, undefined, { renderAltChunks: false });
      return () => target.replaceChildren();
    }
    const style = document.createElement("style"); style.textContent = nativeCss + ribbonCss; target.append(style);
    const host = document.createElement("div"); host.className = "workdsh-ppt-editor"; host.style.cssText = "height:100%;overflow:hidden"; target.append(host);
    const editor = await mountPptx(host, input.bytes, input.name, () => undefined, () => undefined);
    return () => { editor.dispose(); target.replaceChildren(); };
  })));
  ctx.effect(() =>
    ctx.documentPreviews.register({
      id: "workdsh-office",
      extensions: wordOnlyRelease ? ["docx"] : ["xlsx", "docx", "pptx"],
      title: () => "Office 浏览器编辑",
      priority: "builtin",
      loading: "bytes-complete",
    }),
  );
  ctx.slots.inject("sidebar.right.tab.document", () =>
    ctx.slots.register(
      { name: "sidebar.right.tab.document", key: "workdsh-office", inject: () => ({office}) },
      OfficeDocument,
    ),
  );
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
  const activeDocuments = new Map<string, ReturnType<typeof createDocumentModel>>();
  // alpha.2: the list snapshot has no `current`; the view owner's mainView retention
  // marks the selected Session (same derivation as the official ui-session publishMain).
  const currentSessionId = () => {
    const state = (ctx.sessions as unknown as ISessions).list.getSnapshot();
    return Object.values(state.byId).find(row => (row.retainedBy.mainView ?? 0) > 0)?.id;
  };
  const office: OfficeClient = {
    request:rpc,
    createPresentation:options=>createPresentationModel(options,rpc),
    importDocument: (sessionId, input, signal) => rpc(sessionId, {endpoint: "open", input}, signal),
    list: (sessionId, signal) => rpc(sessionId, { endpoint: "list" }, signal),
    download: async (sessionId, documentId) => {
      const current = activeDocuments.get(sessionId + ":" + documentId);
      if (current) await current.download();
      else {
        const snapshot = await rpc<OfficeContentSnapshot>(sessionId, {endpoint: "read", documentId});
        if (snapshot.kind === "pdf") await downloadPdf(office,sessionId,snapshot);
        else if (snapshot.kind === "html") downloadHtml(snapshot);
        else if (snapshot.kind === "spreadsheet") await downloadSpreadsheet(snapshot);
        else if (snapshot.kind === "document") await downloadDocument(snapshot);
        else throw new Error("请在 PPT 编辑器中下载此演示文稿。");
      }
    },
    open: (sessionId, documentId) => ctx.sidebarRight.openTabIn(sessionId as never, "workdsh-office-live", {params: {documentId}}),
    createDocument: (options) => {
      const model = createDocumentModel(options, rpc), key = options.sessionId + ":" + options.documentId;
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
      DocumentPage,
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
