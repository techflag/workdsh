# WorkDSH 模块版本规划

状态：强制执行。版本单位是模块，不是页面、开发任务或临时切片。

## 版本模型

- 每个可独立交付的功能模块维护自己的 SemVer 版本线。当前技能模块版本线为 **0.1**，对应包 `workdsh-plugin-skills` 的开发制品 `0.1.0-alpha.N`。
- `主版本.次版本` 表示模块能力基线；补丁位表示同一基线内兼容修复，`alpha.N`、`beta.N`、`rc.N` 表示该模块的预发布迭代。
- 同一模块内的 Host、Client、Remote、资源、内置管理 Skill 和迁移文件属于一个模块版本，不能分别宣称互不相干的产品版本。
- 不同模块独立推进，不要求技能、专家、连接器、工作台和资料库锁步升级。只有实际发生变化的模块增加版本。
- 默认组合包维护自己的集成版本，并记录所组合模块的精确制品版本。组合包版本不能替代功能模块版本，也不能把未变化模块一起算作升级。
- 用户创建的 Skill、Expert、Project 等业务对象使用各自的 revision/schemaVersion；它们不跟随 npm 模块版本增长，模块升级也不能覆盖用户对象。

## 版本递增规则

| 变化 | 0.x 阶段规则 | 示例 |
| --- | --- | --- |
| 首个可评审模块切片 | 建立 `0.1` 版本线，开发包使用 `0.1.0-alpha.1` 起步 | 技能模块 `0.1` |
| 同一能力基线内的兼容修复或补全 | 增加 patch 或预发布序号 | `0.1.0-alpha.8` → `0.1.0-alpha.9` |
| 新增一组对外能力或公开契约发生不兼容变化 | 增加 minor，并给出迁移与消费者验证 | `0.1` → `0.2` |
| 稳定公开契约后的不兼容变化 | 增加 major | `1.x` → `2.0` |

开始模块开发时，必须在 `docs/modules.json` 写入 `moduleVersion`；模块 README、package.json、CHANGELOG、证据和 STATUS 使用同一版本线。`check:plan` 会验证模块版本格式、当前活动切片的版本声明，以及 package.json 的 major/minor 是否匹配。

## 当前版本线（2026-09-20）

当前安装包版本与模块实现状态分别列出；公开发行范围以[发行回执](releases/2026-09-14-development-candidate.md)为准，当前待验收项见[STATUS](STATUS.md)。每周排期见周计划（`WEEKLY-RELEASE-PLAN.md`，该文档未创建；排期口径见 [PLAN](PLAN.md) 的「每周发行排期」），不要求模块锁步升级。

| 模块 | 版本线 | 当前包版本 | 实现状态 |
| --- | --- | --- | --- |
| 领域公开契约 | 0.1 | `workdsh-contracts@0.1.0-alpha.10` | implemented |
| 共享展示组件 | 0.1 | `workdsh-ui@0.1.0-alpha.6` | implemented |
| 企业门户与登录门禁 | 0.1 | `workdsh-portal@0.1.0-alpha.2` | in_progress |
| 默认组合包 | 0.1 | `workdsh-bundle@0.1.0-alpha.57` | in_progress |
| 工作台 | 0.1 | `workdsh-plugin-workbench@0.1.0-alpha.16` | implemented |
| 专家管理 | 0.1 | `workdsh-plugin-experts@0.1.0-alpha.9` | in_progress |
| 技能管理 | 0.1 | `workdsh-plugin-skills@0.1.0-alpha.32` | implemented |
| 连接器管理 | 0.1 | `workdsh-plugin-connectors@0.1.0-alpha.3` | in_progress |
| 资源授权 | 0.1 | `workdsh-plugin-access@0.1.0-alpha.5` | implemented |
| 审计 | 0.1 | `workdsh-plugin-audit@0.1.0-alpha.4` | implemented |
| 本地身份提供方 | 0.1 | `workdsh-provider-identity-local@0.1.0-alpha.6` | implemented |
| Office 浏览器编辑插件 | 0.1 | `workdsh-plugin-office@0.1.0-alpha.8` | in_progress |
| 协作与活动展示 | 0.1 | `workdsh-plugin-activity@0.1.0-alpha.5` | in_progress |
| 项目管理 | 0.1 | `workdsh-plugin-projects@0.1.0-alpha.4` | in_progress |
| 资料库 | 0.1 | `workdsh-plugin-library@0.1.0-alpha.4` | implemented |
| 助理 | 0.1 | `workdsh-plugin-assistant@0.1.0-alpha.1` | in_progress |

2026-10-01 更新：library α.3 → **α.4**（Unreleased）——「给 import 分支补 source 透传」。资料库 HTTP 连接接口 `/api/workdsh-library` 的 `import` 分支此前**不透传** `source` / `sourceTaskId`，导致经接口导入的资料落库恒为默认 `upload`，「产出」视图（`sources: ['task']`）不再列出它们（2026-09-30 方案 B 重建 8 篇资料的已知偏差 ②）。本版只补**转发层**：`connection-api.ts` 的 import 分支新增 `source` 白名单（`upload` / `task` / `created`，非白名单值回落默认 `upload`）与 `sourceTaskId`（须为字符串，否则丢弃）；客户端 `management.ts` 的 `importFile` 新增可选第三参 `origin`，不传时行为与旧版等价。**公开契约未变**（`LibraryImportInput` 本就含这两个字段）、服务端 `LibraryManager` 已消费，故属「同一能力基线内的兼容修复或补全 ⇒ 递增预发布序号」。**重定版理由**：`0.1.0-alpha.3` 已是线上运行制品（见上方 2026-09-25 更新（四）与本表），同名不同内容按本项目「撞号必须重新定版」口径处理。门禁实测：`corepack pnpm --filter workdsh-plugin-library typecheck` 退出码 0；`test` **6/6 通过**（原 5 + 新增 1 条 source 透传回归）。**线上 `dsh.10ge.cn` 已部署 α.4**（2026-10-01：`file:` 指针 → `pnpm install`（`+6 -92`，8.7s，EXIT=0）→ 重启 healthy；线上 `dist/remote/connection-api.js` 含 `payload.source === 'task'`）；已打包 `.artifacts/library-release/workdsh-plugin-library-0.1.0-alpha.4.tgz`（61279B，SHA256 `4b176118…d833e46`）；**未发布 npm、未提交未推送**。同日以方案②（直改 state 元数据，非官方重导）把 8 篇资料 `source` 由 `upload` 修正为 `task`，产出视图恢复；证据见 [STATUS](STATUS.md)「续三十七」（补透传）与「续三十八」（上线 + source 修复）。

2026-09-28 更新（二）：**仓库基线随升到 `0.1.7-rc.2`**（**本批不 bump 任何模块**——仓库侧 0 行业务代码，改动折入既有未发布增量；证据见 [dsh-0.1.7-rc.2-upgrade](evidence/dsh-0.1.7-rc.2-upgrade.md)「八、仓库基线随升（第二阶段）」）。承上条线上升级的用户追加三项裁决：①**仓库基线随升**——根 `package.json`（`devDependencies` 23 条 dsh + `pnpm.overrides`）与 15 个模块 `package.json`、`pnpm-lock.yaml`、`check-published-versions.mjs` 期望值、基线文档全量切 `0.1.7-rc.2`，并**补入 rc.2 新增 5 包**（`dsh-client-shortcuts` / `dsh-client-ui-shortcuts` / `dsh-llm-deepseek-account` / `dsh-llm-deepseek-api-key` / `dsh-util-code-language`）的精确 override；②**rc.2 文档镜像**落盘 `docs/dsh-v0.1.7-rc.2/`（569 文件 / 24MB）并把 24 文件 71 处镜像引用重锚（73 个唯一引用全命中）；③**8 插件 peer 重指**——已部署 8 插件的 dsh `peerDependencies` 由精确值改为 caret `^0.1.7-rc.2`（75 条），`devDependencies` 与 `cordis 4.0.4` 保持精确，使后续 `0.1.7-rc.*` 递进版本不再触发官方 skip；④**清理** 47.6GB core dump。门禁实测：`check:versions` PASS（**550 条 DSH 锁定 rc.2；Cordis 4.0.4 only**）、`check:plan` PASS（31 modules; 50 documents）、`typecheck`/`build` 退出码 0（各 13 包）。**未执行**：`test:integration`/`test:activity`/`probe:*` 未复跑；**npm 发布面受阻**（`npm whoami` = `ENEEDAUTH`、目标包 `E404`），发布待凭据与 registry 确认；未提交未推送。详见 [STATUS](STATUS.md)「续二十八」。

2026-09-28 更新：线上 `dsh.10ge.cn` 升级到官方 `latest` `0.1.7-rc.2`（**仅线上运行面；仓库基线随升见上条 2026-09-28 更新（二）**；证据见 [dsh-0.1.7-rc.2-upgrade](evidence/dsh-0.1.7-rc.2-upgrade.md)）。按用户 2026-09-28 指令「能否同步升级最新版，请分析并执行」执行，三项裁决：目标版本 `0.1.7-rc.2`（未取 `next` 通道 `0.2.0-rc.1`）、compose 镜像 tag 保持 `1panel/deepseek-harness:0.1.5-rc.1` 不动、8 插件 skip 走**官方豁免**（未重指 peer、未重打包、未发布 npm）。技术前提：compose 的 `global-dsh/standalone` 是 **bind mount，覆盖镜像内 dsh** ⇒ 线上 dsh 版本由宿主 standalone 树决定，镜像 tag 与实际版本解耦。执行链：P0 全量备份（`/home/luoji/dsh-backup-rc2-20260928224220`，profile-config-full 289MB / sessions 43MB / storages 6.6MB）→ Phase 1 profile 依赖重装到 rc.2（`VERSION_DISTRIBUTION_OK {"0.1.7-rc.2": 224}`、`RETARGET_OK FILE_DEPS=12`）→ Phase 2 换 standalone 树 + auth-bypass 双补丁 + `--force-recreate`（`RESOLUTION_ALL_OK 82 packages (73 @deepseek-ai/dsh)`、`TREE_VERSION_OK {"0.1.7-rc.2": 272}`、healthy / restarts=0）→ 豁免步骤（8 条 `allow-version` 落盘到**独立文件** `$P/compatibility.json`，profile `package.json` sha256 未变）→ Phase 3 全量复验 `PHASE3_RC2_OK`（启动错误模式 6 项全 0、属主门禁 0、`skip_count=0`、12 个 workdsh 包版本在线）。**回归根因**：8 插件 `peerDependencies` 对 dsh 用**精确值** `"0.1.7-alpha.2"`，rc.2 不匹配被官方 skip（caret 则 `rc.2 > alpha.2` 满足范围）。**边界**：2 个 core dump（28.3GB + 19.3GB）判定为容器更替期同型 SIGSEGV、**非 rc.2 回归**（当前容器 segv=0、`Restarts=0`；对齐 [v8-gc-sigsegv-repro](evidence/v8-gc-sigsegv-repro.md)）。**未执行**（当日线上批次口径，已被下条「2026-09-28 更新（二）」取代）：仓库 14 个版本承载 `package.json` / `pnpm.overrides` 279 条 / `check-published-versions.mjs` 期望值当时仍为 `0.1.7-alpha.2`，与线上 rc.2 存在版本分叉；47.6GB core 未清理。回退锚点：`$G/standalone.rc2.old.20260928230721`（alpha.2 旧树）+ `$P/node_modules.pre-rc2.20260928230332` + 4 份 `/home/luoji/dsh-backup-rc2-*` 快照。

2026-09-25 更新（三）：DSH 基线 `0.1.7-alpha.1` → `0.1.7-alpha.2`（Unreleased，**本批不 bump 任何模块**；证据见 [dsh-0.1.7-alpha.2-upgrade](evidence/dsh-0.1.7-alpha.2-upgrade.md)）。同族小版本递进：上游全树 0 文件删除、仓库侧 **0 行业务代码改动**，改动面为 `package.json`（根 + 13 个模块）、`pnpm-lock.yaml`、脚本常量与基线文档。版本族外实质变化是 Cordis `4.0.3 → 4.0.4` 及 5 个伴生包（`group 1.0.4` / `loader 1.0.5` / `include 1.0.9` / `timer 1.1.6` / `schemastery 3.18.4`）——官方把 caret 收紧为 tilde，单独升 Cordis 会 peer 冲突，故必须同批升。官方变化面 13 条逐项裁定为「0 处需改代码」（spill 默认值 `maxInlineBytes`→`maxInlineTokens`、`ToolDefinition.projectContent` 新扩展点、`ctx.pluginRegistryProbe` 新服务、`maxConsecutiveWakes` 缺省语义、模型协议改落 `cordis.patch.yml` 等）。`check:versions` PASS 539 条锁 alpha.2 / Cordis 4.0.4 only；`typecheck`/`build` 退出码 0；单测 127/127；7 项探针门禁全绿（`probe:theme` 观测到官方主题词表由 361 → **367** 个 `--dsw-*` 名字，仓库 887 条引用全部落在新词表内）。**线上 `dsh.10ge.cn` 未动（仍为 0.1.7-alpha.1）**；按用户裁决本批改动与 alpha.1 批次合并提交为 `c8a05e10a3` 并推送 `fork/main`（未发布 npm）。线上切换于同日随后执行，见下条更新（四）。

2026-09-25 更新（四）：线上 `dsh.10ge.cn` 切换到 `0.1.7-alpha.2`（**本批仍未 bump 任何模块**；证据见 [dsh-0.1.7-alpha.2-upgrade](evidence/dsh-0.1.7-alpha.2-upgrade.md)「线上切换与复验」）。按用户 2026-09-25 指令「执行上线部署」执行，沿用 alpha.1 批次 P8-5「换树」范式（alpha.2 把 caret 收紧为 tilde，且 Cordis 与伴生包在 standalone 树与 profile 树两侧都有实装，只升一侧会 peer 冲突）。执行链：d3 全量备份（`/home/luoji/dsh-backup-a2-20260925010038`，含 1.4G 整树副本）→ d4 物化 `_a4-standalone` 新树（512M / 闭包 156 条，硬门禁 A/B/C 全绿）→ d5 profile 升位 + 12 个 `file:` 指针重指 `wd-upload-018` + 279 条 overrides 写入 `pnpm-workspace.yaml` + 确定性重装 → d6 `mv` 原子换树 + auth-bypass 双份补丁 + 容器硬门禁 + `docker compose up -d --force-recreate` → d7 只读复验。复验结论：CLI `0.1.7-alpha.2`、cordis 家族 `4.0.4 / 1.0.4 / 1.0.9 / 1.0.5 / 1.1.6`、容器 `healthy` / `Restarts=0`、属主门禁 0、Session 与 Storage 逐字节未变、只读 API 10 项与 P8-6/P9-R 基线逐项相等、浏览器零 pageerror/console error、域名 302 → `/portal`（`server: cloudflare`）。**边界**：换树后约 30s 出现 1 次负载相关 SIGSEGV（`RestartCount=1`，容器自愈），无并发负载受控复现与同型负载复现均不再发生，判定为上游已知 V8 缺陷（[v8-gc-sigsegv-repro](evidence/v8-gc-sigsegv-repro.md)）、非本次升级回归，不回退。回退锚点：`standalone.a2.old.20260925010221` + `node_modules.pre-a2.20260925010207` + `web.bak.a2.20260925010038` + `/home/luoji/dsh-backup-a2-20260925010038/`。未发布 npm；线上 12 个制品版本号与本表一致（experts α.9 / skills α.32 / bundle α.54 / office α.8 / projects α.4 / activity α.5 / access α.5 / connectors α.3 / audit α.4 / library α.3 / assistant α.1 / identity-local α.6）。

2026-09-25 更新（二）：experts α.8→**α.9**（Unreleased）——P8-6 复验遗留的 4 个 `readiness=broken` 专家的处置（用户 2026-09-25 裁决「泛化过期修订重编译」）。0.1.7 换主后，0.1.6 时代发布的修订在新预设路径下没有 `preset.json`，`readExpertPreset` 只能显式报错；其中 3 个是**内置默认专家**，其 `publish()` 被 `default-immutable` 拒绝，原先「提示用户重新发布」的处置对它们不可执行。本版把既有的团队专用 `ensureCurrentExecutionRevision` 泛化为**所有** `compilerVersion` 过期的已发布修订，并新增 `ensureCompilerCurrent()` 在启动（`[Service.init]`）与列表/详情读取前扫描重编译：旧修订行按 ADR-0010 保持只读不改写，结果落为派生修订并前移 `publishedRevisionRef`，逐专家 best-effort、失败只审计不阻断。`readExpertPreset` 仍是永不重编译的读取器，`experts/preset-broken` 语义收窄为「迁移未成功」。同批 1 个可发布的个人专家（大客户经营顾问）按设计流程重新发布，不依赖本自愈路径。详见 [STATUS](STATUS.md) 2026-09-25（续二）与 [0.1.7 升级证据](evidence/dsh-0.1.7-alpha.1-upgrade.md)。公开 prerelease 仍以上次发行回执为准，本版待下次发行携带。

2026-09-25 更新：DSH 基线 `0.1.6-alpha.2` → `0.1.7-alpha.1` 收口（独立升级专项，证据见 [dsh-0.1.7-alpha.1-upgrade](evidence/dsh-0.1.7-alpha.1-upgrade.md)）。按用户 2026-09-25 裁决本批**不整体 bump**：实际改码的 experts、office、projects、library、skills、assistant、workbench、ui、bundle 九个模块的当前版本号本就高于其公开发行版本，0.1.7 适配**折叠进各自现有未发布增量**（CHANGELOG 已加条目，不新增版本号）。仅三个模块**重定版**：activity α.4→**α.5**、connectors α.2→**α.3**、identity-local α.5→**α.6**——它们的原版本号已是公开发行制品（`v0.1.0-alpha.7` 批次 / 2026-09-15 专家发行附件），沿用会把不同内容挂在同一版本号上（本项目按「撞号必须重新定版」处理）。线上 `dsh.10ge.cn` 已于 2026-09-24 切到 `0.1.7-alpha.1`；该次部署的 12 个 tgz 曾是这三个模块重定版**之前**的构建（源码相同、仅版本字段不同），**已于 2026-09-25 重打包并重新部署**（不再换树，只改 3 个 `file:` 指针 + `pnpm install` + 重启；线上现为 activity α.5 / connectors α.3 / identity-local α.6，`dist/` 与重定版前逐字节相同）。`ui` 与 `contracts` 不属可安装模块，随载体包内联。

2026-09-18 更新：bundle、experts、skills、office、activity、projects、library 跟随 DSH 0.1.6-alpha.2 升级 bump；contracts 补 bump α.9（补记 2026-09-17 项目任务上下文只读契约 `ProjectTaskContext`/`taskContext`，属兼容补全）；experts/office/activity 同时携带其未发布批次；公开发行仍以上次 prerelease 为准。

2026-09-20 更新：experts bump α.5→α.6（Unreleased）——修复设置面板重复「Agent 预设」页：移除对官方增量 list 槽 `settings.section` 的包装注册，保留 `conversation.hero.agentPreset` 单座槽接管；公开 prerelease 仍为 α.5，待下次发行携带。

2026-09-20 更新（二）：skills α.30→α.31、experts α.6→α.7、connectors α.1→α.2（均 Unreleased）——按用户决定删除能力中心「行业应用」标签入口（行业应用暂时用不到，暂无领域实现，能力页保留专家/技能/连接器三标签）；公开 prerelease 仍为 skills α.30、experts α.5、connectors α.1，待下次发行携带。

2026-09-20 更新（三）：bundle α.46→α.47（Unreleased）——修复设置页「外观」切换不生效：工作台客户端不再注册并强制 `workdsh` 深色主题、不再拦截 `theme/change`，外观改由官方 ThemeRuntime 与用户偏好驱动（浅色/深色/跟随系统即时生效，选中态恢复）；bundle 的 `dsh.client.inject` 与开发依赖同步移除 `@deepseek-ai/dsh-client-ui-theme`。公开 prerelease 仍为 bundle α.46，待下次发行携带。

2026-09-20 更新（四）：合并上游 `github/main` 线并重新定版（本线此前发布到 root α.7、bundle α.49、workbench α.12、office α.6、library α.2；上游线发布过 bundle α.46/α.47、workbench α.11、office α.7；skills 两条线都到过 α.31）。撞号模块重新定版：root α.7→**α.8**、bundle α.49→**α.50**、workbench α.12→**α.13**、office α.6→**α.8**、library α.2→**α.3**、skills α.31→**α.32**。官方依赖与 `pnpm.overrides` 统一精确锁定 `0.1.6-alpha.2`；未实现入口按本线决定保留侧栏行并标「待开放」，不采用上游「隐藏未实现入口」行为。

2026-09-22 更新：bundle α.50→α.52、workbench α.13→α.15（两次连贯 bump）。α.51 为侧栏导航重排与新增「新建任务」行（行与不渲染内容的 `main` 面板配对，点击即起原生空会话）；α.52 为「新建任务」改为任务创建器（UI-DESIGN 第 5 节，2026-09-22 用户决定），组合包自身代码未变、只为携带 workbench 客户端制品。两次都需 bundle 与 workbench 同批安装。上一轮 bump 未同步本表，本次一并回填。

2026-09-23 更新：bundle α.52→**α.53**（Unreleased）——收敛注入：移除 `cordis.patch.yml` 的 `browser-use` 与 `browser-use-playwright-mcp` 两条 insert 及对应依赖，消除 Profile 根与 Host 核心各持一份 `@deepseek-ai/dsh-scope` 导致的 MCP 服务重名注册（归属裁定为官方缺陷本体 + WorkDSH 为唯一触发方，按用户裁决「收敛注入、立即解锁」处置）；官方浏览器使用能力随本版暂缓，`probe:browser-use:playwright` 独立探针一并移除。组合包代码未变，本表状态列与"当前开发制品"同步至 α.53。公开 prerelease 仍为 bundle α.47（项目级 `v0.1.0-alpha.7`），待下次发行携带。

2026-09-23 更新（二）：新增模块 **企业门户与登录门禁** `workdsh-portal@0.1.0-alpha.1`（Unreleased，0.1 版本线）——按用户裁决新增 `packages/portal`：静态企业门户（首页四段 + 登录页）与单文件 Node 服务（签名 Cookie 会话、失败限流、`/api/portal/auth` 供 Caddy `forward_auth` 使用）。该模块属部署边缘面、不是功能插件，不声明 `dsh.bundle`/`exports`/`bin`，不发布 npm，随部署交付；边界与所有权见 [ADR-0034](adr/0034-enterprise-portal-and-edge-authentication.md)。线上路由切换未执行。

2026-09-24 更新：portal α.1→**α.2**（Unreleased）——按用户裁决修复两项线上性能缺陷（`dsh.10ge.cn` 性能体检的 P0 项）：① 缓存头与安全头分离，`packages/portal/src/server.mjs` 的 `SECURITY_HEADERS` 不再向静态资源套用 `Cache-Control: no-store`，改为按类分档（HTML `no-cache` + ETag、站内 CSS/JS `max-age=3600`、图片素材 `max-age=604800`），并新增 ETag 条件请求（命中返回 304 且零正文）；接口、跳转与错误页保持 `no-store`。② 门户 5 张界面截图上 WebP 双尺寸 `srcset`（原 3006px PNG 保留为回退），首屏图片上线量 3.34MB → 约 115KB@1x / 325KB@2x。本版已于同日部署到 `dsh.10ge.cn` 并完成线上复验（门户首屏 9 个资源 166,291B；公网三档视口图片档位正确、无溢出、无 console 错误；登录门禁零回归）。部署时发现线上 `server.mjs` 含一段仓库未登记的 `/portal/products/*` 公开产品页路由，本版按「仓库文件 + 重新叠加该路由」落位；随后按用户裁决**已回填仓库并纳入缓存分档**：`server.mjs` 新增 `serveProductPage`（与门户首页同档 `no-cache` + ETag，仅该路径放宽 CSP 以支持单文件自包含页面）、`site/products/2026Q3.html`、`tools/publish-products.sh` 与 README 五处，同日再次部署并完成公网复验（产品页 200 `no-cache` + 放宽 CSP，其余分档与门禁无回归）。详见 [STATUS](STATUS.md) 2026-09-24（续八）。

2026-09-24 更新（二）：新增模块 **助理** `workdsh-plugin-assistant@0.1.0-alpha.1`（Unreleased，0.1 版本线）；workbench α.15→**α.16**。助理按 [ADR-0027](adr/0027-assistant-entry-pack-boundary.md) 实现为**引用型工作入口包**：单一 Host 服务 `workdshAssistant`、`/api/workdsh-assistant` 端点、`workdsh_assistant_*` 工具，引用技能修订／专家修订／连接器实例，解析在 Host 侧读兄弟插件公开服务；不拥有执行、会话、凭据、数据与权限。模块版本线 0.1，channel `local-candidate`，尚未进入项目发布包。workbench α.16 的变更是把「助理」占位从 `businessPanels` 移除——助理页面改由该插件自持 `main`（`key: workdsh-assistant`）与同名 `sidebar.panellist` 行（`order: 10`），只升工作台会让「助理」入口消失，故两包需同批安装。同批还包含 P1-2 首包压缩（自有 client 构建加 `minify`、专家 front matter 解析移回 Host，见 [STATUS](STATUS.md) 2026-09-24（续九））。D16 步骤状态仍为 `todo`（依赖 D08）。

2026-09-24 更新（三）：contracts α.9→**α.10**、experts α.7→**α.8**（均 Unreleased）——P1-2 首包压缩中**源码与公开契约真正发生变化**的两个模块：contracts 新增 `ExpertAuthoredDisplay`／`ExpertDisplayProjection` 与 `ExpertDetail.draftDisplay`／`revisionDisplay`；experts 的 client 改为读取该投影、不再在浏览器解析 front matter。其余模块（skills、connectors、office、library、projects、activity、bundle）本轮只改了**仓库根 `scripts/build-*.mjs` 的构建开关**（`minify` + `process.env.NODE_ENV`），模块源码与公开契约未变，因此不随本批 bump，避免以全局构建开关带动未变化模块锁步升级。公开 prerelease 仍以上次发行回执为准，本批待下次发行携带；P1-2 的实测体积见 [STATUS](STATUS.md) 2026-09-24（续九）。

2026-09-24 更新（四）：bundle α.53→**α.54**（Unreleased）——本版是 α.53「收敛注入」的**首个上线制品**（α.53 只到本地候选，线上仍为 α.52），并搭载 workbench α.16 的客户端制品（「助理」入口由工作台占位移交 `workdsh-plugin-assistant@0.1.0-alpha.1` 自持）。组合包自身代码未变，只改版本号。同批部署把 P1-2 压缩后的**其余自有 client 制品按原版本号重发**（skills α.32、connectors α.2、office α.8、library α.3、projects α.3、activity α.4；模块源码与公开契约均未变，故不 bump，仅重发构建产物，理由见「更新（三）」），使自有 client 制品**仓库 dist raw** 由 856,544 B 降至 458,905 B（约 −46%）；**线上下发口径**为 857,294 B → 497,569 B（约 −42%，见 [STATUS](STATUS.md) 2026-09-24（续十一））。同时更正本表 projects 行 `0.1.0-alpha.2` → `0.1.0-alpha.3`（该行自 2026-09-22 起滞后，实际交付制品与线上均已为 α.3）。线上部署与复验见 [STATUS](STATUS.md) 2026-09-24（续十一）。

2026-09-24 更新（五）：projects α.3→**α.4**（Unreleased）——按用户要求把「从模板创建」的内置模板由 5 个扩充到 **15** 个（新增内容营销与社媒运营、客户跟进与商机管理、数据分析与经营报表、活动策划与执行、招投标与解决方案、招聘与人才选拔、培训与课程开发、财务预算与成本核算、品牌与视觉设计、网站建设与 SEO 增长）。模板仍是纯预填数据（只预填名称、一句场景描述与初始指令，不自动执行、不预绑专家或技能、不改变权限语义），公开契约与其余模块均未变。该版本已于同日增量部署到 `dsh.10ge.cn` 并完成浏览器级复验（面板 15 张卡片、新建弹框模板下拉 16 项），详见 [STATUS](STATUS.md) 2026-09-24（续十六）。

2026-10-01 更新：bundle α.54→**α.55**（Unreleased）——按用户要求把线上 `dsh.10ge.cn` 左侧导航栏顶部 LOGO 名称由 `DSH JOB AI` 改为 **`10GE DSH 企业AI工作台`**（用户原话为「10ge dsh job ai」，与仓库实际字符串 `DSH JOB AI` 对应）。改动仅为 [Brand.tsx](file:///Users/apple/Documents/AI-luoji/workdsh/packages/bundle/src/client/components/Brand.tsx) 中 `BrandName` 的文本内容：仍由公开 Slot `sidebar.brand.name` 贡献（`priority: -10`），未改动席位、owner props、`sidebar.brand.mark`（10GE 字标 `GeWordmark`）与其它插件，未触碰官方 Sidebar owner。probe 断言 `scripts/probe-browser.mjs`（第 65、263 行）随文案同步。同批线上操作还包括插件市场 6 个插件全量升级与 `dsh-prompt-enhance` 启用（不属于 bundle 版本变化，详见 [STATUS](STATUS.md) 2026-10-01）。

## 历史版本线快照（被2026-09-14表覆盖）

以下旧快照仅供追溯，旧“专家planned”不覆盖当前实现。

| 模块 | 模块版本线 | 当前开发制品 | 说明 |
| --- | --- | --- | --- |
| 领域公开契约 | **0.1** | `workdsh-contracts@0.1.0-alpha.5` | 本地基线完成；新增 ./skills 管理服务契约，包含 Host identity/access/audit、Session owner/runtime binding 与排空契约，企业扩展后期独立验收 |
| 本地身份提供方 | **0.1** | `workdsh-provider-identity-local@0.1.0-alpha.3` | 本地基线完成；官方 Storage Domain 持久化可信单用户 Profile，不用于远程认证 |
| 资源授权 | **0.1** | `workdsh-plugin-access@0.1.0-alpha.3` | 本地基线完成；持久 Session owner、受控 Session Host 入口、RuntimeBinding 与官方工具授权/审计 |
| 审计 | **0.1** | `workdsh-plugin-audit@0.1.0-alpha.2` | 本地基线完成；官方 Storage Domain 持久审计、排空和敏感引用拒绝 |
| 技能管理 | **0.1** | `workdsh-plugin-skills@0.1.0-alpha.24` | 默认/本地管理闭环及独立 Host/Client 安装交付完成；公共市场不在当前范围，企业服务端与管理 Web 列入后期 ToDo |
| 工作台 | 0.1 | `workdsh-plugin-workbench@0.1.0-alpha.10` | D02 已完成；官方 Sidebar/Conversation 组合与 TSX 页面边界 |
| 共享 UI | 0.1 | `workdsh-ui@0.1.0-alpha.4` | D02 已完成；纯导出入口、独立组件、令牌与样式模块 |
| 默认组合包 | 0.1 | `workdsh-bundle@0.1.0-alpha.39` | 集成版本；工作台以子插件组合，Skill 为显式独立 Profile 层 |

专家、连接器、资料库等 planned 模块在开始实际开发时再建立各自版本线，不为占位目录虚构版本。
