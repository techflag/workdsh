## 0.1.0-alpha.8

- 合并上游 `0.1.6-alpha.2` 线：适配 DeepSeek Harness 0.1.6-alpha.2，当前会话改为按 `SessionSummary.retainedBy.mainView` 推导。
- CSV 预览并入本线的按需产物：`CsvDocument` 从启动壳移入 `dist/office-runtime.js`，`sidebar.right.tab.document` 的 CSV 槽位改用统一的 `deferred` 包装按需取得组件，启动包继续只保留注册壳。
- `--word-only` 精简制品不注册 CSV 表格预览与对应侧栏 Tab，客户端注册范围与 `release-scope.json` 的 `docx` 声明一致；完整制品不受影响。
- 版本号撞号修复：本线与上游线都发布过 `0.1.0-alpha.6`（内容不同），上游另有 `0.1.0-alpha.7`，合并后重新定版为 `0.1.0-alpha.8`；下方 `alpha.6`/`alpha.7` 记录即合并前的两条线。

## 0.1.0-alpha.7（上游线）

- 适配 DeepSeek Harness 0.1.6-alpha.2：当前会话改为按 `SessionSummary.retainedBy.mainView` 推导；CSV 预览按官方 `DocumentContent` 新增的 `renderer` 变体显式收窄三种内容形态。
- `--word-only` 精简制品不再注册 CSV 表格预览与对应侧栏 Tab，客户端注册范围与 `release-scope.json` 的 `docx` 声明一致；完整制品不受影响。

## 0.1.0-alpha.6 — 2026-09-19（本线）

- 编辑器运行时拆成独立的按需产物 `dist/office-runtime.js`，由插件自己的 Web 路由托管：启动包只保留注册壳（65,204,471 B → 16,677 B），打开文档时才注入脚本并取得模块表导出。
- 旧内联编辑器页面改为按需产物 `dist/editor.html`，同样经该路由取用；URL 不带修订号，故用 ETag 重校验而不是 immutable 缓存。
- 声明 `modules` 客户端注入：懒加载经内核模块表取产物，缺该声明时页面只报 `cannot get property "modules" without inject`。

## 0.1.0-alpha.6（上游线，2026-09-17）

- CSV 文件在右侧文件 Tab 以只读表格打开：单元格网格线、表头与行号、冻结表头/行号列、数字右对齐、超长内容省略并悬停查看，长行不再溢出。
- 解析复用 PapaParse 5.7.0（MIT）的 RFC 4180 能力与分隔符识别；字节解码（UTF-8/GB18030/UTF-16 BOM）与 1500 行/120 列/24000 单元格显示上限为自有业务差异，超限时明确提示仅显示前缀。
- 官方“纯文本”渲染器仍作为回退保留；许可文本随构建自动收集（papaparse 不在缺文本清单）。

## 0.1.0-alpha.5 — 2026-09-15

- 支持从客户 PPTX 模板建立独立工作副本，保留母版、版式、主题、媒体与原文件。
- 修复长任务大文件分块导出和重复媒体膨胀，加入受控模板文字更新与风格预览。
- 原生 DOCX/PPTX/XLSX 隔离安装探针覆盖当前界面；首次安装优先缓存并只放行 `protobufjs` 构建。

## 长任务 PPT 修复（2026-09-14）

- 所有超过 96 KiB 的导出文件走分块官方 bash 写入，修复模板 PPTX 单命令参数过长；保留 SHA 校验、原子链接、目标冲突保护和失败不交付。
- 保存前从当前 PPTX 重新绑定已知临时媒体引用，避免 load 生成的新 blob URL 导致未修改背景被误判并反复打包；支持旧 Host 的已失效媒体句柄。

## Unreleased — PPTX template working copies

- Add `content_import_pptx` using the calling Session Harness filesystem and the existing Office ownership, audit, idempotency and live editor flow; retain original PPTX package and never overwrite the template.
- Add guarded `presentation.updateText` for template text boxes, preserving geometry and native metadata; full text replacement retains the first run style.
- Bound native imports and allow authorized human PPT saves up to 30 MiB without widening ordinary document or Agent edit limits.
- Render named DemiBold/Semibold faces at CSS weight 600 to avoid extra heavy CJK glyph painting; stored font/style remains unchanged.

## Current source candidate — HTML and PDF working copies

- Open self-contained HTML working copies before AI revision updates; sandbox the native preview and retain source/download bytes.
- Add PDF Chinese text and rectangle pages, AI page updates, manual text edits, real PDF.js preview, PDF download and native file delivery.
- Embed the licensed Noto Sans SC static font; no end-user Python, font download or system-font requirement for the PDF workflow.
- Existing arbitrary PDF import, OCR and image editing remain outside this slice. Published archives are unchanged.

## alpha.3 未发布：当前中文 PPT 编辑器集成

- 唯一 PPT 提供方：pptx-react-viewer 3.16.5 / pptx-viewer-core 3.14.3。
- 移除其他 PPT 编辑/预览实现及依赖；保留原生编辑、图表数据、同服务修订保存与中文工具栏。
- PPTX 文件 Tab 直接挂载；服务工作副本采用稳定页 ID。

## 0.1.0-alpha.3 — Unreleased PPT adapter work

- Add a private presentation model and atomic slide/element operations, native Konva10.5.0 canvas interactions and PptxGenJS4.0.1 editable text/image export. Both new components are MIT.
- This is a tested technical slice, not an installable real-time PPT feature yet. Host service, six tools, right-pane UI, text input and independent package lifecycle validation remain pending. PPT commands remain unavailable.
- Word development is paused; published alpha.2 remains unchanged.

## 0.1.0-alpha.2 — Word tables/images preview (2026-09-12)

- Reuse MIT Tiptap TableKit and Image extensions for table insertion, row/column editing, header rows, merge/split, column dragging and native image resize.
- Table/image entry points appear near the start of the compact native toolbar.
- AI tools and human editing use the same validated block model, CAS, receipts and human leases; table/image IDs map after a human commit.
- DOCX working copies retain supported merged tables, column widths, embedded PNG/JPEG images, sizes/alignment and existing text styles; original bytes remain available.
- Semantic comparison ignores DTO property order, preventing endless saving after Host validation.
- Model reads expose opaque image references; the existing content service resolves authorized source images and copies their original bytes into the target working copy. Document understanding stays with the model; no separate agent or reference module is added.
- PNG/JPEG up to512 KiB per image; 1 MiB batch, 2 MiB document, 50×50 grid/500 cells maximum. Nested tables, cell images, floating-layout fidelity, headers/footers and complete pagination remain unsupported.


## 0.1.0-alpha.1 — Word text preview (2026-09-12)

- Independent Harness Host/Client plugin with six shared content tools and a saved semantic document service.
- AI creates and opens the right-hand working copy immediately, then writes in visible committed batches.
- Native Tiptap editing with headings, text styles, lists, find/replace, undo/redo, zoom, autosave and reading follow.
- Download the latest saved working copy as DOCX; AI export uses the native Harness deliverable card.
- DOCX imports create a separate text editing copy, retain original bytes and provide original-layout preview.
- Native `/office` output chips and optional `@` working-copy references with explicit reference/target roles.
- All tool registrations are owned by the plugin lifecycle. Removal revokes menus, tools and previews; reinstallation retains saved documents. Missing-source draft references fail serialization rather than silently sending plain text.
- DOCX copy styling is isolated from surrounding code/file-preview typography. An external source update during editing cannot replace the active copy until editing ends.

- Word-only release packaging excludes experimental Univer/Excel/PPT adapters and their runtime dependencies; bundled dependency license texts are checked before packing.
- Frozen-revision exports have stable content-addressed paths. Retry after a lost write receipt verifies existing bytes; conflicting files are preserved, cancellation prevents delivery, and delivery-only failure exposes the saved path. Optional baseRevision rejects a changed document.

### Scope

Word text working copies only. Tables, images, headers/footers, embedded objects and complete Word pagination are outside the editable semantic model. Text-copy import flattens table paragraphs and clearly warns about unsupported features. Original files remain available. The other seven output types are selectable but their live adapters remain pending.

This is a development preview, not a complete Word replacement or an eight-editor release. Professional layout checks in Word/WPS, OS IME checks, cross-host export recovery and power-loss durability remain separate acceptance work.

## 2026-09-14 PPT 风格预览候选

增加通用/红色各四套真实标题封面预览；通过 Office 持久保存及官方原生提问选择。内置 PPT 不再将红色直接视为红金；具体模板/风格及快速交付跳过选择。卡片不直接提交答案，真实模型完整制作尚待验收。
