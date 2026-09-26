# Desktop 安装包体积与 Windows 安装耗时检查

2026-09-26 对比同属 DSH `0.1.7-rc.2` 基线的公开发行产物：[DSH Desktop v2.0.15](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.15) Windows Setup 为 256.1 MiB，[WorkDSH Desktop 2.0.5-alpha.20](https://github.com/techflag/workdsh/releases/tag/desktop-v2.0.5-alpha.20) 为 356.1 MiB。两者都使用 NSIS，且打包器补丁都直接解压到安装目录；不能把差距归因于多一次暂存复制。WorkDSH 额外随包交付完整 Profile、五个产品功能包及独立的官方 Node/Python 运行时。

本地已有的 macOS arm64 `WorkDSH.app` 用 `report-package-footprint.mjs` 扫描，文件逻辑大小合计 1812.3 MiB、76,898 个常规文件。其中 Profile `node_modules` 为 1136.5 MiB、70,595 个文件；官方主运行时为 344.9 MiB、6,006 个文件。该扫描不是 Windows 安装实测，也不是压缩后 DMG 大小。

在**只调整 Electron Builder 的 `extraResources.filter`** 后，隔离打包的 Profile `node_modules` 为 1029.0 MiB、49,874 个文件；比基线少 107.5 MiB、20,721 个文件。过滤对象仅为 `*.d.ts`、`*.d.mts`、`*.d.cts` 类型声明和 `*.pdb` Windows 调试符号；保留源码映射、Python、Office 和所有可执行及原生库。隔离产物通过了 `@deepseek-ai/dsh --version` 与 `--profile workdsh --dump-config`，配置中仍含 WorkDSH Office、官方 Office 技能和 workspace dependencies。移除 PDB 会减少随包调试符号，若需符号化诊断应从构建产物另行保留符号。

[CI 运行 36214410124](https://github.com/techflag/workdsh/actions/runs/36214410124) 的 Windows 打包通过。生成的 `WorkDSH-2.0.5-x64-Setup.exe` 为 **323.3 MiB**（339,012,164 字节），相比上述已发布 Setup 的 356.1 MiB 少约 **32.8 MiB / 9.2%**。实际 `win-unpacked` 目录为 **1,769,640,839 字节 / 57,817 个文件**；其中 Profile `node_modules` 1,093,634,966 字节 / 49,975 个文件，官方主运行时 283,562,765 字节 / 7,736 个文件。最大项是官方 Windows LibreOffice kit 190,865,379 字节和 WorkDSH Office 包 185,654,796 字节。源码映射仍占 131,317,708 字节，尚未删减。

CI 的 `desktop-footprint-windows-x64` 报告记录这些 Windows 文件指标，但不会成为 Release 附件。压缩安装包缩小已验证，**首次安装与升级所需时间尚未实测**；需按[NSIS 冷快照 A/B 方法](windows-nsis-ab-methodology.md)验证，不能把减少 20,721 个 macOS 文件直接换算成 Windows 安装提速幅度。不要通过删除普通用户所需的官方 Python 或 Office 功能来追求 200 MiB 目标。
