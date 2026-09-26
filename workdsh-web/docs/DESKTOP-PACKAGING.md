# WorkDSH 桌面打包指南（官方 Desktop 流水线）

本文是 WorkDSH 桌面测试版打包的指南主体：用法、补丁用途表、快照重建、快照与仓库基线版本对照、Windows 说明与常见问题。
脚本目录速查见 [scripts/desktop/README.md](../scripts/desktop/README.md)；决策背景见 [ADR-0025](adr/0025-desktop-packaging-via-official-pipeline.md)；历次执行证据见 [desktop-pack-test](evidence/desktop-pack-test.md)。

**定位与边界**：基于官方 `deepseek-ai/deepseek-harness` 仓库 `apps/desktop` 的隔离快照（tag `dsh-v0.1.5-rc.1`），经 `WORKDSH TEST PATCH` 最小补丁产出 **WorkDSH.app 未签名本地测试版**（macOS arm64）。快照位于 `.artifacts/desktop-pack-test/upstream`（gitignored），**不作为 WorkDSH 的开发或运行依赖**，不参与 workspace、CI 与 Web 预览；不引入自建 Electron 壳与第二套插件加载器。产物仅本机自用、**不可分发**；正式发布需具备 Apple Developer ID 与公证凭据并停用未签名模式。

## 快速使用

```bash
node scripts/desktop/pack-desktop.mjs                # 校验补丁 → build:desktop → electron-builder → 产物校验
node scripts/desktop/pack-desktop.mjs --restart      # 打包校验通过后重启应用
node scripts/desktop/pack-desktop.mjs --skip-build   # 只重跑 electron-builder（未改 apps/desktop 源码时）
node scripts/desktop/pack-desktop.mjs --check-only   # 只做前置检查（快照存在性 + 9 补丁 SHA-256 一致性）
node scripts/desktop/pack-desktop.mjs --sync-patches # 快照补丁有改动时，同步到 scripts/desktop/patches/ 存档
```

退出码非 0 即失败，按日志定位。脚本自动处理：Node 22 自举（shell 默认低于 22.19 时切换 nvm 中 v22）、corepack 缓存中的 pnpm 直调、停止运行中的 WorkDSH 实例、注入未签名环境变量与 `ELECTRON_MIRROR` 镜像、产物断言。

产物：`.artifacts/desktop-pack-test/upstream/apps/desktop/.desktop-build/targets/mac-arm64/artifacts/mac-arm64/WorkDSH.app`（约 1.0G）。

## 前置条件

- macOS arm64（Apple Silicon）主机。
- 快照存在：`.artifacts/desktop-pack-test/upstream/`（gitignored，重建见「快照重建」）。
- 首次打包需联网：npm 产物已缓存在快照 `node_modules`；Electron 二进制等下载走 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`（脚本注入）。
- 不要求 Apple 签名凭据（`WORKDSH_DESKTOP_UNSIGNED=1` 由脚本注入）。

## 流水线概览

`pack-desktop.mjs` 直接执行两步，然后在 `apps/desktop` 内调用 electron-builder：

1. `pnpm run build:desktop`（快照根，tsc + tsdown；`--skip-build` 可跳过）。
2. `pnpm exec electron-builder --config electron-builder.config.mjs --dir --publish never`（`--dir` 只产目录，不产 DMG/ZIP）。

electron-builder 经 `extraResources` 把快照内 `.desktop-build/targets/mac-arm64/` 下的 `runtime`（内嵌 Node + pnpm）与 `seed`（核心包集 tarball + 描述符）打进应用 `Contents/Resources`。这些 prepare 产物由官方准备序列生成、在快照 `.desktop-build` 中持久化——因此：

> **改了 WorkDSH 包内容或版本后，必须重打 7 包 tarball 并重跑 `prepare:packages` + 准备序列，再执行 `pack-desktop.mjs`；只跑 `pack-desktop.mjs` 会沿用旧种子。**

官方完整序列（复刻 `apps/desktop/scripts/package-target.ts`）：`build:desktop` → `build:official` → `release:pack --family dsh` → `pack apps/desktop-host` → `release:pack --family vendor` → `native/system landlock` → `prepare:runtime` → `prepare:packages` → `prepare:seed`（unsigned）→ electron-builder。脚本环境变量：`DSH_DESKTOP_TARGET_PLATFORM=darwin`、`DSH_DESKTOP_TARGET_ARCH=arm64`、`DSH_DESKTOP_APP_ID=com.workdsh.app`、`WORKDSH_DESKTOP_UNSIGNED=1`、`DSH_DESKTOP_AUTO_UPDATE_ENV=production`、`ELECTRON_MIRROR`。

## 补丁存档（patches/upstream/，9 文件）

所有补丁仅存在于隔离快照，逐处注释 `WORKDSH TEST PATCH`，按快照相对路径存于 `scripts/desktop/patches/upstream/`，每次打包前逐文件 SHA-256 比对防漂移。用途：

| # | 存档路径（相对 `apps/desktop/`） | 用途 |
| - | -------------------------------- | ---- |
| 1 | `src/project-manager.ts` | 新增 `WORKDSH_PROFILE_BUNDLES`（7 层，置于官方内置两层 bundle 之后）；`createSeedMetadata` 的 `dsh.profile.bundles` 与 dependencies 扩展。dev 项目 metadata 刻意未改。 |
| 2 | `scripts/prepare-package-set.ts` | `WORKDSH_ROOT_PACKAGES`（7 个 WorkDSH 包）作为根加入核心包集闭包选择；`packedWorkdsh` 作为默认输入。闭包算法本身未改。 |
| 3 | `scripts/prepare-seed.ts` | `WORKDSH_DESKTOP_UNSIGNED=1` 时跳过 darwin 种子签名门槛（`resolveMacOSSigningEnvironment`）。 |
| 4 | `scripts/desktop-build-paths.mjs` | 新增 `packedWorkdsh` 路径（`<build>/packed/workdsh`）。 |
| 5 | `scripts/desktop-build-paths.d.mts` | 上述类型声明同步。 |
| 6 | `electron-builder.config.mjs` | 品牌：`productName 'WorkDSH'`、`artifactName 'workdsh-${version}-…'`、`mac.icon` 指向 `workdsh-icon.icns`；unsigned 时跳过签名/公证导入校验（`mac.identity=null`、`forceCodeSigning/notarize=false`、`dmg.sign=false`、afterSign/artifactBuildCompleted 钩子守卫）。 |
| 7 | `src/main.ts` | `createWindow(preload, shellFrame=false)` 新增参数；主窗口 darwin 下 `titleBarStyle: 'hiddenInset'`；管理窗口保持默认标题栏。 |
| 8 | `src/preload-app.ts` | 注入 `style[data-workdsh-shell]` 适配样式（MutationObserver 先于首帧）：`_logoRow` 留白 48px/height:auto、logoRow 与 header 为 drag 区、交互控件 no-drag；`dataset.workdshShell='inset'` 可检测标记。选择器用 CSS-modules 类名后缀（如 `_logoRow`），官方 web UI 升级后若失效需重验。 |
| 9 | `workdsh-icon.icns` | 品牌图标（由 `assets/brand/workdsh-logo-concept.png` 经 sips + iconutil 生成）。 |

改动流程：改快照 → `--check-only` 核对差异 → `--sync-patches` 同步存档 → 存档随代码提交。补丁类别受 ADR-0025 约束（品牌 / 未签名模式 / 种子扩展 / 窗口壳融合），新增其他类别需先补 ADR。

## 产物与断言

`pack-desktop.mjs` 产物校验（失败即退出非 0）：

- `Info.plist`：`CFBundleIdentifier=com.workdsh.app`、`CFBundleDisplayName=WorkDSH`、`CFBundleIconFile=icon.icns`。
- `Contents/Resources/icon.icns` 与快照 `workdsh-icon.icns` SHA-256 一致。
- `app.asar` 补丁断言：`lib/main.js` 含 `hiddenInset`/`shellFrame`；`lib/preload-app.cjs` 含 `workdshShell`/`_logoRow`。

脚本无法断言、需人工肉眼确认：Dock 图标、红绿灯落位与留白/品牌行间距、窗口拖动。冒烟方法（CDP 截图绕过屏幕录制权限）见证据文档。

## 快照重建

快照随时可能丢失或需要升级；完整重建步骤如下（2026-09-12 首建流程，供复刻）：

1. **获取官方快照**：下载官方 tag tarball（当前 `dsh-v0.1.5-rc.1`，commit `183f08e9…`）解包至 `.artifacts/desktop-pack-test/upstream/`。快照自持 `pnpm@11.7.0`（`packageManager`）、Node 要求 `^22.19.0 || >=24`。
2. **安装依赖**：在快照根执行 `pnpm install --frozen-lockfile`。本机 corepack shim 可能损坏（`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`），直接调用缓存中的固定版本：`node ~/.cache/node/corepack/v1/pnpm/11.7.0/bin/pnpm.mjs`（`pack-desktop.mjs` 已内建该逻辑）。
3. **应用补丁存档**：将 `scripts/desktop/patches/upstream/` 按相对路径覆盖到快照对应位置；然后 `--check-only` 验证（不一致文件会列出）。
4. **打包 WorkDSH 本地包 tarball**：对 7 个包在仓库根执行 `pnpm --dir <包路径> pack --pack-destination "<快照>/apps/desktop/.desktop-build/targets/mac-arm64/packed/workdsh"`，tarball 文件名须为 `<name>-<version>.tgz`。

   | 包名 | 仓库路径 |
   | ---- | -------- |
   | `workdsh-bundle` | `packages/bundle` |
   | `workdsh-plugin-skills` | `packages/plugins/skills` |
   | `workdsh-plugin-access` | `packages/plugins/access` |
   | `workdsh-plugin-audit` | `packages/plugins/audit` |
   | `workdsh-plugin-experts` | `packages/plugins/experts` |
   | `workdsh-provider-identity-local` | `packages/providers/identity-local` |
   | `workdsh-plugin-office` | `packages/plugins/office` |

   本地未发布包无法在桌面运行时 `plugin-add/update`（官方仅接受 registry 包名@版本），预置必须走打包期种子——这是 tarball 重打路径存在的唯一原因。

5. **运行官方准备序列**（快照根，目标 darwin/arm64）：`build:desktop` → `build:official` → `release:pack --family dsh` → `pack apps/desktop-host` → `release:pack --family vendor` → `native/system` landlock → `prepare:runtime` → `prepare:packages` → `prepare:seed`（带 `WORKDSH_DESKTOP_UNSIGNED=1`）。命令参数对照历史脚本 `.artifacts/desktop-pack-test/run-prepare-steps.sh`（其日志与产物保留在该目录）。
6. **打包与冒烟**：`node scripts/desktop/pack-desktop.mjs --restart`，然后按证据文档方式启动冒烟（首启会向 `~/.dsh/profiles/desktop` 离线安装种子；见「常见问题」残留处理）。
7. **回填证据**：按项目规范更新 [desktop-pack-test](evidence/desktop-pack-test.md) 与 [STATUS](STATUS.md)，未做的检查写明「未执行」。

## 快照与仓库基线的版本对照

**快照（桌面测试版内嵌宿主）与仓库发布基线不是同一版本族，属于已知差异，不是事故**：

| | 桌面快照 | 仓库基线 |
| - | -------- | -------- |
| 来源 | 官方源码 tag `dsh-v0.1.5-rc.1`（快照 `package.json` 版本 `0.1.5-rc.1`） | npm 发布包 `@deepseek-ai/dsh@0.1.6-alpha.2`（根 `pnpm.overrides` 全族锁定） |
| 用途 | 仅桌面测试版打包（隔离、gitignored，不入依赖图/CI） | Web 运行、开发、测试与发布 |
| 工具链 | electron `^44.0.0`、快照自带 `pnpm@11.7.0` | 仓库 `pnpm@10.34.5`、Node 22 LTS |

- 2026-09-12 选快照时其与当时 WorkDSH 基线一致；此后全仓基线升级至 `0.1.6-alpha.2`（证据见 [dsh-0.1.6-alpha.2-upgrade](https://github.com/techflag/workdsh/blob/1dd9eadc4f/workdsh-web/docs/evidence/dsh-0.1.6-alpha.2-upgrade.md)），快照未随之刷新，桌面测试版因此落后一个版本族。
- 影响：`0.1.6-alpha.2` 的官方行为与插件面变化**不会**出现在桌面测试版；对比桌面与 Web 行为差异时先核对宿主版本；桌面冒烟结论不能替代 Web 基线验收。
- 升级路径（**未实施**，应作为独立任务立项）：重新选择与基线对应的官方快照 → 逐个复核/重做 9 补丁（窗口壳补丁依赖官方 web UI 类名，升级后可能失效）→ 重打 7 包 tarball → 重跑准备序列 → 打包冒烟 → 记录版本对照证据。

## Windows 平台说明

**macOS 不能直接产出 Windows 版**，三条官方硬门槛：

1. `package-target.ts:136-137` 明确 `win-x64 requires a Windows x64 build host`（官方 README.zh.md 同）。
2. `prepare:seed` 需用**目标平台 Node** 执行 pnpm 离线安装验证并按平台/CPU 过滤可选依赖（win 目标仅生成 `node.exe`，macOS 无法执行）。
3. Windows 打包强制 EV 代码签名（`windows-sign.mjs` 缺 `DSH_DESKTOP_WINDOWS_*` 凭据直接抛错），无未签名降级路径。

如需 Windows 版：在 Windows x64 真机或虚拟机复刻本流程，并新增等价的 unsigned 测试补丁；作为独立任务规划，不虚构已通过。

## 常见问题

- **不要手动拼 electron-builder 命令**。必须传 `--config electron-builder.config.mjs`；历史事故：遗漏该参数产出默认图标、未跳过签名、产物误落 `apps/desktop/dist/`。始终走 `pack-desktop.mjs`。
- **Electron 下载慢/卡住**：GitHub release 直连实测约 18KB/s；脚本已注入 npmmirror 镜像，勿关闭。
- **Dock 图标未更新**：LaunchServices 缓存问题，从 Dock 移除后重新打开，或 `killall Dock`。
- **`~/.dsh/profiles/desktop` 旧测试残留阻断启动**：残留（如社区版遗留 bundles）不符合 desktop 项目格式，会阻断 `releaseFile()` 读取；备份重命名（历史：`desktop.test-residue-20260912`，保留数据不删除）后重试。
- **补丁不一致报错**：确认快照是否为最新补丁 → `--sync-patches` 同步存档；否则检查快照是否被意外改动。
- **corepack shim 损坏**：脚本已直调缓存 pnpm；手动操作时同样用 `node ~/.cache/node/corepack/v1/pnpm/11.7.0/bin/pnpm.mjs`。
- **Node 版本不足**：脚本要求 ≥22.19，shell 默认低版本时自动切换 nvm 中 v22 重跑；未找到会明确报错。

## 当前状态（2026-09-18）

未签名测试版已完成构建与本机冒烟（2026-09-12：安装 → Host 激活 → WorkDSH 层加载 → UI 渲染全链路贯通，exit=0）。**未执行**：正式签名/公证、DMG/ZIP 分发制品、安装升级与自动更新验收、长会话稳定性、快照重建实演、快照升级至 0.1.6-alpha.2。无上传、发布或推送。
