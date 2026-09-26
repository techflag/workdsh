# ADR 0014：工作台侧栏呈现

状态：已修订，2026-09-11。2026-09-10 的整块 sidebar priority 替换方案已废止；保留本 ADR 编号记录方向变化。

P1-01 展示切片扩展 ADR 0013 范围：ui 提供图标、导航项与主题令牌；workbench 通过公开 `sidebar.brand.*`、`sidebar.panellist` 和配对的 `main` entry 增量加入 WorkDSH 品牌与业务页面。官方 root、layout、sidebar owner、Workspace/Session model 和 Conversation 均不替换。

Harness 官方 Sidebar 继续拥有新会话、工作区、Session、搜索、筛选、创建工作区、工作区菜单、会话菜单和设置。WorkDSH 不读取或复制这些原生组件，不重声明 owner 已声明的 child Slot，不提供“更多/返回 WorkDSH”双侧栏往返，也不拦截原生设置入口。普通业务插件可以有左栏入口、设置入口或无 UI；入口位置不代表安装、运行范围或授权。

WorkDSH 的业务 entry 使用稳定 list id，并以相同 key 注册 main 页面。`layout.selectPanel(null)` 返回官方 `main.conversation`，因此 `/`、`@`、附件、权限、模型、preset、发送、取消和执行状态完整保留。Web 不模拟交通灯，不缓存第二份任务列表，不把 Workspace 冒充业务项目。

会话级文件、目录、资料、成果或上下文页面后续使用官方 `rightbar.session` 与 `sidebar.right.*`；它们不进入全局主导航，也不承载全局技能库或项目配置。实现要求见 [Harness 官方开发规范](../HARNESS-OFFICIAL-DEVELOPMENT.md)。

验证：当前组合已在正式 Host 验证 WorkDSH 业务入口与 Harness 原生 Workspace/Session 树同时存在，新会话进入原生 Conversation；构建、类型检查、重连、卸载和重装证据记录在 STATUS 与 `docs/evidence/`。最终视觉仍须按 UI-DESIGN 的 1440/1920/390 视口验收。
