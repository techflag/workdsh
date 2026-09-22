import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Context } from "@deepseek-ai/cordis";
/** Type-only: activates the official `ctx.webServer` augmentation. */
import type {} from "@deepseek-ai/dsh-host-webserver";
import { officeAssetRoot } from "./mount.js";

/**
 * Assets the lazy runtime needs. Requests are resolved through this table
 * only, so a name that is not listed is a 404 and path traversal is not even
 * expressible.
 */
const assets = new Map([
  ["runtime.js", { file: "office-runtime.js", contentType: "text/javascript; charset=utf-8" }],
  ["editor.html", { file: "editor.html", contentType: "text/html; charset=utf-8" }],
]);
interface Served {
  body: Buffer;
  etag: string;
  contentType: string;
  mtimeMs: number;
  size: number;
}
const cached = new Map<string, Served>();

async function readAsset(name: string): Promise<Served | undefined> {
  const entry = assets.get(name);
  if (!entry) return undefined;
  // The Host bundle is `dist/index.js`, so siblings resolve against its own URL.
  const path = fileURLToPath(new URL(`./${entry.file}`, import.meta.url));
  const info = await stat(path).catch(() => undefined);
  if (!info?.isFile()) return undefined;
  const previous = cached.get(name);
  if (previous && previous.mtimeMs === info.mtimeMs && previous.size === info.size) return previous;
  const body = await readFile(path);
  const served: Served = {
    body,
    etag: `"${createHash("sha256").update(body).digest("hex").slice(0, 32)}"`,
    contentType: entry.contentType,
    mtimeMs: info.mtimeMs,
    size: info.size,
  };
  cached.set(name, served);
  return served;
}

/**
 * Serve the lazy Office runtime and its legacy editor document.
 *
 * These artifacts are far larger than the plugin's startup bundle, so they are
 * deliberately not `dsh.client` bundles (every application bundle in the boot
 * graph is preloaded on first paint). The URL carries no revision, so responses
 * revalidate through an ETag instead of caching immutably: an upgrade must never
 * leave a stale editor behind.
 * @param ctx - Host context; the route follows the Web carrier's lifecycle.
 */
export function registerOfficeAssets(ctx: Context): void {
  ctx.inject(["webServer"], scope =>
    scope.effect(
      () =>
        scope.webServer.register({
          kind: "prefix",
          path: officeAssetRoot,
          handler: async (request, response) => {
            const method = request.method ?? "GET";
            if (method !== "GET" && method !== "HEAD") {
              response.writeHead(405);
              response.end();
              return;
            }
            const name = new URL(request.url ?? "/", "http://localhost").pathname.slice(officeAssetRoot.length + 1);
            const served = await readAsset(name);
            if (!served) {
              response.writeHead(404);
              response.end();
              return;
            }
            const headers = {
              "content-type": served.contentType,
              "cache-control": "public, max-age=0, must-revalidate",
              etag: served.etag,
              vary: "accept-encoding",
            };
            if (request.headers["if-none-match"] === served.etag) {
              response.writeHead(304, headers);
              response.end();
              return;
            }
            response.writeHead(200, headers);
            response.end(method === "HEAD" ? undefined : served.body);
          },
        }),
      "workdsh-office: runtime assets",
    ),
  );
}
