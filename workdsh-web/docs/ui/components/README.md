# 共用配置弹框（原型组件）

`config-dialog.js` 与 `config-dialog.css` 由专家、技能、连接器配置共用。`project-dialogs.js` 提供领域示例数据，组件自身不持有业务状态、不调用 API。

- `WorkDSHConfigDialog.open({title, content, confirm, onConfirm})`：content 为 DOM 节点；标题用 textContent；可选确认回调由调用方提供。返回原生 dialog。
- `card(name, description, icon)`：返回紧凑图文卡片；文字以 textContent 写入，长文本省略并提供完整 title。
- 依赖原型 icons.js 的 svgIcon；先加载 icons，再加载组件和领域装配。
- 原生模态行为限制背景交互；Escape/关闭后恢复触发焦点。一次打开一个弹框。
- 确定在当前只读示例中仅关闭，不表示保存。添加显示未接入提示。

正式 D02 将此结构迁移到 packages/ui 并适配官方主题与前端框架；不直接复制原型全局 CSS，不将当前文件视为已发布 UI 包。
