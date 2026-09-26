import {LivePdf} from "../pdf/Page.js";
import {LiveHtml} from "../html/Page.js";
import {LiveSpreadsheet} from "../spreadsheet/Page.js";
import {LivePresentation} from "../presentation/Page.js";
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { PropsRuntime } from "@deepseek-ai/dsh-client-ui-slots";
import type {} from "@deepseek-ai/dsh-client-ui-sidebar-right/client";
import type {} from "@deepseek-ai/dsh-client-ui-session/client";
import { Toolbar } from "./Toolbar.js";
import { officeCss } from "./style.js";
import type { OfficeClient } from "./model.js";
type Props = PropsRuntime<"sidebar.right.pane.tab"> & { office: OfficeClient };

export function DocumentPage(props: Props) {
  const info = props.useTabInfo();
  const params = info.tab.navigation.params as
    | { documentId?: string; requestId?: string }
    | undefined;
  const sessionId = String(props.sessionId);
  const [selected, setSelected] = useState(params?.documentId);
  const [items, setItems] = useState<{ documentId: string; title: string;kind?:"document"|"presentation"|"spreadsheet"|"html"|"pdf" }[]>(
    [],
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (params?.documentId && !busy) setSelected(params.documentId);
  }, [params?.documentId, busy]);
  useEffect(() => {
    let active = true;
    props.office
      .list(sessionId, info.tab.signal)
      .then((value) => {
        if (active) setItems(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [sessionId, selected, props.office, info.tab.signal]);
  return (
    <section className="wd-office-live" data-testid="office-live">
      <style>{officeCss}</style>
      <div className="wd-office-docpicker">
        <span>文档</span>
        <select
          aria-label="选择文档"
          disabled={busy}
          value={selected ?? ""}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="" disabled>
            选择工作副本
          </option>
          {items.map((d) => (
            <option key={d.documentId} value={d.documentId}>
              {d.title}
            </option>
          ))}
        </select>
      </div>
      {busy && params?.documentId && params.documentId !== selected && (
        <div className="wd-office-problem">
          新文档已就绪，完成当前编辑后打开。
        </div>
      )}
      {selected && !items.some(item=>item.documentId===selected) ? <div className="wd-office-empty">正在打开…</div> : selected ? (items.find(item=>item.documentId===selected)?.kind==="pdf" ? <LivePdf key={sessionId+selected} documentId={selected} sessionId={sessionId} office={props.office} visible={info.tab.visible} signal={info.tab.signal} requestId={params?.documentId===selected?params.requestId:undefined} onEditing={setBusy}/> : items.find(item=>item.documentId===selected)?.kind==="html" ? <LiveHtml key={sessionId+selected} documentId={selected} sessionId={sessionId} office={props.office} visible={info.tab.visible} signal={info.tab.signal} requestId={params?.documentId===selected?params.requestId:undefined}/> : items.find(item=>item.documentId===selected)?.kind==="spreadsheet" ? <LiveSpreadsheet key={sessionId+selected} documentId={selected} sessionId={sessionId} office={props.office} visible={info.tab.visible} signal={info.tab.signal} requestId={params?.documentId===selected?params.requestId:undefined} onEditing={setBusy}/> : items.find(item=>item.documentId===selected)?.kind==="presentation" ? <LivePresentation key={sessionId+selected} documentId={selected} sessionId={sessionId} office={props.office} visible={info.tab.visible} signal={info.tab.signal} requestId={params?.documentId===selected?params.requestId:undefined} onEditing={setBusy}/> :
        <LiveDocument
          key={sessionId + selected}
          documentId={selected}
          sessionId={sessionId}
          office={props.office}
          visible={info.tab.visible}
          signal={info.tab.signal}
          requestId={
            params?.documentId === selected ? params.requestId : undefined
          }
          onEditing={setBusy}
        />
      ) : (
        <div className="wd-office-empty">
          <h2>从想法写成文档</h2>
          <p>
            {error ||
              "在左侧对话中请 AI 使用 content_open 创建文档，再分批写入。内容会在这里实时出现，并可直接编辑。"}
          </p>
        </div>
      )}
    </section>
  );
}
export function LiveDocument({
  documentId,
  sessionId,
  office,
  visible,
  signal,
  requestId,
  onEditing,
}: {
  documentId: string;
  sessionId: string;
  office: OfficeClient;
  visible: boolean;
  signal: AbortSignal;
  requestId?: string;
  onEditing: (value: boolean) => void;
}) {
  const [zoom, setZoom] = useState(100);
  const mount = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const [following, setFollowing] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const model = useMemo(
    () =>
      office.createDocument({
        documentId,
        sessionId,
        visible,
        signal,
        requestId,
      }),
    [documentId, sessionId, office, signal],
  );
  const view = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const { title, status, editing, ready, problem, failed } = view;
  useEffect(() => model.attach(mount.current!), [model]);
  useEffect(() => {
    model.setVisible(visible);
    model.setRequest(requestId);
  }, [model, visible, requestId]);
  useEffect(() => onEditing(editing), [editing, onEditing]);
  useEffect(() => {
    const container = scroll.current!,
      paper = mount.current!;
    let frame = 0;
    const track = () => {
      follow.current =
        container.scrollHeight - container.clientHeight - container.scrollTop <
        64;
      setFollowing(follow.current);
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (follow.current && !model.getSnapshot().editing)
          container.scrollTop = container.scrollHeight;
      });
    });
    observer.observe(paper);
    container.addEventListener("scroll", track, { passive: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      container.removeEventListener("scroll", track);
    };
  }, [model]);
  return (
    <>
      <div className="wd-office-toolbar">
        <span className="wd-office-title" title={title}>
          {title}
        </span>
        <span role="status" className="wd-office-status">
          {status}
        </span>
        <button
          disabled={!ready || failed || downloading}
          onClick={async () => {
            setDownloading(true);
            setDownloadError("");
            try {
              await model.download();
            } catch (e) {
              setDownloadError(e instanceof Error ? e.message : String(e));
            } finally {
              setDownloading(false);
            }
          }}
        >
          {downloading ? "正在下载…" : "下载 Word"}
        </button>
        {editing ? (
          <button onClick={() => void model.finish()} disabled={failed}>
            完成编辑
          </button>
        ) : (
          <button
            onClick={() => void model.begin()}
            disabled={!ready || failed}
          >
            编辑
          </button>
        )}
      </div>
      <Toolbar
        model={model}
        disabled={!editing || failed}
        zoom={zoom}
        setZoom={setZoom}
      />
      {downloadError && (
        <div role="alert" className="wd-office-problem">
          {downloadError}
        </div>
      )}
      {!following && !editing && (
        <button
          className="wd-office-follow"
          onClick={() => {
            follow.current = true;
            setFollowing(true);
            scroll.current!.scrollTop = scroll.current!.scrollHeight;
          }}
        >
          跟随最新内容 ↓
        </button>
      )}
      {problem && (
        <div role="alert" className="wd-office-problem">
          {problem}{" "}
          {failed ? "请先保留页面中的文字；此版本不会自动覆盖冲突内容。" : ""}
        </div>
      )}
      <div ref={scroll} className="wd-office-paper-scroll">
        <div
          ref={mount}
          className="wd-office-paper"
          style={{ zoom: zoom / 100 }}
          onDoubleClick={() => void model.begin()}
        />
      </div>
    </>
  );
}
