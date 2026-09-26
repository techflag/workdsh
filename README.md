# WorkDSH

**把 DeepSeek Harness 变成可安装的桌面工作台。** 在 Windows 和 macOS 上，把对话、项目、资料、专家、技能与连接器放在同一处使用。

[下载桌面版](https://github.com/techflag/workdsh/releases) · [使用指南](docs/user-guide.md) · [English](README.en.md)

[![Release](https://img.shields.io/github/v/release/techflag/workdsh?include_prereleases&label=release)](https://github.com/techflag/workdsh/releases) [![Downloads](https://img.shields.io/github/downloads/techflag/workdsh/total?label=downloads)](https://github.com/techflag/workdsh/releases) [![Stars](https://img.shields.io/github/stars/techflag/workdsh?label=stars)](https://github.com/techflag/workdsh) [![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

WorkDSH 使用固定版本的[官方 DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 运行时。Electron 提供桌面窗口和安装包；项目、资料库、专家、技能及连接器由同一 WorkDSH Profile 提供。它是独立维护的社区项目，并非 DeepSeek 官方产品。

## 从一个项目开始

1. **收集资料**：把工作文件放入资料库，在对话或项目任务中引用。
2. **配置项目**：集中设置项目指令、资料、专家、技能和连接器。
3. **完成任务**：在项目中发起对话，使用对应配置，保留任务和资料引用，继续后续工作。

也可以直接打开普通会话，使用 Harness 原生的模型、工具、`/` 命令、`@` 引用和附件能力。当前仍为 Alpha 版本，项目与跨插件工作流在持续验证中；遇到问题请[提交 Issue](https://github.com/techflag/workdsh/issues)。

## 技能与插件

**面向海量 WorkBuddy 风格与社区 Skill。** WorkDSH 支持导入包含 `SKILL.md` 的技能文件或 ZIP 技能包，并提供预检、确认安装、启停及管理。按这一结构制作的现有技能可以尝试迁入；带有专用脚本、外部服务或其他依赖的技能，仍需逐个验证，不能保证直接运行。这描述的是兼容入口，不表示技能已随安装包预装。内置的技能创建指南也参考了 WorkBuddy 的完整制作流程。[了解技能管理](workdsh-web/packages/plugins/skills/README.md)

**接入 DSH 插件生态。** WorkDSH 保留官方 Harness 的插件加载与组合机制，第三方 DSH 插件可以按当前固定的上游版本进行适配。WorkDSH 自身的项目、资料、专家、技能和连接器也是这一 Profile 的功能包。社区插件市场仍在设计中，不把第三方目录条目等同于已预装、已测试的插件。[插件开发与兼容边界](docs/plugin-development.md) · [插件生态倡议](docs/plugin-ecosystem.md)

技能是供智能体使用的说明与资源；DSH 插件则扩展 Host、客户端、工具或服务。两者都可以扩展工作台，但安装方式和依赖不同。

## 下载与安装

在 [GitHub Releases](https://github.com/techflag/workdsh/releases) 选择**包含 `.exe` 或 `.dmg` 安装文件**的最新 Desktop 版本。仅有源码压缩包的 Release 不是桌面安装包。

| 系统 | 文件 | 安装 |
| --- | --- | --- |
| Windows x64 | Windows Setup | 运行安装程序 |
| macOS Apple Silicon | arm64 DMG | 打开 DMG，将 WorkDSH 拖入“应用程序” |
| macOS Intel | x64 DMG | 打开 DMG，将 WorkDSH 拖入“应用程序” |

安装包自带所需的 DSH、Node.js 和 Python 运行时；普通用户无需分别安装。当前更新方式是从 Releases 下载新版安装包。[平台说明与常见问题](docs/faq.md)

## 项目状态与文档

- [使用指南](docs/user-guide.md)：安装、数据位置和日常使用。
- [常见问题](docs/faq.md)：运行环境、版本及故障排查。
- [架构说明](docs/architecture.md)：桌面外壳、上游运行时与 WorkDSH Profile 的关系。
- [插件开发](docs/plugin-development.md)：按固定 DSH 版本开发、安装和验证扩展。
- [完整文档索引](docs/README.md)：设计、验收记录与维护文档。

上游 `deepseek-harness/` 是固定版本的 Git 子模块，WorkDSH 功能代码位于 [`workdsh-web/`](workdsh-web/README.zh-CN.md)，Desktop 外壳位于 [`dsh-plugin-desktop/`](dsh-plugin-desktop/README.zh.md)。当前固定版本见 [`upstream.json`](upstream.json)。仓库不在 Desktop 内再安装第二套 DSH。

从源码运行需要 Node.js 22.19+ 或 24+、Corepack 和 Yarn 4.18.0：

```sh
git submodule update --init --recursive
corepack yarn install --immutable
corepack yarn dev
```

构建与检查见 [`dsh-plugin-desktop/README.zh.md`](dsh-plugin-desktop/README.zh.md) 和 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 社区与致谢

感谢 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)、[Cordis](https://github.com/cordiverse/cordis) 与开源社区。感谢阿里云无影云电脑、[UCloud 星图 AstraFlow](https://www.ucloud.cn/site/active/astraflow?ytag=geo_waituo_dsh) 和 [88API](https://88api.ai/sign-up?aff=VnEb) 对项目的支持。

[GitHub Issues](https://github.com/techflag/workdsh/issues) · [Discord](https://discord.gg/TJeGqKRNM) · [参与贡献](CONTRIBUTING.md) · [联系维护者](mailto:t4wefan@qq.com)

WorkDSH 采用 [MIT License](LICENSE)。“DeepSeek Harness”仅用于说明技术来源与兼容性；WorkDSH 与 DeepSeek 不存在隶属、合作、授权或背书关系。GitHub Contributors 中的上游贡献者来自继承及同步的提交历史，不表示其参与本仓库维护。

## Star 趋势

[![WorkDSH Star 趋势](https://api.star-history.com/chart?repos=techflag/workdsh&type=date)](https://www.star-history.com/?repos=techflag%2Fworkdsh&type=date)
