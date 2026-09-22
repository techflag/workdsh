import type { ComponentType } from "react";
import type { Context } from "@deepseek-ai/cordis";
import type { OfficeContentSnapshot } from "workdsh-contracts/office";
import type { LibraryOriginalPreviewInput } from "workdsh-contracts/library";
import { officeRuntimeModule, officeRuntimeScript } from "./mount.js";
import type { DocumentOptions, OfficeClient, Rpc } from "./live/model.js";

/** Client module system face this loader needs; the kernel provides it as `ctx.modules`. */
interface ClientModuleLoader {
  import(specifier: string): Promise<unknown>;
}

/**
 * The lazy Office artifact: every editor implementation that is too heavy for
 * the startup bundle. The client shell registers slots with wrappers and only
 * reaches this surface once a document is actually opened.
 */
export interface OfficeRuntime {
  readonly OfficeDocument: ComponentType<any>;
  readonly CsvDocument: ComponentType<any>;
  readonly DocumentPage: ComponentType<any>;
  createDocumentModel(
    options: DocumentOptions,
    request: Rpc,
  ): ReturnType<typeof import("./live/model.js").createDocumentModel>;
  createPresentationModel(
    options: DocumentOptions,
    request: Rpc,
  ): ReturnType<typeof import("./presentation/client-model.js").createPresentationModel>;
  downloadOriginal(
    office: OfficeClient,
    sessionId: string,
    snapshot: OfficeContentSnapshot,
  ): Promise<void>;
  mountOriginalPreview(
    target: HTMLElement,
    input: LibraryOriginalPreviewInput,
  ): Promise<() => void>;
}

let pending: Promise<OfficeRuntime> | undefined;

/**
 * Load the runtime once per page. Concurrent callers share one script request,
 * because the module table rejects a second registration of the same id.
 * @param ctx - client root context carrying the module system.
 * @returns the materialized runtime exports.
 */
export function loadOfficeRuntime(ctx: Context): Promise<OfficeRuntime> {
  pending ??= acquire(ctx).catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}

async function acquire(ctx: Context): Promise<OfficeRuntime> {
  const modules = (ctx as unknown as { modules?: ClientModuleLoader }).modules;
  if (!modules)
    throw new Error("Office 编辑器暂不可用：客户端模块系统未就绪，请刷新页面后重试。");
  await injectScript(officeRuntimeScript);
  const runtime = (await modules.import(officeRuntimeModule)) as Partial<OfficeRuntime> | undefined;
  if (typeof runtime?.createDocumentModel !== "function")
    throw new Error("Office 编辑器加载失败：运行时产物未注册导出。");
  return runtime as OfficeRuntime;
}

/** Classic script transport: the artifact registers itself into the module table on execution. */
function injectScript(source: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = source;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        script.remove();
        resolve();
      },
      { once: true },
    );
    script.addEventListener(
      "error",
      () => {
        script.remove();
        reject(new Error(`Office 编辑器资源加载失败：${source}`));
      },
      { once: true },
    );
    document.head.append(script);
  });
}
