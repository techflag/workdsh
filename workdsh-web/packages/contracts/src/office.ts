/** Office v1 public DTOs. No SDK, storage implementation or runtime values. */
import type { ActorContext } from "./governance.js";
export type OfficeMark = "bold" | "italic" | "underline" | "strike";
export type OfficeTextStyle = {
  fontFamily?: string;
  fontSize?: number; // points
  color?: string; // #rrggbb
  backgroundColor?: string;
};
export type OfficeParagraphStyle = {
  alignment?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  indent?: number; // 0–6 steps
};
export type OfficeList = {
  type: "bullet" | "ordered";
  depth: number; // 0–5
  start?: number;
  continuation?: boolean; // another paragraph in the same list item
};
export interface OfficeRunInput {
  text: string;
  marks: OfficeMark[];
  style?: OfficeTextStyle;
}
export interface OfficeRun extends OfficeRunInput {
  runId: string;
}
export interface OfficeTableCell {
  colspan: number;
  rowspan: number;
  colwidth?: number[];
  header?: boolean;
  paragraphs: OfficeParagraphInput[];
}
export interface OfficeTable { rows: { cells: OfficeTableCell[] }[] }
export interface OfficeImage {
  src: string; // bounded embedded PNG/JPEG, never remote URL
  alt?: string;
  width: number;
  height: number;
  alignment?: "left" | "center" | "right";
}
export type OfficeChartType = "bar" | "line" | "pie" | "doughnut" | "area";
export interface OfficeChart {
  chartType: OfficeChartType;
  title?: string;
  categories: string[];
  series: { name: string; values: number[]; color?: string }[];
  width: number;
  height: number;
  alignment?: "left" | "center" | "right";
  legend?: "none" | "top" | "right" | "bottom" | "left";
  xAxisTitle?: string;
  yAxisTitle?: string;
}
export interface OfficeParagraphInput {
  type: "paragraph" | "heading";
  level?: number;
  runs: OfficeRunInput[];
  style?: OfficeParagraphStyle;
  list?: OfficeList;
}
export interface OfficeBlockInput extends Omit<OfficeParagraphInput, "type"> {
  type: "paragraph" | "heading" | "table" | "image" | "chart";
  table?: OfficeTable;
  image?: OfficeImage;
  chart?: OfficeChart;
  level?: number;
  runs: OfficeRunInput[];
  style?: OfficeParagraphStyle;
  list?: OfficeList;
}
export interface OfficeBlock extends Omit<OfficeBlockInput, "runs"> {
  blockId: string;
  runs: OfficeRun[];
}
export interface OfficeDocumentState {
  modelVersion: 1;
  blockIds: string[];
  blocks: Record<string, OfficeBlock>;
}
export type OfficeOperation =
  | {
      op: "document.insertBlocks";
      afterBlockId: string | null;
      blocks: (OfficeBlockInput & { clientRef: string })[];
    }
  | {
      op: "document.replaceBlock";
      blockId: string;
      expectedText: string;
      block: OfficeBlockInput;
    }
  | { op: "document.removeBlock"; blockId: string; expectedText: string };
export type OfficeOpenInput =
  | { source: "new"; title: string; operationId: string }
  | { source: "existing"; documentId: string }
  | { source: "import"; title: string; operationId: string; blocks: OfficeBlockInput[] };
export interface OfficeEditInput {
  documentId: string;
  baseRevision: number;
  operationId: string;
  operations: OfficeOperation[];
}
export interface OfficeReceipt {
  operationId: string;
  revision: number;
  status: "committed";
  ids: Record<string, string>;
}
export interface OfficeSnapshot {
  documentId: string;
  kind: "document";
  title: string;
  revision: number;
  state: OfficeDocumentState;
  generation: string;
}
export interface OfficeContentService {
  open(
    actor: ActorContext,
    input: OfficeOpenInput|OfficePresentationOpenInput|OfficeSpreadsheetOpenInput|OfficeHtmlOpenInput|OfficePdfOpenInput,
    signal?: AbortSignal,
  ): Promise<OfficeContentSnapshot>;
  read(
    actor: ActorContext,
    documentId: string,
    signal?: AbortSignal,
  ): Promise<OfficeContentSnapshot>;
  edit(
    actor: ActorContext,
    input: OfficeEditInput|OfficePresentationEditInput|OfficeSpreadsheetEditInput|OfficeHtmlEditInput|OfficePdfEditInput,
    signal?: AbortSignal,
  ): Promise<OfficeReceipt>;
  present(
    actor: ActorContext,
    documentId: string,
    signal?: AbortSignal,
  ): Promise<{
    requestId: string;
    documentId: string;
    revision: number;
    status: "requested";
  }>;
}

/** Adapter-owned native JSON, validated by the Office presentation provider. */
export interface OfficePresentationSnapshot extends Omit<OfficeSnapshot, "kind" | "state"> {
  kind: "presentation";
  state: {modelVersion: 1; deck: unknown; focusSlideId?: string};
}
export interface OfficeHtmlSnapshot extends Omit<OfficeSnapshot, "kind" | "state"> {
  kind: "html";
  state: {modelVersion:1;html:string};
}
export interface OfficeHtmlOpenInput {source:"new";kind:"html";title:string;operationId:string}
export interface OfficeHtmlEditInput extends Omit<OfficeEditInput,"operations"> {operations:{op:"html.replaceDocument";html:string}[]}
export type OfficeContentSnapshot = OfficeSnapshot | OfficePresentationSnapshot | OfficeSpreadsheetSnapshot | OfficeHtmlSnapshot | OfficePdfSnapshot;
export type OfficePresentationOpenInput = {
  source: "pptx";
  kind: "presentation";
  title: string;
  operationId: string;
  /** Internal service transport; model-facing tool reads via Harness fs. */
  bytes: string;
} | {
  source: "new";
  kind: "presentation";
  title: string;
  operationId: string;
  brief?: string;
}
export interface OfficePresentationEditInput extends Omit<OfficeEditInput, "operations"> {
  operations: unknown[]; // native adapter validates the exact operation union
}

export interface OfficeSpreadsheetCell {
  value?: string | number | boolean | null;
  formula?: string;
}
export interface OfficeSpreadsheetState {
  modelVersion: 1;
  sheetOrder: string[];
  sheets: Record<string, {sheetId: string; name: string; cells: Record<string, OfficeSpreadsheetCell>}>;
}
export interface OfficeSpreadsheetSnapshot extends Omit<OfficeSnapshot, "kind" | "state"> {
  kind: "spreadsheet";
  state: OfficeSpreadsheetState;
}
export interface OfficeSpreadsheetOpenInput {
  source: "new"; kind: "spreadsheet"; title: string; operationId: string;
}
export interface OfficeSpreadsheetEditInput extends Omit<OfficeEditInput, "operations"> {
  operations: unknown[];
}

export type OfficePdfElement = {id:string;x:number;y:number;width:number;height:number}&({type:"text";text:string;fontSize:number;lineHeight:number;color:string}|{type:"rectangle";fill:string});
export interface OfficePdfPage {id:string;width:number;height:number;background:string;elements:OfficePdfElement[]}
export interface OfficePdfSnapshot extends Omit<OfficeSnapshot,"kind"|"state"> {kind:"pdf";state:{modelVersion:1;pages:OfficePdfPage[]}}
export interface OfficePdfOpenInput {source:"new";kind:"pdf";title:string;operationId:string}
export interface OfficePdfEditInput extends Omit<OfficeEditInput,"operations"> {operations:({op:"pdf.insertPage";afterPageId:string|null;page:OfficePdfPage}|{op:"pdf.updatePage";pageId:string;page:OfficePdfPage}|{op:"pdf.removePage";pageId:string})[]}
