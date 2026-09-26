# 共享展示组件

状态：**已实现，0.1.0-alpha.7**。作为 WorkDSH 插件共享的纯展示组件包，由官方 Client renderer 渲染。

当前提供 LogoMark、Icon、IconButton、NavItem、NavGroup、主题令牌、导航样式和公共 Modal。公开 `src/index.ts` 只导出 API；TSX 组件、设计令牌和 CSS 字符串分别位于 `components/` 与 `styles/`。共享包不创建 React root，不持有 Cordis Context、Remote、Host、账号、数据库或执行状态。领域插件只传入标题、正文、动作和关闭回调。

Modal 统一处理 `role=dialog`、遮罩与 Escape 关闭、焦点约束、关闭后的焦点返回和窄屏保留边距显示。技能详情已经复用该组件；专家、连接器和行业应用后续可以直接复用相同外壳，不复制弹框生命周期。

规范与边界见 [UI 规范](../../docs/UI-DESIGN.md)、[公共外壳证据](../../docs/evidence/workbench-sidebar.md)、[ADR 0014](../../docs/adr/0014-workbench-sidebar-presentation.md)。

本版本通过 bundle 组合，子包不独立声明 dsh 加载入口。共享包只负责展示和可访问性交互，不承载技能安装、权限、团队对象或其他领域事实。

页面与弹窗使用 Harness 原生主题语义颜色，跟随官方外观设置及系统明暗切换。

公共 Button/Input 适配官方 ui-primitives@0.1.7-alpha.1；Select/Textarea 使用 HTML 原生语义，controlsCss 提供统一 36px 表单尺寸及主题状态。业务样式放在 workdsh-business cascade layer，原生控件外观优先；controlsCss 必须与管理视图样式一起加载。
