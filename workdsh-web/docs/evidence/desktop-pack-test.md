# 官方 Desktop 测试打包

用户于2026-09-12明确授权继续官方Desktop测试打包。本轮是隔离验证官方构建流程的例外，不将上游源码作为WorkDSH开发/运行依赖，不改官方实现或现有Web Profile，不引入自建Electron壳。

官方能力复用：官方 apps/desktop README、对应 dsh-v0.1.5-rc.1 tag 的原样构建脚本。master Desktop 已0.1.5-rc.2，测试选与WorkDSH基线相同的rc.1；版本差异必须分开记录。GitHub最近5个release无安装包assets，npm @deepseek-ai/dsh-desktop 返回404，源码manifest private true。机器为macOS arm64，security find-identity显示0有效codesigning身份。官方构建/签名/插件加载分别验证，不将应用目录或源码编译当成已签名可发布安装包。

隔离文件位于 .artifacts/desktop-pack-test，现有Web18989保持运行。正式签名、公证、安装升级和业务插件在Desktop中的运行尚未执行。没有自动上传、发布或推送。

## 本次执行结果

官方rc.1快照下载与解包完成。corepack pnpm install --frozen-lockfile 未完成：原生SDK大包下载重复error(23)重试；build:desktop尝试也未越过依赖安装阶段。本轮停止所启动的构建/安装进程，保留日志和快照供复用，不报告编译成功。日志 install.log、desktop-build.log 在隔离目录。官方公开签名/公证resolver实际运行分别报告缺少DSH_DESKTOP_MACOS_SIGNING_IDENTITY和完整Apple公证凭据，security检查为0有效签名身份。没有生成.app、DMG或ZIP；安装、Desktop业务插件加载和更新验收未执行。当前Web预览未停止。

## 2026-09-12 第二轮：方向澄清与官方 rc.1 流水线复跑

用户澄清：目标是基于**官方仓库 apps/desktop 自行打包**的 WorkDSH 桌面端，不是社区版 DSH Desktop（anywhere）。第一轮在社区应用（/Applications/DSH Desktop.app 2.0.9）上所做的诊断按此纠正停止，其结论不再作为交付路径依据；此后以官方 rc.1 快照实际代码为准。

### 官方 rc.1 流水线事实核对（.artifacts/desktop-pack-test/upstream 实际代码）

- 官方入口：根 `pnpm run prepare:desktop` = apps/desktop `prepare:package` = `package-target.ts --prepare-only`；正式打包 `package:desktop:mac:arm64` 等固定目标脚本。
- 序列（package-target.ts main）：build:official → release:pack --family dsh → pack apps/desktop-host → release:pack --family vendor → native/system landlock → prepare:runtime → prepare:packages → prepare:seed → electron-builder（--publish never）。
- macOS 签名硬门槛：① prepare-seed.ts 对 darwin 目标调用 resolveMacOSSigningEnvironment（要求 DSH_DESKTOP_MACOS_SIGNING_IDENTITY、DSH_DESKTOP_MACOS_TEAM_ID）并对种子 store 中每个 Mach-O 签名；② electron-builder.config.mjs 模块导入时即校验 DSH_DESKTOP_APP_ID、签名身份与公证凭据（三套方案之一）；③ mac.forceCodeSigning / notarize / hardenedRuntime 均为 true。
- 品牌写死点：productName 'DeepSeek Harness'、artifactName 'deepseek-harness-…'（WorkDSH 品牌需改此处）；appId 来自 DSH_DESKTOP_APP_ID。
- 桌面 profile 规则（project-manager.ts）：desktop 项目 bundles 必须以内置 ['@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app'] 开头，之后的包按插件管理；插件须声明 dsh.bundle.patch；运行时 plugin-add/update 仅接受 npm registry 包名@版本（file:/URL spec 被显式拒绝），因此 WorkDSH 预装必须走打包期种子扩展，不能靠运行时添加本地包。
- 种子机制（prepare-seed.ts / core-package-set.ts）：desktop-packages.json 描述符 + desktop-packages/*.tgz 构成核心包集，包目录必须与描述符严格一致（多余文件即拒绝）；包集校验只强制 dsh 与 desktop-host 的版本等于 Electron 版本，其他包名/版本不设限；依赖通过 file: 覆盖注入（desktopCorePackageOverrides）。prepare-package-set.ts 从 dsh + desktop-host 依赖闭包选择可用包——WorkDSH 包作为根/可用输入加入即可进入包集，闭包算法本身无需改。
- 无 COS 上传凭据不影响打包（仅 upload:* 步骤需要）。
- corepack shim 本机损坏（ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING），须以 `node ~/.cache/node/corepack/v1/pnpm/11.7.0/bin/pnpm.mjs` 直接调用；`corepack pnpm` 会取到 11.22.0 并触发版本校验失败。

### 本轮执行进度

- 依赖恢复：`pnpm install --frozen-lockfile` = Already up to date（上轮 error(23) 系中断竞态，已消除）。
- `build:desktop` 通过（exit=0；日志 desktop-build-retry2.log）。
- `build:official` 通过（exit=0，"recorded 234 client artifact(s)"；日志 build-official.log）。
- prepare 序列（脚本 run-prepare-steps.sh，日志 prepare-steps.log）全部通过（exit=0）：release:pack dsh（267 tgz）、vendor、desktop-host、landlock、prepare:runtime（内嵌 Node 24.17.0 + pnpm 11.7.0）、prepare:packages（核心包集 241 包 + desktop-packages.json）均完成。
- prepare:seed（日志 prepare-seed.log）：已完成锁文件生成与校验、--prod 冻结安装、离线安装验证（种子机制在无签名环境下全部工作），随后精确中止于签名门槛：`Error: desktop release environment: DSH_DESKTOP_MACOS_SIGNING_IDENTITY must be set to a non-empty value`（prepare-seed.ts:166 → resolveMacOSSigningEnvironment）。electron-builder 亦因 DSH_DESKTOP_APP_ID 与公证凭据缺失不可运行。
- 本机 security find-identity 0 有效签名身份，无 DSH_DESKTOP_*/APPLE_* 环境变量；未生成 .app/DMG。

### WorkDSH 预置设计（对照已复核）

现有 preview profile（.test-runtime/preview）已验证组合可平移：dependencies 7 个 WorkDSH 包，bundles = 内置两层 + workdsh-bundle + 6 个插件/提供方。桌面种子预置预期改动面（测试快照内）：prepare-package-set.ts 增加 WorkDSH 根与 tarball 输入；project-manager.ts 种子/项目元数据写入扩展后的 bundles 列表；品牌两行与 appId 环境。未实施，待用户决策 Apple 凭据与品牌。

### 未执行

- electron-builder、真实签名/公证、安装启动、更新验收；WorkDSH 预置改动；未触碰 WorkDSH 根依赖与现有 Web 预览；无上传/发布。

## 2026-09-12 第三轮：WorkDSH 未签名测试版打包与冒烟验证

用户四项决策：① Apple 凭据暂无，先做未签名测试版（仅本机自用、不可分发）；② 品牌 WorkDSH；③ 预置全部 7 个 WorkDSH 包（与 preview profile 一致）；④ 应用 ID com.workdsh.app。

### 快照补丁（5 文件，全部标注 WORKDSH TEST PATCH，仅存在于隔离快照）

- src/project-manager.ts：新增 WORKDSH_PROFILE_BUNDLES（7 层，置于内置两层之后）；createSeedMetadata 的 dsh.profile.bundles 与 dependencies 扩展。dev 项目 metadata 刻意未改。
- scripts/prepare-seed.ts：`WORKDSH_DESKTOP_UNSIGNED=1` 时跳过 darwin 种子签名门槛。
- electron-builder.config.mjs（6 处）：productName 'WorkDSH'、artifactName 'workdsh-${version}-…'；unsigned 时跳过签名/公证导入校验；mac.identity=null、forceCodeSigning/notarize=false；dmg.sign=false；afterSign/artifactBuildCompleted 钩子守卫。
- scripts/desktop-build-paths.mjs 与 .d.mts：新增 packedWorkdsh 路径。
- scripts/prepare-package-set.ts：WORKDSH_ROOT_PACKAGES 作为根加入闭包选择 + packedWorkdsh 作为默认输入。

### 构建与产物

- 7 个 WorkDSH tarball 打包至 <build>/packed/workdsh（bundle alpha.40 / skills alpha.25 / access alpha.4 / audit alpha.3 / experts alpha.1 / office alpha.1 / identity-local alpha.4）。
- prepare:packages 重建核心包集：248 包（241 官方 + 7 WorkDSH）。
- prepare:seed（unsigned）：exit=0（prepare-seed-workdsh.log）。种子 bundles = 内置两层 + 7 层；248 dependencies；integrity.json 270 文件；无签名痕迹。
- electron-builder（--dir, unsigned）：**exit=0**（electron-builder-workdsh.log）。首次运行卡在 GitHub release 直接下载（release-assets.githubusercontent.com 实测约 18KB/s），实测 npmmirror 镜像可用（HTTP 200，129.7MB）后中止进程并以 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 重启完成；日志确认 `skipped macOS code signing reason=identity explicitly is set to null` 与 `downloaded electron zip extracted successfully`。
- 产物：.desktop-build/targets/mac-arm64/artifacts/mac-arm64/WorkDSH.app（总 1.0G）
  - Info.plist：CFBundleName/CFBundleDisplayName=WorkDSH、CFBundleIdentifier=com.workdsh.app、CFBundleShortVersionString=0.1.5-rc.1。
  - Contents/Resources：app.asar、runtime（node 24.17.0 + pnpm 11.7.0）、seed（248 tarball + integrity.json + desktop-packages.json）。
  - 签名状态：`Signature=adhoc`（Electron 自带 linker-signed），无 Developer ID；无 quarantine 属性（com.apple.provenance 为系统溯源标记），本机可直接启动；内嵌 node 保持官方硬化签名。
  - 图标：WorkDSH 品牌 icns 已接线（详见下文「第四轮：应用图标接线」）。

### 本机冒烟验证（WorkDSH.app 未签名，macOS 26.3 arm64）

- 前置处理：`~/.dsh/profiles/desktop` 存在旧测试残留（bundles=dsh-better-sidebar/dsh-plugin-ssh，无 desktop-release.json），不符合 desktop 项目格式且会阻断 releaseFile() 读取；已备份重命名为 `~/.dsh/profiles/desktop.test-residue-20260912`（保留数据，未删除）。
- 首启（smoke-launch.sh，日志 smoke-launch.log）：种子校验 → mergeSeedPnpmState → 离线安装 248 包至 ~/.dsh/profiles/desktop → staging healthCheck → 激活 → 正式 backend。安装结果：desktop-release.json=0.1.5-rc.1、node_modules 含全部 7 个 workdsh 包、bundles 列表正确。healthCheck 证据链 `[workdsh:probe] activated → disposed → activated`（探测启动/dispose/正式启动，probe 来自 packages/bundle/src/probe.ts）。backend host 以打包的 runtime/node 运行 dsh-desktop-host。
- 二次启动（--remote-debugging-port=19222，日志 smoke-launch3.log）：快路径直接激活（不重装）。CDP target：title「用deepseek-harness复刻workbuddy — DeepSeek Harness」，url `dsh-app://app/index.html?workdsh-view=conversation`。
- CDP 截图（smoke-ui.png，CDP Page.captureScreenshot 绕过屏幕录制权限）：WorkDSH 品牌 + 侧边导航（新会话/助理/项目/专家·技能·连接器/定时任务/资料库/工作区）+ 真实 session 轨迹（officecli skill 执行、运行统计 3 轮 15 步 · 218 tok/s · 缓存命中 82%）+ 右侧文件面板 + 模型选择 DeepSeek-V41-Flash High。这是 WorkDSH 插件页面在桌面壳中真实渲染的直接证据。
- Electron 进程树完整：主进程 + gpu-process + renderer + utility 各 1；启动日志仅一条 IMKCFRunLoopWakeUpReliable 良性噪音，无其他 error/warn。
- 结论：官方 rc.1 流水线在 WorkDSH 预置下从构建到「安装 → Host 启动 → WorkDSH 层激活 → UI 渲染」全链路贯通，无 Apple 凭据也可完成本机测试验收。

### 本轮未执行

- 正式 Developer ID 签名、公证、DMG/ZIP release 制品（本轮 --dir 仅目录产物）、分发与安装升级、自动更新通道验证（DSH_DESKTOP_AUTO_UPDATE_ENV=production 仅满足配置校验）、长会话稳定性与真实业务端到端。
- 本产物仅本机冒烟，不可对外分发；根 WorkDSH 依赖、Web 预览与既有 Profile 未触碰；无上传/发布。

## 2026-09-12 第四轮：应用图标接线（WORKDSH TEST PATCH 扩展）

用户指出 Dock 显示 Electron 默认原子图标。修复过程：

- 以品牌资产 assets/brand/workdsh-logo-concept.png（1254×1254）经 sips 生成 10 档 iconset（16–1024px，含 @2x）→ `iconutil -c icns` 生成 workdsh-icon.icns（1,549,686 字节，ic12 类型）。
- 快照落盘 apps/desktop/workdsh-icon.icns；electron-builder.config.mjs 新增两处 WORKDSH TEST PATCH（`node:url` 导入 + `mac.icon` 指向该文件）。
- 重新打包 exit=0（electron-builder-icon.log；Electron zip 命中镜像缓存，全流程约 3 分钟）。产物 `Contents/Resources/icon.icns` 与源 SHA-256 一致（af72f855…），Info.plist `CFBundleIconFile=icon.icns`；打包日志不再出现 `default Electron icon is used`。
- icns 转回 PNG 人工复核：WorkDSH 品牌图（蓝色折叠 W + 青色火花 + 浅色圆角底座），非 Electron 默认图标。应用重启运行正常（本机 open 启动，host 正常激活）。
- 若 Dock 仍显示旧图标属 LaunchServices 缓存：将图标从 Dock 移除后重新打开，或 `killall Dock` 刷新。

## 2026-09-12 第五轮：窗口壳融合（macOS inset 标题栏）

用户对比 WorkBuddy 指出：原生标题栏浅色条与深色 UI 脱节，顶部未融为一体。修复过程：

### 问题定位（CDP 实测 DOM）

- 官方 createWindow（apps/desktop/src/main.ts）未设置 titleBarStyle → macOS 显示原生标题栏（32px），web 内容被压缩（窗口 840 → 视口 808，`window.innerHeight=808`），浅色标题条与深色外壳割裂。
- 官方 web UI（packages/client/ui-layout 等）为纯网页设计，无任何红绿灯留白或窗口拖拽区（-webkit-app-region）适配。

### 补丁（WORKDSH TEST PATCH，快照 apps/desktop）

- src/main.ts：`createWindow(preload, shellFrame=false)` 新增 shellFrame 参数，主窗口传 true 时 darwin 下 `titleBarStyle: 'hiddenInset'`；管理窗口（plugin-manager）保持默认标题栏（低频窗口，避免改动官方 shell HTML/CSS）。
- src/preload-app.ts：注入 `style[data-workdsh-shell]` 适配样式（经 MutationObserver 在 documentElement 出现时立即插入，先于首帧，无闪烁；`document.documentElement.dataset.workdshShell='inset'` 作为可检测标记）：
  - `[class$="_logoRow"]`：`padding-top: 48px !important; height: auto !important`（官方固定 height:60px border-box 会压瘪内容区，实测需覆盖）→ logoRow 高 84px，品牌行 y=56，与红绿灯（窗口 y≈20–32）间隙约 24px；`-webkit-app-region: drag` 恢复窗口拖动。
  - `header[class$="_header"]` 与其 `_titleRow`：drag 区；内部 button/a/input/nav/_headerActions/_headerUtilities/_headerCorner 显式 `no-drag` 保留交互。
  - 选择器用 CSS-modules 类名后缀（`_logoRow` 等稳定部分）而非构建哈希（`gHG9Wq_` 会随构建变化）；升级官方 web UI 后若失效需重验。

### 构建与验证

- 首次重打包遗漏 `--config electron-builder.config.mjs`（package-target.ts:205 的必需参数），产物误落地 `apps/desktop/dist/`（默认图标、未跳过签名）；已删除误产物目录（dist/，18:00 生成，含 builder-debug.yml 与 @deepseek-aidsh-desktop.app），修正脚本后重跑（electron-builder-shell2/3.log，均 exit=0，`loaded configuration file=…electron-builder.config.mjs`、`skipped macOS code signing reason=identity explicitly is set to null`、无 `default Electron icon`）。
- app.asar 静态核验：`lib/main.js` 含 hiddenInset/shellFrame，`lib/preload-app.cjs` 含 workdshShell/_logoRow。
- 运行时核验（CDP，smoke-launch6.log）：
  - `window.innerWidth/Height = 1280×840 = outerWidth/Height`（补丁前 innerHeight=808）→ 原生标题栏已完全移除。
  - `document.documentElement.dataset.workdshShell='inset'`、`style[data-workdsh-shell]` 存在。
  - logoRow h=84（padding-top=48px、height:auto 生效）、brand y=56、新会话按钮 y=98（原 74，整列下移 24px）；`header` y=0 h=76 `-webkit-app-region: drag`。
  - 截图 smoke-ui-shell.png：侧边栏顶部留白、品牌行下移、导航与内容区布局完好。
- 待人工确认（CDP 无法截取系统红绿灯）：红绿灯实际落位（窗口 y≈20–32）与留白/品牌行的视觉间距；窗口拖动（拖侧边栏顶部空白或内容 header 空隙）；Dock 图标与窗口顶部是否已达到 WorkBuddy 式的融合效果。

### 本轮未执行

- 设置页/全屏等非默认视图的红绿灯重叠检查（默认视图已验收）；Windows/Linux 的窗口框架适配（本次仅 darwin hiddenInset）；管理窗口外观变更（保持官方默认标题栏）。

## 2026-09-12 第六轮：打包工具固化（脚本 + 技能）

用户要求：把打包整理为可复用入口（"下次打包直接执行"），并询问 macOS 能否打 Windows 版。

### 交付

- `scripts/desktop/pack-desktop.mjs`（一键打包，241 行）：Node 22 自举（shell 默认 v21 时自动切换 nvm v22）、corepack 直调 pnpm、快照与补丁存档 SHA-256 逐文件比对（防漂移，`--sync-patches` 可同步）、打包前停止运行中实例、`build:desktop → electron-builder --dir --config …`（内置 unsigned 环境变量与 ELECTRON_MIRROR）、产物断言（plist 三字段 / icon.icns 哈希 / app.asar 内 hiddenInset+shellFrame+workdshShell+_logoRow）、`--restart`。参数：`--skip-build/--check-only/--sync-patches/--restart`。
- `scripts/desktop/patches/upstream/`：9 个补丁文件存档（8 源文件 + workdsh-icon.icns），按快照相对路径存放。
- `docs/DESKTOP-PACKAGING.md`：打包指南主体（用法、补丁用途表、快照重建步骤（含 7 包 tarball 重打路径）、Windows 说明、常见问题）——按用户要求打包资料集中 docs；`scripts/desktop/README.md` 保留为脚本目录速查并指向指南。
- 技能：`.qoder/skills/workdsh-desktop-pack/SKILL.md` 保留为 Qoder 触发入口（内容指向 `docs/DESKTOP-PACKAGING.md`）；个人级 `~/.agents` 副本已移除，工程内 `.qoder/skills` 由 Qoder 直接发现。触发词覆盖“打包/重打 WorkDSH 桌面应用、WorkDSH.app、桌面测试版、Dock、Windows 桌面版”。

### 验证

- `--check-only`：Node 21.0.0 → 自动切换 v22.23.2 重跑；9 个补丁文件与快照一致；exit=0。
- 完整打包（日志 pack-desktop-test.log）：exit=0——补丁校验 → 停止旧实例 → build:desktop（preload-app.cjs 1.65 kB）→ electron-builder（`loaded configuration file=…electron-builder.config.mjs`、`skipped macOS code signing reason=identity explicitly is set to null`）→ 产物校验通过（Info.plist / 图标 SHA-256 / app.asar 补丁断言全部通过）。产物 1.0G（du）；应用重启正常。
- 脚本内建防护对应首次重打包事故（遗漏 `--config` 会产出默认图标+未签名未跳过+落错 dist/ 目录）。

### Windows 可行性结论（回答用户）

- 官方硬门槛：`package-target.ts:136-137` —— `win-x64 requires a Windows x64 build host`；README.zh.md:99 同样明确。
- 实质原因：`prepare:seed` 用**目标平台 Node** 执行 pnpm 离线安装验证并按平台/CPU 过滤可选依赖（win 目标仅生成 `node.exe`，macOS 无法执行），mac 上打出的 seed 会缺 Windows 平台原生包。
- Windows 打包强制 EV 代码签名：`windows-sign.mjs` 的 `createWindowsTokenSigner` 在缺 `DSH_DESKTOP_WINDOWS_*`（证书/SignTool/SafeNet 容器/PIN）时直接抛错，无未签名降级路径。
- 结论：macOS 不能直接产出 Windows 版。需要 Windows x64 真机或虚拟机复刻本流程（并新增等价 unsigned 补丁）；或作为独立任务规划。

### 本轮未执行

- Windows 侧任何实际构建（无 Windows 环境、无 EV 凭据）；技能的跨会话自动触发未实测（待下次打包请求时验证）；快照重建路径未实际演练。
