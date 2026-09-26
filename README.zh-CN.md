<p align="center"><img src="workdsh-web/assets/brand/workdsh-logo.svg" width="88" alt="WorkDSH 标志"></p>
<h1 align="center">WorkDSH</h1>
<p align="center"><strong>WorkBuddy 式工作台，让技能、专家与插件组成更多工作场景。</strong></p>
<p align="center">WorkDSH 将资料、专家、技能和连接器带入同一工作台；接入 SkillHub 技能目录，并支持安装 DSH 社区插件。</p>
<p align="center"><a href="#下载桌面版">下载桌面版</a> · <a href="#从资料到成果">了解工作流</a> · <a href="docs/user-guide.md">使用指南</a> · <a href="README.md">English</a></p>

[![Desktop release](https://img.shields.io/badge/Desktop-2.0.6--alpha.1-176BFF)](https://github.com/techflag/workdsh/releases/tag/desktop-v2.0.6-alpha.1) [![GitHub stars](https://img.shields.io/github/stars/techflag/workdsh?label=stars)](https://github.com/techflag/workdsh) [![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

![WorkDSH 项目主页：项目、模板与完整桌面侧栏](workdsh-web/assets/screenshots/workdsh-projects-alpha8-dark.png)

<sub>WorkDSH 本地运行截图。项目名称和账户数值为演示环境数据，不随安装包提供。</sub>

## WorkBuddy 式体验，DSH 开放生态

WorkDSH 参考 WorkBuddy 按项目组织资料、专家、技能和连接器的工作方式，并在 DeepSeek Harness 上实现这些页面和管理功能。DSH 本身也是完整的 Agent 软件；它通过插件组合模型、工具、技能支持、界面等功能，WorkDSH 则在这套机制上加入自己的工作台功能。

| 你要完成的事 | WorkDSH 提供的入口 |
| --- | --- |
| 围绕长期目标持续工作 | **项目**集中管理指令、计划、任务、资料和能力配置。 |
| 让 AI 用上已有文件 | **资料库**管理本地文件、搜索和预览，任务可引用资料及其修订。 |
| 复用团队擅长的方法 | **专家**保存角色与能力配置；**技能**承载可调用的说明和资源。 |
| 把结果带出对话 | **成果工作区**预览或编辑支持的文档、表格、演示文稿、HTML 和 PDF 工作副本。 |

### 从资料到成果

```text
资料库中的文件 ──引用──> 项目任务 ──选择──> 专家 / Skill / 连接器
                                      │
                                      └──> 查看过程与成果，在支持的编辑器中继续修改
```

这条路径是 WorkDSH 的产品方向。项目内资料引用、专家执行与不同 Office 格式的完整端到端体验仍在 Alpha 验收中；各格式的预览、编辑和导出范围不同，[当前能力与限制](workdsh-web/README.zh-CN.md)有更具体的说明。

<details>
<summary>查看实际会话中的 HTML 成果示例</summary>

![WorkDSH 会话、成果卡片和右侧 HTML 预览](workdsh-web/assets/screenshots/workdsh-html-dashboard-preview.png)

<sub>本地任务示例；展示成果卡片和右侧预览，不代表任意文件都能无损编辑。</sub>

</details>

## 技能与插件生态

这里要区分**用户使用的内容**和**实现它的软件扩展**：一个技能通常是包含 `SKILL.md` 的说明与资源，可以直接安装到本机 DSH 技能目录，它本身不一定是插件；WorkDSH 的技能管理器才是 DSH 插件。专家配置也不等于插件，管理专家的功能由 WorkDSH 插件实现。DSH 插件还可以直接增加工具或界面功能。因而插件体系能承载技能、专家及软件功能，但不能把每一个技能或专家都算成一个插件。

DSH 插件可以是单项工具，也可以组合界面、服务与其他资源，形成更完整的应用场景。例如，数据管理插件可以提供数据页面和处理工具，再与技能、专家配合完成一套流程；这是插件体系允许的扩展方向，不表示当前版本已内置这样的数据管理系统。用户可以从 SkillHub 发现和安装技能，也可以通过 dsh-market 寻找 DSH 社区插件。安装前应看插件具体提供什么，以及是否兼容当前 DSH 版本。

WorkDSH 接入两个独立维护的目录：[SkillHub](https://skillhub.cn/) 提供 Skill，[dsh-market](https://dshmarket.com/zh/) 提供 DSH 插件。SkillHub 条目展示来源和版本，许可证信息可到来源页核对；现有插件页通过第三方 dsh-market 插件打开社区目录。目录中的内容**并非全部预装、经 WorkDSH 审核或获得 WorkDSH 背书**，安装前应查看许可证、依赖和 DSH 版本兼容性。[技能管理](workdsh-web/packages/plugins/skills/README.md) · [插件开发](docs/plugin-development.md) · [生态倡议](docs/plugin-ecosystem.md)

![WorkDSH 中的 SkillHub 技能目录：图标、版本、来源与安装入口](workdsh-web/assets/screenshots/workdsh-skillhub-2026-09.png)

<sub>SkillHub 实时目录，条目和数量会变化；截图所示本地会话为演示环境。</sub>

![从 WorkDSH 现有插件页打开的 DSH 社区插件市场](workdsh-web/assets/screenshots/workdsh-dshmarket-2026-09.png)

<sub>社区插件的发现和安装由第三方 dsh-market 插件提供；截图不代表目录中的插件已随 WorkDSH 安装包提供。</sub>

## 下载桌面版

计划发布的桌面安装包版本为 **2.0.6-alpha.1**。发布 [GitHub Release](https://github.com/techflag/workdsh/releases/tag/desktop-v2.0.6-alpha.1) 后，以下下载链接才会生效：

| 平台 | 下载 |
| --- | --- |
| Windows x64 | [WorkDSH Setup.exe](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.6-alpha.1/dsh-plugin-desktop-windows-x64--WorkDSH-2.0.6-alpha.1-x64-Setup.exe) |
| macOS Apple Silicon | [WorkDSH arm64.dmg](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.6-alpha.1/dsh-plugin-desktop-macos-arm64--WorkDSH-2.0.6-alpha.1-arm64.dmg) |
| macOS Intel | [WorkDSH x64.dmg](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.6-alpha.1/dsh-plugin-desktop-macos-x64--WorkDSH-2.0.6-alpha.1-x64.dmg) |

Desktop 安装包默认内置 Node.js 和 Python 运行时，普通用户无需单独安装。当前为 **Alpha 版**：项目资料引用、专家执行及不同 Office 格式的端到端体验仍在验收中。macOS DMG 未签名；更新请从 [Releases](https://github.com/techflag/workdsh/releases) 下载。开始使用前请阅读[用户指南](docs/user-guide.md)和[常见问题](docs/faq.md)。

## 开发与文档

源码分工：[WorkDSH 功能包与 Web](workdsh-web/README.zh-CN.md) · [Desktop 外壳](dsh-plugin-desktop/README.zh.md) · [架构](docs/architecture.md) · [全部文档](docs/README.md)。从源码运行需要 Node.js 22.19+ 或 24+、Corepack 和 Yarn 4.18.0：

```sh
git submodule update --init --recursive
corepack yarn install --immutable
corepack yarn dev
```

运行检查：`corepack yarn check`。[参与贡献](CONTRIBUTING.md)

## 社区与致谢

感谢 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 社区提供运行时与插件底座；[腾讯 SkillHub](https://github.com/Tencent/skillhub) 提供公开的技能目录 API；[@cocofhu/skillhub](https://github.com/cocofhu/skillhub) 提供随桌面版集成的 DSH SkillHub 插件；[dsh-market](https://github.com/dsh-market/dsh-market) 与 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 社区提供插件市场与目录。WorkBuddy 是工作台设计参考。内置 skill-creator 的改编保留了原 [Apache-2.0 来源说明](workdsh-web/packages/plugins/skills/resources/skills/workdsh-skill-creator/NOTICE.md)。反馈与参与：[GitHub Issues](https://github.com/techflag/workdsh/issues) · [参与贡献](CONTRIBUTING.md)

WorkDSH 采用 [MIT License](LICENSE)，是独立社区项目，与 DeepSeek 或 WorkBuddy 不存在隶属、合作、授权或背书关系。相关名称仅用于说明技术来源、兼容性与设计参考。GitHub Contributors 中的上游贡献者来自继承和同步的提交历史，不表示其参与本仓库维护。

## Star 趋势

[![WorkDSH Star 趋势](https://api.star-history.com/chart?repos=techflag/workdsh&type=date)](https://www.star-history.com/?repos=techflag%2Fworkdsh&type=date)
