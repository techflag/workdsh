## 0.1.0-alpha.12 — Unreleased（2026-09-22）

- 适配 DeepSeek Harness 0.1.7-alpha.1、Cordis 4.0.3，更新精确依赖。

# 0.1.0-alpha.11

- 按用户决定隐藏尚无领域实现的「助理」「定时任务」「更多」侧栏入口：未实现的功能不再注册导航入口与占位页，避免脚手架被当成已交付能力；项目、专家 · 技能 · 连接器、资料库保持，实现完成后恢复入口。

# 0.1.0-alpha.10

- 导出标准 name/inject/apply，由默认展示包通过 ctx.plugin 注册独立子插件生命周期。
- 将能力中心侧栏入口交还 Skill Client，移除 Skill 后不残留空入口；原生工作区和会话导航保持。
- 仍随展示产物编译，本版本不宣称独立 npm 安装交付。

# 0.1.0-alpha.9

- 进入 D02，将 Harness Slot 装配、工作台 TSX 页面结构与样式拆分，公开入口只导出装配函数。
- 保持官方 Sidebar、Workspace、Session 与 Conversation 所有权，未接入领域页继续显示真实边界。

# 0.1.0-alpha.8

在 Harness 官方 Sidebar 上按 WorkBuddy 信息架构增量加入助理、项目、“专家 · 技能 · 连接器”、定时任务、资料库和更多。“专家 · 技能 · 连接器”保持一个能力中心入口，内部再分领域；官方工作区/会话区域及全部菜单继续由 Harness 持有。

# 0.1.0-alpha.6

撤销整块 sidebar 替换，恢复 Harness 官方工作区和会话导航，因此保留工作区创建/重命名/删除、会话重命名/分叉/归档、时间、折叠和原生新会话行为。WorkDSH 后续只通过增量公开 Slot 添加业务入口。

# 0.1.0-alpha.5

“新建任务”直接进入 Harness 原生空会话，不再渲染 WorkDSH 自建输入器。`/` 指令、`@` 引用、附件、权限、模型及 preset 全部沿用官方 Conversation；左侧工作区行改为展开/收起分组，不再误触发任务创建。

# 0.1.0-alpha.4

侧栏改为 Harness 原生语义的“工作区 → 会话”层级，工作区选择留在左侧并驱动新任务首页；移除左侧“专家 · 技能 · 连接器”聚合入口。

# 0.1.0-alpha.3

新增正式 WorkDSH 新任务首页：读取 Harness 官方工作区列表，通过官方 Session Controller 创建任务，并将描述写入原生 Conversation 草稿。首页只负责任务入口，执行、模型、权限和附件继续由 Harness 管理。

# 0.1.0-alpha.2

修复“运行设置”直接替换侧栏却未打开设置的错误交互。入口改为“设置”，先显示 WorkDSH/Harness 设置职责及明确的跳转动作；支持遮罩、取消和 Escape 关闭。

# 0.1.0-alpha.1

通过官方 sidebar slot 提供 WorkDSH 导航；useSessions 读取真实任务，clear/open 返回原生 Conversation。更多/运行设置恢复官方侧栏，footer 可返回。
