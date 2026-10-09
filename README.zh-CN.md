<p align="center"><img src="apps/web/assets/brand/workdsh-logo.svg" width="88" alt="WorkDSH 标志"></p>
<h1 align="center">WorkDSH</h1>
<p align="center"><strong>WorkBuddy 式工作台，让技能、专家与插件组成更多工作场景。</strong></p>
<p align="center">参考 WorkBuddy 的工作体验，基于 DeepSeek Harness 的开放插件体系：个人开箱使用，安装企业连接插件后接入公司模型、协作与 @同事。</p>
<p align="center"><a href="#下载桌面版">下载桌面版</a> · <a href="#从资料到成果">了解工作流</a> · <a href="#个人与企业使用">个人与企业</a> · <a href="docs/user-guide.md">使用指南</a> · <a href="README.md">English</a></p>

[![Desktop release](https://img.shields.io/badge/Desktop-2.0.6--alpha.5-176BFF)](https://github.com/techflag/workdsh/releases/tag/desktop-v2.0.6-alpha.5) [![GitHub stars](https://img.shields.io/github/stars/techflag/workdsh?label=stars)](https://github.com/techflag/workdsh) [![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[![GitHub Actions](https://github.com/techflag/workdsh/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/techflag/workdsh/actions/workflows/ci.yml) [![Gitee stars](https://gitee.com/techflag/workdsh/badge/star.svg?theme=dark)](https://gitee.com/techflag/workdsh/stargazers) [![Gitee forks](https://gitee.com/techflag/workdsh/badge/fork.svg?theme=dark)](https://gitee.com/techflag/workdsh/members)

## 功能建议与 Bug 反馈

**WorkDSH 正在持续改进，欢迎告诉我们：你想要什么功能、哪里不好用、遇到了什么 Bug。无需懂代码。**

| 我要反馈 | 点击这里 | 建议提供 |
| --- | --- | --- |
| 🐛 功能异常、安装失败或界面问题 | [提交 Bug](https://github.com/techflag/workdsh/issues/new?template=bug_report.yml) | 应用版本、个人/企业模式、操作步骤及报错截图。 |
| 💡 新功能或体验改进 | [提交功能建议](https://github.com/techflag/workdsh/issues/new?template=feature_request.yml) | 你的使用场景、目前的困难、希望达到的效果。 |
| 🔎 查看已有反馈与处理进展 | [查看 Issues](https://github.com/techflag/workdsh/issues) | 先搜索相同问题；已有反馈可补充信息或点赞。 |

GitHub 提交需要登录账号。暂时不知道属于哪类？[从反馈入口开始](https://github.com/techflag/workdsh/issues/new/choose)。公司账号、权限或模型转发的后台问题，请到 [WorkDSH Admin 提交](https://github.com/techflag/workdsh-admin/issues)。**Issue 是公开的，请勿上传密码、Token、API Key 或公司敏感资料。**

**个人工作台 + 可安装的企业能力，是 WorkDSH 的特色。** 资料库、项目、专家、技能和连接器共用同一套功能；企业连接插件按需安装，登录公司账号后使用协作、@同事分享正文与文件，并可在模型设置中添加公司模型。独立业务插件还能通过 `workdshEnterprise` 复用成员认证，连接自己的公司业务接口。

企业插件目前**未上架插件市场**：[下载企业连接包](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.6-alpha.5/workdsh-enterprise-connection-0.1.0-alpha.2.tgz)，在“插件 → 添加插件”填写下载文件的完整路径，安装并启用，再到“设置 → 企业账号”连接公司后台。[安装与登录步骤](#企业连接插件下载安装与登录) · [业务插件认证调用](#企业插件开放认证服务业务插件不用重复登录) · [独立管理后台](https://github.com/techflag/workdsh-admin)

![WorkDSH 项目主页：项目、模板与完整桌面侧栏](apps/web/assets/screenshots/workdsh-projects-alpha8-dark.png)

<sub>WorkDSH 本地运行截图。项目名称和账户数值为演示环境数据，不随安装包提供。</sub>

## WorkBuddy 式体验，DSH 开放生态

WorkDSH 参考 WorkBuddy 按项目组织资料、专家、技能和连接器的工作方式，并在 DeepSeek Harness 上实现这些页面和管理功能。DSH 本身也是完整的 Agent 软件；它通过插件组合模型、工具、技能支持、界面等功能，WorkDSH 则在这套机制上加入自己的工作台功能。

| 你要完成的事 | WorkDSH 提供的入口 |
| --- | --- |
| 围绕长期目标持续工作 | **项目**集中管理指令、计划、任务、资料和能力配置。 |
| 让 AI 用上已有文件 | **资料库**管理本地文件、搜索和预览，任务可引用资料及其修订。 |
| 复用团队擅长的方法 | **专家**保存角色与能力配置；**技能**承载可调用的说明和资源。 |
| 把结果带出对话 | **成果工作区**预览或编辑支持的文档、表格、演示文稿、HTML 和 PDF 工作副本。 |

### WorkDSH 的特色

- **本机执行，集中管理**：Agent 和工具在员工桌面客户端运行；服务器负责账号、权限、协作数据与模型转发。
- **完整官方界面，共享功能插件**：个人和企业复用同一套资料库、专家、技能和连接器功能。
- **安装即可使用运行环境**：Desktop 随包提供 Node.js、pnpm 和 Python，内置插件无需首次登录再下载；社区技能和插件按需安装。
- **企业认证可供业务插件复用**：独立插件注入 `workdshEnterprise` 即可请求公司后台，复用当前成员登录，不读取或保存 Token。
- **@同事，分享 AI 成果**：在对话中选择组织同事，分享分析正文和文件；在“协作”中查看收到的、发出的分享并继续交流。安装企业连接插件并登录公司账号后使用。
- **个人与公司模型并存**：接入公司内部模型 API 后，可在对话的模型选择器中选择公司模型，也可保留个人模型；真实供应商密钥由管理后台保管。

### 企业插件开放认证服务，业务插件不用重复登录

企业 Desktop 的业务插件注入 **`workdshEnterprise`**，复用当前成员登录。服务不返回后台 Token、本机桥接密钥或账号密码；Desktop 主进程携带认证请求公司后台，后台检查成员与业务权限。

以下代码在独立插件的 **Host 入口**执行，不在浏览器页面直接执行。企业连接插件安装、启用并登录后提供服务；普通个人空间不提供此服务。

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { EnterpriseService } from 'workdsh-contracts/enterprise'

declare module '@deepseek-ai/cordis' {
  interface Context { workdshEnterprise: EnterpriseService }
}

export default {
  name: 'company-reports',
  inject: ['workdshEnterprise'],
  async apply(ctx: Context) {
    const member = await ctx.workdshEnterprise.identity()
    const reports = await ctx.workdshEnterprise.request<{ items: unknown[] }>({
      plugin: 'reports',
      operation: 'list',
      method: 'POST',
      body: { page: 1 },
    })
  },
}
```

以上请求映射到公司后台的 `POST /api/extensions/reports/list`。开发者实现该业务接口并检查权限即可，不需要再开发一套登录。此能力从 Desktop `2.0.6-alpha.3`、企业连接包 `0.1.0-alpha.2` 开始提供。`workdsh-contracts` 当前未发布公共 npm SDK，类型包的构建与打包方式、接口限制见[企业业务插件认证接入](docs/ENTERPRISE-PLUGIN-AUTH.md)。

### 从资料到成果

```text
资料库中的文件 ──引用──> 项目任务 ──选择──> 专家 / Skill / 连接器
                                      │
                                      └──> 查看过程与成果，在支持的编辑器中继续修改
```

这条路径是 WorkDSH 的产品方向。项目内资料引用、专家执行与不同 Office 格式的完整端到端体验仍在 Alpha 验收中；各格式的预览、编辑和导出范围不同，[当前能力与限制](apps/web/README.zh-CN.md)有更具体的说明。

<details>
<summary>查看实际会话中的 HTML 成果示例</summary>

![WorkDSH 会话、成果卡片和右侧 HTML 预览](apps/web/assets/screenshots/workdsh-html-dashboard-preview.png)

<sub>本地任务示例；展示成果卡片和右侧预览，不代表任意文件都能无损编辑。</sub>

</details>

## 技能与插件生态

这里要区分**用户使用的内容**和**实现它的软件扩展**：一个技能通常是包含 `SKILL.md` 的说明与资源，可以直接安装到本机 DSH 技能目录，它本身不一定是插件；WorkDSH 的技能管理器才是 DSH 插件。专家配置也不等于插件，管理专家的功能由 WorkDSH 插件实现。DSH 插件还可以直接增加工具或界面功能。因而插件体系能承载技能、专家及软件功能，但不能把每一个技能或专家都算成一个插件。

DSH 插件可以是单项工具，也可以组合界面、服务与其他资源，形成更完整的应用场景。例如，数据管理插件可以提供数据页面和处理工具，再与技能、专家配合完成一套流程；这是插件体系允许的扩展方向，不表示当前版本已内置这样的数据管理系统。用户可以从 SkillHub 发现和安装技能，也可以通过 dsh-market 寻找 DSH 社区插件。安装前应看插件具体提供什么，以及是否兼容当前 DSH 版本。

WorkDSH 接入两个独立维护的目录：[SkillHub](https://skillhub.cn/) 提供 Skill，[dsh-market](https://dshmarket.com/zh/) 提供 DSH 插件。SkillHub 条目展示来源和版本，许可证信息可到来源页核对；现有插件页通过第三方 dsh-market 插件打开社区目录。目录中的内容**并非全部预装、经 WorkDSH 审核或获得 WorkDSH 背书**，安装前应查看许可证、依赖和 DSH 版本兼容性。[技能管理](packages/plugins/skills/README.md) · [插件开发](docs/plugin-development.md) · [生态倡议](docs/plugin-ecosystem.md)

![WorkDSH 中的 SkillHub 技能目录：图标、版本、来源与安装入口](apps/web/assets/screenshots/workdsh-skillhub-2026-09.png)

<sub>SkillHub 实时目录，条目和数量会变化；截图所示本地会话为演示环境。</sub>

![从 WorkDSH 现有插件页打开的 DSH 社区插件市场](apps/web/assets/screenshots/workdsh-dshmarket-2026-09.png)

<sub>社区插件的发现和安装由第三方 dsh-market 插件提供；截图不代表目录中的插件已随 WorkDSH 安装包提供。</sub>

## 个人与企业使用

WorkDSH 支持个人使用和企业 Desktop。个人与企业保留完整官方 DSH 界面，复用同一套 WorkDSH 功能插件；企业通过 [WorkDSH Admin](https://github.com/techflag/workdsh-admin) 管理公司账号、组织、权限和内部模型 API。

| 使用方式 | Agent 与工具在哪里执行 | 如何进入 |
| --- | --- | --- |
| 个人 Desktop | 本机，使用个人文件和模型配置。 | 打开应用，选择“个人使用”。 |
| 企业 Desktop | 员工本机，使用本机文件和工具。 | 安装桌面应用和企业账号插件，再选择“企业登录”。 |

Desktop 的个人与企业空间分别保存数据和凭据。企业账号插件按需安装，安装后使用公司地址和账号登录，企业身份仍由后台授权。项目功能随 Desktop 提供。企业协作按需安装，登录企业账号后启用，个人模式不启用；不部署 ECS 成员 Agent 运行进程。通知和业务应用仍作为独立插件安装。

### 企业管理后台（独立仓库）

企业云端管理后台在 **[techflag/workdsh-admin](https://github.com/techflag/workdsh-admin)** 独立开发和部署。本仓库提供 WorkDSH 客户端与插件；公司账号、组织权限、协作数据、成员授权的会话审计及内部模型 API 转发由管理后台提供。

管理员请按 [workdsh-admin 的部署与使用说明](https://github.com/techflag/workdsh-admin#readme) 部署后台，并向成员提供后台地址和公司账号。成员安装本仓库的桌面端与企业连接插件后连接该地址；Agent 与工具仍在成员本机执行。

### 企业连接插件：下载、安装与登录

**企业功能通过企业连接插件按需启用，基础桌面包不预装。** 一个包提供企业账号、@同事协作，并向独立业务插件提供认证请求服务。

1. 下载本次发行的 `workdsh-enterprise-connection-0.1.0-alpha.2.tgz`，保留文件。
2. 在个人空间打开“插件 → 添加插件”，填写 tgz 完整路径，安装后点击“立即启用”。
3. 打开“设置 → 企业账号 → 连接企业”，填写公司后台地址和成员账号登录。
4. 在“协作”查看分享，在模型设置中手动配置公司内部 API。开发者可注入 `workdshEnterprise` 复用认证，详见[调用说明](docs/ENTERPRISE-PLUGIN-AUTH.md)。

**目前企业连接插件未上架插件市场，不能按名称搜索安装。这里安装的是下载到本机的 `.tgz` 文件。**

例如下载到 Downloads 文件夹后，“添加插件”输入框填写：

```text
macOS：/Users/你的用户名/Downloads/workdsh-enterprise-connection-0.1.0-alpha.2.tgz
Windows：C:\Users\你的用户名\Downloads\workdsh-enterprise-connection-0.1.0-alpha.2.tgz
```

请换成自己电脑上的真实路径，不要直接复制示例用户名。macOS 可在 Finder 选中文件，按 `Option + Command + C` 复制完整路径；Windows 可右键文件选择“复制文件地址”，若带外层引号，粘贴时去掉引号。将路径粘贴到“插件 → 添加插件”的输入框，点击安装，再点击“立即启用”。不是填写插件名称，也不是把文件上传到管理后台。

[下载本版企业连接插件 tgz](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.6-alpha.5/workdsh-enterprise-connection-0.1.0-alpha.2.tgz)。如果浏览器自动解压，请保留或重新下载原始 `.tgz` 文件，不要填写解压后的文件夹路径。

企业连接包由本项目 [GitHub Releases](https://github.com/techflag/workdsh/releases) 独立交付，不依赖第三方插件市场。下载 `workdsh-enterprise-connection-<版本>.tgz`，在添加插件时填写完整路径；Desktop 2.0.6-alpha.5 起会将本地插件包复制到应用自己的账号缓存目录，安装成功后移动或删除原始下载文件不会影响后续插件安装；发行附件包含兼容 DSH 版本的清单及 `SHA256SUMS`。

在个人空间打开“插件 → 添加插件”，输入管理员提供的“企业连接”包路径或安装地址，确认来源并安装，安装完成后点击“立即启用”。一个包提供账号和协作，无需分别安装。完成后进入“设置 → 企业账号”，点击“连接企业”，填写后台地址并登录。安装过程复用官方进度与错误提示，不需要终端命令。目前企业插件未发布到可搜索目录，不能仅凭名称搜索安装。

### 企业登录与账号

Desktop 使用同一个基础安装包。先进入个人空间，在插件管理中安装企业连接包（包含账号和协作）。随后从工作区菜单切换使用方式，填写管理员提供的后台地址并使用公司账号登录。后台地址也可由管理员打包预置。管理后台仍通过浏览器访问。

![Desktop 个人与企业使用入口](assets/screenshots/desktop-login.png)

<sub>本节企业截图使用演示账号、组织和本地地址，示例数据不随应用预装。</sub>

登录后，在**设置 → 企业账号**查看当前成员的姓名、组织和角色，或退出登录。

<details>
<summary>查看企业账号与退出入口</summary>

![企业 Desktop 企业账号](assets/screenshots/enterprise-account.png)

</details>

企业 Desktop 按当前成员身份向后台同步用户和助手已显示的会话文字，不将思考、工具轨迹或附件作为正文上传。本组织有权限的管理员可只读查看已同步正文，每次访问记录审计。

### 使用案例：把 AI 分析分享给同事

下面是已完成的 Desktop 演示验收流程，不是客户部署案例：

1. 成员登录公司账号，在官方模型设置中添加管理员提供的内部 API 地址、访问 Key 和允许使用的模型。
2. 新建对话，选择公司模型，让 AI 分析工作资料或创建成果文件。Agent 与文件工具在成员电脑上执行。
3. 在对话中输入 `@` 并选择组织同事，分享分析正文与文件。
4. 接收方登录自己的公司账号，在“协作 → 收到的”查看内容；发送方在“发出的”查看分享记录。

已有验收截图展示了公司模型选择、@同事和协作记录；截图中的账号及内容均为演示数据。企业插件安装、成员登录和后台授权仍是前提，安装插件本身不授予组织权限。

### @同事与企业协作

安装并启用企业连接插件、登录公司账号后，在对话输入框输入 `@`，选择组织同事，随任务分享分析结果和文件。侧栏的**协作**入口集中展示“收到的”和“发出的”分享，方便查看内容、文件并继续交流。企业身份与协作由同一个企业连接包提供，个人模式不启用企业协作。

![企业协作：收到的与发出的分享](assets/screenshots/enterprise-collaboration.png)

### 配置公司模型

管理员在 WorkDSH Admin 中配置上游模型 API、供应商 Key、协议和允许使用的模型目录。成员获得内部 API 地址与访问 Key 后，进入**设置 → 模型 → 自定义模型 API**，填写：

| 字段 | 填写内容 |
| --- | --- |
| Provider ID 与显示名称 | 例如 `company-api` 和“公司模型”。 |
| API 地址 | 管理员提供的内部地址，例如 `https://enterprise.example/api/model-gateway/v1`。 |
| API 协议 | 内部接口支持的协议。 |
| API 密钥 | 管理员提供的内部访问 Key。 |
| 模型目录 | 获取可用模型，或添加管理员提供的允许使用的模型 ID。 |

保存提供商后，在对话输入框的模型选择器中选择“公司模型”下的模型；同一对话入口也支持 `@` 选择同事。

![在对话中 @同事并选择公司模型](assets/screenshots/enterprise-mention-model.png)

个人自配模型可与公司模型并存。真实供应商 Key 只保存在服务器上；公司模型通过官方设置配置，不自动注入 DSH。模型请求发送到配置的 API，与 Agent 在本机执行分别决定。

<details>
<summary>查看官方模型设置中的公司模型配置</summary>

![企业 Desktop 公司模型设置](assets/screenshots/company-model.png)

</details>

<details>
<summary>查看企业 Web 工作台、技能管理与管理后台</summary>

企业 Web：对话工作台。

![企业 Web 对话工作台](assets/screenshots/enterprise-web.jpg)

企业 Web：技能管理。

![企业 Web 技能管理](assets/screenshots/skills.jpg)

WorkDSH Admin：组织概览。

![WorkDSH Admin 组织概览](assets/screenshots/admin-overview.jpg)

</details>

## 下载桌面版

桌面安装包 **2.0.6-alpha.5** 已发布。[GitHub Release](https://github.com/techflag/workdsh/releases/tag/desktop-v2.0.6-alpha.5) 提供以下完整安装包：

| 平台 | 下载 |
| --- | --- |
| Windows x64 | [WorkDSH Setup.exe](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.6-alpha.5/dsh-plugin-desktop-windows-x64--WorkDSH-2.0.6-alpha.5-x64-Setup.exe) |
| macOS Apple Silicon | [WorkDSH arm64.dmg](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.6-alpha.5/dsh-plugin-desktop-macos-arm64--WorkDSH-2.0.6-alpha.5-arm64.dmg) |
| macOS Intel | [WorkDSH x64.dmg](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.6-alpha.5/dsh-plugin-desktop-macos-x64--WorkDSH-2.0.6-alpha.5-x64.dmg) |

**国内下载**：[Gitee 2.0.6-alpha.3 发行](https://gitee.com/techflag/workdsh/releases/tag/desktop-v2.0.6-alpha.3) 提供 Windows x64 和 macOS Apple Silicon 分卷。受当前仓库单附件 100 MB、附件总量 1 GB 限制，需下载对应平台的全部分卷及合并脚本，按发行页说明恢复安装包；脚本通过 SHA256 校验后才生成安装文件。Intel Mac 或希望下载单个完整安装包的用户，请使用上表 GitHub 链接。企业插件 TGZ/ZIP 也可从 Gitee 发行页直接下载。

**开发与反馈**：GitHub 是唯一主开发仓库，Gitee 同步源码和发行包。欢迎通过 [Gitee Issues](https://gitee.com/techflag/workdsh/issues) 或 [GitHub Issues](https://github.com/techflag/workdsh/issues) 反馈问题。查看[国内发行路线图](https://gitee.com/techflag/workdsh/issues/IKJN8I)、[跨平台测试征集](https://gitee.com/techflag/workdsh/issues/IKJN8J)和[业务插件认证示例任务](https://gitee.com/techflag/workdsh/issues/IKJN8K)。Gitee 的有效代码贡献经审查纳入 GitHub 后再同步，不维护第二套产品代码。

Desktop 安装包默认内置 Node.js、pnpm 和 Python 运行时，普通用户无需单独安装。当前为 **Alpha 版**：项目资料引用、专家执行及不同 Office 格式的端到端体验仍在验收中。macOS DMG 未签名；更新请从 [Releases](https://github.com/techflag/workdsh/releases) 下载。开始使用前请阅读[用户指南](docs/user-guide.md)和[常见问题](docs/faq.md)。

Desktop 基础包不预装企业插件，安装企业插件后启用企业登录。已有下载版本的功能以对应发行说明为准。

桌面菜单“工具 → 终端命令 dsh（可选）”可查看、安装、修复和移除终端命令。普通桌面聊天无需安装此命令，只有主动点击菜单才显示管理弹窗。安装只创建命令入口，使用随包的 Node、pnpm 和官方 CLI；移除命令不会删除应用或工作区。命令默认操作当前 Desktop 工作区，启动时显示空间名称；`--workdsh-space=personal` 或 `--workdsh-space=enterprise` 可明确选择。企业空间须保持 Desktop 登录，首次使用前先在 Desktop 打开对应空间。插件安装、更新和移除遵循该空间的官方 Profile。

### 开发需要企业认证的插件

企业业务插件注入 `workdshEnterprise`，通过 `request({ plugin: "reports", operation: "list", method: "POST", body: { page: 1 } })` 请求公司后台。Desktop 自动携带当前成员认证，插件不读取或保存 Token；后台仍检查成员和业务权限。调用示例、SDK 类型依赖及新旧版本要求见[企业插件认证接入](docs/ENTERPRISE-PLUGIN-AUTH.md)。

## 开发与文档

源码分工：[WorkDSH 功能包与 Web](apps/web/README.zh-CN.md) · [Desktop 外壳](apps/desktop/README.zh.md) · [架构](docs/architecture.md) · [全部文档](docs/README.md)。从源码运行需要 Node.js 22.19+ 或 24+、Corepack 和 Yarn 4.18.0：

```sh
corepack yarn install --immutable
corepack yarn dev
```

官方 DSH 核心使用已发布 npm 包；Desktop 的 Node、pnpm、Python、Office 资源和命令管理程序从官方安装包提取。`upstream.json` 锁定版本、下载地址、大小与 SHA-512 摘要，构建无需克隆官方源码。首次打包会下载对应平台的官方包；Windows 构建机需要 7-Zip，仅用于解压安装包。

运行检查：`corepack yarn check`。在 macOS 或 Windows 上，从当前提交一键打包 Web Profile 与 Desktop：`corepack yarn release:pack`；Web 包发布后，正式安装包使用 `corepack yarn release:pack:published`。两条命令使用同一个[打包脚本](scripts/package-desktop-release.mjs)。[参与贡献](CONTRIBUTING.md)

工程目录按应用入口和共享功能分开：

```text
apps/desktop/   Electron 桌面应用与安装包
apps/web/       Web 启动、部署与验证
packages/       共用插件、身份适配、UI 和契约
profiles/       个人与企业插件组合
scripts/        产品构建与发布检查
```

### 企业 Desktop 打包配置

企业管理员部署 [WorkDSH Admin](https://github.com/techflag/workdsh-admin) 后，在打包时提供公司的公开后台地址。配置文件只保存地址，例如：

```json
{
  "enterprise": {
    "backendUrl": "https://enterprise.example"
  }
}
```

通过 `WORKDSH_DEPLOYMENT_CONFIG` 指定该文件，打包后写入应用资源中的 `workdsh-config.json`，员工入口使用固定地址。模型 API 地址与内部访问 Key 仍在官方模型设置中填写，不放入打包配置。具体操作见 [Desktop 打包说明](apps/desktop/README.zh.md)。

## 社区与致谢

感谢 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 社区提供运行时与插件底座；[腾讯 SkillHub](https://github.com/Tencent/skillhub) 提供公开的技能目录 API；[@cocofhu/skillhub](https://github.com/cocofhu/skillhub) 提供随桌面版集成的 DSH SkillHub 插件；[dsh-market](https://github.com/dsh-market/dsh-market) 与 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 社区提供插件市场与目录。WorkBuddy 是工作台设计参考。内置 skill-creator 的改编保留了原 [Apache-2.0 来源说明](packages/plugins/skills/resources/skills/workdsh-skill-creator/NOTICE.md)。反馈与参与：[GitHub Issues](https://github.com/techflag/workdsh/issues) · [参与贡献](CONTRIBUTING.md)

WorkDSH 采用 [MIT License](LICENSE)，是独立社区项目，与 DeepSeek 或 WorkBuddy 不存在隶属、合作、授权或背书关系。相关名称仅用于说明技术来源、兼容性与设计参考。GitHub Contributors 中的上游贡献者来自继承和同步的提交历史，不表示其参与本仓库维护。

## Star 趋势

[![WorkDSH Star 趋势](https://api.star-history.com/chart?repos=techflag/workdsh&type=date)](https://www.star-history.com/?repos=techflag%2Fworkdsh&type=date)
