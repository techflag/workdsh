# Skill 0.1 — Independent Harness plugin / 独立技能管理插件

Package: **`workdsh-plugin-skills@0.1.0-alpha.24`**. Tag: `skills-v0.1.0-alpha.24`.

## 本次交付

Skill 以独立 Host、Client、`dsh.bundle` 配置层和预构建浏览器制品交付，不再依赖 WorkDSH 展示包初始化。一个插件管理多个 `SKILL.md` 技能对象；通过公开 Skill 服务契约供后续专家等模块复用。

包含全局列表、全文和资源、编辑/修订冲突、启停、批量操作、可恢复卸载、导入预检与原子安装，以及原生任务框的创建/试用交接。

## English

The Skill module now ships as an independently installable Harness plugin, with its own Host, Client, configuration layer, and prebuilt browser artifact. It runs without the WorkDSH presentation bundle and exposes a public service contract for future plugin collaboration.

Includes local discovery, full documents and resources, editing with conflict detection, enable/disable, batch management, recoverable uninstall, validated import, and native task-composer handoff.

## 安装 / Installation

Use the official Harness **`0.1.5-rc.1` Web Profile**, Cordis `4.0.2`, and pnpm `10.34.5`. Stop the target Profile before changing packages. Download the named `.tgz`, not the source archive.

```sh
dsh --profile workdsh --from-default-profile web --dump-config
dsh plugin --profile workdsh add /absolute/path/workdsh-plugin-skills-0.1.0-alpha.24.tgz
dsh --profile workdsh
```

Open **专家 · 技能 · 连接器 → 技能**. WorkDSH branding is optional and supplied by the separate [presentation bundle](https://github.com/techflag/workdsh/releases/tag/bundle-v0.1.0-alpha.39).

## 已知限制 / Known limitations

- **DSH Desktop with Harness `0.1.2-rc.1` can show this plugin as enabled while its navigation is missing, even after restart. This release does not fix that issue. / 旧版桌面入口缺失未修复。**
- Verified on macOS / Node `22.23.2` / Harness `0.1.5-rc.1` Web. Other desktop and OS combinations are not claimed as verified.
- No npm registry publication, public marketplace, enterprise server, or organization administration. Real-model calls and complete live CLI hot-unload were not tested in this release pass.
- Directory reveal continues to use the native Host capability; a new graphical file-manager acceptance test was not performed.

## Validation / 验证

Build, typecheck, **33/33 integration tests**, **2/2 planning tests**, dependency checks, and both standalone and composed packaged-browser probes passed. Real temporary files were edited and restored; removal/reinstallation and composed cold restarts passed. Tests use isolated homes.

Assets: module `.tgz`, `SHA256SUMS`, and `release-manifest.json` with source commit and compatibility metadata. [Module guide](https://github.com/techflag/workdsh/blob/skills-v0.1.0-alpha.24/docs/RELEASES.md) · [Verification evidence](https://github.com/techflag/workdsh/blob/skills-v0.1.0-alpha.24/docs/evidence/skills-standalone-package.md).
