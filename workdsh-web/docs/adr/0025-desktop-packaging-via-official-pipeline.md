# ADR-0025：官方 Desktop 自建打包与 WorkDSH 种子预置

日期：2026-09-12。状态：方向已实施——未签名本地测试版完成构建与本机冒烟（WorkDSH.app，exit=0，安装→激活→UI 渲染全链路贯通，2026-09-12）；可分发签名版待 Apple 凭据。

用户明确要求基于官方仓库 apps/desktop 自行打包 WorkDSH 桌面端。社区版 DSH Desktop（anywhere）为第三方维护应用，经用户明确否决，不作为交付路径；自建 Electron 壳与第二套插件加载器沿用既有禁令。

决定：以官方 dsh-v0.1.5-rc.1 随库 tag 的原样快照（隔离于 .artifacts/desktop-pack-test/upstream，不作为 WorkDSH 开发/运行依赖）经官方流水线 package-target.ts 打包。上游仅允许四类已登记的最小测试补丁，逐处注释 WORKDSH TEST PATCH：① 品牌（productName/artifactName 改 WorkDSH、workdsh-…、mac.icon 接入 workdsh-icon.icns）；② WORKDSH_DESKTOP_UNSIGNED=1 未签名测试模式（跳过 prepare:seed 的 Developer ID 签名与 electron-builder 的签名/公证/签名校验钩子），产物仅本机自用不可分发；③ 种子扩展（prepare-package-set.ts 将 7 个 WorkDSH 包作为根加入包集；project-manager.ts 种子与项目元数据在内置两层 bundle 之后写入 WorkDSH bundles）；④ 窗口壳融合（main.ts 主窗口 titleBarStyle: 'hiddenInset'；preload-app.ts 注入 style[data-workdsh-shell] 适配样式：侧边栏 logoRow 留白 48px/height:auto、logoRow 与内容 header 为 -webkit-app-region drag 区、交互控件 no-drag）。正式可分发版本必须停用未签名模式，并在具备 Developer ID 签名与公证凭据时执行完整 package:mac:arm64。

WorkDSH 预置必须走打包期种子：桌面运行时 plugin-add/update 仅接受 npm registry 包名@版本（file:/URL 被显式拒绝），本地未发布包无法运行时添加。预置范围与现有 preview profile 一致：workdsh-bundle 与 skills/access/audit/experts/office/identity-local 六包，均声明 dsh.bundle.patch 且位于内置 bundle 之后，符合官方插件管理语义。appId 使用 com.workdsh.app；本地构建自动更新通道用 production fixed origin（不执行 upload/publish）。

拒绝：使用社区版桌面应用安装插件；复制上游实现或私有接口进 WorkDSH；运行时改写官方磁盘结构或第二套真源。流水线核对、门槛证据与实施记录见 [desktop-pack-test](../evidence/desktop-pack-test.md)。

## 2026-09-13 托管运行环境设计补充

用户确认 Desktop 应提供 Python 和精选技能依赖，不依赖用户系统 Python。分发、隔离环境、官方执行/沙箱集成与干净机器验收见 [托管运行环境设计](../design/desktop/MANAGED-RUNTIME.md)。仅设计，尚未实现；必须先验证官方公开扩展面，不增加 Harness 源码修改类别。
