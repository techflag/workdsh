# D04 / P1-02 专家模块 0.1：EP-07 验证与 AT-01～AT-23 证据矩阵

任务：EP-07（typecheck/build/集成 + AT-01～AT-23 验收 + 文档同步）。
核对日期：2026-09-12。Node v22.23.2、pnpm 10.34.5、`@deepseek-ai/dsh@0.1.5-rc.1`、`@deepseek-ai/cordis@4.0.2`。
本文件按测试层次如实区分证据；未执行项明确标注，不以构建通过或导航存在替代真实激活。

## 1. 本轮已跑绿的自动化检查（真实输出）

| 检查 | 命令 | 结果 |
|---|---|---|
| 计划/脚手架完整性 | `node scripts/check-plan.mjs` | PASS：26 modules；50 documents；task references / team acceptance / relative links checked |
| 规划测试 | `node --test tests/planning/*.test.mjs` | tests 2 / pass 2 / fail 0 |
| 专家 Host 集成 | `node --test tests/integration/expert-manager.test.mjs` | tests 9 / pass 9 / fail 0 |
| 全量集成 | `node --test tests/integration/*.test.mjs` | tests 42 / pass 42 / fail 0 |

集成层次为**真实 Cordis Context + 官方 Storage Domain（defineDomain/CAS）+ 真实 AccessManager/AuditJournal**；`workdshIdentity`、`sessionController`、`agentPresets`、`workdshSessionAccess` 为测试替身（`ctx.provide`）。因此集成证据覆盖 Host 领域事实与治理授权/审计，不覆盖打包安装态与真实浏览器/模型。

`build`/`typecheck`/`check:versions` 在实现阶段已绿（见 STATUS 记录）；本轮为文档与证据同步，未改产品代码，故未重跑（**本轮未执行**，代码未变）。

## 2. AT-01～AT-23 证据矩阵

图例：✅ 集成-真实Host（node --test 绿）｜⛔ 阻塞-真实打包Web（ADR-0019 阻塞1/2）｜◐ 部分（领域/契约已实现，端到端未验）｜⬜ 未执行-真实模型/真实运行探针。

| AT | 需求 | 状态 | 证据 / 缺口 |
|---|---|---|---|
| AT-01 | REQ-EXP-001 | ✅ | `expert-manager.test.mjs` T1：默认目录 seed、搜索命中/无结果、origin/availability 过滤、分页、ownership-scoped |
| AT-02 | REQ-EXP-002,003 | ⛔ | 召唤/示例→workspace/Session 的 UI 与“无模型请求”属打包浏览器层；创建/handoff 逻辑由 AT-17 集成覆盖 |
| AT-03 | REQ-EXP-004 | ⛔ | expert-manager 精确预填文案 + 原生 /@附件/模型/权限 + 已有草稿不丢，属原生输入 overlay 浏览器层 |
| AT-04 | REQ-EXP-005 | ✅ | T3：createDraft 存不完整草稿、validate 报 issue、EXPERT_LIMITS 强制、无假成功 |
| AT-05 | REQ-EXP-005,011 | ✅ | T4：同 expectedRevision 并发 updateDraft，一方成功一方 conflict，失败方内容保留（CAS） |
| AT-06 | REQ-EXP-005,011 | ✅ | T5：伪造/未确认 proof、错主体、改内容/依赖均拒绝；确认绑定精确内容 |
| AT-07 | REQ-EXP-007 | ✅ | T6：发布冻结真实 Skill 依赖为不可变修订（快照 + dependencyLock 摘要） |
| AT-08 | REQ-EXP-007,008 | ✅ | T6：v2 发布后冷重启仍读 v1 修订（真实 Storage Domain 重开）；篡改/删除的 guard 拒绝见 G03 |
| AT-09 | REQ-EXP-006,007 | ◐ | skill-revisions 契约（resolve/retain/check/release）+ 运行绑定 guard 已实现；跨插件“停用/卸载报告专家与任务引用”的端到端集成/浏览器未执行 |
| AT-10 | REQ-EXP-008 | ◐/⛔ | 冷恢复绑定校验由 AT-08 集成覆盖；原生 Remote/刷新/fork/换 preset 路径属浏览器层（⛔）。“每轮 prompt 前强制重校验”在 rc.1 无公开 seam，按 G03 / ADR-0017 §6 记为兼容性缺口，非 D04 验收项 |
| AT-11 | REQ-EXP-009 | ⛔ | prepareHandoff/createHandoff 逻辑由 AT-17 覆盖；“旧任务换专家→关联新任务、摘要/资料按选择、原任务不改”属浏览器层 |
| AT-12 | REQ-EXP-003 | ⛔ | 多任务切换、重复挂载/刷新只消费一次草稿、最近/置顶冷启动保留属原生输入 overlay + 浏览器层 |
| AT-13 | REQ-EXP-008 | ⬜ | 显式不支持模型返回错误不回退、权限/附件、取消复用原生、默认无专家任务回归——需真实模型 + 原生 Session，未执行 |
| AT-14 | REQ-EXP-006 | ✅ | T7：默认专家不可编辑/发布；copy 生成独立可编辑个人草稿；availability 真实持久 |
| AT-15 | REQ-EXP-011 | ✅ | T2：伪造 owner/organization 无效；跨 owner read/use/edit/manage 拒绝；关键操作审计（真实 AuditJournal） |
| AT-16 | REQ-EXP-005,008 | ✅ | T8：同 operationId 发布回放同一回执；重用 id 冲突（幂等） |
| AT-17 | REQ-EXP-008,009 | ✅ | T9：createExecution 每 operationId 恰保留一个 Session、一次性草稿 handoff、绑定校验 |
| AT-18 | REQ-EXP-012 | ⛔ | 360/768/1440、200% 缩放、暗/浅色、键盘、焦点、Escape、未保存离开、菜单溢出——真实打包浏览器层，被 ADR-0019 阻塞 |
| AT-19 | REQ-EXP-001,012 | ⛔ | Host 缺席/超时/取消/重连/cursor 过期/错误 vs 空列表、主操作不只 toast——真实打包浏览器层，被 ADR-0019 阻塞 |
| AT-20 | REQ-EXP-012 | ⛔ | 公共 Modal 回归 Skill、专家独立制品安装/移除、独立 Fiber 依赖消失/恢复 dispose/reload、Skill/工作台/工作区菜单保持——核心打包验收，被 ADR-0019 阻塞1（Host 无法解析 contracts）+ 阻塞2（治理未装配）双重挡住 |
| AT-21 | REQ-EXP-010 | ◐ | portability 导入/导出领域实现完成（EP-06）；zip slip/链接/超限/未知版本/摘要错误/凭据字段反例的契约级测试与真实打包上传往返未执行 |
| AT-22 | REQ-EXP-001,011 | ✅ | T2：坏 actor/坏权威 schema 被拒，不当作空列表（与 AT-15 同测试） |
| AT-23 | REQ-EXP-007,008 | ⬜ | persona A/B 不串、保留 runtime context、用户模板表达式不能注入未知变量/抑制官方指导——需真实 Host persona + 真实模型运行探针，未执行（G01 已记为待回填） |

**统计**：✅ 集成-真实Host 通过 11 项（AT-01/04/05/06/07/08/14/15/16/17/22）；⛔ 真实打包 Web 阻塞 7 项（AT-02/03/11/12/18/19/20）；◐ 部分/端到端未验 3 项（AT-09/10/21）；⬜ 真实模型未执行 2 项（AT-13/23）。

## 3. AT-18/19/20 阻塞根因（经验确认，非推测）

真实打包 Web 激活被两个叠加阻塞挡住，已录入 [ADR-0019](../adr/0019-installable-host-self-containment-and-governance-assembly.md)：

1. **阻塞1（Host 无法解析 contracts 运行时）**：`install-preview.mjs` 只 pack skills/experts/bundle，不 pack private 的 `workdsh-contracts`；而 experts Host `dist` 运行时裸导入 `ExpertsError/EXPERT_LIMITS/actionAccess/assertActorContext` 及 `export * from 'workdsh-contracts/experts'`。安装态解析失败 → experts Host Fiber FAILED。对照 skills（`export type *`、dist 零运行时 contracts 导入）已验证自包含。
2. **阻塞2（治理未真实装配）**：identity-local/audit/access 为裸 Service 类，无 `dsh.bundle`/patch，仅在测试内 `ctx.plugin`；打包 Profile 无 `workdshIdentity/Access/Audit/SessionAccess` 提供方 → 即便修复阻塞1，experts 仍 PENDING。

经验证据（grep dist）：`experts/dist/services/experts-manager.js` `import { EXPERT_LIMITS, ExpertsError, actionAccess, assertActorContext } from 'workdsh-contracts'`；`experts/dist/shared.js` `export * from 'workdsh-contracts/experts'`；`access/dist/index.js`、`audit/dist/index.js`、`identity-local/dist/index.js` 均运行时导入 governance 原语。`workdsh-contracts` `private:true`、未发布、不在 experts `dependencies`。

## 4. 收口 AT-18/19/20 所需的最小路径（待批准）

按 ADR-0019：(1) experts Host 自包含（迁出 `EXPERT_LIMITS/ExpertsError/actionAccess` 至 experts 源码、`shared.ts` 改 `export type *`、actor 校验依赖注入 IdentityService）；(2) 治理三包 Host 自包含；(3) bundle `./governance` 子路径经 `ctx.plugin` 装配治理五服务 + 固定本地身份 config；(4) `install-preview` 装配治理层；(5) `probe:browser` 验证 experts ACTIVE + AT-18/19/20 闭环 + 两次冷重启 + 移除重装不回归。第 (2)(3)(4) 步属 D01/组合交付，需单独授权，不在 D04 内自行展开。

## 5. 未执行 / 待回填

- **未执行**：AT-18/19/20 真实打包 Web 浏览器探针（被 ADR-0019 阻塞1/2 挡住）；AT-13/AT-23 真实模型与真实 Host persona 运行探针；AT-09/AT-21 跨插件停用/卸载影响与导入导出反例的端到端验证；`build`/`typecheck`/`check:versions` 本轮未重跑（代码未变）。
- **待批准**：ADR-0019 的两部分（D04 experts 自包含 + D01 治理自包含与 bundle 装配）须一并批准，方能收口真实打包验收；在此之前不擅自改动 contracts 打包模型或 bundle 组合职责（有回归当前绿 probe 的风险）。
