import {pdfEditInput} from "../pdf/model.js";
import {pdfBytes} from "../pdf/encode.js";
import {htmlEditInput} from "../html/model.js";
import {spreadsheetEditInput} from "../spreadsheet/model.js";
import type { Context } from "@deepseek-ai/cordis";
import type { HostConnectionHandle } from "@deepseek-ai/dsh-client-connection";
import { z } from "zod";
import { id, editInput, openInput, contentOpenInput, presentationEditInput, parse, OfficeError } from "./model.js";
export const name = "workdsh-office-connection";
export const inject = ["connection", "workdshOfficeContent", "workdshIdentity"];
const endpoint = z.discriminatedUnion("endpoint", [
  z.object({ endpoint: z.literal("open"), input: contentOpenInput }).strict(),
  z.object({ endpoint: z.literal("read"), documentId: id }).strict(),
  z.object({endpoint:z.literal("pdfBytes"),documentId:id,baseRevision:z.number().int().nonnegative()}).strict(),
  z.object({ endpoint: z.literal("list") }).strict(),
  z.object({ endpoint: z.literal("pending") }).strict(),
  z
    .object({
      endpoint: z.literal("edit"),
      input: z.union([editInput,presentationEditInput,spreadsheetEditInput,htmlEditInput,pdfEditInput]),
      lease: z.object({ token: id, clientId: id }).strict().optional(),
    })
    .strict(),
  z
    .object({
      endpoint: z.literal("lease"),
      documentId: id,
      clientId: id,
      action: z.enum(["acquire", "renew", "release"]),
      token: id.optional(),
    })
    .strict(),
  z
    .object({
      endpoint: z.literal("ack"),
      documentId: id,
      requestId: id,
      clientId: id,
      appliedRevision: z.number().int().nonnegative(),
    })
    .strict(),
]);
export function apply(ctx: Context) {
  const lifetime = new AbortController(),
    pending = new Set<Promise<Response>>();
  const connection = (ctx as Context & { connection: HostConnectionHandle })
    .connection;
  const unregister = connection.fetch.register({
    path: "/api/workdsh-office",
    methods: ["POST"],
    requestBody: "buffered",
    fetch(request) {
      const action = (async () => {
        const signal = AbortSignal.any([request.signal, lifetime.signal]);
        try {
          signal.throwIfAborted();
          if (Number(request.headers.get("content-length")) > 30*1024*1024)
            throw new OfficeError("LIMIT_REACHED", "请求过大。");
          const text = await request.text();
          if (new TextEncoder().encode(text).length > 30*1024*1024)
            throw new OfficeError("LIMIT_REACHED", "请求过大。");
          const envelope = parse(
            z.object({ sessionId: id, request: endpoint }).strict(),
            JSON.parse(text),
          );
          const actor = await ctx.workdshIdentity.resolve(
              { sessionId: envelope.sessionId },
              signal,
            ),
            r = envelope.request,
            s = ctx.workdshOfficeContent;
          if (new TextEncoder().encode(text).length > 1500000) {
            const largePresentation = r.endpoint === "open" && r.input.source === "pptx" ||
              r.endpoint === "edit" && (await s.read(actor, r.input.documentId, signal)).kind === "presentation";
            if (!largePresentation) throw new OfficeError("LIMIT_REACHED", "请求过大。");
          }
          let value: unknown;
          switch (r.endpoint) {
            case "open":
              value = await s.open(actor, r.input, signal);
              break;
            case "read":
              value = await s.read(actor, r.documentId, signal);
              break;
            case "pdfBytes": {
              const saved=await s.read(actor,r.documentId,signal);
              if(saved.kind!=="pdf")throw new OfficeError("INVALID_INPUT","不是 PDF 工作副本。");
              if(saved.revision!==r.baseRevision)throw new OfficeError("REVISION_CONFLICT","PDF 已更新，请重读。");
              const bytes=await pdfBytes(saved,signal);signal.throwIfAborted();if(bytes.length>8*1024*1024)throw new OfficeError("LIMIT_REACHED","PDF 超过 8 MiB。 ");value={revision:saved.revision,bytes:Buffer.from(bytes).toString("base64")};break;
            }
            case "list":
              value = await s.list(actor, signal);
              break;
            case "pending":
              value = await s.pending(actor, signal);
              break;
            case "edit":
              value = await s.editHuman(actor, r.input, r.lease ?? {token:"",clientId:"direct-presentation"}, signal);
              break;
            case "lease":
              value = await s.lease(
                actor,
                r.documentId,
                r.clientId,
                r.action,
                r.token,
                signal,
              );
              break;
            case "ack":
              value = await s.acknowledge(actor, r, signal);
              break;
          }
          return Response.json(
            { ok: true, value },
            { headers: { "cache-control": "no-store" } },
          );
        } catch (error) {
          const code =
            error instanceof OfficeError
              ? error.code
              : lifetime.signal.aborted || request.signal.aborted
                ? "CANCELLED"
                : "INVALID_REQUEST";
          return Response.json(
            {
              ok: false,
              error: {
                code,
                message:
                  error instanceof OfficeError
                    ? error.message
                    : "请求未完成，请核对操作结果后重试。",
              },
            },
            { headers: { "cache-control": "no-store" } },
          );
        }
      })();
      pending.add(action);
      void action.then(
        () => pending.delete(action),
        () => pending.delete(action),
      );
      return action;
    },
  });
  ctx.effect(
    () => async () => {
      lifetime.abort();
      await unregister();
      await Promise.allSettled([...pending]);
    },
    "workdshOffice.connection",
  );
}
