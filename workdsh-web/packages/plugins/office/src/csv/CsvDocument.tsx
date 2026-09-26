import React, { useMemo } from 'react';
import type { DocumentPreviewProps } from '@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client';
import { decodeCsvBytes, parseCsv, type CsvTable } from './csv.js';
import csvCss from './csv.css';

const encodingLabels: Record<string, string> = {
  'utf-8': 'UTF-8',
  'gb18030': 'GB18030',
  'utf-16le': 'UTF-16 LE',
  'utf-16be': 'UTF-16 BE',
};
const delimiterLabels: Record<string, string> = {
  ',': '逗号分隔',
  ';': '分号分隔',
  '\t': '制表符分隔',
};
const numeric = /^-?\d+(?:\.\d+)?$/;

function cellTitle(value: string): string | undefined {
  return value.length > 300 ? `${value.slice(0, 300)}…` : value || undefined;
}
function cellClass(value: string): string | undefined {
  return value.length <= 20 && numeric.test(value.trim()) ? 'wd-csv-num' : undefined;
}
/** The parsed table is memoized input; wrap toggling only swaps the section class. */
const Grid = React.memo(function Grid({ table }: { table: CsvTable }) {
  const { columns } = table;
  return (
    <table className="wd-csv-table">
      <thead>
        <tr>
          <th className="wd-csv-rownum" scope="col" aria-label="行号" />
          {Array.from({ length: columns }, (_, column) => (
            <th key={column} scope="col" title={cellTitle(table.header[column] ?? '')}>
              {table.header[column] ?? ''}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, index) => (
          <tr key={index}>
            <th className="wd-csv-rownum" scope="row">
              {index + 1}
            </th>
            {Array.from({ length: columns }, (_, column) => {
              const value = column < row.length ? row[column]! : '';
              return (
                <td key={column} className={cellClass(value)} title={cellTitle(value)}>
                  {value}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
});

/** Read-only CSV table body for the right-Sidebar document seat, owned by the official preview registry. */
export function CsvDocument(props: DocumentPreviewProps) {
  const { content, wrap, scrollportRef } = props;
  const decoded = useMemo(
    () => {
      if (content.kind === 'bytes') return decodeCsvBytes(content.data);
      // alpha.2: the owner can request renderer-owned loading; this read-only body renders
      // text or bytes only and has no loader to serve that request.
      if (content.kind === 'renderer') return null;
      return { text: content.text, encoding: 'utf-8' as const, binary: false };
    },
    [content],
  );
  const table = useMemo(() => parseCsv(decoded?.text ?? ''), [decoded]);
  const empty = !table.header.length && !table.rows.length;
  const clipped = table.truncatedRows || table.truncatedColumns;
  if (!decoded) return null;
  return (
    <section className={`wd-csv ${wrap ? 'wrap' : 'nowrap'}`} aria-label="CSV 表格预览">
      <style>{csvCss}</style>
      {decoded.binary && (
        <div className="wd-csv-note" role="note">
          文件包含 NUL 字节，看起来不是文本 CSV。可在预览菜单切换到“纯文本”查看原始内容。
        </div>
      )}
      {empty ? (
        <div className="wd-csv-empty">CSV 文件中没有可显示的数据。</div>
      ) : (
        <div className="wd-csv-scroll" ref={scrollportRef} tabIndex={0}>
          <Grid table={table} />
        </div>
      )}
      {!empty && (
        <footer className="wd-csv-status">
          <span>{encodingLabels[decoded.encoding]}</span>
          <span>·</span>
          <span>{table.columns > 1 ? delimiterLabels[table.delimiter] : '单列'}</span>
          <span>·</span>
          <span>
            {table.columns} 列 × {table.rows.length} 行
          </span>
          {clipped && (
            <span className="wd-csv-clip">
              · 文件较大，仅显示前 {table.rows.length} 行、{table.columns} 列
            </span>
          )}
        </footer>
      )}
    </section>
  );
}
