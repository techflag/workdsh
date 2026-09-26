# 官方依据、现状审查与开发前复用记录

核对日期：2026-09-12。源码基线：WorkDSH `5225e42`。本文件区分“产品参考”“官方公开约定”“现有实现”和“拟议能力”，禁止互相替代。

## 1. 产品来源

- **SRC-USER**：本轮用户指令——专家、专家团、制作专家三张参考图，交付需求/规范/约束/技术文档给其他开发工具；历史已确认本地/默认优先、公共企业管理后置、模块独立版本。
- **SRC-SCREENSHOTS**：[三张参考图](references/README.md)。详情内容、成员层级、按钮与预填文案据此设计；文档中的尺寸、状态、契约和验收为 WorkDSH 自行定义。
- **SRC-WB**：[WorkBuddy 官方专家中心说明](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Expert-Center)，本轮已访问。其说明将专家与专业角色联系，将专家团描述为分工协作；支持从中心召唤、查找、置顶和切换。这里只借鉴产品概念，不据此推断 WorkDSH 具有相同运行接口。
- **SRC-PLAN**：[当前计划](../../PLAN.md)、[开发顺序](../../development-order.json)、[团队设计](../../TEAM-DESIGN.md)、[企业后期边界](../../ENTERPRISE-EDITION.md)。D04 单专家，D11 专家团，企业阶段再建服务器与管理 Web。

WorkBuddy 的使用次数、计费倍数、线上专家数量和案例不写入本产品需求；本包的技术方案不是对 WorkBuddy 内部架构的断言。

## 2. Harness 官方来源与采用次序

开发约束入口：[官方开发规范](../../HARNESS-OFFICIAL-DEVELOPMENT.md)。采用次序：**锁定 npm 包 exports / `.d.ts` / 可重复运行证据 → 对应版本官方说明 → 最新在线说明**。发生差异时记录，不静默升级。

| 主题 | 官方文档/本地镜像 | 用途 |
|---|---|---|
| 外部包结构 | [adding-a-package](https://deepseek-harness.github.io/deepseek-harness/reference/cookbook/adding-a-package)、[本地镜像](../../dsh-v0.1.6-alpha.2/cookbook/adding-a-package.zh.md) | 理解 Host/Client/types；不能复制上游 monorepo 聚合配置到本仓库 |
| Slots/owner | [用户指定 sidebar-right 说明](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/sidebar-right#slot-%E4%B8%8E-owner-props)、[Slots](../../dsh-v0.1.6-alpha.2/subsystems/slots.zh.md) | 该链接是右栏体系，不能把它当整个左栏重写授权；左栏按既有 sidebar owner/公开 Slots |
| Agent/preset/persona | [core](../../dsh-v0.1.6-alpha.2/subsystems/core.zh.md) | setup、scope、preset、角色组合 |
| Skill | [skills](../../dsh-v0.1.6-alpha.2/subsystems/skills.zh.md) | 分层目录、按需正文、Session cwd/preset 影响 |
| Session/Conversation | [session](../../dsh-v0.1.6-alpha.2/subsystems/session.zh.md)、[conversation](../../dsh-v0.1.6-alpha.2/subsystems/conversation.zh.md)、[projection](../../dsh-v0.1.6-alpha.2/subsystems/session-projection.zh.md) | 原生任务、输入框和执行事实 |
| 持久数据 | [storage](../../dsh-v0.1.6-alpha.2/subsystems/storage.zh.md) | Domain 原子单次写入、写链、事件在持久后发出；不承诺跨域事务 |
| 子代理与流程 | [subagent](../../dsh-v0.1.6-alpha.2/subsystems/subagent.zh.md)、[workflow](../../dsh-v0.1.6-alpha.2/subsystems/workflow.zh.md) | 团队可选执行基础；不是本产品已经拥有的团队 |
| 实验性协作 | [agent-team](../../dsh-v0.1.6-alpha.2/subsystems/agent-team.zh.md) | 后期评估；当前未锁定对应包，不可直接编码依赖 |

## 3. 源码和公开声明核对

本轮只读本仓库代码、安装包清单和类型声明；没有下载或修改 Harness 上游实现。`.d.ts` 内部文件用于核对声明，实施 import 必须来自包公开 exports。

| 编号 | 可确认事实 | 证据 | 不可推导的结论 |
|---|---|---|---|
| E01 | experts 目前只有规划入口 | [模块 README](../../../packages/plugins/experts/README.md) | 有完整可用 Host/UI |
| E02 | contracts 仅导出治理类型 | [index](../../../packages/contracts/src/index.ts)、[governance](../../../packages/contracts/src/governance.ts) | 已有 `/experts` 或 `/skills` 子路径 |
| E03 | 受控 Session create/resolve bridge 存在 | [access 实现](../../../packages/plugins/access/src/index.ts) 的 `SessionAccessBridge` | 官方所有 Remote 已经过该 bridge；企业治理已完成 |
| E04 | Skill 使用官方 Connection 的 exact Fetch 管理入口 | [connection-api](../../../packages/plugins/skills/src/services/connection-api.ts) | 专家可直接复用私有 wire；已有全局业务 SkillRevision/ActorContext 覆盖 |
| E05 | 原生输入 overlay 已用于 Skill 草稿 | [drafts](../../../packages/plugins/skills/src/client/drafts.tsx) | 当前单键 sessionStorage 交接可安全复制为多任务草稿机制 |
| E06 | 共享 Modal/导航已抽出 | [UI exports](../../../packages/ui/src/index.ts)、[Modal](../../../packages/ui/src/components/Modal.tsx) | 自动覆盖所有新焦点、关闭确认和窄屏需求 |
| E07 | preset 冷启动会按 ID 再读；同名文件改动导致组合变化 | [D01 探针](../../evidence/d01-presets.md)、[ADR-0010](../../adr/0010-immutable-preset-revisions.md) | 只记录 preset ID 就已经不可变 |
| E08 | 官方 Persona 支持 prefix/suffix/complete/includeRuntimeContext，scope-only | `@deepseek-ai/dsh-persona@0.1.5-rc.1` 公开 index 类型 | 可挂全局、可用任意用户模板表达式、可禁用官方运行指导 |
| E09 | SessionCreateRequest 只有 workspaceId/cwd/sessionId/agentPreset；create 无 signal | `@deepseek-ai/dsh-api-session-controller@0.1.5-rc.1` 公共导出声明 | create 支持 expertId、model 参数或可被 AbortSignal 撤回 |
| E10 | agentPresets.select 约束空会话；recompose 的空白检查由调用者负责 | `@deepseek-ai/dsh-agent-presets@0.1.5-rc.1` index 声明 | 可对非空专家会话安全换组合 |
| E11 | lockfile 含 subagent/workflow，未含 dsh-agent-team | [锁文件](../../../pnpm-lock.yaml) | 最新团队文档能在 rc.1 直接运行 |

声明复核可在安装依赖后定位 `node_modules/.pnpm/@deepseek-ai+dsh-<package>@*/node_modules/@deepseek-ai/dsh-<package>/lib/types/`；根目录未直接 hoist 某包不代表依赖不存在。查看 exports 后只使用公开导出，不从上述物理路径导入产品代码。

## 4. 本阶段新增复用记录模板

每个 G 关卡的 evidence 必须记录：锁定包/版本、exports 名称、准确方法/类型签名、官方文档链接、探针命令、观察值、取消/dispose 行为、剩余缺口。不能只粘贴本文给出“官方支持”的结论。

| 能力 | 已有证据可复用 | 本次必须增加 |
|---|---|---|
| preset 持久化 | E07 | 专家编译构件 + 全恢复入口健康校验 |
| Skill 同名隔离 | 既有 C01 探针 | 业务快照、资源、停用/卸载与全局回退边界 |
| Session 创建 | E03/E09 | operation 持久映射、模型选择失败和丢响应对账 |
| UI draft | E05 | session-targeted 一次交接、已有草稿与重复挂载 |
| domain storage | 现有 identity/access/audit 用法 | 专家发布 CAS、操作/outbox 与构件跨提交点恢复 |
| external Remote | 已有 Skill 兼容记录 | 专家独立 Typert 探针或确切 Connection 例外 |

## 5. 文档审查结果与剩余验证

已进行需求—UI—契约—技术—验收交叉审查，覆盖：单专家与团队范围、原生交互、发布确认、历史不可变、依赖真实可用、并发和取消、导入规范、恢复旁路、企业后置、有限完成标准。需求编号分别映射到 AT，实际验证结果另记，不用本轮文档审查冒充测试。

本轮修正顶层说明中仍写“D03 等待 D02”的过期当前态描述；D01～D03 的已完成台账不回退，Skill 的治理/修订缺口明确作为 D04 的依赖适配，避免把历史局部证据放大为完整能力。

PRD 已含 `prd-profile-v1` 追溯块及必需字段。当前安装的 prd-writer 所引用的外部 schema/lint 文件不存在；本轮仅能验证 YAML 可解析、编号唯一、字段齐备和需求映射，不宣称通过未提供的官方 trace-lint。

以下不需要为了交付本文档向用户追加需求问题，但实现必须落实：G01/G02/G03 运行 seam、G05 传输选择、G06 crash recovery；具体证据不通过时按有限关卡处理。默认模板内容可用本产品原创文本，不依赖第三方内容授权。

## 6. 文档验证记录

本轮实际通过：

- Node 22.23.2 下 `corepack pnpm check:plan`：26 个模块、47 份登记文档及相对链接检查通过。
- `corepack pnpm test:planning`：2/2 通过。
- 专项文档校验：15 个唯一需求、27 条验收的映射、来源关系、全部新增 Markdown 本地链接与 fenced blocks 检查通过。
- PRD 追溯 YAML 解析、JSON Schema 2020-12 结构、原创专家示例校验通过；owner/agentPreset/credentials 额外字段反例均被 Schema 拒绝。
- `git diff --check` 通过；D04 仍为 todo；专家目录没有新增可加载 package.json。

本轮未执行产品 build/typecheck、模型、Host 或浏览器运行验收；仅新增设计文档、示例 schema、参考图片和文档检查登记，未修改业务运行实现。G01～G06、EP 和 AT 仍需实施者按本包验证。没有调用缺失的官方 trace-lint。
