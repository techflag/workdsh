# WorkDSH 专家插件 / Experts plugin

一个插件管理多个专家与专家团配置。当前源码候选为 `workdsh-plugin-experts@0.1.0-alpha.8`，面向 **DeepSeek Harness 0.1.7-rc.2 / Cordis 4.0.3**；本地 Web 升级证据见 [rc.2 记录](../../../docs/DSH-0.1.7-UPGRADE-PLAN.md)，候选代码与已经发布的安装包仍须分别验收。

WorkDSH manages authored expert assets and immutable revisions. Team execution, messaging, tasks and the Web team panel use the official DSH Agent Teams plugins.

## 专家资产与官方团队执行

- 专家目录、搜索、收藏、复制、草稿、导入导出、启停和确认发布由专家插件管理。页面与 Agent 管理工具使用同一 Host 服务。
- 支持 WorkBuddy 风格作品：`plugin.json`、`agents/*.md`、`settings.json`、README，以及 `skills`、`references`、`scripts`、`templates` 和二进制资源。
- 发布冻结专家定义、成员修订、技能快照和官方 Agent preset。召唤创建原生任务并关联该版本；修改草稿不会静默改变已经发布的内容。
- 团队创建成员使用官方 `spawn_teammate`；消息、等待、中断和共享任务也使用官方工具。团队面板直接加载官方 Client，不再另做一套成员状态面板。
- 已发布成员的 key 对应官方 teammate 的 name。在公开 `agent/created` / `agent/pre-step` 中核验资产、主体和组织，通过 Agent 局部的官方 Persona / Skill Filesystem 插件装配该成员。未配置的成员名在模型请求前拒绝。
- 场景与分工保留为工作指导；任务依赖和状态由官方 Team 及 Session 日志拥有。任务标记完成不等于专业成果已经验收。

## 官方装配

本包的 `cordis.patch.yml` 装配三个精确锁定的官方插件：

| 插件 | 职责 |
| --- | --- |
| `@deepseek-ai/dsh-experimental-agent-team` | 成员、消息、共享任务、持久化恢复 |
| `@deepseek-ai/dsh-experimental-tool-agent-team` | 官方九项团队工具 |
| `@deepseek-ai/dsh-experimental-client-ui-agent-team` | 官方成员与共享任务面板 |

启用 Team 时，按官方 Profile 组合停用旧 `subagent`、`subagent_fork` 及旧控制工具。默认成员创建上限为 16。九项工具为 `spawn_teammate`、`send_message`、`list_agents`、`wait_agent`、`interrupt_agent`、`team_task_create`、`team_task_list`、`team_task_get`、`team_task_update`。

WorkDSH 的必需组合仍包含 identity-local、audit、access、skills、experts；可选 bundle 提供工作台导航，activity 仅显示个人工作动态。各包通过官方 Loader/Profile 和公开服务注入装配；无自建 Agent loop、消息邮箱、团队执行表或插件加载器。

## 旧版迁移边界

已删除自建 `TeamRunsManager`、SOP 运行状态机、`workdsh_expert_team_*` 工具及 `workdsh-expert` 委派 provider。构建前清理 `dist`，防止旧执行器残留在新安装包里。

用户的专家、技能、发布修订、文件和旧任务历史保留。旧版委派子任务不再续跑旧调度器，应从专家团重新召唤官方 Team 任务。旧团队运行表不会转写成伪造的官方执行记录。团队配置仍可复用，不要求重建用户作品。

原 WorkBuddy 规范与许可证归属保留在资源目录；平台适配说明维护在 `resources/skills/workdsh-expert-manager/references/authoring-api.md`，团队运行指引维护在 `runtime/team-lead.md`。

## 构建与验证

在仓库根目录使用 Node 22 和固定的 pnpm：

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test:integration
corepack pnpm test:activity
corepack pnpm probe:experts:team
corepack pnpm probe:experts:team:web
corepack pnpm probe:experts:team:resilience
corepack pnpm probe:experts:team:real
```

- `probe:experts:team` 使用真实 Loader、生产资产服务与执行准入、官方 Agent Loop/Team/持久化；仅模型 I/O 和受信本地入口使用夹具。验证并行、各成员角色与技能、fresh/fork、非法成员和跨主体拒绝、任务依赖/CAS、模型工具分派、中断及独立进程恢复。
- `probe:experts:team:web` 将七个功能包打成 tgz，通过官方 CLI 安装到仓库外临时 Web Profile；使用实际生产 Host、官方 Team Client、真实浏览器和确定性模型检查成员、任务写入、成员会话与冷恢复。
- `probe:experts:team:resilience` 是同一生产安装探针的发布验收入口，并固定持续运行、人工停止后原成员继续、完整浏览器重连、成员间任务与消息交接、失败状态展示及冷重启恢复。失败由本地模型适配器确定性注入；成员、消息、任务、持久化、Host、Client 和浏览器均走正式实现。
- `probe:experts:team:real` 显式读取已配置的 preview DeepSeek 凭据，在一次性 DSH Home 中创建独立真实执行；真实 lead 创建两阶段任务并通过官方消息与状态工具交给两名真实成员。凭据不进入命令参数和报告，临时副本在退出时删除。
- `probe:experts` 保留专家资产与编辑页面的独立打包回归。

本轮证据位于仓库 `.artifacts/dsh-0.1.6-upgrade/native-expert-team/` 和 `native-team-web/`，长任务、交接、重连和失败恢复的判定见 `docs/evidence/expert-team-resilience.md`，完整状态以 `docs/STATUS.md` 为准。两种测试都不修改用户 preview；只有显式 `:real` 命令调用付费模型。

官方 Team 在该版本仍为实验性能力。纯官方 fork 历史查询另有可复现的 `seeded session constructor seed must equal its inherited prefix` 问题；公共持久化读取与成员冷恢复的通过不能代替 Web 分叉历史验收。默认使用 fresh 成员。真实模型专业成果质量、企业远程多用户和完整热卸载仍须分别验收，不宣称本轮已完成。

## 安装候选包

当前源码依赖 DSH 0.1.7-rc.2，应使用同一次构建产出的配套 tgz；不要把旧 Release 的安装包当作已含本次升级。先在独立 Profile 验证，再部署实际使用的 Profile：

```sh
dsh --profile workdsh --from-default-profile web --dump-config
dsh plugin --profile workdsh add /absolute/path/release/workdsh-provider-identity-local-0.1.0-alpha.6.tgz \
  /absolute/path/release/workdsh-plugin-audit-0.1.0-alpha.5.tgz \
  /absolute/path/release/workdsh-plugin-access-0.1.0-alpha.6.tgz \
  /absolute/path/release/workdsh-plugin-skills-0.1.0-alpha.32.tgz \
  /absolute/path/release/workdsh-plugin-experts-0.1.0-alpha.8.tgz
dsh --profile workdsh
```

在专家入口保存、校验、预览并确认发布，然后召唤。示例只填入原生草稿，发送后才执行；模型与账号在 Harness 中配置。

页面与弹窗使用 Harness 原生主题语义颜色，跟随官方外观设置及系统明暗切换。
