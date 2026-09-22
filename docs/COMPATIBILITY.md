# 官方依据与兼容验证

## 固定版本

目标 `@deepseek-ai/dsh@0.1.6-alpha.1`。2026-09-16 复核官方 npm：该版本是当前最新发布（GitHub release `dsh-v0.1.6-alpha.1`，2026-09-15 发布），对应 `alpha` 标签；`latest` 仍为 0.1.5-rc.1、`next` 为 0.1.5-rc.2。抽查 14 个关键包（dsh、dsh-web、dsh-web-app、dsh-client-ui-slots、dsh-experimental-agent-team、dsh-experimental-auto-review、dsh-computer-use、dsh-headless、dsh-mcp-resources、dsh-client-ui-sidebar-terminal、dsh-client-ui-settings-unarchive-sessions、dsh-ptc-runtime、dsh-workflow-ptc、dsh-session-projection）的 alpha 标签同为 0.1.6-alpha.1；`pnpm check:versions` 复核 495 条锁文件条目全部为 0.1.6-alpha.1、Cordis 仅 4.0.2，未出现 alpha 混搭。不得凭单个包 latest 标签拼装版本族。

版本升级需更新锁文件、该表、集成测试证据与 ADR，保持与业务功能变更可区分。

2026-09-16 同步记录：仓库内镜像 `docs/deepseek-harness-docs` 已与 tag `dsh-v0.1.6-alpha.1` 对齐，530 个文件逐 git blob 哈希一致（补齐 158 个缺失文件、刷新 134 个变化文件），并按上游删除 `subsystems/code-runtime.*`（该页在本版本更名为 `subsystems/ptc-runtime.*`，审查台账同步改名）。原生 preset 仍为标准／PTC／极简／创造四种，锁定包 `dsh-agent-presets@0.1.6-alpha.1` 的 README.zh.md 与 `preset.yml` 复核了复制、broken 原因、删除与漂移语义，与 ARCHITECTURE 记载一致；`dsh web --host 0.0.0.0` 在锁定 CLI 上仍按安全理由拒绝（实测原文：`--host 0.0.0.0 is intentionally not supported yet for safety`）。该版本要求适配的变更逐项核对结果：`agent/session-start` 改为异步串行 `agent/created`，experts 执行守卫与 connectors 会话选择已在用新事件；Team 统一 `spawn_teammate` 并在 Profile 停用旧 `subagent`／`subagent_fork`，见 experts `cordis.patch.yml`；PTC 包与服务统一为 `ptc-runtime` 系列，自有代码未引用旧 `dsh-code-runtime`；工作流执行器为 `dsh-workflow-ptc`；内置 E2B 后端移除，本项目未使用；Session 同步历史接口 `snapshotEvents`／`eventAt`／`ownEvents` 弃用，自有代码无引用。

2026-09-16 更名清理记录：本版本族退役了 `@deepseek-ai/dsh-code-runtime`、`@deepseek-ai/dsh-code-runtime-worker-thread`、`@deepseek-ai/dsh-workflow-worker-thread` 三个包名（npm 该版本查询均 404，最后发布版本为 0.1.5-rc.2），对应新名为 `dsh-ptc-runtime`、`dsh-ptc-runtime-node`、`dsh-workflow-ptc`。仓库 `pnpm.overrides` 中残留的三个旧名条目已删除（package.json 与 pnpm-lock.yaml overrides 段同步移除），`pnpm install --frozen-lockfile` 报 `Lockfile is up to date`；锁文件解析结果本身此前已只使用新名，故运行时依赖面不变。`scripts/check-published-versions.mjs` 原有断言只校验"已解析条目必须有精确 override"，无法发现"override 指向已退役包名"，已补反向断言（DSH 命名空间的 override 必须有对应解析条目），改后 `pnpm check:versions` 仍 PASS 495 条。

2026-09-16 版本引用统一：`docs/HARNESS-OFFICIAL-DEVELOPMENT.md`（2 处）、`docs/ARCHITECTURE.md`、`docs/PLAN.md`、`docs/DEVELOPMENT.md` 及产品网站 `website/index.html`、`website/zh-CN.html`（页脚上一行安装说明）中残留的 `0.1.5-rc.1` 全部改为 `0.1.6-alpha.1`；`pnpm-lock.yaml` 已无该串。

2026-09-16 验证结果：`pnpm build`、`pnpm typecheck`、`pnpm test:integration`（102/102 通过）、`pnpm check:versions`（PASS 495 条）均为退出码 0；3031 预览 Host 仍在运行并返回需认证的 401。未执行：升级后的真实模型任务回归；`docs/research/deepseek-harness-review.json` 的审查范围未随镜像扩张，新文档保持待评审状态（`pnpm audit:harness-docs` 报 127/167 已评审、40 待评审，退出码 0）。

## 官方文档

- [快速开始](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart)
- [插件开发](https://deepseek-harness.github.io/deepseek-harness/develop/basic/)
- [打包安装](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)
- [能力的三种角色](https://deepseek-harness.github.io/deepseek-harness/develop/practice/)
- [Web Client](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/web-client)
- [Web Client Slots](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/slots)
- [右侧 Sidebar](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/sidebar-right)
- [新增 Package](https://deepseek-harness.github.io/deepseek-harness/reference/cookbook/adding-a-package)
- [技能](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/skills)
- [会话与输入](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/conversation)
- [会话投影](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/session-projection)
- [0.1.6-alpha.1 发布说明](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.6-alpha.1)

在线文档可能继续变化；以选定发布包的公开 exports/types 和可重复集成验证落实，不把其他版本或旧仓库的观察当作已验证行为。

## P0 验证矩阵

| 能力 | 设计用途 | 状态 |
| --- | --- | --- |
| bundle / plugin CLI | 独立安装与卸载 | tgz 安装、Host 激活、停服卸载后重启及重装通过；当前产品运维契约为停止 Host 后变更包并重启，运行中 CLI 热变更不作为用户路径 |
| Client Modules / Remote / Slots | 功能页面和 Host 通信 | 包根扫描、侧栏/页面注册、官方清单 Remote、页面刷新、WebSocket 关闭后自动重连及新 HTTP 查询、停服卸载后 Client 缺席通过；Skill exact Fetch 的认证、超时、中途取消、暂存清理和提交前重试通过；通用自有 Typert Remote 生成仍为上游兼容项，见 [Client 证据](evidence/d01-client.md) |
| Agent Preset 创作/挂载/恢复 | 专家发布与精确修订绑定 | 待验证 |
| scoped skills/tools | 按专家选择能力 | 待验证 |
| Session 注入与投影 | 持久执行事实与对象绑定 | 待验证 |
| MCP / credentials | 连接实例、账号与动态就绪 | 待验证 |
| Conversation / Sidebar | 真实轨迹与成果预览 | 待验证 |
| Subagent / Workflow | P2 专家团 | 待验证 |
| Schedule | 会话提醒，不能先假定等于独立调度 | 待验证 |

安装及生命周期证据见 [D01 安装验证](evidence/d01-installation.md)。Client/Remote 等未执行部分继续保持待验证；本机 HTTP 登录不是团队授权证据。

2026-09-10 自有 Remote 补充：rc.1 generator 只识别登记的 workspace protocol 符号或对应 ambient 声明，当前纯 npm 最小例无法生成 Remote 元数据。官方 runtime decorator/namespace 测试 4/4 通过，但不替代生成。该点阻塞未来通用自有 Remote 的发布链，作为 Harness 升级兼容项保留；它不阻塞 Skill 插件使用 Connection 官方 exact Fetch 扩展面。项目不修改依赖、不伪造 protocol。复现与边界见 [Remote 证据](evidence/d01-remote.md)。

团队产品依据与证据边界见 [TEAM-DESIGN](TEAM-DESIGN.md)，包括用户提供的企业版概述以及官方连接器、协作、企业智能体说明。

D00 新增探针 Q01—Q04，详见 ACCEPTANCE；全部待验证。关键边界见 ADR-0007。公开接口不满足时记录禁用/阻塞结论，不隐式降低保障。
