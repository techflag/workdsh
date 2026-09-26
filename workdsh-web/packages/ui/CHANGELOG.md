# 0.1.0-alpha.7 — Unreleased（2026-09-22）

- 统一 Button/Input/Select/Textarea 公开入口，优先复用官方组件，补齐选择框和文本域。

- 共享 Modal 背景、遮罩、文字、关闭按钮和投影复用原生主题变量，随系统明暗切换。

# 0.1.0-alpha.6 — 2026-09-15

- 统一共享 Modal 的紧凑层级、关闭按钮、滚动区、底部操作栏和窄屏边界。

# 0.1.0-alpha.5

- Icon 图标集新增 `back` 左向返回图标，供独立列表页（技能「我安装的」页等）的返回入口使用；24×24、1.7px 描边约定不变。

# 0.1.0-alpha.4

- 将公开入口改为纯 TypeScript barrel，拆分 Icon、导航组件、主题令牌、导航样式和 Modal 样式。
- 新增跨平台 WorkDSH LogoMark，供 Harness 品牌 Slot 和其他插件复用。
- 保持既有导出和 CSS class 兼容，继续由 Harness 官方 renderer 渲染。

# 0.1.0-alpha.3

- 公共组件源码迁移为 TSX。
- 新增带 Escape、遮罩关闭、焦点返回和焦点约束的共享 Modal，供技能、专家、连接器与行业应用复用。

# 0.1.0-alpha.1

Icon、IconButton、NavItem、NavGroup、主题令牌和导航样式。纯展示，无 Host、账号、数据库或执行状态。
