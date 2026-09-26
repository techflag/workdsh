# 默认组合包

> GitHub 模块制品与兼容矩阵：[发布说明](../../docs/RELEASES.md)。当前验证 Harness **0.1.6-alpha.2 Web**；内置 **0.1.2-rc.1** 的旧桌面入口缺失尚未修复，本包不包含该兼容修复。

状态：**P0 实现中，含 P1 展示切片**。当前包含安装/生命周期探针、公共侧栏、全局技能目录和真实新任务入口；完整产品组合尚未实现。

- 实现阶段：P0
- 主任务：P0-02，详见 [开发计划](../../docs/PLAN.md)
- 职责：组合各功能插件，预构建 tgz 可安装。
- 边界：不实现 Agent loop 或私有启动器。

## 开发前阅读

[规则](../../AGENTS.md)、[状态](../../docs/STATUS.md)、[契约](../../docs/CONTRACTS.md)、[团队设计](../../docs/TEAM-DESIGN.md)。

所有业务操作遵守服务端主体和组织上下文；页面与 Agent 工具调用相同领域服务。可选功能接入通过公开契约与生命周期注入。

## 验收与下一步

完成对应 PLAN 任务及 [验收矩阵](../../docs/ACCEPTANCE.md) 场景，记录真实测试证据后才更新状态。先验证公开接口，再实现；Host 入口输出激活/清理标记；Client 通过官方 Slots 提供 WorkDSH 导航、业务面板及诊断面板。新任务直接进入原生 Conversation，诊断页调用真实 pluginInventory Remote，不提供假业务响应。

本地候选版本 **0.1.0-alpha.46**。build/typecheck 使用包内脚本，安装验证由根 scripts/probe-install.mjs 提供。源码经 TypeScript/TSX 编译后打包，不依赖上游 checkout。

Skill 已拆为 `workdsh-plugin-skills@0.1.0-alpha.30` 的独立 Host/Client 安装层，本包不再导入或直接调用其初始化函数。开发时运行 `corepack pnpm build` 和 `corepack pnpm preview:install`，由官方 CLI 将这两个精确版本的 tgz 安装到预览 Profile。仅安装本包提供品牌、工作台展示和诊断，不会暗中初始化 Skill；需要技能时显式安装 Skill 包。

Workbench alpha.11 仍随展示产物编译，但通过 `ctx.plugin(workbench)` 建立正式子插件生命周期。它尚无独立安装制品，本轮不宣称所有规划模块均可独立分发。技能页面和侧栏能力中心入口归 Skill Client 所有。初始 URL 在官方 Client 组合完成后解析，缺失页面回到原生 Conversation，避免先选择尚未注册的面板。

浏览器验收：根目录先 build，再运行 corepack pnpm probe:browser。`workdsh-view=home` 为旧地址兼容并归一化到原生 `conversation`；接入诊断必须显式使用 `diagnostics=1&workdsh-view=diagnostics`，普通产品 URL 不注册诊断页面或导航。新任务使用 Harness 原生空会话编辑器。无需模型 API Key。
