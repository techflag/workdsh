/**
 * Read-only CSV decoding and parsing for the right-side document preview.
 * Byte decoding and the hard display budgets stay ours; RFC 4180 parsing and
 * delimiter detection are delegated to PapaParse. Parsing is bounded: a huge
 * file must still open promptly and honestly report that only a prefix is shown.
 */
import * as Papa from "papaparse";
export type CsvEncoding = "utf-8" | "gb18030" | "utf-16le" | "utf-16be";
export type CsvDelimiter = "," | ";" | "\t";
export interface CsvLimits { rows: number; columns: number; cells: number; }
export interface CsvTable {
  header: string[];
  rows: string[][];
  /** Number of columns shown, including padded header cells. */
  columns: number;
  delimiter: CsvDelimiter;
  truncatedRows: boolean;
  truncatedColumns: boolean;
}
export interface DecodedCsv { text: string; encoding: CsvEncoding; binary: boolean; }

export const csvLimits: CsvLimits = { rows: 1500, columns: 120, cells: 24000 };
const delimiters: CsvDelimiter[] = [",", ";", "\t"];

function bom(bytes: Uint8Array): { encoding: CsvEncoding; length: number } | undefined {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { encoding: "utf-8", length: 3 };
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return { encoding: "utf-16le", length: 2 };
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return { encoding: "utf-16be", length: 2 };
  return undefined;
}
/** Decode bytes as UTF-8, falling back to GB18030 for other real-world CSVs (for example vendor exports). */
export function decodeCsvBytes(bytes: Uint8Array): DecodedCsv {
  const marker = bom(bytes);
  const body = marker ? bytes.subarray(marker.length) : bytes;
  let text: string, encoding: CsvEncoding;
  if (marker) { encoding = marker.encoding; text = new TextDecoder(encoding).decode(body); }
  else {
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(body); encoding = "utf-8"; }
    catch {
      try { text = new TextDecoder("gb18030", { fatal: true }).decode(body); encoding = "gb18030"; }
      catch { text = new TextDecoder("utf-8").decode(body); encoding = "utf-8"; }
    }
  }
  const binary = !marker && text.includes("\0");
  return { text, encoding, binary };
}

/**
 * Parse RFC 4180 CSV text with PapaParse: quoted fields, doubled quotes, embedded
 * newlines and delimiter detection among comma/semicolon/tab. One row past the row
 * budget is parsed so real overflow is provable, the table is trimmed to the
 * column/cell budgets, and dropped content is reported instead of hidden.
 * The first row is returned as the header.
 */
export function parseCsv(text: string, limits: CsvLimits = csvLimits): CsvTable {
  const result = Papa.parse<string[]>(text, {
    delimiter: "", // auto-detect among `delimiters`
    delimitersToGuess: delimiters,
    skipEmptyLines: "greedy",
    preview: limits.rows + 1,
  });
  const delimiter: CsvDelimiter = result.meta.delimiter === ";" || result.meta.delimiter === "\t" ? result.meta.delimiter : ",";
  let rawWidth = 0;
  for (const row of result.data) if (row.length > rawWidth) rawWidth = row.length;
  const columns = Math.min(rawWidth, limits.columns);
  const capacity = Math.max(1, Math.floor(limits.cells / Math.max(columns, 1)));
  const shown = result.data.slice(0, Math.min(limits.rows, capacity));
  const clip = (row: string[]): string[] => (row.length > columns ? row.slice(0, columns) : row);
  return {
    header: clip(shown[0] ?? []),
    rows: shown.slice(1).map(clip),
    columns,
    delimiter,
    truncatedRows: result.data.length > shown.length,
    truncatedColumns: rawWidth > limits.columns,
  };
}
