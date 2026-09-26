<p align="center"><img src="workdsh-web/assets/brand/workdsh-logo.svg" width="88" alt="WorkDSH 标志"></p>
<h1 align="center">WorkDSH</h1>
<p align="center"><strong>把工作交给 AI，看清过程，拿到成果。</strong></p>
<p align="center">基于 DeepSeek Harness 的开源桌面工作台：让项目、资料、专家、技能、连接器与任务在同一个地方协作。</p>
<p align="center"><a href="#下载桌面版">下载桌面版</a> · <a href="#从资料到成果">了解工作流</a> · <a href="docs/user-guide.md">使用指南</a> · <a href="README.en.md">English</a></p>

[![Desktop release](https://img.shields.io/badge/Desktop-2.0.5--alpha.20-176BFF)](https://github.com/techflag/workdsh/releases/tag/desktop-v2.0.5-alpha.20) [![GitHub stars](https://img.shields.io/github/stars/techflag/workdsh?label=stars)](https://github.com/techflag/workdsh) [![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

![WorkDSH 项目主页：项目、模板与完整桌面侧栏](workdsh-web/docs/assets/screenshots/workdsh-projects-alpha8-dark.png)

<sub>WorkDSH 本地运行截图。项目名称和账户数值为演示环境数据，不随安装包提供。</sub>

## 为什么是 WorkDSH

一个 AI 任务往往不止一句提问：它需要资料、工作规则、合适的能力，以及可以检查和继续修改的成果。WorkDSH 把这些对象组织进桌面工作台，同时保留 DeepSeek Harness 原生的模型、工具、会话、`/` 命令、`@` 引用和附件。

| 工作中遇到的问题 | WorkDSH 的做法 |
| --- | --- |
| 每次对话都要重新解释背景 | **项目**集中管理指令、计划、任务、资料和能力配置，让后续工作有明确入口。 |
| 文件在聊天记录和目录间散落 | **资料库**管理本地文件、搜索和预览；任务引用资料及其修订。 |
| 好用的工作方法难以复用 | **技能**保存可调用的说明与资源；**专家**把角色与能力配置发布为固定修订。 |
| 回答结束后还要另找工具交付 | **成果工作区**在支持的格式内预览或编辑文档、表格、演示文稿、HTML 与 PDF 工作副本。 |

### 从资料到成果

```text
资料库中的文件 ──引用──> 项目任务 ──选择──> 专家 / Skill / 连接器
                                      │
                                      └──> 查看过程与成果，在支持的编辑器中继续修改
```

这条路径是 WorkDSH 的产品方向。项目内资料引用、专家执行与不同 Office 格式的完整端到端体验仍在 Alpha 验收中；各格式的预览、编辑和导出范围不同，[当前能力与限制](workdsh-web/README.zh-CN.md)有更具体的说明。

<details>
<summary>查看实际会话中的 HTML 成果示例</summary>

![WorkDSH 会话、成果卡片和右侧 HTML 预览](workdsh-web/docs/assets/screenshots/workdsh-html-dashboard-preview.png)

<sub>本地任务示例；展示成果卡片和右侧预览，不代表任意文件都能无损编辑。</sub>

</details>

## 海量 Skill 的接入路径，开放的 DSH 插件生态

WorkDSH 的能力分为两层，避免把“技能”和“插件”混为一谈：

| | Skill：复用工作方法 | DSH 插件：扩展系统能力 |
| --- | --- | --- |
| 做什么 | 为智能体提供说明、脚本、参考资料和资源 | 扩展 Harness Host、客户端、工具或服务 |
| 如何接入 | 导入包含 `SKILL.md` 的文件或 ZIP 包，经过预检与确认后安装 | 使用当前固定 DSH 版本的官方插件加载与组合机制 |
| 在 WorkDSH 中 | 技能市场展示本地目录，支持搜索、启停和管理；可尝试迁入 WorkBuddy 风格及社区 Skill | 项目、资料库、专家、技能、连接器本身由 WorkDSH 功能包组成，也可按版本适配第三方 DSH 插件 |

**海量兼容的含义是开放导入格式，不是预装海量技能。** 许多 WorkBuddy 风格的技能以 `SKILL.md` 为入口；WorkDSH 支持这种结构，并内置参考 WorkBuddy 完整制作流程的技能创建指南。脚本运行环境、外部服务、权限和专有格式仍需逐个验证。DSH 第三方插件同样要以当前上游版本验证，不能把社区目录中的条目视为已通过兼容测试。[技能管理](workdsh-web/packages/plugins/skills/README.md) · [插件开发](docs/plugin-development.md) · [生态倡议](docs/plugin-ecosystem.md)

![WorkDSH 技能市场：本地目录、分类和可安装技能](workdsh-web/docs/assets/screenshots/workdsh-skills-alpha8-dark.png)

<sub>截图中的可安装条目来自演示机的本地技能目录，不代表安装包自带或官方托管的在线市场。</sub>

## 下载桌面版

当前公开桌面安装包为 **2.0.5-alpha.20**。以下链接直接指向 [GitHub Release](https://github.com/techflag/workdsh/releases/tag/desktop-v2.0.5-alpha.20) 中的文件：

| 平台 | 下载 |
| --- | --- |
| Windows x64 | [WorkDSH Setup.exe](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.5-alpha.20/dsh-plugin-desktop-windows-x64--WorkDSH-2.0.5-x64-Setup.exe) |
| macOS Apple Silicon | [WorkDSH arm64.dmg](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.5-alpha.20/dsh-plugin-desktop-macos-arm64--WorkDSH-2.0.5-arm64.dmg) |
| macOS Intel | [WorkDSH x64.dmg](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.5-alpha.20/dsh-plugin-desktop-macos-x64--WorkDSH-2.0.5-x64.dmg) |

普通用户无需分别安装 DSH、Node.js 或 Python；桌面包内置固定版本的运行时。macOS DMG 当前未签名，更新需从 [Releases](https://github.com/techflag/workdsh/releases) 手动下载。开始使用前请阅读[用户指南](docs/user-guide.md)和[常见问题](docs/faq.md)。

## 技术来源与当前边界

WorkDSH 使用固定版本、未修改的[官方 DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 子模块。Electron 只负责窗口、启动和打包；WorkDSH 功能由同一 Profile 的插件组合提供，Desktop 不另装第二套 DSH。固定版本见 [`upstream.json`](upstream.json)。模型或第三方服务是否联网，取决于用户配置。

这是 **Alpha 预览版**。跨平台真实任务、长时间专家团队执行、任意 Office 文件保真，以及社区插件市场仍需继续验收或实现。已发布的桌面包与开发分支可能不同；请以对应 [Release](https://github.com/techflag/workdsh/releases) 的说明和附件为准。反馈请提交到 [Issues](https://github.com/techflag/workdsh/issues)。

## 开发与文档

源码分工：[WorkDSH 功能包与 Web](workdsh-web/README.zh-CN.md) · [Desktop 外壳](dsh-plugin-desktop/README.zh.md) · [架构](docs/architecture.md) · [全部文档](docs/README.md)。从源码运行需要 Node.js 22.19+ 或 24+、Corepack 和 Yarn 4.18.0：

```sh
git submodule update --init --recursive
corepack yarn install --immutable
corepack yarn dev
```

运行检查：`corepack yarn check`。[参与贡献](CONTRIBUTING.md)

## 社区与致谢

感谢 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)、[Cordis](https://github.com/cordiverse/cordis) 和开源社区。感谢阿里云无影云电脑、[UCloud 星图 AstraFlow](https://www.ucloud.cn/site/active/astraflow?ytag=geo_waituo_dsh) 与 [88API](https://88api.ai/sign-up?aff=VnEb) 支持本项目。

[GitHub Issues](https://github.com/techflag/workdsh/issues) · [Discord](https://discord.gg/TJeGqKRNM) · [联系维护者](mailto:t4wefan@qq.com)

WorkDSH 采用 [MIT License](LICENSE)，是独立社区项目，与 DeepSeek 或 WorkBuddy 不存在隶属、合作、授权或背书关系。相关名称仅用于说明技术来源、兼容性与设计参考。GitHub Contributors 中的上游贡献者来自继承和同步的提交历史，不表示其参与本仓库维护。

## Star 趋势

[![WorkDSH Star 趋势](https://api.star-history.com/chart?repos=techflag/workdsh&type=date)](https://www.star-history.com/?repos=techflag%2Fworkdsh&type=date)
