## 2026-09-20 WorkDSH 项目级 alpha.7

[`v0.1.0-alpha.7`](https://github.com/techflag/workdsh/releases/tag/v0.1.0-alpha.7) 是 Harness `0.1.6-alpha.2` 基线上的维护版。九个可安装包中四个模块更新：skills `alpha.31`、experts `alpha.7`、connectors `alpha.2`、bundle `alpha.47`；identity-local、audit、access、office、activity 沿用当前已验收版本。

修复设置页「外观」切换不生效：工作台客户端不再强制 `workdsh` 深色主题、不再拦截 `theme/change`，外观改由官方 ThemeRuntime 与用户偏好驱动，浅色/深色/跟随系统即时生效。能力中心删除「行业应用」标签（用户决定，暂用不到）；修复设置导航重复的「Agent 预设」页，移除对官方 `settings.section` 增量槽的包装式注册。构建、typecheck、集成 110/110、活动 14/14、规划 2/2 与精确版本门禁通过；macOS 已覆盖九包隔离安装与冷启动；Windows、Linux、卸载与自动回滚仍未验收。相对 alpha.6，专家团长任务探针、真实模型两阶段交接、连接器隔离探针与腾讯文档实连未在本批制品上复跑。

## 2026-09-19 WorkDSH 项目级 alpha.6

[`v0.1.0-alpha.6`](https://github.com/techflag/workdsh/releases/tag/v0.1.0-alpha.6) 将项目组合升级到 DeepSeek Harness `0.1.6-alpha.2`。九个可安装包中五个模块随升级与开发推进更新：skills `alpha.30`、experts `alpha.5`、office `alpha.7`、activity `alpha.4`、bundle `alpha.46`；identity-local、audit、access、connectors 沿用当前已验收版本。

六个客户端插件完成 Client Session 迁移：当前会话按官方 `SessionSummary.retainedBy.mainView` 推导，打开会话使用官方 `uiWorkspace.openSession` 导航，专家成员会话改用官方 `sessions.subagentAddress` 解析。Office 新增 CSV 只读表格预览并收窄 word-only 制品范围；安装器集成测试断言已同步到 Harness `0.1.6-alpha.2`。macOS 已覆盖全新 Profile 安装与冷启动；Windows、Linux、卸载与自动回滚仍未验收。projects 与 library 源码同步推进到 `0.1.0-alpha.2`，不进入本次安装组合。

## 2026-09-16 WorkDSH 项目级 alpha.5

[`v0.1.0-alpha.5`](https://github.com/techflag/workdsh/releases/tag/v0.1.0-alpha.5) 修复项目安装器的升级路径。安装器现在区分新 Profile 与现有 Profile：新装时初始化官方 Web Profile，升级时保留原配置、专家、技能、连接器与凭据，不再重复使用 `--from-default-profile`。安装器还会在修改 Profile 前校验 Harness CLI 必须为 `0.1.6-alpha.1`，避免旧 CLI 产生部分安装。

九个插件包沿用 alpha.4 已验收字节和模块版本；本次更新的是项目发行版本、安装器与升级验收。macOS 已覆盖全新 Profile 冷启动和 `alpha.4 → alpha.5` 原地升级；Windows、Linux、卸载与自动回滚仍未验收。

## 2026-09-16 WorkDSH 项目级 alpha.4

[`v0.1.0-alpha.4`](https://github.com/techflag/workdsh/releases/tag/v0.1.0-alpha.4) 更新专家团韧性和协作状态展示。正式打包 Web 验收覆盖长任务、浏览器重连、人工停止后由原成员继续、任务与消息交接、成员失败提示及 Host 冷恢复；显式真实模型验收完成 lead→analyst→reviewer 两阶段任务交接。

本次项目 Release 附九个可安装 `.tgz`、`SHA256SUMS`、`release-manifest.json`、发行说明和校验型安装器。专家插件为 `workdsh-plugin-experts@0.1.0-alpha.4`，活动插件为 `workdsh-plugin-activity@0.1.0-alpha.3`；其他模块沿用当前已验收版本。小时级资源稳定性和官方 fork 成员浏览器历史仍未签收。

## 2026-09-15 WorkDSH 项目级 alpha.2

[`v0.1.0-alpha.2`](https://github.com/techflag/workdsh/releases/tag/v0.1.0-alpha.2) 是当前 WorkDSH 模块的项目级发行，基于 DeepSeek Harness `0.1.6-alpha.1`。它在既有 Skill 单模块项目预览之后，第一次用一个项目 Release 汇总当前组合所需的九个预构建插件包、统一校验文件和发布清单。

本次新增可安装的 `workdsh-plugin-connectors@0.1.0-alpha.1`：支持多个 stdio/Streamable HTTP MCP 实例、官方凭据存储、工具与资源发现、启停、增删改和按会话工具隔离。腾讯文档令牌连接实测发现 224 个工具，并在 WorkDSH 会话内完成只读账号文档查询。新会话默认不选连接器；选择后详情弹窗关闭并在输入框旁显示连接器名称。交互式 OAuth、多账号和公共授权尚未验收。

完整变化、验证和边界见[项目发行说明](releases/v0.1.0-alpha.2.md)。各插件仍保留独立包版本，不因项目 tag 统一改号。

## 2026-09-15 DSH 0.1.6 官方 Team 公开发布回执

源码发行提交：`bbda262fd0f7d3332d1a9a864d24e0114b2dc811`。main 与 5 个模块 tag 已推送，5 个 GitHub prerelease 均已公开；共 23 个附件完成无认证 HTTP 200 回读，并与本地发行制品逐字节 SHA-256 一致。

本批使用 DeepSeek Harness `0.1.6-alpha.1`，以官方 Team 替代 WorkDSH 自建专家团执行器。五个独立模块版本为 experts alpha.3、skills alpha.29、activity alpha.2、office alpha.5、bundle alpha.42；专家发行附 identity-local alpha.5、audit alpha.4、access alpha.5。安装包、摘要和 manifest 见各模块发布页；未发布 npm。完整变化、验证与已知边界见[本批发布说明](releases/2026-09-15-dsh-0.1.6-alpha.1.md)。

| 模块 | 安装包版本 | 下载 |
| --- | --- | --- |
| experts | `workdsh-plugin-experts@0.1.0-alpha.3` | [Release](https://github.com/techflag/workdsh/releases/tag/experts-v0.1.0-alpha.3) · [tgz](https://github.com/techflag/workdsh/releases/download/experts-v0.1.0-alpha.3/workdsh-plugin-experts-0.1.0-alpha.3.tgz) |
| skills | `workdsh-plugin-skills@0.1.0-alpha.29` | [Release](https://github.com/techflag/workdsh/releases/tag/skills-v0.1.0-alpha.29) · [tgz](https://github.com/techflag/workdsh/releases/download/skills-v0.1.0-alpha.29/workdsh-plugin-skills-0.1.0-alpha.29.tgz) |
| activity | `workdsh-plugin-activity@0.1.0-alpha.2` | [Release](https://github.com/techflag/workdsh/releases/tag/activity-v0.1.0-alpha.2) · [tgz](https://github.com/techflag/workdsh/releases/download/activity-v0.1.0-alpha.2/workdsh-plugin-activity-0.1.0-alpha.2.tgz) |
| office | `workdsh-plugin-office@0.1.0-alpha.5` | [Release](https://github.com/techflag/workdsh/releases/tag/office-v0.1.0-alpha.5) · [tgz](https://github.com/techflag/workdsh/releases/download/office-v0.1.0-alpha.5/workdsh-plugin-office-0.1.0-alpha.5.tgz) |
| bundle | `workdsh-bundle@0.1.0-alpha.42` | [Release](https://github.com/techflag/workdsh/releases/tag/bundle-v0.1.0-alpha.42) · [tgz](https://github.com/techflag/workdsh/releases/download/bundle-v0.1.0-alpha.42/workdsh-bundle-0.1.0-alpha.42.tgz) |

## 2026-09-14 公开发布回执

源码发行提交：`557d076f12d8e18003edf6940793acf2055d111c`。main已推送，5个独立模块tag均指向该提交；全部为公开prerelease，未覆盖旧附件。

- [experts-v0.1.0-alpha.2](https://github.com/techflag/workdsh/releases/tag/experts-v0.1.0-alpha.2)，7个附件。
- [skills-v0.1.0-alpha.28](https://github.com/techflag/workdsh/releases/tag/skills-v0.1.0-alpha.28)，4个附件。
- [activity-v0.1.0-alpha.1](https://github.com/techflag/workdsh/releases/tag/activity-v0.1.0-alpha.1)，4个附件。
- [office-v0.1.0-alpha.4](https://github.com/techflag/workdsh/releases/tag/office-v0.1.0-alpha.4)，4个附件。
- [bundle-v0.1.0-alpha.41](https://github.com/techflag/workdsh/releases/tag/bundle-v0.1.0-alpha.41)，4个附件。

全部23个公开附件已通过无认证下载，SHA256与本地一致。

每个发行含模块tgz、SHA256SUMS、源提交manifest与隔离Profile安装/冷启动/移除验证清单。专家发行另附原配套身份/审计/授权插件。真实应用截图随源码公开，并嵌入发行说明。未发布npm，未发送Twitter；TM-01和付费长任务状态切换未整体验收。

## 2026-09-14 Alpha Web release / 最新预览发行

本批通过8个精确安装包的隔离官方Web Profile安装、两次冷启动、匿名401/认证200、活动插件移除及全部模块移除后冷启动。完整构建、115项集成测试、9项活动测试通过。验证环境：Harness 0.1.5-rc.1，Node 22.23.2，macOS。专家团TM-01、真实长任务状态切换及多平台整体验收尚未完成。

| 模块 | 安装包版本 | 下载 |
| --- | --- | --- |
| experts | `workdsh-plugin-experts@0.1.0-alpha.2` | [Release](https://github.com/techflag/workdsh/releases/tag/experts-v0.1.0-alpha.2) · [tgz](https://github.com/techflag/workdsh/releases/download/experts-v0.1.0-alpha.2/workdsh-plugin-experts-0.1.0-alpha.2.tgz) |
| skills | `workdsh-plugin-skills@0.1.0-alpha.28` | [Release](https://github.com/techflag/workdsh/releases/tag/skills-v0.1.0-alpha.28) · [tgz](https://github.com/techflag/workdsh/releases/download/skills-v0.1.0-alpha.28/workdsh-plugin-skills-0.1.0-alpha.28.tgz) |
| activity | `workdsh-plugin-activity@0.1.0-alpha.1` | [Release](https://github.com/techflag/workdsh/releases/tag/activity-v0.1.0-alpha.1) · [tgz](https://github.com/techflag/workdsh/releases/download/activity-v0.1.0-alpha.1/workdsh-plugin-activity-0.1.0-alpha.1.tgz) |
| office | `workdsh-plugin-office@0.1.0-alpha.4` | [Release](https://github.com/techflag/workdsh/releases/tag/office-v0.1.0-alpha.4) · [tgz](https://github.com/techflag/workdsh/releases/download/office-v0.1.0-alpha.4/workdsh-plugin-office-0.1.0-alpha.4.tgz) |
| bundle | `workdsh-bundle@0.1.0-alpha.41` | [Release](https://github.com/techflag/workdsh/releases/tag/bundle-v0.1.0-alpha.41) · [tgz](https://github.com/techflag/workdsh/releases/download/bundle-v0.1.0-alpha.41/workdsh-bundle-0.1.0-alpha.41.tgz) |

下载所需tgz后，使用官方CLI：`dsh plugin --profile <profile> add /absolute/path/<package>.tgz`。基础身份、审计与授权配套见专家发行附件；各模块独立安装。仅发布GitHub alpha附件，未发布npm注册表。Office依赖引用与声明许可证见下文；现有notice及检查报告保留。

## 2026-09-14 发布准备历史记录

本次提交准备：experts 0.1.0-alpha.2、skills 0.1.0-alpha.28、contracts 0.1.0-alpha.7，新增独立activity 0.1.0-alpha.1。模块分别版本化，不覆盖旧Release包。最新协作栏状态刷新纳入本次源码；本地重打包制品位于.artifacts/release-submit-2026-09-14。未推送/创建公开Release/发布npm；Office文本缺项按用户要求用README引用说明记录，不再作为本次阻塞；新制品完整组合回归仍未执行。Twitter草稿及真实图片见[social draft](social/twitter-2026-09-14.md)。

# Module releases / 模块发布与安装

2026-09-12。当前新增单个专家0.1 alpha及匹配的身份/授权/审计/Skill/展示配套；下方旧Skill发布信息保留为历史基线。每个模块保留自己的版本，GitHub Release 按模块建立，不再用一个仓库快照版本代替全部模块。

## Word alpha.2 预览版

[office-v0.1.0-alpha.2](https://github.com/techflag/workdsh/releases/tag/office-v0.1.0-alpha.2)：独立 workdsh-plugin-office@0.1.0-alpha.2，Harness0.1.5-rc.1 Web/Cordis4.0.2。包含实时Word工作副本、MIT Tiptap表格/图片、已支持DOCX导入导出，原件保留，原生文件卡与下载。附件为Word-only tgz、摘要与源提交清单；基础身份/授权/审计配套沿用alpha.1/专家发布版本，不需安装其他编辑器。未发布npm。参阅[安装说明](../packages/plugins/office/README.md)、[验收](evidence/office-word-final-u3.md)及[下一阶段](design/office/NEXT-STAGE.md)。

模型单批或多批取决于任务，提交后页面自动更新；最近长图资料模型行为仍有文件工具绕行，不承诺每次固定分批。完整分页/页眉页脚、嵌套表格、单元格图片与其他七类实时编辑未完成，Microsoft Word/真实IME未验。历史alpha.1保持不变。

## 单个专家首个alpha / Individual Experts first alpha

[experts-v0.1.0-alpha.1](https://github.com/techflag/workdsh/releases/tag/experts-v0.1.0-alpha.1)发布专家插件以及本次验证所用配套包、SHA256SUMS与release-manifest.json。此页聚合配套下载，不意味着模块统一版本。未发布npm注册表，contracts/UI为开发依赖而非用户安装包。

| 包 / Package | Version | 本次用途 / Purpose |
|---|---|---|
| workdsh-plugin-experts | 0.1.0-alpha.1 | 单个专家管理、发布与原生任务 / Expert management, publication and native tasks |
| workdsh-provider-identity-local | 0.1.0-alpha.4 | 本地主体 / Local identity |
| workdsh-plugin-audit | 0.1.0-alpha.3 | 审计 / Audit |
| workdsh-plugin-access | 0.1.0-alpha.4 | 授权及Session/Tool桥 / Governed entry points |
| workdsh-plugin-skills | 0.1.0-alpha.25 | 共享Skill与固定修订 / Shared Skills and retained revisions |
| workdsh-bundle | 0.1.0-alpha.40 | 可选展示层 / Optional presentation |

安装顺序和具体CLI命令见[专家插件README](../packages/plugins/experts/README.md)。本次基线为Harness0.1.5-rc.1 Web/Cordis4.0.2，旧Desktop及Windows/Linux端到端未验收。实际模型工具/文件/计算/成果与冷重启任务绑定已有证据，但专业报告仍有两项脏数据推断问题；本次是可试用alpha，不整体签收D04/AT-27。专家团SOP、公共市场与企业Web不包含在安装功能中。

See the plugin README for the matching archives and installation order. Native model execution and artifacts have been exercised; professional report acceptance is incomplete. This alpha excludes expert teams and enterprise administration. [验收证据 / Evidence](evidence/d04-experts-review-fixes.md)

## 旧Skill发布基线 / Previous Skill release baseline

## 可下载模块 / Installable modules

| 模块 / Module | npm package | Version | Git tag / release |
| --- | --- | --- | --- |
| 技能管理 / Skills | `workdsh-plugin-skills` | `0.1.0-alpha.24` | [skills-v0.1.0-alpha.24](https://github.com/techflag/workdsh/releases/tag/skills-v0.1.0-alpha.24) |
| 展示组合 / Presentation | `workdsh-bundle` | `0.1.0-alpha.39` | [bundle-v0.1.0-alpha.39](https://github.com/techflag/workdsh/releases/tag/bundle-v0.1.0-alpha.39) |

每个发布页只附本模块的 `.tgz`、`SHA256SUMS` 与 `release-manifest.json`。Manifest 记录模块、版本、源代码提交、验证基线、文件大小与摘要。GitHub 的 Source code ZIP/TAR 是仓库源码，不是插件安装包。尚未发布 npm。

Each release carries its own prebuilt package, checksums, and a manifest tying it to the source commit and verified runtime. Use the named `.tgz` asset, not GitHub's automatically generated source archives. No npm publication has been performed.

## 开发模块对应表 / Development package map

| 模块 | 当前版本 | 本次交付方式 |
| --- | --- | --- |
| `workdsh-plugin-workbench` | `0.1.0-alpha.10` | 随展示 bundle 交付；没有独立安装层，不另发可安装插件包。 |
| `workdsh-ui` | `0.1.0-alpha.6` | 共享展示组件库；需要的代码编译进各 Client 制品。 |
| `workdsh-contracts` | `0.1.0-alpha.8` | 类型契约开发包；Skill 自包含所需声明。 |
| `workdsh-provider-identity-local` | `0.1.0-alpha.5` | 本地身份基础服务源码和测试，未作为独立用户安装包交付。 |
| `workdsh-plugin-access` | `0.1.0-alpha.5` | 本地授权基础服务源码和测试，未作为独立用户安装包交付。 |
| `workdsh-plugin-audit` | `0.1.0-alpha.4` | 本地审计基础服务源码和测试，未作为独立用户安装包交付。 |
| 连接器 / Connectors | `0.1.0-alpha.1` | 项目级 `v0.1.0-alpha.2` 附带可安装包；令牌授权已验证，OAuth 仍在规划。 |
| 项目、资料库等 | 见 [modules.json](modules.json) | 设计/规划模块，不生成空插件发布包。 |

Workbench currently ships inside the presentation bundle. UI and contracts are shared development libraries. Local identity/access/audit are source-level foundations. None is advertised as an independently installable end-user plugin in this release. Planned modules receive their own releases only after actual package and lifecycle acceptance.

## 兼容矩阵 / Compatibility

| 环境 / Environment | 结论 / Result |
| --- | --- |
| Harness `0.1.5-rc.1` Web Profile + Cordis `4.0.2` | 已验证独立 Skill 安装、组合、浏览器管理、停止后移除、冷重启和重装。 / Verified. |
| 本次测试主机 / Test host | macOS，Node `22.23.2`，pnpm `10.34.5`，Playwright Chromium。 |
| Node 声明 / Declared Node range | `^22.19.0 || >=24.0.0`；本次发布回归使用 22.23.2。 |
| DSH Desktop `2.0.5`，内置 Harness `0.1.2-rc.1` | **已知不兼容表现：安装启用并重启后缺少入口；本次不修复。** / Known missing navigation, unresolved. |
| 其他桌面版本 / Other desktop versions | 未验收，不从“已安装”推断 Client 已激活。 / Not verified. |
| Windows / Linux | 本次未做各平台端到端验收。 / Platform-specific end-to-end checks not performed. |

旧桌面发布包的 Sidebar 文档与 Client 制品没有当前插件使用的 `sidebar.panellist`。这说明入口扩展面存在版本差异，但本次没有继续完成全部 Host/Client 兼容诊断。用户已明确停止兼容性改造；不将该问题写成已修复，不升级用户桌面应用，不改其 Profile。

The older desktop's shipped Sidebar does not expose the `sidebar.panellist` used by this plugin. This establishes an extension-point difference, not a complete diagnosis of all Host/Client compatibility. Compatibility work was stopped at the user's request; the release does not upgrade or modify that desktop installation.

## 安装 / Install

使用已匹配依赖的官方 `0.1.5-rc.1` CLI；`dsh` 不能指向旧桌面启动器。安装、升级和移除前停止目标 Profile。

```sh
# New Web Profile; use the official CLI, not handwritten profile files.
dsh --profile workdsh --from-default-profile web --dump-config

# Required for Skill management. Replace the absolute file path.
dsh plugin --profile workdsh add /absolute/path/workdsh-plugin-skills-0.1.0-alpha.24.tgz

# Optional WorkDSH brand/theme/workbench layer.
dsh plugin --profile workdsh add /absolute/path/workdsh-bundle-0.1.0-alpha.39.tgz

dsh --profile workdsh
```

启动后打开“专家 · 技能 · 连接器 → 技能”。Skill 独立安装不提供 WorkDSH URL 路由，直接使用侧栏入口。展示包提供 `workdsh-view` 深链接，但它不包含 Skill 功能实现。

Open **专家 · 技能 · 连接器 → 技能** after boot. Standalone Skill uses its sidebar entry; the optional presentation bundle owns WorkDSH deep links and does not contain the Skill implementation.

停止 Profile 后移除管理插件：

```sh
dsh plugin --profile workdsh remove workdsh-plugin-skills
```

原有技能文件与管理数据保留。也可独立移除 `workdsh-bundle`；已安装的 Skill 插件继续提供自己的入口。此处是停止后移除与重新启动流程，未宣称 CLI 运行中完整热卸载。

Removal preserves user skill files and management data. The presentation bundle can also be removed independently. Full live CLI hot-unload is not claimed.

## 校验 / Verify downloads

将某一模块的 `.tgz`、`SHA256SUMS` 和 `release-manifest.json` 放在同一目录。不同模块的附件同名，请各自保存到独立目录。

```sh
# macOS
shasum -a 256 -c SHA256SUMS
# Linux
sha256sum -c SHA256SUMS
```

Checksums detect download corruption; they are not a separate publisher signature. The manifest records the exact source commit. Source and release assets must correspond; published versioned tarballs are not overwritten with different bytes.

## 后续发布规则 / Release policy

1. 一模块一版本线；按 `<module>-v<package-version>` 建 tag，保持历史 `v0.1.0-alpha.1` 快照不变。
2. 只有具备有效 `dsh.bundle`、标准入口、预构建产物并通过独立安装验收的功能包，才列为“可安装插件”。共享库、提供方、规划目录分别标注，不能混列。
3. 先构建、类型检查和针对性测试，再打包；核对 manifest、exports、配置 patch、依赖和包内文件；不上传开发环境、凭据、用户内容或运行时数据。
4. 在隔离 Profile 中验证真实安装、Client 页面、Host 操作和生命周期。兼容结论必须带完整 Harness 版本与实际平台。
5. GitHub Release 附对应模块的安装包、校验与 manifest；README 中的版本、下载路径、范围和限制同步更新。
6. 默认交付 `.tgz`；GitHub 源码推送不等于 npm 发布。公共技能市场、企业后台与独立开发库发行仍按已批准范围推进。

Official basis: [Package and install a plugin](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish). Local verification: [Skill standalone evidence](evidence/skills-standalone-package.md).

## 本次发布回执 / Publication receipt

源码与制品提交 / Source commit: [`c6e0fd5`](https://github.com/techflag/workdsh/commit/c6e0fd5)。两个模块 tag 指向同一源提交，各模块独立版本不变。全部六个附件已从公开 URL 无认证下载，与本地上传文件字节摘要一致。中英文 README 和嵌入截图也已公开回读一致。

| 安装包 / Package | SHA-256 |
| --- | --- |
| `workdsh-plugin-skills-0.1.0-alpha.24.tgz` | `11d1dd6134d4e6ef1c01c3cba0c8c9558715b70ea7165f8af240b62b7ca3311e` |
| `workdsh-bundle-0.1.0-alpha.39.tgz` | `f22f614937962f8f98f7df5862774f1db7e9e8670eae48531aed31af735ffc29` |

This documentation-only receipt follows the release commit. Module tags and release manifests keep the original source commit; no published artifact was replaced.

## 2026-09-13 原生 PPT 源码预览

本次发布 `office-v0.1.0-alpha.3` 为 GitHub 源码开发预览：包含当前原生 PPT 编辑集成、UI 样式隔离与最终 PPTX 文件交付实现及 README 截图。此前已发布 Word alpha.2 安装包不变。完整实验构建仍有第三方 tarball 缺少许可正文的 review 记录，因此本次不上传该完整 `.tgz` 为已审查安装包。源码发布不等同于 npm 发布、完整 Office 交付或 PPT 美观度验收。技能市场当前 alpha.26 工作区改动随源码记录，其独立新安装包不在本次 Office 发布范围。

发布回执：[Office alpha.3 源码预览](https://github.com/techflag/workdsh/releases/tag/office-v0.1.0-alpha.3)，源码提交 `0b042c5`；tag 与 main 已推送。该 release 标记 prerelease，无实验安装包附件。
