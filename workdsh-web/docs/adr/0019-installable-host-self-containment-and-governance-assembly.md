# ADR-0019：可安装插件 Host 自包含与治理真实装配

状态：Accepted（2026-09-12 用户继续实现审查修复；采用下述独立治理配置层修订）

## 本轮实施修订

为遵守 ADR-0018 的全局插件组合精神，实际采用备选 **iii**：identity-local、audit、access 各贡献独立 `dsh.bundle.patch`；access 公开 `./session`、`./tool` 插件子路径，配置层显式注册桥接服务。安装脚本明确安装六个包，bundle 不隐藏初始化治理。以下背景中的阻塞与推荐 i 是决策前记录，以本修订为准。

Experts Manager 通过 `ctx.plugin` 初始化，集成子插件声明自己的服务依赖并注册 Connection、工具、内置管理 Skill 与公开 pre-step 校验。安装态运行时自包含已通过仓库外真实安装验证；部分导出类型仍需后续仓库外消费检查。真实打包浏览器与两次冷重启已通过，但本轮没有证明完整移除重装、真实模型、故障恢复或全部 AT-18/19/20 通过。证据见 [审查修复](../evidence/d04-experts-review-fixes.md)。

日期：2026-09-12
关联：ADR-0016（治理契约优先）、ADR-0017（专家定义与运行绑定）、ADR-0018（独立功能插件、共享服务与专家技能引用）；D04/EP-07 真实打包验收（AT-18/19/20）前置。

## 背景与问题

D04 专家模块的领域服务、Client、Agent 工具与集成测试已完成：`node --test tests/integration/expert-manager.test.mjs` 9/9 通过，全量集成 42/42 通过（真实 Cordis Context + 官方 Storage Domain + 真实 AccessManager/AuditJournal，identity/session/agentPresets 为测试替身），`check:plan`、`test:planning` 均绿。但 EP-07/AT-18/19/20 要求的“真实打包 Web 浏览器激活 + 冷重启”无法达成。经对锁定发布包 `dist` 与安装脚本的经验核对，确认两个相互叠加的阻塞，均属基础交付模型，非 D04 单模块可独立收口。

### 阻塞 1：可安装 Host 存在无法解析的 workspace 运行时依赖

- `scripts/install-preview.mjs` 仅 pack `packages/plugins/skills`、`packages/plugins/experts`、`packages/bundle` 三个 tarball，经官方 CLI `plugin --profile preview add` 安装；**不 pack `workdsh-contracts`、不 pack 治理三包**。
- `workdsh-contracts` 为 `private:true`、未发布，且不在 experts 的 `dependencies`（仅 `devDependencies: workspace:*`）。
- experts Host 由 tsc 编译（`dist/*.js` 外部导入），运行时裸导入 contracts 值：`dist/services/experts-manager.js` `import { EXPERT_LIMITS, ExpertsError, actionAccess, assertActorContext }`；`dist/shared.js` `export * from 'workdsh-contracts/experts'`；`dist/runtime/confirmation.js`、`dist/services/portability.js`、`dist/services/connection-api.js` `import { ExpertsError }`；`dist/domain/definition.js` `import { EXPERT_LIMITS }`。源码层 10 个文件导入 contracts、约 170 处运行时值使用。
- 治理三包 Host dist 同样运行时导入 governance 原语：`access/dist/index.js` `import { assertActorContext, assertResourceOwner, GovernanceContractError }`；`audit/dist/index.js` `import { GovernanceContractError }`；`identity-local/dist/index.js` `import { assertActorContext, GovernanceContractError }`。
- 对照已验证的 skills：`skills/src/shared.ts` 为 `export type * from 'workdsh-contracts/skills'`（仅类型），`skills/dist` 对 contracts **零运行时导入**，运行时值（错误码字符串、`maximumDocumentBytes` 等常量）在 Host 源码本地定义 → tarball 自包含、“不要求运行环境保留 workspace”（见 evidence/skills-standalone-package.md）。bundle Host `dist/probe.js` 同样无 workspace 运行时导入。
- 结论：experts / 治理 Host 在安装态无法解析 `workdsh-contracts` → 模块加载即失败（Fiber FAILED，甚至早于 inject PENDING）。这直接违反 ADR-0018 第 54 行“制品能否解析……仅装进 node_modules 不算激活”的已采纳层一要求。

### 阻塞 2：治理栈从未在打包 Profile 中真实装配

- identity-local / audit / access 为裸 Cordis `Service` 类（`super(ctx,'workdshXxx')` + `static inject`），无模块级 `name/apply/inject`、无 `dsh` 配置、无 `cordis.patch.yml`。按官方 publish 机制，无 `dsh.bundle` 声明的包只作普通依赖安装、不激活任何配置层。
- 治理服务当前仅在 `tests/integration/*.test.mjs` 中经 `ctx.plugin/ctx.provide` 实例化；`packages/`、`scripts/` 中无任何打包态实例化。D01 证据（d01-installation.md、d01-access-audit.md）表明治理只在 test:integration（真实 Cordis Context）层验证，从未作为 Profile 层安装。
- experts Host `inject` 必需 `workdshIdentity/workdshAccess/workdshAudit/workdshSessionAccess`；即便修复阻塞 1，这些服务在打包 Profile 中无提供方 → experts Fiber 停在 PENDING（官方 06-composition：PENDING 是合法静默状态）。
- ADR-0018 第 22-23 行已决定“identity/access/audit 是必需公共基础服务，默认组合按官方注册明确装配”，第 60 行“同一包内可含多个正式插件模块，由官方配置或 ctx.plugin 管理”，但第 66 行明确“以下是目标行为，不是当前实现已通过的声明”——装配从未实现。

### 未记录的决策缺口

ADR-0018 第 24 行称 contracts 提供“类型、校验”，与第 54 行“制品必须可解析”对**已安装 Host**存在张力：contracts 若发布运行时校验（`assertActorContext`/`GovernanceContractError`/`ExpertsError` 等），已安装 Host 裸导入它即破坏自包含。此张力此前无 ADR 明确；skills 以“Host 仅类型导入 + 本地运行时”事实规避，experts/治理则偏离。本 ADR 形式化该规则。

## 决策

1. **可安装插件 Host 必须自包含。** 任何参与打包安装（`pnpm pack` → 官方 CLI Profile 层）的插件，其 Host `dist` 不得含对 workspace/private 包（`workdsh-contracts`、`workdsh-ui` 等）的运行时 `import`。允许：官方 `@deepseek-ai/*`、已在 `dependencies` 声明的真实发布 npm 包、Node 内置、以及编译期擦除的 `import type`。
2. **contracts 对已安装 Host 是仅类型依赖。** contracts 可继续发布运行时校验，供 (a) Client bundle 经 esbuild 内联、(b) 测试、(c) 作为单一真源被各 Host 在**自有源码内**内建/复制；但已安装 Host `dist` 不得裸 `import ... from 'workdsh-contracts'` 运行时值。此规则形式化 skills 已验证模式，符合 AGENTS.md“contracts 不放业务实现”。
3. **experts 侧（D04）自包含修正。** 将 experts 领域运行时值 `EXPERT_LIMITS`/`ExpertsError`/`actionAccess` 从 `contracts/src/experts.ts` 迁至 experts 自有源码（如 `src/domain/`），contracts 仅保留类型；`src/shared.ts` 改为 `export type * from 'workdsh-contracts/experts'` + 本地运行时再导出；Client 从 experts 源码导入（esbuild 内联）。actor 校验依赖注入的 `IdentityService`（其契约保证 Host 解析的可信 `ActorContext`），如需防御性结构校验则在 experts 源码内建最小 guard，不裸导入 `assertActorContext`。
4. **治理真实装配（执行 ADR-0018）。** 默认本地组合经官方 `ctx.plugin` 明确装配：`LocalIdentityService`（固定本地配置 `principalId/organizationId/organizationName`）、`AuditJournal`、`AccessManager`、`SessionAccessBridge`、`ToolAccessBridge`；治理 Host 同样满足决策 1（governance 运行时原语迁至可安装位置或各治理包自有源码，contracts 仅类型）。装配落点见备选方案。
5. **验证门槛。** experts/治理 `dist` 对 contracts 零运行时导入（脚本可核）；experts 集成保持 9/9、全量 42/42 绿；`preview:install` + `probe:browser` 确认 experts Host 为 ACTIVE（非 FAILED/PENDING）、治理服务有提供方、AT-18/19/20 闭环 + 两次冷重启 + 移除重装不回归 skills/workbench/工作台。

## 备选方案与取舍

**阻塞 1（contracts 运行时可用性）：**

- **X** 让 contracts 成为可安装运行时依赖（experts/治理 `dependencies` 加 contracts + pack + install）：违反 skills 已采纳的“不要求运行环境保留 workspace”；private 包经官方 CLI 从 registry 解析行为不确定（不猜接口）；跨插件 `ExpertsError`/`GovernanceContractError` 类身份（`instanceof`）风险。**否决。**
- **Y（推荐）** Host 自包含：type-only contracts + 运行时值本地拥有 / 注入服务提供。与 skills 已验证模式一致，符合 ADR-0018 第 54 行与 AGENTS.md。**采纳。**
- **Z** esbuild 打包 Host（内联 contracts）：偏离既有 tsc-Host / 官方 Loader 模式，Error 类跨插件身份风险，Host 体积与 sourcemap 复杂化。**否决。**

**阻塞 2（治理装配落点）：**

- **i（推荐）** bundle 增 `./governance` 子路径 Host 插件，`apply` 内 `ctx.plugin` 组合治理五服务 + 固定本地身份 config：符合 ADR-0018 第 60 行“同一包内多个正式插件模块由 ctx.plugin 管理”、第 17 行“不隐藏调用 applyX，需嵌套用官方插件注册”；bundle 只承担组合/品牌，不拥有治理实现。
- **ii** 专用治理组合包（新 bundle）：多一个安装层与版本线，本地单用户收益低。
- **iii** 治理三包各自成可安装层（各加 `dsh.bundle` patch）：access 需为 `SessionAccessBridge`/`ToolAccessBridge` 增子路径导出；层数增多、装配顺序耦合，企业分发前不必要。
- 本地默认选 **i**；企业/多组织分发再评估 ii/iii。

## 影响与范围

触及 `contracts`（共享库，迁出 experts 运行时值）、`experts`（D04，Host 自包含）、`access`/`audit`/`identity-local`（D01，Host 自包含）、`bundle`（组合装配 `./governance`）。

**回归风险**：改动 contracts/experts/治理/bundle 可能影响当前绿的 `probe:browser`（skills + bundle）与集成 42/42，须全量重跑。D01 治理侧自包含与 bundle 装配属治理/组合交付，需单独授权，不在 D04 内自行展开；D04 侧 experts 自包含可随本 ADR 批准先行实施，但在治理装配落地前 experts 仍无法在打包态 ACTIVE，AT-18/19/20 仍阻塞——因此本 ADR 的两部分须一并批准方能收口真实打包验收。

## 官方依据

- 打包与安装（`https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/user/develop/basic/publish.zh.md`）：组合包贡献配置层；无 `dsh.bundle` 的包只作普通依赖、不激活层；制品解析是激活前提。
- 组合与 HMR（`https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/cordis-tutorial/06-composition-and-hmr.zh.md`）：`inject` 无提供方时 Fiber 静默 PENDING（合法态）；经 `ctx.registry` + `FiberState.PENDING` 诊断。
- 添加包（`https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/cookbook/adding-a-package.zh.md`）：`src/index.ts` 可为 service default export 或 plugin（name/inject/apply/Config）。
- ADR-0018：三层依赖分别声明；默认组合用官方注册装配必需公共服务，不隐藏 applyX。
