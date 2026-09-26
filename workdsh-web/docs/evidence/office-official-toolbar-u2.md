# Tiptap 官方工具栏复用 / OFFICE-AI-01 U2

2026-09-12。官方复用记录见 U1-IMPLEMENTATION.md；来源锁定 https://github.com/ueberdosis/tiptap-ui-components/tree/799929bea4804c73767562b69f8acc2acdb8ac86 。官方文档：https://tiptap.dev/docs/ui-components/primitives/toolbar 与 https://tiptap.dev/docs/ui-components/templates/simple-editor 。后者明确 MIT，收费 DOCX 模板未引入。

实际复用 Toolbar/ToolbarGroup、Button 无 tooltip 分支、13个官方 SVG。保留 MIT 全文、SOURCE.md 和构建后的 THIRD-PARTY-LICENSES.txt。依赖 alias 本地化；导航直接依据当前 DOM disabled 状态，避免源码 Tab 陷阱，原生 select/input 不被箭头导航劫持；样式转到现有 scoped CSS，省去全局 SCSS 和独立 Editor Provider。44px单行，32px按钮热区，常规字体与字号，颜色不再用大边框。缩放和查找同排，字符数尾部显示；窄栏横向滚动，未做动态溢出菜单，不声称官方完整 DOCX 编辑器。

验证：Office typecheck/build，7项集成测试；probe-office-live.mjs 11项检查，格式→保存→重开→DOCX样式保留、实时追加与上滚暂停、模拟组合输入、下载、冷重开。新增窄栏高度<=52px/控制同排/实际可滚动，以及末端按钮focus揭示、Home/ArrowRight/Tab行为。1500x1050与1100x900 CSS视口，缩放100%，截图 .artifacts/office-live/document-toolbar.png 和 document-toolbar-narrow.png，已目视核对普通宽度截图。

本轮真实模型、Word/WPS、系统输入法与全仓测试未执行。没有修改原生交付卡工具路径；文档表格/图片/链接/分页模型仍待实施。
