# UI-CONTROLS-01 公共表单控件

## 官方能力复用记录
- 公开文档：docs/dsh-v0.1.7-alpha.1/docs/web-styling.zh.md。
- 锁定发布包：@deepseek-ai/dsh-client-ui-primitives@0.1.7-alpha.1 根 exports/types。
- Button 支持 primary/outline/ghost/toolbar，md 36px、sm 28px、16px 图标；Input 提供原生输入与图标容器。
- 无独立 Select/Textarea 导出：公共 UI 使用 HTML 原生语义和主题变量补齐，不引入第二套组件库。
- 迁移范围：项目、资料库、技能、专家、连接器的管理操作与表单；卡片、导航、开关、引用 chip、对话发送保留专用行为。
- 验收：构建、类型、浏览器控件几何/主题/输入与选择行为；未完成前不宣称验收。

## 实现
- 公共 UI 导出 Button/Input/Select/Textarea；Button/Input 经官方公开入口加载，不复制上游实现。
- 原生 alpha.1 不转发 ref；适配层以 React useId/useImperativeHandle 保持聚焦引用，不增加 DOM 包装。
- 页面旧 CSS 放入 workdsh-business 层，原生控件和公共表单规则优先；保留业务布局与卡片/开关/导航样式。Input 的布局选择器同时匹配官方容器。
- 标准单行控件外框 36px，紧凑动作 28px；文本域随内容用途增高，技能源码编辑保留足够高度。
- 业务模块声明原生 UI 精确依赖和 Client 注入，构建将原生包保持 external；公共 UI 标记无副作用，未使用控件的 bundle 不引入原生运行依赖。
- 显式保留资料库搜索 submit 行为；不创建项目、不保存 MCP、不调用模型。

## 验收
- 全量 build/typecheck 已通过。
- scripts/probe-preview-controls.mjs：五模块、36/28px几何、明暗主题、原生输入聚焦、模板选择、资料库搜索提交及无 React 页面异常通过。
- 1440×1000 明暗截图及结果：.artifacts/controls/。1920/390 项目弹窗边界与键盘焦点已检查；发现窄屏按钮换行后补齐不收缩规则；最终包复验通过，按钮文字完整显示。
- 未执行：全模块移动端业务流程、屏幕阅读器、真实模型任务与全量 Host 集成回归；本轮不改变 Host 业务逻辑。

最终验收：scripts/probe-preview-controls.mjs PASS（五页面 36/28px 几何、light/dark、Input ref 聚焦、Select、搜索 submit、1920/390 弹窗与按钮文字）。最终 build、typecheck、check:plan、git diff --check PASS。开发环境 18989 已更新并保持运行。

窄屏最终修正：项目弹窗 footer 改为自适应高度，复验包含按钮边界完全位于弹窗内，避免固定 footer 高度裁切按钮。最终探针 PASS。

### 会话输入区主题修复
复用原生主题别名与 panel elevation，修复 ConnectorPicker 内联 CSS 固定深色，以及 LibraryPicker 悬停固定浅色图标。覆盖连接器弹层、详情与按钮，不修改原生输入框。

验证：连接器/资料库构建通过；真实会话 light/dark/light 背景和悬停文字颜色断言通过，截图 `.artifacts/composer-theme/`。未执行连接器业务调用及全量回归。
