# P1-01：公共外壳复用记录

- 官方依据：[Slots](../dsh-v0.1.6-alpha.2/subsystems/slots.zh.md)、[Web Client](../dsh-v0.1.6-alpha.2/subsystems/web-client.zh.md)、[右侧 Sidebar](../dsh-v0.1.6-alpha.2/subsystems/sidebar-right.zh.md) 与 [Harness 官方开发规范](../HARNESS-OFFICIAL-DEVELOPMENT.md)。
- 锁定发布包：dsh-client-ui-layout/sidebar/session/renderer、dsh-api-session-controller，均 0.1.5-rc.1；公开 /client 类型入口。
- 复用：官方 sidebar owner 继续提供 Workspace、Session、新会话、搜索、菜单与设置；WorkDSH 仅用 `sidebar.brand.*` 和 `sidebar.panellist` 增量贡献品牌与业务入口，并以同 key `main` entry 配对；`layout.selectPanel(null)` 返回原生 Conversation。
- 自有差异：业务入口标签、图标和对应全局管理页；ui 纯组件，无 Host、账户或存储。业务项目/权限不在本切片实现。
- 已有证据：正式 Host 中业务入口与官方工作区/会话树同时存在，技能浏览、重连与卸载恢复已验证。原生 owner 的 child Slot 不由 WorkDSH 重声明或复制。
- 待验收：1440/1920/390 同视口的最终视觉对齐；未来会话级资料/成果若进入右栏，按 tab registry、keyed body、owner props 和 Session scope 单独验收。

## 结果

历史 alpha.8 曾验证设置说明弹框；该替代 Sidebar 方案随后废止。当前正式约束保留 Harness 原生设置入口，不再插入“返回 WorkDSH”或中转确认弹框。现行 bundle 的 build/typecheck、正式 Host 业务入口、原生工作区/会话树、重连和卸载恢复已有独立记录。

未实现/验证：业务项目/团队授权、所有页面的公共组件及右侧 Sidebar 的 WorkDSH tab 类型。未运行模型和额外持久化测试。

## 2026-09-22：P1-01 增量 —— 「新建任务」任务创建器复用记录

**用户决定**：把「新建任务」做成任务创建器（豆包式），与官方「新会话」区分；官方「新会话」入口文案本版保持不动。面板归属 workbench（工作台拥有整体布局）。

| 字段 | 内容 |
| --- | --- |
| 任务与范围 | P1-01 增量（D02 已完成步骤内的功能补充，不改变 D05/D06/D07 步骤状态）。可验收行为：点击侧栏「新建任务」显示创建器面板；选定运行位置/项目/专家/连接器后确认，写入绑定并进入原生空会话；任务描述仅作为草稿预填，不自动发送。 |
| 官方能力 | [Slots](../dsh-v0.1.6-alpha.2/subsystems/slots.zh.md)、[Web Client](../dsh-v0.1.6-alpha.2/subsystems/web-client.zh.md)；锁定 `0.1.6-alpha.2` 的 `dsh-client-ui-slots`、`dsh-client-ui-layout`、`dsh-client-ui-sidebar`、`dsh-client-ui-workspace`、`dsh-client-ui-conversation`、`dsh-api-session-controller`、`dsh-api-workspace-controller` 公开 `/client` 入口。原生所有者仍是官方：`sidebar.panellist` 行、`main.conversation`、`conversation.input.overlay`、Session Controller、Workspace Controller。 |
| 复用选择 | 直接复用 + 公开扩展。会话创建、打开、草稿回填、布局返回全部走官方公开入口；项目/专家/连接器只走各领域已发布的 `/api/workdsh-*` 公开 HTTP 契约（与 `ProjectsPanel.tsx` 调用 `/api/workdsh-library`、`/api/workdsh-connectors` 的既有先例一致），不横向导入其他功能插件实现。 |
| 自有边界 | 仅新增：创建器面板的字段与校验、绑定写入顺序、待开放项标注。仍归官方/各领域的事实：Session 与执行日志、消息发送、权限与模型、专家编译 preset 与 `ExecutionBinding`、项目配置快照与 `ProjectTaskLink`、连接器选择真源。workbench 不复述也不缓存这些事实。 |
| 证据与差异 | 已有探针：`projects` `startTask`（`sessions.create` → `set-task-selection`/`set-selection` → `linkTask` → `conversation.send`）、`experts` `summon`（`prepare-execution` → `create-execution` → `openSession` → `consume-handoff` → `seedDraft`）、`skills` `startSkillTask`（sessionStorage + overlay + `setDraft`）。差异：workbench 侧新增对 `/api/workdsh-projects` `link-task` 与 `/api/workdsh-connectors` `set-selection` 的调用。 |
| 验收 | 正例：选定工作空间与专家后确认，进入原生空会话且专家 `handoff` 文本预填为草稿。反例：未选运行位置时拒绝并给出原因；专家 `prepare-execution` 返回 `missing` 时显示不可召唤原因且不创建会话；绑定写入失败时不静默继续。未覆盖：技能、权限策略、模型与推理强度、初始附件（本版标注待开放）。 |

**更正记录**：本轮一度判断「接入专家需先给 experts 补公开发起端点」。实测 `packages/plugins/experts/src/services/connection-api.ts` 的 endpoint 白名单与分发中已包含 `prepare-execution`、`create-execution`、`consume-handoff`、`verify-binding`，**v1 不需要修改 experts 插件**，工作量小于当时陈述的预估。
