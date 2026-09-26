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
