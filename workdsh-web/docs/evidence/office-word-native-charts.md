# OFFICE-WORD-CHART-01 原生 Word 图表（2026-09-16）

## 官方能力复用记录（编码前）

- 任务：Word 报告中的分析图表必须由 Office 插件根据结构化数据绘制，不能让模型生成 PNG/Base64 后作为图片插入。
- 官方底座：继续复用锁定 `@deepseek-ai/dsh@0.1.6-alpha.1` 的 Loader/Profile、工具、Session、右侧 Tab、文件交付与审批链路；没有新增 Agent loop、模型路由、文件服务器或替代编辑器。
- 公开扩展面：WorkDSH Office 插件已有 `content_open/read/edit/export`、版本化内容模型、Tiptap Client 和 OOXML DOCX 导出器。官方 Harness 不拥有文档内部图表语义；业务差异在 Office 插件内扩展 `chart` 块。
- 实现：模型提交 `chartType/categories/series` 等结构化数据；浏览器 NodeView 使用 SVG 绘制；DOCX 写入 `word/charts/chartN.xml`、Chart relationship 和 `word/embeddings/*.xlsx`。图表不是 `word/media` 图片，数据保存在嵌入工作簿中。
- 验收：Host schema/reducer、编辑器 JSON 往返、浏览器实际 SVG、DOCX Chart XML/relationship/content type、嵌入 XLSX 数据和无图表图片回归。现有 PNG 图表不会根据像素自动恢复原始数据，须由已知数据重新生成结构化图表。

## 已验证结果

Office build/typecheck 通过；Office content、download、rich editor 相关 30 项测试通过。浏览器渲染柱状图为 SVG，页面中没有 `img`；DOCX 包含原生 `c:chart` 和嵌入工作簿，且没有为该图表生成 `word/media` 文件。测试覆盖柱状图的完整导出；line/pie/doughnut/area 共享同一 schema 与生成器，尚未逐一在 Microsoft Word/WPS 人工打开签收。

## 边界

DOCX 导入仍是非无损工作副本导入；本轮没有实现把任意外部 Word 原生图表反向解析成 WorkDSH `chart` 块。已存在的图片图表保持图片，不做 OCR 或数值猜测。图表数据目前由 AI 通过同一 `content_edit` 修订更新，尚未增加人工图表数据面板。
