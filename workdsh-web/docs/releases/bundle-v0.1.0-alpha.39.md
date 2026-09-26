# WorkDSH presentation — Optional Harness composition / 可选展示组合包

Package: **`workdsh-bundle@0.1.0-alpha.39`**. Tag: `bundle-v0.1.0-alpha.39`.

## 本次交付

提供 WorkDSH 品牌、深色主题、增量导航、工作台展示和 URL 状态适配，继续保留 Harness 原生 Workspace、Session、Settings 和 Conversation。

Skill 从组合包中独立：本包不再导入、编译或隐藏初始化 Skill。Workbench `0.1.0-alpha.10` 作为正式 Cordis 子插件随本包交付；共享 UI 版本为 `0.1.0-alpha.4`。占位导航不代表对应业务模块已经实现。

## English

An optional presentation layer for WorkDSH branding, dark theme, additive navigation, workbench presentation, and URL state. Native Harness workspace, session, settings, and conversation owners remain in place.

Skill is a separate installable module and is not initialized or bundled by this package. Workbench `alpha.10` is included as a Cordis child plugin, with shared UI `alpha.4`. Navigation placeholders do not imply completed business features.

## 安装 / Installation

Use the official Harness **`0.1.5-rc.1` Web Profile**. Stop the target Profile before changing packages. For Skill management, download and install the [Skill plugin](https://github.com/techflag/workdsh/releases/tag/skills-v0.1.0-alpha.24) as a separate layer.

```sh
dsh --profile workdsh --from-default-profile web --dump-config
dsh plugin --profile workdsh add /absolute/path/workdsh-plugin-skills-0.1.0-alpha.24.tgz
dsh plugin --profile workdsh add /absolute/path/workdsh-bundle-0.1.0-alpha.39.tgz
dsh --profile workdsh
```

The first `plugin add` is optional if no Skill management is needed. Removing the presentation bundle preserves the separately installed Skill module and native Harness interface.

## 验证与边界 / Validation and limits

Build, typecheck, **33 integration tests**, planning and dependency checks, and packaged-browser regression passed on macOS / Node `22.23.2` / Harness `0.1.5-rc.1`. Both removal directions were tested: removing Skill retains the WorkDSH shell, and removing the presentation bundle retains Skill.

**Not a fix for the older Harness `0.1.2-rc.1` desktop navigation issue.** Other desktop/OS combinations, real-model execution, and complete live CLI hot-unload are not verified. No enterprise server, public Skill catalog, or npm publication is included.

Assets: this module's `.tgz`, `SHA256SUMS`, and `release-manifest.json`. [Module guide](https://github.com/techflag/workdsh/blob/bundle-v0.1.0-alpha.39/docs/RELEASES.md).
