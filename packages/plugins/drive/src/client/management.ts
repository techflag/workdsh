import type { Context } from '@deepseek-ai/cordis';
import type { DriveNode, DriveSearchHit, DriveSessionRef, DriveSpace, DriveTreeEntry } from 'workdsh-contracts/drive';

const path = '/api/workdsh-drive';
const invoke = async <T>(endpoint: string, payload: unknown, signal?: AbortSignal, timeoutMs = 60_000): Promise<T> => {
  const timeout = AbortSignal.timeout(timeoutMs);
  const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint, payload }), signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  const result = await response.json() as { ok?: boolean; value?: T; error?: { message?: string } };
  if (!result.ok) throw new Error(result.error?.message ?? '网盘操作失败。');
  return result.value as T;
};
const fileBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader(); reader.onerror = () => reject(reader.error ?? new Error('读取文件失败。'));
  reader.onload = () => resolve(String(reader.result).split(',', 2)[1] ?? ''); reader.readAsDataURL(file);
});
/** 分块拼二进制再 btoa，避免大数组展开触发调用栈溢出。 */
const bytesBase64 = (bytes: Uint8Array): string => {
  let binary = ''; const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  return btoa(binary);
};

export function createDriveClient(_ctx: Context, lifetime?: AbortSignal) {
  return {
    space: () => invoke<DriveSpace>('space', {}, lifetime),
    list: (parentId?: string) => invoke<readonly DriveTreeEntry[]>('list', { parentId }, lifetime),
    createFolder: (name: string, parentId?: string) => invoke<DriveNode>('create-folder', { name, parentId }, lifetime),
    // 大文件上传放宽到 10 分钟：固定 60s 在网络慢或文件大时必然失败。
    saveFile: async (file: File, parentId?: string, operationId?: string) => invoke<DriveTreeEntry>('save', { name: file.name, mediaType: file.type, base64: await fileBase64(file), operationId: operationId ?? crypto.randomUUID(), source: 'user-upload', ...(parentId ? { parentId } : {}) }, lifetime, 600_000),
    /** 在线编辑写回：基于 revisionId 追加新修订；服务端发现已过期时抛「文件已被其他编辑更新，请刷新后重试。」。 */
    appendRevision: (input: { fileId: string; revisionId: string; bytes: Uint8Array; mediaType?: string; operationId?: string }) => invoke<DriveTreeEntry>('append-revision', { fileId: input.fileId, baseRevisionId: input.revisionId, base64: bytesBase64(input.bytes), operationId: input.operationId ?? crypto.randomUUID(), ...(input.mediaType ? { mediaType: input.mediaType } : {}) }, lifetime, 600_000),
    /** 读取单个节点的当前状态：在线编辑需要用它拿到真实 currentRevisionId 作为并发基线。 */
    stat: (fileId: string) => invoke<DriveTreeEntry>('stat', { fileId }, lifetime),
    /** 走原生 GET 取二进制，不经过 base64 与 JSON，避免大文件内存翻倍。 */
    download: async (fileId: string, revisionId?: string, signal?: AbortSignal): Promise<Blob> => {
      const query = new URLSearchParams({ fileId, ...(revisionId ? { revisionId } : {}) });
      const combined = signal && lifetime ? AbortSignal.any([signal, lifetime]) : signal ?? lifetime;
      const response = await fetch(`${path}/download?${query.toString()}`, { credentials: 'same-origin', ...(combined ? { signal: combined } : {}) });
      if (!response.ok) throw new Error((await response.text()) || '下载失败。');
      return response.blob();
    },
    search: (query: string, filters: { sources?: readonly ('ai-generated' | 'user-upload' | 'tool-output')[]; kinds?: readonly ('document' | 'image' | 'video' | 'audio' | 'archive' | 'other')[]; sessionId?: string } = {}) => invoke<readonly DriveSearchHit[]>('search', { query, ...filters }, lifetime),
    sessions: () => invoke<readonly DriveSessionRef[]>('sessions', {}, lifetime),
    rename: (nodeId: string, name: string) => invoke<DriveNode>('rename', { nodeId, name }, lifetime),
    move: (nodeId: string, parentId?: string) => invoke<DriveNode>('move', { nodeId, parentId }, lifetime),
    archive: (nodeId: string) => invoke<{ archived: true }>('archive', { nodeId }, lifetime),
    listArchived: () => invoke<readonly DriveTreeEntry[]>('list-archived', {}, lifetime),
    restore: (nodeId: string) => invoke<{ restored: true }>('restore', { nodeId }, lifetime),
    purge: (nodeId: string) => invoke<{ purged: true }>('purge', { nodeId }, lifetime),
  };
}
export type DriveClient = ReturnType<typeof createDriveClient>;
