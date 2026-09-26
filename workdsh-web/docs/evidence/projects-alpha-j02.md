# Projects Alpha J02 证据

日期：2026-09-17。

领域测试同时维护两个项目：两者分别保存独立指令和能力配置；从第一个项目创建任务时固定当时的 `configRevisionId`；随后移除第一个项目的技能不会改变旧任务修订，也不会改变第二个项目仍关联的技能及其源修订。重启 Host 后上述配置与任务快照保持不变。

验证命令：`corepack pnpm --filter workdsh-plugin-projects test`。
