import { Editor } from "@tiptap/core";
import { documentExtensions } from "./extensions.js";
import type {
  OfficeSnapshot,
  OfficeReceipt,
  OfficeEditInput,
} from "workdsh-contracts/office";
import { downloadDocument } from "./docx.js";
import {
  documentDiff,
  editorContent,
  normalizedColor,
} from "./adapter.js";
export type Rpc = <T>(
  sessionId: string,
  request: unknown,
  signal?: AbortSignal,
) => Promise<T>;
type Lease = {
  token: string;
  clientId: string;
  expiresAt: number;
  generation: string;
};
export interface DocumentOptions {
  documentId: string;
  sessionId: string;
  visible: boolean;
  signal: AbortSignal;
  requestId?: string;
}
export interface OfficeClient {
  request: Rpc;
  createPresentation(options:DocumentOptions):ReturnType<typeof import("../presentation/client-model.js").createPresentationModel>;
  importDocument(sessionId: string, input: Extract<import("workdsh-contracts/office").OfficeOpenInput, {source: "import"}>, signal: AbortSignal): Promise<OfficeSnapshot>;
  download(sessionId: string, documentId: string): Promise<void>;
  open(sessionId: string, documentId: string): void;
  list(
    sessionId: string,
    signal: AbortSignal,
  ): Promise<{ documentId: string; title: string; kind?:"document"|"presentation"|"spreadsheet"|"html"|"pdf" }[]>;
  createDocument(
    options: DocumentOptions,
  ): ReturnType<typeof createDocumentModel>;
}
const ref = <T>(current: T) => ({ current });
/** Client mirror + local editing transaction. Host owns committed content and revisions. */
export function createDocumentModel(
  { documentId, sessionId, visible, signal, requestId }: DocumentOptions,
  rpc: Rpc,
) {
  const mount = ref<HTMLDivElement | null>(null),
    editor = ref<Editor | null>(null),
    base = ref<OfficeSnapshot | null>(null);
  const lease = ref<Lease | null>(null),
    clientId = ref(crypto.randomUUID()),
    disposed = ref(false),
    saving = ref<Promise<void> | null>(null),
    timer = ref<ReturnType<typeof setTimeout> | null>(null),
    composing = ref(false),
    mapping = ref(false),
    failed = ref(false),
    revision = ref(0),
    uncertain = ref<OfficeEditInput | null>(null);
  let view = {
    status: "正在打开…",
    title: "文档",
    editing: false,
    ready: false,
    problem: "",
    failed: false,
    controls: {
      fontFamily: "",
      fontSize: 12,
      color: "#222222",
      backgroundColor: "#fff2a8",
      level: 0,
      alignment: "left",
      lineHeight: 1.85,
      bold: false,
      italic: false,
      underline: false,
      strike: false,
      bullet: false,
      ordered: false,
      undo: false,
      redo: false,
      characters: 0,
    },
  };
  const listeners = new Set<() => void>();
  function update(patch: Partial<typeof view>) {
    view = { ...view, ...patch };
    for (const listener of listeners) listener();
  }
  const setStatus = (status: string) => update({ status }),
    setTitle = (title: string) => update({ title }),
    setEditing = (editing: boolean) => update({ editing }),
    setReady = (ready: boolean) => update({ ready }),
    setProblem = (problem: string) => update({ problem });
  const visibleRef = ref(visible);
  visibleRef.current = visible;
  const requested = ref(requestId),
    acked = ref<string | null>(null);
  requested.current = requestId;
  const call = <T>(request: unknown) => rpc<T>(sessionId, request, signal);
  function fail(error: unknown) {
    if (disposed.current) return;
    failed.current = true;
    setProblem(error instanceof Error ? error.message : String(error));
    setStatus("尚未保存，内容保留在页面");
    update({ failed: true });
    editor.current?.setEditable(false);
  }
  function refreshControls(e: Editor) {
    if (disposed.current) return;
    const text = e.getAttributes("textStyle"),
      block = e.state.selection.$from.parent.attrs;
    update({
      controls: {
        fontFamily: text.fontFamily ?? "",
        fontSize:
          parseFloat(text.fontSize) *
            (String(text.fontSize).endsWith("px") ? 0.75 : 1) || 12,
        color: normalizedColor(text.color) ?? "#222222",
        backgroundColor: normalizedColor(text.backgroundColor) ?? "#fff2a8",
        level: e.isActive("heading") ? e.getAttributes("heading").level : 0,
        alignment: block.textAlign ?? "left",
        lineHeight: block.lineHeight ?? 1.85,
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        bullet: e.isActive("bulletList"),
        ordered: e.isActive("orderedList"),
        undo: e.can().undo(),
        redo: e.can().redo(),
        characters: e.state.doc.textContent.length,
      },
    });
  }
  function mountEditor(snapshot: OfficeSnapshot, editable: boolean) {
    editor.current?.destroy();
    editor.current = new Editor({
      element: mount.current!,
      editable,
      content: editorContent(snapshot.state),
      extensions: documentExtensions(),
      editorProps: {
        attributes: { "aria-label": "文档正文", class: "wd-office-writing" },
        handleDOMEvents: {
          compositionstart: () => {
            composing.current = true;
            return false;
          },
          compositionend: () => {
            composing.current = false;
            queueSave();
            return false;
          },
        },
      },
      onTransaction: ({ editor: e }) => refreshControls(e),
      onSelectionUpdate: ({ editor: e }) => refreshControls(e),
      onUpdate: () => {
        if (!mapping.current && lease.current) {
          setStatus("正在保存…");
          queueSave();
        }
      },
    });
    refreshControls(editor.current);
    setReady(true);
  }
  function queueSave() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void save().catch(fail);
    }, 500);
  }
  async function save(): Promise<void> {
    if (saving.current) return saving.current;
    if (
      !editor.current ||
      !base.current ||
      !lease.current ||
      composing.current ||
      failed.current
    )
      return;
    const run = (async () => {
      do {
        if (disposed.current || composing.current) return;
        const operations = documentDiff(
          base.current!.state,
          editor.current!.getJSON(),
        );
        if (!operations.length && !uncertain.current) {
          setStatus(`已保存 · 修订 ${base.current!.revision}`);
          return;
        }
        const input = uncertain.current ?? {
          documentId,
          baseRevision: base.current!.revision,
          operationId: crypto.randomUUID(),
          operations,
        };
        uncertain.current = input;
        const receipt = await call<OfficeReceipt>({
          endpoint: "edit",
          input,
          lease: { token: lease.current!.token, clientId: clientId.current },
        });
        if (disposed.current) return;
        const snapshot = await call<OfficeSnapshot>({
          endpoint: "read",
          documentId,
        });
        if (disposed.current) return;
        // Remap IDs only, preserving user typing/selection that arrived during the request.
        mapping.current = true;
        const e = editor.current!,
          tr = e.state.tr;
        e.state.doc.descendants((node, pos) => {
          if (!["paragraph", "heading", "table", "image", "officeChart"].includes(node.type.name)) return;
          const mapped = receipt.ids[String(node.attrs.blockId)];
          if (mapped)
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              blockId: mapped,
            });
        });
        if (tr.docChanged) e.view.dispatch(tr.setMeta("addToHistory", false));
        mapping.current = false;
        base.current = snapshot;
        revision.current = snapshot.revision;
        uncertain.current = null;
      } while (!failed.current && lease.current);
    })();
    saving.current = run;
    try {
      await run;
    } finally {
      saving.current = null;
    }
  }
  async function begin() {
    if (!view.ready || lease.current || failed.current) return;
    setStatus("正在获取编辑权…");
    try {
      const value = await call<{ snapshot: OfficeSnapshot; lease: Lease }>({
        endpoint: "lease",
        documentId,
        clientId: clientId.current,
        action: "acquire",
      });
      if (disposed.current) return;
      lease.current = value.lease;
      base.current = value.snapshot;
      setEditing(true);
      mountEditor(value.snapshot, true);
      setProblem("");
      setStatus("编辑中 · 自动保存");
      editor.current?.commands.focus("end");
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
      setStatus("暂时无法编辑");
    }
  }
  async function finish() {
    try {
      if (composing.current) return;
      await save();
      if (failed.current || uncertain.current) return;
      const current = lease.current;
      if (!current) return;
      editor.current?.setEditable(false);
      await call({
        endpoint: "lease",
        documentId,
        clientId: clientId.current,
        action: "release",
        token: current.token,
      });
      lease.current = null;
      setEditing(false);
      setStatus(`已保存 · 修订 ${base.current!.revision}`);
      mountEditor(base.current!, false);
    } catch (e) {
      fail(e);
    }
  }
  function attach(element: HTMLDivElement) {
    mount.current = element;
    disposed.current = false;
    let pollTimer: ReturnType<typeof setTimeout>,
      renewTimer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        if (
          !lease.current &&
          !failed.current &&
          (visibleRef.current || !base.current)
        ) {
          const snapshot = await call<OfficeSnapshot>({
            endpoint: "read",
            documentId,
          });
          if (disposed.current) return;
          if (
            !lease.current &&
            (!base.current ||
              snapshot.generation !== base.current.generation ||
              snapshot.revision > revision.current)
          ) {
            base.current = snapshot;
            revision.current = snapshot.revision;
            setTitle(snapshot.title);
            mountEditor(snapshot, false);
            setStatus(`已保存 · 修订 ${snapshot.revision}`);
          }
          const rid = requested.current;
          if (rid && acked.current !== rid && visibleRef.current)
            try {
              await call({
                endpoint: "ack",
                documentId,
                requestId: rid,
                clientId: clientId.current,
                appliedRevision: revision.current,
              });
              acked.current = rid;
            } catch {}
        }
      } catch (e) {
        if (!disposed.current)
          setStatus(e instanceof Error ? e.message : "暂时无法同步");
      } finally {
        if (!disposed.current)
          pollTimer = setTimeout(poll, visibleRef.current ? 500 : 5000);
      }
    }
    async function renew() {
      const current = lease.current;
      if (current && !failed.current)
        try {
          const value = await call<{ lease: Lease }>({
            endpoint: "lease",
            documentId,
            clientId: clientId.current,
            action: "renew",
            token: current.token,
          });
          if (!disposed.current) lease.current = value.lease;
        } catch (e) {
          fail(e);
        }
      if (!disposed.current) renewTimer = setTimeout(renew, 10000);
    }
    const warn = (e: BeforeUnloadEvent) => {
      if (
        uncertain.current ||
        (lease.current &&
          base.current &&
          editor.current &&
          documentDiff(base.current.state, editor.current.getJSON()).length)
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    void poll();
    renewTimer = setTimeout(renew, 10000);
    return () => {
      disposed.current = true;
      clearTimeout(pollTimer);
      clearTimeout(renewTimer);
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("beforeunload", warn);
      editor.current?.destroy();
      editor.current = null;
    };
  }
  const command = (run: (e: Editor) => void) => {
    if (editor.current && lease.current && !failed.current) {
      run(editor.current);
      editor.current.commands.focus();
    }
  };
  function matches(query: string) {
    const found: { from: number; to: number }[] = [];
    if (!editor.current || !query || query.length > 2000) return found;
    editor.current.state.doc.descendants((node, pos) => {
      if (!node.isTextblock) return;
      const text = node.textBetween(0, node.content.size, "", "\n");
      let index = 0;
      while ((index = text.indexOf(query, index)) >= 0) {
        found.push({
          from: pos + 1 + index,
          to: pos + 1 + index + query.length,
        });
        index += query.length;
      }
      return false;
    });
    return found;
  }
  function find(query: string) {
    const found = matches(query),
      e = editor.current;
    if (e && found.length) {
      const match =
        found.find((m) => m.from >= e.state.selection.to) ?? found[0];
      e.commands.setTextSelection(match);
      e.commands.scrollIntoView();
    }
    return found.length;
  }
  return {
    canTableAction: (action:"insertTable"|"addRowBefore"|"addRowAfter"|"deleteRow"|"addColumnBefore"|"addColumnAfter"|"deleteColumn"|"mergeCells"|"splitCell"|"toggleHeaderRow"|"deleteTable")=>{
      const e=editor.current;if(!e)return false;
      return action==="insertTable" ? !e.isActive("table") && e.can().insertTable({rows:3,cols:3}) : e.can()[action]();
    },
    canAlignImage: ()=>editor.current?.isActive("image") ?? false,
    tableAction: (action:"insertTable"|"addRowBefore"|"addRowAfter"|"deleteRow"|"addColumnBefore"|"addColumnAfter"|"deleteColumn"|"mergeCells"|"splitCell"|"toggleHeaderRow"|"deleteTable") => command(e=>{
      if(action==="insertTable") {if(!e.isActive("table")) e.commands.insertTable({rows:3,cols:3,withHeaderRow:true});}
      else e.commands[action]();
    }),
    imageAlignment: (alignment:"left"|"center"|"right")=>command(e=>e.commands.updateAttributes("image",{alignment})),
    insertImage: async(file:File)=>{
      if(!["image/png","image/jpeg"].includes(file.type) || file.size>524288) throw new Error("请选择不超过512 KiB的PNG或JPEG图片。");
      const src=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("图片读取失败。"));reader.readAsDataURL(file);});
      const image=new window.Image(); image.src=src; await image.decode();
      const scale=Math.min(1,600/image.naturalWidth,4096/image.naturalHeight);
      if(image.naturalWidth*scale<24 || image.naturalHeight*scale<24) throw new Error("图片显示尺寸至少24像素。");
      command(e=>{if(e.isActive("table")) throw new Error("请将光标移到表格外，再插入图片。");e.commands.setImage({src,alt:file.name,width:Math.round(image.naturalWidth*scale),height:Math.round(image.naturalHeight*scale)});});
    },
    find,
    replace: (query: string, replacement: string, all: boolean) => {
      if (
        !lease.current ||
        failed.current ||
        composing.current ||
        replacement.length > 20000
      )
        return 0;
      const e = editor.current!,
        found = matches(query);
      const selected = found.find(
        (m) =>
          m.from === e.state.selection.from && m.to === e.state.selection.to,
      );
      const targets = all
        ? found
        : [
            selected ??
              found.find((m) => m.from >= e.state.selection.to) ??
              found[0],
          ].filter(Boolean);
      const tr = e.state.tr;
      for (const range of [...targets].reverse())
        tr.insertText(replacement, range.from, range.to);
      if (tr.docChanged) e.view.dispatch(tr);
      e.commands.focus();
      return targets.length;
    },
    action: (
      action:
        | "undo"
        | "redo"
        | "bullet"
        | "ordered"
        | "indent"
        | "outdent"
        | "clear"
        | "selectAll",
    ) =>
      command((e) => {
        if (action === "undo") e.commands.undo();
        if (action === "redo") e.commands.redo();
        if (action === "bullet") e.commands.toggleBulletList();
        if (action === "ordered") e.commands.toggleOrderedList();
        if (action === "selectAll") e.commands.selectAll();
        if (action === "clear")
          e.chain()
            .unsetAllMarks()
            .updateAttributes("paragraph", {
              textAlign: null,
              lineHeight: null,
              indent: 0,
            })
            .updateAttributes("heading", {
              textAlign: null,
              lineHeight: null,
              indent: 0,
            })
            .run();
        if (action === "indent" || action === "outdent") {
          if (e.isActive("listItem")) {
            let levels = 0;
            for (let depth = 1; depth <= e.state.selection.$from.depth; depth++)
              if (
                ["bulletList", "orderedList"].includes(
                  e.state.selection.$from.node(depth).type.name,
                )
              )
                levels++;
            if (action === "indent") {
              if (levels < 6) e.commands.sinkListItem("listItem");
              else setProblem("列表最多支持 6 级。");
            }
            if (action === "outdent") e.commands.liftListItem("listItem");
          } else {
            const tr = e.state.tr;
            e.state.doc.nodesBetween(
              e.state.selection.from,
              e.state.selection.to,
              (node, pos) => {
                if (["paragraph", "heading", "table", "image", "officeChart"].includes(node.type.name))
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    indent: Math.max(
                      0,
                      Math.min(
                        6,
                        Number(node.attrs.indent ?? 0) +
                          (action === "indent" ? 1 : -1),
                      ),
                    ),
                  });
              },
            );
            e.view.dispatch(tr);
          }
        }
      }),
    textStyle: (
      property: "fontFamily" | "fontSize" | "color" | "backgroundColor",
      value: string,
    ) =>
      command((e) => {
        if (property === "fontFamily")
          value
            ? e.commands.setFontFamily(value)
            : e.commands.unsetFontFamily();
        if (property === "fontSize") e.commands.setFontSize(`${value}pt`);
        if (property === "color") e.commands.setColor(value);
        if (property === "backgroundColor")
          e.commands.setBackgroundColor(value);
      }),
    alignment: (value: string) =>
      command((e) => e.commands.setTextAlign(value)),
    lineHeight: (value: number) =>
      command((e) =>
        e
          .chain()
          .updateAttributes("paragraph", { lineHeight: value })
          .updateAttributes("heading", { lineHeight: value })
          .run(),
      ),
    getSnapshot: () => view,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    attach,
    begin,
    finish,
    download: async () => {
      if (composing.current) throw new Error("请先完成当前文字输入，再下载。");
      if (lease.current) await finish();
      if (failed.current || uncertain.current || lease.current)
        throw new Error("修改尚未保存，暂不能下载。请先保留页面中的内容。");
      const snapshot = await call<OfficeSnapshot>({
        endpoint: "read",
        documentId,
      });
      await downloadDocument(snapshot);
    },
    setVisible: (value: boolean) => {
      visibleRef.current = value;
    },
    setRequest: (value: string | undefined) => {
      requested.current = value;
    },
    format: (action: "bold" | "italic" | "underline" | "strike") =>
      command((e) => {
        if (action === "bold") e.commands.toggleBold();
        if (action === "italic") e.commands.toggleItalic();
        if (action === "underline") e.commands.toggleUnderline();
        if (action === "strike") e.commands.toggleStrike();
      }),
    paragraph: (level: 0 | 1 | 2 | 3 | 4 | 5 | 6) =>
      command((e) =>
        level === 0
          ? e.commands.setParagraph()
          : e.commands.setHeading({ level }),
      ),
  };
}
