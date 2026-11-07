import * as React from 'react';
import type { DriveFileKind, DriveTreeEntry } from 'workdsh-contracts/drive';
import { Icon, type IconName } from 'workdsh-ui';

export type DriveMenuState = { entry: DriveTreeEntry; x: number; y: number };

const kindIcon = (kind?: DriveFileKind): IconName => kind === 'image' ? 'image' : kind === 'video' ? 'video' : kind === 'audio' ? 'audio' : kind === 'archive' ? 'archive' : kind === 'document' ? 'document' : 'file';
const tileIcon = (entry: DriveTreeEntry): IconName => entry.kind === 'folder' ? 'folder' : kindIcon(entry.file?.kind);
const kindLabel: Record<DriveFileKind, string> = { document: '文档', image: '图片', video: '视频', audio: '音频', archive: '压缩包', other: '文件' };
const sizeLabel = (bytes: number): string => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : bytes < 1024 * 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;

/** 列表视图：网盘浏览与回收站共用；回收站额外显示原位置，便于判断整目录恢复的目标。 */
export function DriveFileList({ entries, onOpen, onMenu, mode = 'drive' }: { entries: readonly DriveTreeEntry[]; onOpen: (entry: DriveTreeEntry) => void; onMenu: (event: React.MouseEvent, entry: DriveTreeEntry) => void; mode?: 'drive' | 'recycle' }) {
  if (!entries.length) return <div className="wd-drive-empty"><div><h2>{mode === 'recycle' ? '回收站是空的' : '这里还没有文件'}</h2><p>{mode === 'recycle' ? '删除的文件与文件夹会先进入这里，可随时恢复。' : '上传文件，或让对话产物自动归档到这里。'}</p></div></div>;
  return <div className="wd-drive-grid">{entries.map(entry => {
    const meta = entry.kind === 'folder' ? '文件夹' : `${kindLabel[entry.file?.kind ?? 'other']} · ${sizeLabel(entry.file?.byteLength ?? 0)}`;
    return <div key={entry.id} className="wd-drive-tile" data-kind={entry.kind === 'folder' ? 'folder' : entry.file?.kind}>
      <button className="wd-drive-tile-main" onClick={() => onOpen(entry)} aria-label={`打开 ${entry.name}`}>
        <span className="wd-drive-tile-icon"><Icon name={tileIcon(entry)} size={26} /></span>
        <span className="wd-drive-tile-name" title={entry.name}>{entry.name}</span>
        <span className="wd-drive-tile-meta">{meta}</span>
        {mode === 'recycle' && entry.folderPath ? <span className="wd-drive-tile-path" title={entry.folderPath}>{entry.folderPath}</span> : null}
      </button>
      <button className="wd-drive-tile-more" aria-label={`${entry.name} 更多操作`} onClick={event => { event.stopPropagation(); onMenu(event, entry); }}><Icon name="ellipsis" size={16} /></button>
    </div>;
  })}</div>;
}

export const driveSizeLabel = sizeLabel;
export { kindIcon, kindLabel };
