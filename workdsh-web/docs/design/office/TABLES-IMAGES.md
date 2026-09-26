# OFFICE-WORD-02：表格与图片扩展接入

官方能力复用记录（2026-09-12）：Harness 0.1.5-rc.1，沿用 https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/cordis-tutorial/02-lifecycle-and-effects.md 与现有 content 工具/Remote/Session 右栏探针。无新 Loader、传输、存储服务或 Agent loop。

Tiptap 3.31.0 发布包公开入口 @tiptap/extension-table 的 TableKit 与 @tiptap/extension-image 的 Image，均 MIT。TableKit.configure({table:{resizable:true}}) 提供表格、单元格选择、列宽拖动、行列命令、mergeCells/splitCell；Image.configure({allowBase64:true,resize:{enabled:true}}) 提供图片节点及原生缩放 NodeView。公开类型已核对。工具栏只调用这些命令，不自建表格编辑器或图片缩放逻辑。

业务差异：沿用顶层 blockId、CAS、幂等操作与人工租约；表格作为一个原子块，单元格包含有样式的正文/标题段落，合并尺寸与列宽是语义属性。图片作为嵌入式 raster 块，src/宽高/对齐持久化。复杂嵌套表格和单元格图片暂不接受。共同块信封保留 runs 字段，表格/图片 runs 必须为空，内容唯一存放于 table/image，避免文本投影成为第二份数据。旧 paragraph/heading 记录不变。原子替换表格继续使用 document.replaceBlock，不新增另一套 UI 写入路径。

资源限额：每张嵌入图片最多 512 KiB；仅 PNG/JPEG，校验 MIME 与文件头；不下载外部 URL、不执行 SVG。保持现有 1 MiB 操作批次和 2 MiB 文档限制，大图片需另行设计官方文件资产引用，不能静默截断。表格最多50行/50列、500个单元格、总文本20000字符，必须完整矩形网格，合并不可重叠。

DOCX 通过已有 JSZip codec 增量支持 w:tbl/gridSpan/vMerge 及 DrawingML 嵌入图片，不引入付费转换、系统 Office 或服务器。复杂浮动图、样式继承和完整分页继续明确警告/保留原文件，不宣称完整保真。

验收目标：原生命令→统一 reducer→保存重开；AI 工具同模型；表格/图片 OOXML 导出再导入；非法网格/资源拒绝，整个批次回滚；实际浏览器列宽/合并/缩放交互及插件生命周期。完成结果写入 STATUS，不以安装扩展代替验收。
