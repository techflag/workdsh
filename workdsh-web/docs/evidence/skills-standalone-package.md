# Skill 独立包安装验证：alpha.24 通过，保留 alpha.23 原始缺口

当前结果：**alpha.24 独立激活及管理验收通过，未发布 npm**。下文“原始验证”保留 alpha.23 的失败证据，最终实施结果见文末。

## 发布补充：旧桌面限制

2026-09-12 在实际 DSH Desktop 2.0.5 安装目录确认其内置 Harness 为 0.1.2-rc.1。用户已安装 alpha.24 并启用、重启，但没有 Skill 导航。该版本 Sidebar 文档和 Client 制品未包含当前使用的 sidebar.panellist；完整 Host/Client 兼容诊断尚未完成。按用户要求停止改造并按原版本发布，**不声称支持该旧桌面**。原有“独立验收通过”专指下文完整列出的 0.1.5-rc.1 Web 环境。见 [模块发布矩阵](../RELEASES.md)。

本轮发布前重新通过 build、typecheck、33/33 集成、2/2 规划、463 项依赖锁定、独立和组合打包浏览器测试。演示截图只含隔离测试内容。

## 原始验证

日期：2026-09-12。包：workdsh-plugin-skills@0.1.0-alpha.23。Node 22.23.2、pnpm 10.34.5、DSH 0.1.5-rc.1。

## 目的与结论

用户要求按官方打包、发布、安装流程判断 Skill 是否是真正的独立插件。此次验证原有包，不修改 manifest 来掩盖当前结果。

**构建和打包通过，作为普通依赖的安装通过；独立配置层激活未通过。** 当前有可加载的 Host apply 模块和真实管理功能，但产品安装方式仍依附 workdsh-bundle，不能宣称 Skill 已作为独立可安装发行品交付。

## 官方依据

[打包与安装插件](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish) 区分普通 npm 依赖与通过 dsh.bundle 贡献配置层的包。本次使用官方 CLI 和已发布依赖；没有使用上游源码。

## 实际验证

在 WorkDSH 根目录执行：

```sh
corepack pnpm --filter workdsh-plugin-skills build
corepack pnpm --filter workdsh-plugin-skills pack --pack-destination .artifacts/skill-package-audit
```

随后由 Node 启动仓库锁定的官方 dsh CLI；仅本次子进程使用新建的 DSH_HOME 和 DSH_AGENTS_HOME：

```text
dsh --profile skill-audit --from-default-profile web --dump-config
dsh plugin --profile skill-audit add <绝对路径>/workdsh-plugin-skills-0.1.0-alpha.23.tgz --offline --config.auto-install-peers=false
dsh --profile skill-audit --dump-config
```

离线安装并禁用自动补齐 peer，用于避免安装未锁定的新版本；本次不据此宣称运行依赖已完整满足。安装后检查真实 Profile manifest、安装包 manifest 和解析后的配置。

| 项目 | 结果 |
|---|---|
| tsc 构建 | 通过 |
| pnpm pack | 通过，生成 alpha.23 tgz |
| 官方 CLI 安装依赖 | 通过 |
| 包内 dsh.bundle | 不存在 |
| 包内 dsh.client | 不存在 |
| Profile bundles | 仅 dsh-base、dsh-web-app，没有 Skill 包 |
| 解析后的配置含 Skill 插件 | 否 |
| npm 公开发布 | 未执行；原包 private=true，独立公开发行配置尚未完成 |
| Host/Client 独立激活、生命周期和功能 | 本次未通过该前置，因此未继续宣称运行验收成功 |

CLI 明确提示缺少 dsh.bundle，因此只安装为普通依赖，不作为 Profile layer。原始结构化结果在 `.artifacts/skill-package-audit/result.json`；该结果仅含测试目录、包状态和提示，不含会话凭据。

制品路径为 `.artifacts/skill-package-audit/workdsh-plugin-skills-0.1.0-alpha.23.tgz`。它是**用于验证缺口的原状打包制品**，不能作为“安装即用的 Skill 独立发行版”推广。

## 修正范围

1. 补 Skill 安装组合 manifest 与 patch，使用标准独立 Host 插件行。
2. 补官方 Client manifest、可发现的 Client 入口与正确浏览器产物，声明独立 inject。
3. 完整处理预构建制品的运行依赖，不能依赖开发仓库中的 workdsh-ui 或 workspace 偶然存在。
4. 默认 bundle 改为规范组合，避免直接初始化造成没有独立 Fiber，或同时安装时重复注册。
5. 分别验收独立安装、Host/Client 激活、实际管理操作、移除及重装；移除 Skill 后其他功能仍可运行。
6. 确认公开发布目标、权限和发行元数据后再发布；打包成功不能代替发行与安装激活证明。

这项修正是已有 Skill 的插件交付补齐，不需要扩展公共市场、企业后台或重做技能业务。此次只有验证与记录，没有实施上述修正。

## 独立交付改造：官方能力复用记录

2026-09-12 用户授权实施；以下为本轮范围，前述 alpha.23 的失败记录保留。

| 项目 | 本轮选择 |
|---|---|
| 任务 | D04 前置修复 / P1-03：Skill 0.1 独立交付，不开展专家业务或企业后台 |
| 官方入口 | DSH 0.1.5-rc.1 的 dsh.bundle/patch、dsh.client/./client；Cordis 4.0.2 apply/inject/ctx.plugin/effect |
| 依据 | 官方打包教程；[Client 模块镜像](../dsh-v0.1.6-alpha.2/subsystems/client-modules.zh.md)；ADR-0018 |
| 复用 | 官方 Loader 装配 Skill 独立行，官方 Client 图加载预构建浏览器产物；官方 Skill provider、原生会话与管理业务保持原所有权 |
| 自有修正 | Skill 独立导航/生命周期、公共类型契约、可分发产物；默认产品通过官方 CLI 显式安装所选功能包，总包不隐藏初始化 Skill |
| 待验假设 | 独立 Web Profile 能发现 Client 并操作技能；独立与产品组合都只注册一次；移除 Skill 不移除官方文件提供方、用户文件或工作台 |
| 验收 | 构建/类型、Host 依赖生命周期、无源码 tarball 安装、真实浏览器管理、停服移除与冷启动重装；不把冷启动验收称作完整热卸载 |

## alpha.24 实施结果

- Skill 有独立 Host `apply/inject`、`dsh.bundle` 配置层和 `dsh.client` 标准入口；通过官方 ModuleLoader facade 注册预构建浏览器产物，不自建加载器。依赖锁定 Harness rc.1 / Cordis 4.0.2；React 共享官方 renderer 实例。
- 默认 bundle alpha.39 不导入、不编译也不调用 Skill 初始化；`preview:install` 使用官方 CLI 显式装配 Skill 与展示包两个层。Workbench alpha.10 使用 `ctx.plugin` 注册正式子插件，但尚未独立分发。
- `workdsh-contracts/skills` 提供本地 `SkillManagementService` v1；Skill 消费单一类型源，tarball 内嵌所需声明，不要求运行环境保留 workspace。专家只应注入公开服务，不导入 SkillManager 内部实现。
- Host effect 撤销 exact routes、取消并排空在途上传；Client 请求和任务框等待绑定自己的生命周期。用户文件、草稿、停用来源、回收凭据的数据格式未改变。

### 实际验收

环境：macOS / Node 22.23.2 / pnpm 10.34.5 / DSH 0.1.5-rc.1 / Cordis 4.0.2 / Playwright Chromium。独立 probe 的安装 home 和 cwd 均在系统临时目录，位于源码仓库之外，避免祖先 node_modules 掩盖制品缺失。仅测试 Skill 文件写入隔离 Agents home；不使用用户 ~/.agents 内容。

| 验收 | 实际结果 |
|---|---|
| 根 build、typecheck | 通过；Skill 与 bundle 分别产出独立浏览器制品 |
| test:integration | 33/33 通过；新增真实 Cordis/Skills/Tools 的依赖等待、恢复、清理与在途上传取消 |
| test:planning / check:plan / check:versions / git diff --check | 通过；2/2、26 模块/50 文档、463 项锁定依赖、无补丁格式错误 |
| probe:skills | 通过；官方独立 tarball 安装、单层单 Client、无需总包、无 workspace 运行依赖 |
| 独立浏览器管理 | 真实编辑写盘、陈旧 revision 冲突、启停、卸载到回收站、恢复通过 |
| 独立插件移除与重装 | 停服移除后 Host route 404、Client 图及导航缺席；原生新会话可用，编辑内容保留；重装及重复安装各只激活一次 |
| 默认组合 probe:browser | 通过：原生侧栏、技能列表/完整详情、正文与资源编辑、上传预检/安装、创建草稿、Remote、重连、两次冷重启、移除总包与重装 |
| 双向独立移除 | 移除 Skill 后，WorkDSH 品牌、工作台和原生新会话仍可用，旧技能深链接回到 Conversation；移除展示包后，独立 Skill 列表仍可打开 |
| 同一 Host 的消费者 | 两个测试插件通过服务注入共享依赖检查；提供方消失时清理，恢复后重新注册，无关服务保持 |
| preview:install | 新建隔离预览 Profile 通过；官方 CLI 安装两层，无手写 Loader/Profile 数据 |
| 人工预览更新 | 原有 preview Profile 安装两层后启动 18989；认证目录返回 200、16 项技能，沿用用户 Agents home，未修改用户技能文件 |
| npm 发布、真实模型调用、运行中 CLI 完整热卸载 | 未执行/未声明；不影响本轮本地独立交付结论 |
| 系统文件管理器弹出 | 本轮未执行图形打开；原生 Session Remote 路径保留，不把菜单存在当作新平台验收 |

期间失败均已定位后重新验证：独立安装先命中了全局 pnpm 11 的离线元数据目录，改为工程锁定 pnpm；产品初始 URL 早于独立页面注册，改为官方 Client 组合后恢复并检查真实页面；公开 Cordis 的 dotted Remote 注入仍须声明 root `remote`，Host/Client 注入现已分别补齐。未修改上游或提升版本规避。

产物与证据：

- `.artifacts/skills-standalone/workdsh-plugin-skills-0.1.0-alpha.24.tgz`
- `.artifacts/skills-standalone/result.json` 与 `standalone.png`
- `.artifacts/workdsh-bundle-0.1.0-alpha.39.tgz`
- `.artifacts/client-probe-skills-1440.png`、`client-probe-skills-1920.png`、`client-probe-skills-390.png`
- `tests/integration/skill-plugin-lifecycle.test.mjs`、`scripts/probe-skills-package.mjs`、`scripts/probe-install.mjs`

已人工查看独立与组合 1440px 截图：Skill 页面仍使用局部样式；独立安装保留 Harness 品牌和原侧栏，组合安装显示 WorkDSH 品牌与工作台入口，两种模式均只有一个能力中心入口。本轮不重做页面视觉，不将专家/连接器占位视为已实现功能。

### 当前边界

本轮完成已有 Skill 的独立交付和本地公共服务契约，版本仍为 Skill 0.1。未实现专家业务、不可变技能修订租约、全入口多用户治理、公共市场或企业管理 Web；这些继续按已确认的 D04 / 后期企业方案推进。CLI 停服移除验收与 Cordis 运行中 dispose 测试分开记录，不能等同于端到端热卸载。
