import {pdfStateSchema,pdfEditInput,applyPdf,initialPdf} from "../pdf/model.js";
import {pdfBytes} from "../pdf/encode.js";
import type {OfficePdfOpenInput,OfficePdfEditInput} from "workdsh-contracts/office";
import {htmlStateSchema,htmlEditInput,applyHtml} from "../html/model.js";
import type {OfficeHtmlOpenInput,OfficeHtmlEditInput} from "workdsh-contracts/office";
import {spreadsheetStateSchema,spreadsheetEditInput,createSpreadsheet,applySpreadsheet,spreadsheetCapabilities} from "../spreadsheet/model.js";
import { createHash, randomUUID } from "node:crypto";
import { Service, type Context } from "@deepseek-ai/cordis";
import {
  defineDomain,
  domainTable,
  type KvTable,
} from "@deepseek-ai/dsh-storage-domain";
import { z } from "zod";
import type {
  AccessService,
  RuntimeBindingService,
  IdentityService,
  AuditService,
  ActorContext,
  AuditEvent,
  ResourceOwner,
} from "workdsh-contracts";
import type {
  OfficeSnapshot,
  OfficeContentSnapshot,
  OfficePresentationOpenInput,
  OfficeSpreadsheetOpenInput, OfficeSpreadsheetEditInput,
  OfficePresentationEditInput,
  OfficeReceipt,
  OfficeEditInput,
  OfficeOpenInput,
} from "workdsh-contracts/office";
import {
  applyOperations,
  capabilities,
  editInput,
  openInput,
  contentOpenInput,
  presentationEditInput,
  ensure,
  id,
  runInput,
  blockInput,
  parse,
  OfficeError,
} from "./model.js";

import {parsePresentation,createPresentation,importPresentation,applyPresentation} from "../presentation/native-deck.js";

declare module "@deepseek-ai/cordis" {
  interface Context {
    workdshOfficeContent: ContentService;
    workdshIdentity: IdentityService;
    workdshAccess: AccessService & RuntimeBindingService;
    workdshAudit: AuditService;
  }
}
const runSchema = runInput.safeExtend({runId: id});
const blockSchema = blockInput.safeExtend({blockId: id, runs: z.array(runSchema)});
const stateSchema = z
  .object({
    modelVersion: z.literal(1),
    blockIds: z.array(id),
    blocks: z.record(id, blockSchema),
  })
  .strict();
const presentationStateSchema=z.object({modelVersion:z.literal(1),focusSlideId:id.optional(),deck:z.unknown().transform((value,ctx)=>{
  try{return parsePresentation(value);}catch{ctx.addIssue({code:"custom",message:"Invalid native PPT deck"});return z.NEVER;}
})}).strict();
const receiptSchema = z
  .object({
    operationId: id,
    revision: z.number(),
    status: z.literal("committed"),
    ids: z.record(z.string(), id),
  })
  .strict();
const ownerSchema = z
  .object({
    organizationId: z.string(),
    ownerPrincipalId: z.string(),
    scope: z.literal("personal"),
  })
  .strict();
const eventSchema = z
  .object({
    id: z.string(),
    occurredAt: z.string(),
    requestId: z.string(),
    principalId: z.string(),
    organizationId: z.string(),
    action: z.string(),
    target: z.object({
      domain: z.string(),
      id: z.string(),
      revision: z.string(),
    }),
    outcome: z.literal("succeeded"),
    code: z.string(),
    sessionId: z.string(),
  })
  .strict();
const recordSchema = z
  .object({
    documentId: id,
    kind: z.enum(["document","presentation","spreadsheet","html","pdf"]),
    title: z.string(),
    revision: z.number().int().nonnegative(),
    state: z.union([stateSchema,presentationStateSchema,spreadsheetStateSchema,htmlStateSchema,pdfStateSchema]),
    owner: ownerSchema,
    workspaceId: z.string().optional(),
    sessionId: z.string(),
    createdFingerprint: z.string(),
    receipts: z.record(
      z.string(),
      z
        .object({
          fingerprint: z.string(),
          receipt: receiptSchema,
          event: eventSchema,
          audited: z.boolean(),
        })
        .strict(),
    ),
    lease: z
      .object({
        token: id,
        clientId: id,
        principalId: z.string(),
        generation: id,
        expiresAt: z.number(),
      })
      .strict()
      .nullable(),
    presentation: z
      .object({
        requestId: id,
        sessionId: z.string(),
        revision: z.number(),
        expiresAt: z.number(),
        clientId: id.nullable(),
        appliedRevision: z.number().nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict().refine(record=>record.kind==="document"?"blocks" in record.state:record.kind==="presentation"?"deck" in record.state:record.kind==="pdf"?"pages" in record.state:record.kind==="html"?"html" in record.state:"sheets" in record.state,"State must match editor kind");
type ContentRecord = z.infer<typeof recordSchema>;
export const contentDomain = defineDomain({
  name: "workdsh_office",
  version: 1,
  layout: "per-record",
  tables: { documents: domainTable<string, ContentRecord>(recordSchema) },
});
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const newId = () => randomUUID();

declare const __WORKDSH_PRESENTATION_ENABLED__:boolean;
declare const __WORKDSH_SPREADSHEET_ENABLED__:boolean;
export class ContentService extends Service {
  readonly spreadsheetEnabled=typeof __WORKDSH_SPREADSHEET_ENABLED__!=="undefined"?__WORKDSH_SPREADSHEET_ENABLED__:true;
  readonly presentationEnabled=typeof __WORKDSH_PRESENTATION_ENABLED__!=="undefined"?__WORKDSH_PRESENTATION_ENABLED__:true;
  static inject = [
    "storageDomain",
    "workdshIdentity",
    "workdshAccess",
    "workdshAudit",
  ];
  readonly generation = newId();
  private table!: KvTable<string, ContentRecord>;
  private closed = false;
  private tail: Promise<unknown> = Promise.resolve();
  constructor(ctx: Context) {
    super(ctx, "workdshOfficeContent");
  }
  async [Service.init]() {
    const domain = await this.ctx.storageDomain.open(contentDomain);
    this.table = domain.table("documents");
    this.ctx.effect(
      () => async () => {
        this.closed = true;
        await this.tail;
        await domain.close();
      },
      "workdshOfficeContent.close",
    );
    // Audit events are an outbox in the same record as the committed state.
    await this.flushAudit();
  }
  private enqueue<T>(
    operation: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    const run = this.tail.then(async () => {
      ensure(!this.closed, "UNAVAILABLE", "Office 内容服务已停止。");
      signal?.throwIfAborted();
      return operation();
    });
    this.tail = run.catch(() => undefined);
    return run;
  }
  private session(actor: ActorContext) {
    ensure(!this.closed, "UNAVAILABLE", "Office 内容服务已停止。");
    ensure(
      actor.sessionId,
      "SESSION_REQUIRED",
      "请在已授权的会话中使用文档工具。",
    );
    const binding = this.ctx.workdshAccess.sessionOwner(actor.sessionId);
    ensure(
      binding &&
        binding.organizationId === actor.organizationId &&
        binding.ownerPrincipalId === actor.principalId,
      "FORBIDDEN",
      "会话没有匹配的可信所有权绑定。",
    );
    return binding;
  }
  private async authorize(
    actor: ActorContext,
    action: "read" | "edit",
    record: ContentRecord,
    signal?: AbortSignal,
  ) {
    const session = this.session(actor);
    ensure(
      session.workspaceId === record.workspaceId,
      "FORBIDDEN",
      "文档属于另一个工作区。",
    );
    const decision = await this.ctx.workdshAccess.authorize(
      {
        actor,
        action,
        resource: {
          domain: "office",
          id: record.documentId,
          revision: String(record.revision),
        },
        owner: record.owner,
      },
      signal,
    );
    ensure(decision.effect === "allow", "FORBIDDEN", "没有权限操作此文档。");
  }
  private get(documentId: string) {
    const value = this.table.get(parse(id, documentId));
    ensure(value, "NOT_FOUND", "文档不存在。");
    return value;
  }
  private snapshot(record: ContentRecord): OfficeContentSnapshot {
    return structuredClone({
      documentId: record.documentId,
      kind: record.kind,
      title: record.title,
      revision: record.revision,
      state: record.state,
      generation: this.generation,
    }) as OfficeContentSnapshot;
  }
  private event(
    actor: ActorContext,
    documentId: string,
    operationId: string,
    revision: number,
  ): z.infer<typeof eventSchema> {
    return {
      id: hash([
        actor.organizationId,
        documentId,
        actor.principalId,
        operationId,
      ]),
      occurredAt: new Date().toISOString(),
      requestId: actor.requestId,
      principalId: actor.principalId,
      organizationId: actor.organizationId,
      action: "office.commit",
      target: { domain: "office", id: documentId, revision: String(revision) },
      outcome: "succeeded",
      code: "office/committed",
      sessionId: actor.sessionId!,
    };
  }
  private async flushAudit(documentId?: string) {
    const records = documentId
      ? [this.get(documentId)]
      : [...this.table.entries()].map(([, v]) => v);
    for (const record of records)
      for (const [key, item] of Object.entries(record.receipts)) {
        if (item.audited) continue;
        try {
          await this.ctx.workdshAudit.append(item.event as AuditEvent);
          await this.table.update(record.documentId, (current) => {
            const next = structuredClone(current);
            next.receipts[key]!.audited = true;
            return next;
          });
        } catch {
          /* Durable outbox is retried on the next request or activation. Commit remains committed. */
        }
      }
  }
  async open(
    actor: ActorContext,
    input: OfficeOpenInput | OfficePresentationOpenInput | OfficeSpreadsheetOpenInput | OfficeHtmlOpenInput | OfficePdfOpenInput,
    signal?: AbortSignal,
  ): Promise<OfficeContentSnapshot> {
    const value = parse(contentOpenInput, input);
    ensure(!("kind" in value) || value.kind!=="presentation" || this.presentationEnabled,"UNSUPPORTED_KIND","此 Office 制品未装配 PPT 编辑器。");
    ensure(Buffer.byteLength(JSON.stringify(value)) <= (value.source === "pptx" ? 13*1024*1024 : 1024 * 1024), "LIMIT_REACHED", "导入正文超过1 MiB。请拆分文档。");
    if (value.source === "existing") {
      const snapshot = await this.read(actor, value.documentId, signal);
      await this.present(actor, value.documentId, signal);
      return snapshot;
    }
    return this.enqueue(async () => {
      const binding = this.session(actor);
      const documentId = hash([
        actor.organizationId,
        actor.principalId,
        binding.workspaceId ?? null,
        value.operationId,
      ]);
      const fingerprint = hash(value),
        existing = this.table.get(documentId);
      if (existing) {
        await this.authorize(actor, "read", existing, signal);
        ensure(
          existing.createdFingerprint === fingerprint,
          "IDEMPOTENCY_MISMATCH",
          "同一新建操作 ID 不能使用不同参数。",
        );
        return this.snapshot(existing);
      }
      const owner: ResourceOwner = {
        organizationId: actor.organizationId,
        ownerPrincipalId: actor.principalId,
        scope: "personal",
      };
      const decision = await this.ctx.workdshAccess.authorize(
        {
          actor,
          action: "edit",
          resource: { domain: "office", id: documentId },
          owner,
        },
        signal,
      );
      ensure(decision.effect === "allow", "FORBIDDEN", "没有权限创建文档。");
      const blockId = newId(),
        key = hash([actor.principalId, value.operationId]);
      const receipt: OfficeReceipt = {
        operationId: value.operationId,
        revision: 0,
        status: "committed",
        ids: {},
      };
      const record: ContentRecord = {
        documentId,
        kind: "kind" in value ? value.kind : "document",
        title: value.title,
        revision: 0,
        state: {
          modelVersion: 1,
          blockIds: [blockId],
          blocks: { [blockId]: { blockId, type: "paragraph", runs: [] } },
        },
        owner: owner as ContentRecord["owner"],
        ...(binding.workspaceId ? { workspaceId: binding.workspaceId } : {}),
        sessionId: actor.sessionId!,
        createdFingerprint: fingerprint,
        receipts: {
          [key]: {
            fingerprint,
            receipt,
            event: this.event(actor, documentId, value.operationId, 0),
            audited: false,
          },
        },
        lease: null,
        presentation: {
          requestId: newId(),
          sessionId: actor.sessionId!,
          revision: 0,
          expiresAt: Date.now() + 300000,
          clientId: null,
          appliedRevision: null,
        },
      };
      if ("kind" in value && value.kind === "presentation") {
        const deck=value.source === "pptx" ? await importPresentation(value.title,value.bytes) : await createPresentation(value.title);
        if(value.source!=="pptx")deck.slides=deck.slides.slice(0,1);
        record.state={modelVersion:1,deck,focusSlideId:deck.slides[0].id};
      }
      if ("kind" in value && value.kind === "spreadsheet") {
        ensure(this.spreadsheetEnabled,"UNSUPPORTED_KIND","此制品未装配 Excel 编辑器。");
        record.state=createSpreadsheet();
      }
      if ("kind" in value && value.kind === "pdf") record.state=initialPdf(value.title);
      if ("kind" in value && value.kind === "html") record.state={modelVersion:1,html:"<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head><body><p>网页已打开，等待 AI 写入内容。</p></body></html>"};
      if (value.source === "import") {
        const imported = applyOperations({modelVersion: 1, blockIds: [], blocks: {}}, [{op: "document.insertBlocks", afterBlockId: null, blocks: value.blocks.map((block, i) => ({...block, clientRef: `import-${i}`}))}], newId);
        record.state = imported.state;
        record.presentation = null; // The file-preview tab already owns display.
      }
      signal?.throwIfAborted();
      ensure(!this.closed, "UNAVAILABLE", "Office 内容服务已停止。");
      ensure(Buffer.byteLength(JSON.stringify(record.state)) < 30*1024*1024,"LIMIT_REACHED","工作副本超过 30 MiB。请使用更小的模板。");
      await this.table.put(documentId, record);
      await this.flushAudit(documentId);
      return this.snapshot(record);
    }, signal);
  }
  async read(
    actor: ActorContext,
    documentId: string,
    signal?: AbortSignal,
  ): Promise<OfficeContentSnapshot> {
    ensure(!this.closed, "UNAVAILABLE", "Office 内容服务已停止。");
    const record = this.get(documentId);
    await this.authorize(actor, "read", record, signal);
    signal?.throwIfAborted();
    return this.snapshot(record);
  }
  /** Model projection only: persisted/UI snapshots retain the original embedded bytes. */
  projectForAgent(snapshot: OfficeContentSnapshot): OfficeContentSnapshot {
    const projected = structuredClone(snapshot);
    if(projected.kind === "presentation") { const deck=projected.state.deck as Record<string,unknown>; delete deck.bytes; for(const slide of (deck.slides??[]) as Record<string,unknown>[]) {delete slide.rawXml;for(const element of (slide.elements??[]) as Record<string,unknown>[])delete element.rawXml;} return projected; }
    if(projected.kind === "spreadsheet" || projected.kind === "html" || projected.kind === "pdf") return projected;
    for (const block of Object.values(projected.state.blocks)) {
      if (block.type === "image" && block.image) {
        const digest = createHash("sha256").update(block.image.src).digest("hex");
        block.image.src = `office-image:${snapshot.documentId}:${block.blockId}:${digest}`;
      }
    }
    return projected;
  }
  async editForAgent(actor: ActorContext, input: unknown, signal?: AbortSignal) {
    ensure(Buffer.byteLength(JSON.stringify(input) ?? "") <= capabilities.limits.batchBytes,
      "LIMIT_REACHED", "单批编辑不能超过 1 MiB。");
    const envelope = parse(z.object({documentId: z.string().min(1)}).passthrough(), input);
    await this.authorize(actor, "edit", this.get(envelope.documentId), signal);
    // Request-local authorized snapshots; never a persistent asset registry.
    const target=this.get(envelope.documentId);
    if(target.kind === "presentation") return this.edit(actor,parse(presentationEditInput,input),signal);
    if(target.kind === "spreadsheet") return this.edit(actor,parse(spreadsheetEditInput,input),signal);
    if(target.kind === "pdf") return this.edit(actor,parse(pdfEditInput,input),signal);
    if(target.kind === "html") return this.edit(actor,parse(htmlEditInput,input),signal);
    const sources = new Map<string, Promise<OfficeContentSnapshot>>();
    const source = (documentId: string) => {
      let pending = sources.get(documentId);
      if (!pending) {
        ensure(sources.size < 100, "LIMIT_REACHED", "单批图片来源不能超过100份文档。");
        pending = this.read(actor, documentId, signal);
        sources.set(documentId, pending);
      }
      return pending;
    };
    const resolve = async (value: unknown, depth = 0): Promise<unknown> => {
      signal?.throwIfAborted();
      ensure(depth < 24, "INVALID_INPUT", "编辑载荷嵌套过深。");
      if (Array.isArray(value)) return Promise.all(value.map(child => resolve(child, depth + 1)));
      if (value && typeof value === "object") return Object.fromEntries(await Promise.all(
        Object.entries(value).map(async ([key, child]) => {
          if (key === "src" && typeof child === "string" && child.startsWith("office-image:")) {
            const match = /^office-image:([^:]+):([^:]+):([a-f0-9]{64})$/.exec(child);
            // Compatibility with already-issued same-document references.
            const legacy = match ? null : /^office-image:([^:]+):([a-f0-9]{64})$/.exec(child);
            ensure(match || legacy, "IMAGE_REFERENCE_INVALID", "图片引用格式无效，请重新读取文档。");
            const snapshot = await source(match ? match[1]! : envelope.documentId);
            ensure(snapshot.kind === "document","IMAGE_REFERENCE_INVALID","来源必须是 Word 文档。");
            const block = snapshot.state.blocks[match ? match[2]! : legacy![1]!];
            const digest = match ? match[3] : legacy![2];
            ensure(block?.type === "image" && !!block.image &&
              createHash("sha256").update(block.image.src).digest("hex") === digest,
              "IMAGE_REFERENCE_INVALID", "图片引用失效：来源图片已移除或改变，请重新读取来源文档。");
            return [key, block.image!.src];
          }
          return [key, await resolve(child, depth + 1)];
        })));
      return value;
    };
    return this.edit(actor, parse(editInput, await resolve(input)), signal);
  }

  async list(actor: ActorContext, signal?: AbortSignal) {
    const binding = this.session(actor);
    const items = [];
    for (const [, record] of this.table.entries()) {
      if (
        record.owner.organizationId !== actor.organizationId ||
        record.workspaceId !== binding.workspaceId
      )
        continue;
      try {
        await this.authorize(actor, "read", record, signal);
        items.push({
          documentId: record.documentId,
          title: record.title,
          kind: record.kind,
          revision: record.revision,
        });
      } catch (e) {
        signal?.throwIfAborted();
      }
    }
    return items;
  }
  capabilities() {
    ensure(!this.closed, "UNAVAILABLE", "Office 内容服务已停止。");
    return {...capabilities,pdf:{operations:["pdf.insertPage","pdf.updatePage","pdf.removePage"],coordinateSystem:"top-left points",pageLimits:{pages:50,elements:100},newDocument:true,existingPdfImport:false,elementSchema:"text: id,type,x,y,width,height,text,fontSize,lineHeight,color; rectangle: id,type,x,y,width,height,fill; page: id,width,height,background,elements",font:"bundled static Noto Sans SC, fully embedded",export:{tool:"content_export",browser:"pdf"}},html:{operations:["html.replaceDocument"],state:{modelVersion:1,html:"string"},maxBytes:1048576,preview:"sandboxed inline-only single-file HTML",export:{tool:"content_export",browser:"html"}},...(this.spreadsheetEnabled?{spreadsheet:spreadsheetCapabilities}:{}),...(this.presentationEnabled?{presentation:{model:"pptx-react-viewer@3.16.5",stateFormat:"pptx-viewer-core native slides and PPTX bytes",coordinateSystem:"top-left CSS pixels",fontSizeUnit:"points",canvas:{default:{width:1280,height:720,unit:"css-px"},authoritativePath:"state.deck.canvas",templateSpecific:true},templateImport:{tool:"content_import_pptx",source:"pptx",maxBytes:8*1024*1024,preservesOriginalPackage:true},operations:["presentation.insertSlides","presentation.updateSlide","presentation.updateText","presentation.removeSlide","presentation.moveSlide"],limits:{slides:50,elementsPerSlide:200,contentSlidesPerCommit:1},export:{browser:"pptx",tool:"content_export",maxBytes:8*1024*1024}}}:{})};
  }
  edit(
    actor: ActorContext,
    input: OfficeEditInput | OfficePresentationEditInput | OfficeSpreadsheetEditInput | OfficeHtmlEditInput | OfficePdfEditInput,
    signal?: AbortSignal,
  ): Promise<OfficeReceipt> {
    return this.commit(actor, input, undefined, signal);
  }
  editHuman(
    actor: ActorContext,
    input: OfficeEditInput | OfficePresentationEditInput | OfficeSpreadsheetEditInput | OfficeHtmlEditInput | OfficePdfEditInput,
    lease: { token: string; clientId: string },
    signal?: AbortSignal,
  ) {
    return this.commit(actor, input, lease, signal);
  }
  private async commit(
    actor: ActorContext,
    input: OfficeEditInput | OfficePresentationEditInput | OfficeSpreadsheetEditInput | OfficeHtmlEditInput | OfficePdfEditInput,
    human: { token: string; clientId: string } | undefined,
    signal?: AbortSignal,
  ): Promise<OfficeReceipt> {
    const target=this.get(input.documentId);
    ensure(target.kind!=="presentation"||this.presentationEnabled,"UNSUPPORTED_KIND","此 Office 制品未装配 PPT 编辑器。");
    ensure(target.kind!=="spreadsheet"||this.spreadsheetEnabled,"UNSUPPORTED_KIND","此制品未装配 Excel 编辑器。");
    const value = target.kind === "presentation" ? parse(presentationEditInput,input) : target.kind === "spreadsheet" ? parse(spreadsheetEditInput,input) : target.kind === "pdf" ? parse(pdfEditInput,input) : target.kind === "html" ? parse(htmlEditInput,input) : parse(editInput,input);
    ensure(
      Buffer.byteLength(JSON.stringify(value)) <=
        (human && target.kind === "presentation" ? 30*1024*1024 : capabilities.limits.batchBytes),
      "LIMIT_REACHED",
      "编辑内容超过此通道的大小限制。",
    );
    return this.enqueue(async () => {
      await this.authorize(actor, "edit", this.get(value.documentId), signal);
      const key = hash([actor.principalId, value.operationId]),
        fingerprint = hash({ value, origin: human ? "human" : "agent" });
      const preparedState=this.get(value.documentId).state;
      const existing=this.get(value.documentId);
      let preparedDeck:z.infer<typeof presentationStateSchema>["deck"]|undefined;
      if("deck" in preparedState && !existing.receipts[key]) {
        ensure(existing.revision===value.baseRevision,"REVISION_CONFLICT","文档已更新，请读取最新内容。");
        const active=existing.lease?.generation===this.generation && existing.lease.expiresAt>Date.now();
        if(!human)ensure(!active,"HUMAN_EDITING","用户正在编辑，请等待用户保存。");
        if(!human)ensure(!value.operations.some(op=>op&&typeof op==="object"&&"op" in op&&op.op==="presentation.replaceDeck"),"INVALID_INPUT","AI 请使用幻灯片语义操作。");
        try {preparedDeck=await applyPresentation(preparedState.deck,value.operations);}catch(error){if(error instanceof OfficeError)throw error;ensure(false,"INVALID_INPUT",error instanceof Error?error.message:"无效 PPT 操作");}
      }
      let preparedPdf:z.infer<typeof pdfStateSchema>|undefined;
      if("pages" in preparedState && !existing.receipts[key]) {
        ensure(existing.revision===value.baseRevision,"REVISION_CONFLICT","文档已更新，请重读。");
        const active=existing.lease?.generation===this.generation && existing.lease.expiresAt>Date.now();
        if(!human)ensure(!active,"HUMAN_EDITING","用户正在编辑，请等待用户保存。");
        try {preparedPdf=applyPdf(preparedState,value.operations).state;await pdfBytes({...this.snapshot(existing),kind:"pdf",state:preparedPdf},signal);}catch(error){ensure(false,"INVALID_INPUT",error instanceof Error?error.message:"无效 PDF 操作");}
        signal?.throwIfAborted();
      }
      const next = await this.table.update(value.documentId, (current) => {
        signal?.throwIfAborted();
        ensure(!this.closed, "UNAVAILABLE", "Office 内容服务已停止。");
        const previous = current.receipts[key];
        if (previous) {
          ensure(
            previous.fingerprint === fingerprint,
            "IDEMPOTENCY_MISMATCH",
            "相同操作 ID 的参数不同。",
          );
          return current;
        }
        const active =
          current.lease?.generation === this.generation &&
          current.lease.expiresAt > Date.now();
        if (human)
          ensure(
            (current.kind === "presentation" && human.token === "" && !active) ||
            (active &&
              current.lease?.token === human.token &&
              current.lease.clientId === human.clientId &&
              current.lease.principalId === actor.principalId),
            "LEASE_EXPIRED",
            "编辑权已过期，缓冲尚未保存。",
          );
        else
          ensure(
            !active,
            "HUMAN_EDITING",
            "用户正在编辑，请等待用户保存并结束编辑。",
          );
        ensure(
          current.revision === value.baseRevision,
          "REVISION_CONFLICT",
          "文档已更新，请读取最新内容后重新编辑。",
        );
        ensure(
          Object.keys(current.receipts).length < 10000,
          "LIMIT_REACHED",
          "此工作副本达到操作数限额。",
        );
        if(!human) ensure(!value.operations.some(op=>op && typeof op === "object" && "op" in op && op.op === "presentation.replaceDeck"),"INVALID_INPUT","AI 请使用幻灯片语义操作。");
        const contentSlideIds=new Set<string>();
        if("deck" in current.state && !human) {
          for(const operation of value.operations) {
            const op=operation as {op?:string;slideId?:string;slides?:{id:string}[]};
            if((op.op==="presentation.updateSlide" || op.op==="presentation.updateText") && op.slideId) contentSlideIds.add(op.slideId);
            if(op.op==="presentation.insertSlides") for(const slide of op.slides??[]) contentSlideIds.add(slide.id);
          }
          ensure(contentSlideIds.size<=1,"INVALID_INPUT","PPT 内容请逐页提交：每次最多新增或更新一页；删页、排序可批量完成。");
        }
        if(!human) ensure(!value.operations.some(op=>op && typeof op === "object" && "op" in op && op.op === "spreadsheet.replaceState"),"INVALID_INPUT","AI 请使用单元格及工作表语义操作。");
        const result = "pages" in current.state ? {state:preparedPdf??current.state,ids:{}} : "html" in current.state ? applyHtml(current.state,value.operations) : "sheets" in current.state ? applySpreadsheet(current.state,value.operations) : "deck" in current.state ? (()=>{
          const pptState=current.state as z.infer<typeof presentationStateSchema>;
          const deck=preparedDeck!;
          let focusSlideId:string|undefined=[...contentSlideIds][0]??pptState.focusSlideId;
          for(const operation of value.operations) {
            const op=operation as {op?:string;slideId?:string};
            if(contentSlideIds.size===0 && op.op==="presentation.moveSlide") focusSlideId=op.slideId;
            if(op.op==="presentation.removeSlide" && focusSlideId===op.slideId) {
              const oldIndex=pptState.deck.slides.findIndex(slide=>slide.id===op.slideId);
              focusSlideId=deck.slides[Math.min(Math.max(oldIndex,0),deck.slides.length-1)]?.id;
            }
          }
          return {state:{modelVersion:1 as const,deck,focusSlideId},ids:{}};
        })() : applyOperations(current.state,parse(editInput,value).operations,newId);
        const revision = current.revision + 1;
        const receipt: OfficeReceipt = {
          operationId: value.operationId,
          revision,
          status: "committed",
          ids: result.ids,
        };
        const updated = {
          ...current,
          state: result.state,
          ...("deck" in result.state ? {title:result.state.deck.title}:{}),
          revision,
          ...(!human ? {
            presentation: {
              requestId: newId(),
              sessionId: actor.sessionId!,
              revision,
              expiresAt: Date.now() + 300000,
              clientId: null,
              appliedRevision: null,
            },
          } : {}),
          receipts: {
            ...current.receipts,
            [key]: {
              fingerprint,
              receipt,
              event: this.event(
                actor,
                current.documentId,
                value.operationId,
                revision,
              ),
              audited: false,
            },
          },
        };
        ensure(
          Buffer.byteLength(JSON.stringify(updated)) < 30 * 1024 * 1024,
          "LIMIT_REACHED",
          "工作副本达到存储限额。",
        );
        return updated;
      });
      await this.flushAudit(value.documentId);
      return structuredClone(next.receipts[key]!.receipt);
    }, signal);
  }
  async lease(
    actor: ActorContext,
    documentId: string,
    clientId: string,
    action: "acquire" | "renew" | "release",
    token?: string,
    signal?: AbortSignal,
  ) {
    parse(id, clientId);
    return this.enqueue(async () => {
      await this.authorize(actor, "edit", this.get(documentId), signal);
      const next = await this.table.update(documentId, (current) => {
        signal?.throwIfAborted();
        const active =
          current.lease?.generation === this.generation &&
          current.lease.expiresAt > Date.now();
        const own =
          current.lease?.clientId === clientId &&
          current.lease.principalId === actor.principalId &&
          current.lease.token === token &&
          current.lease.generation === this.generation;
        if (action === "release") {
          ensure(own, "LEASE_EXPIRED", "编辑权已过期。");
          return { ...current, lease: null };
        }
        if (action === "renew")
          ensure(active && own, "LEASE_EXPIRED", "编辑权已过期。");
        else ensure(!active, "HUMAN_EDITING", "另一个页面正在编辑。");
        return {
          ...current,
          lease: {
            clientId,
            principalId: actor.principalId,
            generation: this.generation,
            token: action === "renew" ? token! : newId(),
            expiresAt: Date.now() + 30000,
          },
        };
      });
      return { snapshot: this.snapshot(next), lease: next.lease };
    }, signal);
  }
  async present(actor: ActorContext, documentId: string, signal?: AbortSignal) {
    return this.enqueue(async () => {
      await this.authorize(actor, "read", this.get(documentId), signal);
      const requestId = newId();
      const next = await this.table.update(documentId, (current) => ({
        ...current,
        presentation: {
          requestId,
          sessionId: actor.sessionId!,
          revision: current.revision,
          expiresAt: Date.now() + 300000,
          clientId: null,
          appliedRevision: null,
        },
      }));
      return {
        requestId,
        documentId,
        revision: next.revision,
        status: "requested" as const,
      };
    }, signal);
  }
  async pending(actor: ActorContext, signal?: AbortSignal) {
    this.session(actor);
    const requests = [];
    for (const [, record] of this.table.entries()) {
      const p = record.presentation;
      if (
        !p ||
        p.sessionId !== actor.sessionId ||
        p.expiresAt < Date.now() ||
        p.appliedRevision !== null
      )
        continue;
      await this.authorize(actor, "read", record, signal);
      requests.push({ documentId: record.documentId, ...p });
    }
    return requests;
  }
  async acknowledge(
    actor: ActorContext,
    input: {
      documentId: string;
      requestId: string;
      clientId: string;
      appliedRevision: number;
    },
    signal?: AbortSignal,
  ) {
    return this.enqueue(async () => {
      await this.authorize(actor, "read", this.get(input.documentId), signal);
      await this.table.update(input.documentId, (current) => {
        const p = current.presentation;
        ensure(
          p &&
            p.requestId === input.requestId &&
            p.sessionId === actor.sessionId &&
            p.expiresAt > Date.now(),
          "STALE_PRESENTATION",
          "展示请求已过期。",
        );
        ensure(
          input.appliedRevision >= p.revision &&
            input.appliedRevision <= current.revision,
          "INVALID_INPUT",
          "展示版本无效。",
        );
        return {
          ...current,
          presentation: {
            ...p,
            clientId: input.clientId,
            appliedRevision: input.appliedRevision,
          },
        };
      });
      return { status: "displayed" as const };
    }, signal);
  }
}
