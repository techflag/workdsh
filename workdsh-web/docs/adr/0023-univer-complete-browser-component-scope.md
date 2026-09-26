# ADR-0023：完整 Univer 浏览器组件范围与独立版本迁移验证

日期：2026-09-12。状态：Accepted（用户要求全组件；运行交付尚未完成）。

## 决策

用户要求截图中全部类别纳入：Sheets、Modern Docs、Traditional Docs、Slides、Boards、Bases、PDFs、Compose & Embed、Customization & Integration。后两项为跨产品组合及宿主集成能力，不是另造两个业务模块。两类 Docs 属于文档布局/编辑体验，不能简单把两份 textarea 作为实现。

继续使用现有独立 Office 功能插件，通过 Harness 官方文档 Tab 扩展；原生工具栏、渲染、选区、键盘、撤销和结构编辑归 Univer 所有。移除额外文字片段表单必须随可用的原生编辑路径交付。所有类别纳入退出矩阵，不以展示示例目录替代真实组件。

Registry 验证：目前0.25.1具有 community Docs/Slides；新版 Boards/Bases/PDFs/pro Slides/embed 对应0.25.1不存在，1.0.0-rc.0存在。因此在隔离目录验证一致锁定1.0.0-rc.0全套组合，再迁移 Office；不混装两族SDK，不升级 Harness。

## 硬约束与退出条件

- 不运行转换服务器、Office/LibreOffice，不向第三方上传用户文件。
- 部分产品需要有效的 Univer 客户端授权；未配置时明确不可用，不伪造许可或复制官网授权。npm包可获取不等于使用授权已完成。
- 原生 snapshot 编辑与原始 Office/PDF 导入导出分别验收。SDK fixture 成功不签收真实 DOCX/PPTX 保真。
- Sheets/Docs/Slides/Boards/Bases/PDF 各自验证初始化、页面键盘/对象编辑、撤销重做、snapshot保存/重新打开、生命周期释放、无外部请求和官方 Tab 接入。
- Modern/Traditional Docs 验证文档布局差异；Compose/Embed 验证真实关联与资源边界；Customization 验证中文、主题、响应尺寸、宿主权限边界。
- 复杂Office转换未实现时保留真实预览与明确限制；不降为纯文字后静默丢失图片、表格、图表和布局。

## 官方复用记录

任务：Office原生编辑扩展 / 完整组件范围（用户新指令覆盖原有限三格式范围）。
公开包：@univerjs/presets、preset-sheets-core、preset-docs-core；@univerjs-pro/{slides,boards,bases,pdfs,embed}及其UI/可选元素插件，统一1.0.0-rc.0。官方文档：各guides产品getting-started/installation、guides/license。既有0.25.1探针：scripts/probe-univer-native-editors.mjs；新族发布面：.artifacts/univer-native-editors/package-matrix.json；隔离安装：.artifacts/univer-full-sdk。已有官方documentPreviews/Slot集成不替换。

业务差异仅为授权文件输入/输出、格式映射、组件选择、Harness Tab生命周期。不能另造文档渲染或编辑引擎。D04/D15业务步骤不因SDK范围扩大自动完成。
