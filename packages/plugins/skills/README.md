# 技能管理插件

> GitHub 模块制品与兼容矩阵：[发布说明](../../../docs/RELEASES.md)。当前验证 Harness **0.1.6-alpha.2 Web**；内置 **0.1.2-rc.1** 的旧桌面入口缺失尚未修复，本包不包含该兼容修复。

状态：**Skill 0.1 本地面向用户的技能市场与独立安装交付完成**。当前候选制品 `workdsh-plugin-skills@0.1.0-alpha.32`，尚未发布 npm。一个插件管理多个 Skill 业务对象；用户制作技能不需要发布 npm 包。

本包提供标准 Host `apply/inject`、独立 Client `apply/inject`、`dsh.bundle` 配置 patch 和 `dsh.client` 浏览器产物。官方 Loader/Profile/Cordis 拥有加载及生命周期；不依赖 WorkDSH 总包或另一个插件框架。独立安装、默认组合、移除与重装见[实际验收](../../../docs/evidence/skills-standalone-package.md)。

- 模块版本线：**0.1**，Host、Client、资源和内置管理 Skill 共用版本。
- 主任务：P1-03；本轮为 D04 前置交付修正，不实现专家业务。
- 边界：复用官方 Skill provider、工具和 Conversation；不重造执行器，导入不运行脚本。

## 安装和组合

兼容基线：Node 22.19+、Harness `0.1.6-alpha.2`、Cordis `4.0.2`、React `19.2.4`。从已配置这些依赖的官方 Web Profile 安装本地 tgz；将以下路径替换为实际制品绝对路径：

```sh
dsh plugin --profile <你的 Web Profile> add /absolute/path/workdsh-plugin-skills-0.1.0-alpha.32.tgz
```

按官方流程停服修改组合，再重启该 Profile。卸载管理插件用官方 `dsh plugin --profile <Profile> remove workdsh-plugin-skills`；用户技能文件和管理数据保留，重装继续使用。插件移除与页面中“卸载某个技能对象”不同：后者进入可恢复回收站。当前未宣称完整运行中 CLI 热卸载。

仓库开发使用固定 pnpm；先 `corepack pnpm build`，再 `corepack pnpm preview:install`。安装脚本通过官方 CLI 将 Skill 和 WorkDSH 展示包作为两个独立 Profile 层安装；最后 `corepack pnpm preview`。现有预览应先停止，自动化测试使用隔离 Agents home，人工预览仍默认使用用户原有 `~/.agents`。

可独立打包并验收：

```sh
corepack pnpm --filter workdsh-plugin-skills build
corepack pnpm --filter workdsh-plugin-skills pack --pack-destination .artifacts
corepack pnpm probe:skills
corepack pnpm probe:browser
```

产物内含所需 UI 代码和本地 DTO 声明，不要求运行时存在 `workdsh-ui` 或开发 workspace。React 由官方 renderer 共享；依赖的 Harness 服务明确声明，不把框架复制进包。

可选：从市场镜像生成 WorkDSH 自有技能目录，页面据此展示“可安装”分区，并可用“＋”安装到官方共享技能根（默认 `$DSH_AGENTS_HOME/.workdsh-catalog`，可用 `WORKDSH_SKILL_CATALOG` 覆盖）：

```sh
corepack pnpm catalog:build --source ~/.workbuddy/skills-marketplace --dry-run
corepack pnpm catalog:build --source ~/.workbuddy/skills-marketplace
```

`--source` 必须指向含 `.codebuddy-skill/marketplace.json`、`skills/<source>/SKILL.md` 与 `icons/` 的市场镜像。镜像不在 WorkBuddy 客户端浏览市场时落盘：5.5.6 的内置仓库自动下载已关闭（`BuiltinSkillMarketplaceUpdater` 只在显式 `triggerUpdate()` 时拉取），镜像来自产品配置 `builtin-recommend.skillMarketplaces[].url` 的 zip，形如 `https://download.codebuddy.cn/skill-marketplace/skill-marketplace-<uuid>.zip`，解压后根目录即含 `.codebuddy-skill/marketplace.json`。缺失镜像时目录不会自动存在；此时技能页按 `skill/catalog-missing` 如实显示诊断与路径，`scripts/probe-skills-package.mjs` 覆盖目录缺失、损坏与正常安装三条路径，不伪造空市场。

2026-09-20 实测（镜像 268 条 / 115 图标 / 11 个中文分类）：产出 265 条、12 个分类（含「全部」以外的 11 个市场分类）、111 条带品牌图标，负载合计 37.6 MiB；3 条因镜像 `SKILL.md` frontmatter 的 YAML 缺陷（`workrally`、`fadada-document-sign` 解析失败，`shopify-admin-api` 缺 `name`）被跳过，`fbs-bookwriter` 因 481 个文件超过 400 上限标为不可安装——均按原因如实输出，不修补上游内容。

## 公开服务与依赖

Host 提供 `ctx.workdshSkills`，类型源为 `workdsh-contracts/skills` 的 `SkillManagementService`，`contractVersion` 为 `1`。这是受信本地 Host 管理契约，**不属于企业鉴权 API**。使用服务的插件显式注入 `workdshSkills`，只依赖公共类型，不导入本包内部 `SkillManager`：

```ts
import type { Context } from '@deepseek-ai/cordis';
import type { SkillManagementService } from 'workdsh-contracts/skills';

declare module '@deepseek-ai/cordis' {
  interface Context { workdshSkills: SkillManagementService; }
}

export const inject = ['workdshSkills'];
export function apply(ctx: Context) {
  if (ctx.workdshSkills.contractVersion !== 1) throw new Error('Unsupported Skill contract');
  // Use list/detail/readResource/update and other public methods as needed.
}
```

领域若贡献卸载影响，通过 `registerDependencyInspector()` 返回依赖；消费者用自己的 `ctx.effect()` 托管返回的清理函数。必需服务消失时，由 Cordis 停止消费者，恢复后重新激活。两个消费者共享同一技能所有者的测试已通过，不能据此声称专家模块已实现。

当前契约保留现有本地管理语义：完整正文、资源、冲突修订、导入、草稿发布、启停、依赖影响、回收和恢复。**不可变 SkillRevision、专家执行快照租约和多用户授权尚未实现**，后续专家接入必须补齐，不能把当前文件摘要当作永久历史修订。

## 功能与所有权

全局技能库、搜索、完整详情、直接编辑、资源编辑、打开文件夹、启停、可恢复卸载、批量管理以及新增技能入口均保持原有业务服务。添加菜单提供查找、上传和创建：查找聚焦已安装目录，上传使用专用预检/确认弹框，创建预填原生 Conversation 的 `/workdsh-skill-creator`，不自动发送。

技能页同时是一体化技能市场：真实分类标签来自本地目录元数据，未安装条目显示带品牌图标的卡片和“＋”直接安装，已安装条目显示开关与卡片菜单。安装仍走官方受管导入路径（全局名称锁、内容指纹复核、原子发布），超限条目如实显示安装限制，不提供第二套安装器。目录缺失或损坏时页面仅展示真实状态与诊断，不伪选空目录；图标通过认证 GET 路由返回，浏览器不直接阅读目录文件。「我安装的」入口进入独立安装页：返回链接回到市场、标题显示安装总数、提供批量管理与页内搜索，并与市场页共享同一卡片、菜单与批量逻辑。

管理请求与流式上传复用官方 Connection 认证 exact Fetch 扩展面；公开版本的外部 workspace Typert 生成问题仍记录为兼容项。插件撤销时取消 Client 请求、停止路由并排空在途请求；打开目录沿用原生 Session Remote。页面不持有第二套技能执行目录。

内置 `workdsh-skill-creator` 使用官方 `defineTool` 调用同一个 Host 服务，经过私有草稿、校验、精确 revision 和确认发布。默认共享目标为 `$DSH_AGENTS_HOME/skills`，未配置时为 `~/.agents/skills`；只有明确选择 Harness Profile 范围时使用 `$DSH_HOME/skills`。不得覆盖无关技能。

本包独立贡献能力中心侧栏入口和 Skill 页面，移除后这些贡献随插件消失；官方工作区、会话、原生 `/`、`@`、附件、模型和权限仍由 Harness 拥有。本地技能目录提供真实的分类、图标、中文名称与惰性负载，页面不显示假筛选；公共 SkillHub 服务、企业服务器与管理 Web 仍按 [ADR-0015](../../../docs/adr/0015-skill-control-plane-and-runtime-projection.md) 后置。

开发前阅读[规则](../../../AGENTS.md)、[状态](../../../docs/STATUS.md)、[契约](../../../docs/CONTRACTS.md)、[团队设计](../../../docs/TEAM-DESIGN.md)和[ADR-0018](../../../docs/adr/0018-composable-feature-plugins-and-shared-skills.md)。

## 专业内容制作指南

内置 `workdsh-ppt-design`、`workdsh-word-design`、`workdsh-excel-design`、`workdsh-web-design`，参考腾讯 / WorkBuddy 的产品化方法，由 WorkDSH 按当前工具重新编写。包含叙事、排版、公式审查、响应式与交付参考；不是腾讯 SDK、转换引擎或云服务。感谢相关产品提供的设计启发。指南不能扩充当前编辑器或工具能力，具体来源与边界见[适配说明](../../../docs/design/TENCENT-AUTHORING-ADAPTATION.md)。

创建指南使用 WorkDSH 独立命令，保留用户同名原版技能。多阶段创建要求更新原生任务进度；中断恢复先核对已有草稿与成果。

2026-09-14源码候选0.1.0-alpha.28：配合活动插件提供已有技能标题；通过公开展示契约协作，不复制执行或技能状态。

## 内置技能工程维护

五个内置技能位于 `resources/skills/<name>/SKILL.md`，正文不在 TypeScript 独立维护。执行 build/typecheck 前由 `scripts/generate-builtin-skills.mjs` 使用官方 Harness provider 解析并生成注册内容；references 随本包交付。用户创建技能仍由管理服务保存到官方用户根。内置在管理页保持只读，工程修改后随插件更新。唯一内置 PPT 制作技能采用已合并的设计方法，不包含腾讯专属引擎或原版脚本。目录及来源规则见[架构](../../../docs/ARCHITECTURE.md)。

### 完整技能制作

内置 workdsh-skill-creator 接入用户提供的 WorkBuddy 完整创建方法及初始化、校验、ZIP 打包脚本（Apache-2.0，来源及修改见 resources/skills/workdsh-skill-creator/NOTICE.md）。带 references/scripts/assets 的技能在工作区草稿目录制作，导出 ZIP 后经现有导入预检和确认安装；单文件技能仍使用原草稿工具。需要 Python3 与实际执行工具；基础脚本校验不替代 Harness 解析或真实任务试用。
