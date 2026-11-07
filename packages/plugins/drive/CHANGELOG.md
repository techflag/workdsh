# workdsh-plugin-drive changelog

## 0.1.0-alpha.9

修复网盘 DOCX 在线编辑容器宽度溢出导致的工具栏两端控件被裁切（纯客户端；无契约/存储/服务端变更）。证据见 [drive-plugin-alpha7](../../../docs/evidence/drive-plugin-alpha7.md) 第 8.14 节。

- 布局（高）：`.wd-drive-preview-body.editing` 改为 `display:flex;flex-direction:column`，`.wd-drive-editor` 补 `width:100%;max-width:100%;min-width:0;flex:1 1 auto`。修复前容器 1445 px 超出预览区 912 px，工具栏 `scrollWidth 1448` 时两端控件落到视口外且无法通过滚动触达；修复后编辑器、挂载点与预览区同宽（912 px），26 个控件逐一 `scrollIntoView` 后 hit test 全部命中。

## 0.1.0-alpha.8

修复在线编辑「保存后再退出编辑」重复追加一条同内容修订（未发布）。证据见 [drive-plugin-alpha7](../../../docs/evidence/drive-plugin-alpha7.md) 第八节。

- 契约 `workdsh-contracts/drive`（高）：`DriveEditorHandle` 新增可选 `acknowledge?()`，只在 `appendRevision` 成功后回调；编辑器据此推进「已保存」基线，未收到回调时保持保守（提交失败重试仍导出字节，不丢数据）。
- 客户端（高）：`DrivePreview` 的 `commit()` 在修订写入成功并推进本地基线后调用 `acknowledge`；随后「退出编辑」的 `save()` 返回 `undefined`，不再产生第二条修订。

## 0.1.0-alpha.7

网盘 Office 文档在线编辑（DOCX）：新增按 `fileId` 追加修订的服务端能力与跨插件编辑器桥，编辑器只产出字节，写回与冲突检测由网盘按自己的授权与修订执行。证据见 [drive-plugin-alpha7](../../../docs/evidence/drive-plugin-alpha7.md)。

- 契约 `workdsh-contracts/drive`（高）：新增 `DriveAppendRevisionInput` / `DriveService.appendRevision(actor, input, signal?)`，输入必须带 `baseRevisionId` 与 `operationId`；新增 `DriveEditorInput` / `DriveEditorHandle` / `DriveEditorMount` / `DriveEditorRegistry` 供编辑能力提供方注册。
- 服务端（高）：`append-revision` 按 `fileId` 追加修订，`revision.number` 在同文件内递增，`file.currentRevisionId`/`byteLength`/`updatedAt` 同步；`baseRevisionId` 与当前修订不一致抛 `drive/revision-conflict`；同一 `operationId` 重试幂等，内容不同抛 `drive/operation-conflict`；沿用单文件上限、总配额与全文索引更新。
- Remote（高）：新增 `append-revision`（base64 字节）与 `stat` 端点；`drive/revision-conflict` 映射 HTTP 409，文案「文件已被其他编辑更新，请刷新后重试。」
- 客户端（高）：`management.appendRevision` / `management.stat`；新增 `createDriveEditorRegistry()` 并以 `ctx.provide('workdshDriveEditors')` 暴露，`register` 返回 disposer，沿用 `ctx.inject` 延迟接入，未安装编辑器时按钮不出现。
- UI（高）：预览页新增「在线编辑」，文件菜单新增「在线编辑」；打开前用 `stat` 取真实 `currentRevisionId` 作基线再取字节；保存走 `appendRevision`，成功推进本地基线并刷新列表，409 显示冲突文案并保留编辑器内改动；退出编辑前先写回，失败留在编辑器并显示原因；无改动时提示「没有需要保存的修改。」（不写空修订）。
- 能力晚到与边界：`useSyncExternalStore` 订阅注册表 revision，编辑器注册后入口自动出现；只有同时安装 office 且有 docx 能力时光标可用。25 MiB 以上文件不提供在线编辑（走下载）。
- 测试：新增 `drive appends an edited revision only against the current base revision`（修订号递增、字节更新、旧修订可读、搜索切换到新修订、幂等重试、过期基线 `drive/revision-conflict`、同 operationId 异内容 `drive/operation-conflict`、缺失文件 `drive/not-found`、重启后 `stat` 与搜索仍正确），`test` 7/7 通过。

## 0.1.0-alpha.6

补 alpha.5 浏览器复测 #3 残留的两项未完成项（纯客户端；无契约/存储/服务端变更）。证据见 [drive-plugin-alpha6](../../../docs/evidence/drive-plugin-alpha6.md)。

- `body` 锁滚（中）：抽屉打开时记录并覆盖 `document.body.style.overflow = 'hidden'`，关闭时恢复原值，背景不再跟着滚动。
- 焦点管理（中）：打开后焦点进入抽屉的关闭按钮，背景（`.wd-drive-mobilebar` 与 `.wd-drive-content`）设 `inert` 移出焦点与读屏顺序；关闭后按条件回焦 `.wd-drive-filter-toggle`（仅在焦点仍留在抽屉内或已丢失时，避免抢走用户主动点到的位置）。
- 断点越界（低）：监听 `matchMedia('(max-width: 760px)')`，放大到桌面宽度时自动关闭抽屉，防止锁滚与 `inert` 残留。
- 测试：`test` 6/6 通过（沿用既有用例；焦点与锁滚属浏览器行为，未新增自动化断言）。

## 0.1.0-alpha.5

浏览器逐页实测发现的 6 项客户端缺陷修复（纯 UI；无契约/存储/服务端变更）。证据见 [drive-plugin-alpha5](../../../docs/evidence/drive-plugin-alpha5.md)。

- 名称可发现性（中）：卡片名与搜索结果名补 `title`，超长省略后仍可查看全名。
- 会话筛选（中）：`shortId` 去掉 `session-` 前缀后取尾部 8 位，7 条会话不再同显「会话 session-…」；按钮 `title` 保留完整 ID 兜底。
- 移动筛选抽屉（中）：补遮罩（点击关闭）、`role="dialog"` / `aria-modal` / `aria-label`、标题「分类与筛选」与关闭按钮；`Escape` 关闭；抽屉态取消 `.wd-drive-filter-list` 内嵌滚动，改由抽屉单一滚动，类型/来源/会话不再被裁切。
- 预览元信息（中）：标签 `flex:none` + `white-space:nowrap`、值 `min-width:0` + `overflow-wrap:anywhere`，390 宽度下标签不再压成竖排、MIME 不再硬断。
- 更多操作弹层（中）：与抽屉共用同一 `window` `keydown` 监听，`Escape` 可关闭，键盘用户可退出。
- 390 卡片与标题（低）：单列卡片 icon 区改 `aspect-ratio:4/3` 且限宽 150px 居中；抽屉态隐藏 `h1`，不再与 mobilebar 重复显示「网盘」。
- 测试：`test` 6/6 通过（本版为纯客户端改动，无用例增减，React/CSS 无可自动化断言）。

## 0.1.0-alpha.4

全量缺陷复核与修复（高 4 / 中 5 / 低 4；1 项属契约设计内本版不改）。证据见 [drive-plugin-alpha4](../../../docs/evidence/drive-plugin-alpha4.md)。

- 目录归档（高）：`archive` 改为节点级级联，文件夹连同子树一起离开列表；`DriveNode` 增 `status`/`archivedAt`（zod default `active`，`schemaVersion` 仍为 1，旧记录无需迁移）。
- 回收站（高）：`listArchived` 只列顶层归档节点并返回原路径 `folderPath`，可按目录整体恢复；`restore` 用 `archivedAt` 时间戳判定同批归档，不会连带恢复此前单独删除的文件，重名时自动改名。
- 面包屑（高）：`goTo` 索引修正，点击任意层级回到正确目录。
- 预览（高）：`DrivePreview` 按 MIME/扩展名分流——文本读文本、图片/音视频走 `objectURL`、PDF/Office/压缩包与超过 25MB 只给元信息与下载，不再按 UTF-8 解码成乱码。
- 下载与超时（中）：新增 GET `/api/workdsh-drive/download`（`fileId`/`revisionId`/`mode`），服务端取真值填 `Content-Type`/`Content-Disposition`（含 `filename*=UTF-8''`）、`cache-control: private, no-store`、`nosniff`；删除仅用于 base64 的 `read-bytes` 端点，客户端改 `Blob` 下载，上传超时放宽到 10 分钟。
- 筛选与目录（中）：进入文件夹清除筛选；「全部文件」回目录列表而非平铺搜索；空条件筛选回落 `clearFilter()`。
- 上传（中）：目标目录显式展示（`uploadTarget` state 取代陈旧 ref），逐文件容错并统计失败、无论成败都刷新列表。
- 重名（中）：归档节点不再参与重名检查，删除后可立即新建同名。
- 搜索摘要（低）：`excerptOf` 大小写折叠后按原文定位，切片不再错位。
- 模型工具（低）：`drive_read` 增加文本类型校验（`TEXT_LIKE`），二进制返回 `drive/unsupported-read`；`drive_save` 参数说明限定纯文本，删除「字节路径」矛盾描述。
- 截断提示（低）：列表与搜索命中 50 条上限时显式提示，不再静默截断。
- UI 规范：面板操作图标全部改为 `Icon`（新增 `trash/image/video/audio/archive/file/chat/tag/download` 等路径），纯图标按钮补可访问名称，补移动端筛选抽屉与上传目标条。
- 测试：新增「整目录归档 / 分批恢复 / 同名释放 / 自动改名」用例与原生下载路由断言，6/6 通过。

## 0.1.0-alpha.3

- 修复存储 schema 把标识符上限复用到全文索引值：`textIndex` 的值改为独立上限 `MAX_INDEX_CHARS`（128K 字符），与写入侧降采样一致。此前正文超过 256 字符的索引记录会在重载时校验失败，导致 `workdsh_drive` 域整条记录不可加载、插件不激活。schemaVersion 不变，既有记录无需迁移。
- 新增回归用例：长正文索引记录经重启后仍可加载并支持正文搜索。

## 0.1.0-alpha.2

- 全文内容搜索（文本类文件降采样索引）、回收站/恢复/彻底删除、真实配额展示；预览页新增返回列表入口。

## 0.1.0-alpha.1

- 骨架占位：包结构、tsconfig、依赖声明（官方 dsh 包精确 `0.2.1-alpha.2`）。业务能力待 t5/t6 实现。
