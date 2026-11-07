import type { ActorContext, ResourceOwner } from './governance.js';

/** 归档来源：对话产物捕获自动判定，上传来源由用户动作产生。 */
export type DriveSource = 'ai-generated' | 'user-upload' | 'tool-output';
export type DriveFileKind = 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other';
/** 删除采用归档（保留历史引用），不原地改写已发布对象。 */
export type DriveStatus = 'active' | 'archived';

export interface DriveSpace {
  readonly id: string;
  readonly title: string;
  readonly owner: ResourceOwner;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** 已用字节（当前 revision 字节合计，来自真实服务）。 */
  readonly usedBytes: number;
  /** 配额上限字节。 */
  readonly totalBytes: number;
}

export interface DriveNode {
  readonly id: string;
  readonly spaceId: string;
  readonly parentId?: string;
  readonly kind: 'folder' | 'file';
  readonly name: string;
  readonly fileId?: string;
  /** 节点级生命周期：归档以节点为单位，文件夹与其子树一起进出回收站。 */
  readonly status: DriveStatus;
  /** 节点进入回收站的时间（用于按时间戳区分「随目录归档」与「更早被单独删除」）。 */
  readonly archivedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DriveFile {
  readonly id: string;
  readonly spaceId: string;
  readonly nodeId: string;
  readonly kind: DriveFileKind;
  readonly mediaType: string;
  readonly byteLength: number;
  readonly owner: ResourceOwner;
  readonly status: DriveStatus;
  readonly source: DriveSource;
  /** 来源会话（关联与筛选）。产物捕获时由事件携带。 */
  readonly sessionId?: string;
  readonly currentRevisionId: string;
  /** 内容寻址附件引用（不可变）。 */
  readonly attachmentId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DriveRevision {
  readonly id: string;
  readonly fileId: string;
  readonly number: number;
  readonly sha256: string;
  readonly byteLength: number;
  readonly attachmentId: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

export interface DriveTreeEntry extends DriveNode {
  readonly file?: DriveFile;
  readonly revision?: DriveRevision;
  /** 节点所在目录路径（「我的网盘 / A / B」）；回收站条目即其原位置。 */
  readonly folderPath?: string;
}

export interface DriveSaveInput {
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly mediaType?: string;
  readonly source: DriveSource;
  readonly sessionId?: string;
  readonly parentId?: string;
  readonly operationId: string;
}

/**
 * 在线编辑写回：以 baseRevisionId 做乐观并发控制，只有基于当前修订的保存才会落成新修订。
 * baseRevisionId 与服务端 currentRevisionId 不一致时抛 `drive/revision-conflict`。
 */
export interface DriveAppendRevisionInput {
  readonly fileId: string;
  readonly bytes: Uint8Array;
  readonly baseRevisionId: string;
  readonly mediaType?: string;
  readonly operationId: string;
}

export interface DriveSearchFilters {
  readonly sources?: readonly DriveSource[];
  readonly kinds?: readonly DriveFileKind[];
  readonly sessionId?: string;
  readonly updatedAfter?: string;
  readonly updatedBefore?: string;
}

export interface DriveSearchHit {
  readonly fileId: string;
  readonly revisionId: string;
  readonly nodeId: string;
  readonly name: string;
  readonly kind: DriveFileKind;
  readonly source: DriveSource;
  readonly sessionId?: string;
  readonly updatedAt: string;
  readonly folderPath: string;
  readonly excerpt: string;
  readonly score: number;
}

/** 网盘中存在归档文件的会话引用（用于会话维度筛选）。 */
export interface DriveSessionRef {
  readonly sessionId: string;
  readonly updatedAt: string;
  readonly fileCount: number;
}

export interface DriveService {
  space(actor: ActorContext, signal?: AbortSignal): Promise<DriveSpace>;
  list(actor: ActorContext, parentId?: string, signal?: AbortSignal): Promise<readonly DriveTreeEntry[]>;
  createFolder(actor: ActorContext, name: string, parentId?: string, signal?: AbortSignal): Promise<DriveNode>;
  save(actor: ActorContext, input: DriveSaveInput, signal?: AbortSignal): Promise<DriveTreeEntry>;
  /**
   * 在既有文件上追加新修订（内容不可变、修订号递增）。
   * 供在线编辑与工具改写使用；baseRevisionId 必须等于当前修订，否则 `drive/revision-conflict`。
   */
  appendRevision(actor: ActorContext, input: DriveAppendRevisionInput, signal?: AbortSignal): Promise<DriveTreeEntry>;
  /** 按文件 ID 读取节点元信息（名称/媒体类型/大小），供下载与读取工具取服务端真值。 */
  stat(actor: ActorContext, fileId: string, signal?: AbortSignal): Promise<DriveTreeEntry>;
  readBytes(actor: ActorContext, fileId: string, revisionId?: string, signal?: AbortSignal): Promise<Uint8Array>;
  search(actor: ActorContext, query: string, filters?: DriveSearchFilters, signal?: AbortSignal): Promise<readonly DriveSearchHit[]>;
  listSessions(actor: ActorContext, signal?: AbortSignal): Promise<readonly DriveSessionRef[]>;
  rename(actor: ActorContext, nodeId: string, name: string, signal?: AbortSignal): Promise<DriveNode>;
  move(actor: ActorContext, nodeId: string, parentId: string | undefined, signal?: AbortSignal): Promise<DriveNode>;
  archive(actor: ActorContext, nodeId: string, signal?: AbortSignal): Promise<void>;
  /** 回收站：列出已归档文件（含其原路径），按归档时间倒序。 */
  listArchived(actor: ActorContext, signal?: AbortSignal): Promise<readonly DriveTreeEntry[]>;
  /** 恢复已归档节点（含后代），回到 active。 */
  restore(actor: ActorContext, nodeId: string, signal?: AbortSignal): Promise<void>;
  /** 彻底删除节点（含后代）：移除网盘对象与修订引用，附件字节由附件后端保留。 */
  purge(actor: ActorContext, nodeId: string, signal?: AbortSignal): Promise<void>;
}

/** 在线编辑器挂载输入：编辑器只拿到字节，不直接接触网盘写服务。 */
export interface DriveEditorInput {
  readonly fileId: string;
  readonly revisionId: string;
  readonly name: string;
  readonly bytes: Uint8Array;
}

/**
 * 编辑器句柄：save 返回要写回的新字节（无改动返回 undefined）；dispose 释放挂载资源。
 * acknowledge 只在网盘写回成功后回调，编辑器据此推进「已保存」基线；
 * 未收到回调时保持保守（再次 save 仍导出字节），避免提交失败的重试被误判为无改动。
 */
export interface DriveEditorHandle {
  save(): Promise<Uint8Array | undefined>;
  acknowledge?(): void;
  dispose(): void;
}

export type DriveEditorMount = (target: HTMLElement, input: DriveEditorInput) => DriveEditorHandle | Promise<DriveEditorHandle>;

/**
 * Optional Client capability: 编辑类插件（如 Office）贡献在线编辑能力，网盘不 import 其内部实现。
 * 保存仍由网盘按授权与 baseRevisionId 冲突检测执行。扩展名入参有无前导点均可。
 */
export interface DriveEditorRegistry {
  register(extensions: readonly string[], mount: DriveEditorMount): () => void;
  canEdit(name: string): boolean;
  mount(target: HTMLElement, input: DriveEditorInput): Promise<DriveEditorHandle>;
  subscribe(listener: () => void): () => void;
  getRevision(): number;
}
