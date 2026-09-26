<p align="center"><img src="workdsh-web/assets/brand/workdsh-logo.svg" width="88" alt="WorkDSH logo"></p>
<h1 align="center">WorkDSH</h1>
<p align="center"><strong>Give AI the work. See the process. Keep the result.</strong></p>
<p align="center">An open-source desktop workspace built on DeepSeek Harness, bringing projects, documents, experts, skills, connectors, and tasks together.</p>
<p align="center"><a href="#download-desktop">Download Desktop</a> · <a href="#from-material-to-deliverable">Explore the workflow</a> · <a href="docs/user-guide.en.md">User guide</a> · <a href="README.md">简体中文</a></p>

[![Desktop release](https://img.shields.io/badge/Desktop-2.0.5--alpha.21-176BFF)](https://github.com/techflag/workdsh/releases/tag/desktop-v2.0.5-alpha.21) [![GitHub stars](https://img.shields.io/github/stars/techflag/workdsh?label=stars)](https://github.com/techflag/workdsh) [![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

![WorkDSH projects home with project templates and the complete desktop sidebar](workdsh-web/docs/assets/screenshots/workdsh-projects-alpha8-dark.png)

<sub>Captured from a local WorkDSH session. Project names and account figures are demonstration data, not bundled with the installer.</sub>

## Why WorkDSH

An AI task needs more than a prompt: it needs source material, working rules, the right capabilities, and a result people can inspect and keep editing. WorkDSH organizes these in a desktop workspace while retaining DeepSeek Harness's native models, tools, sessions, `/` commands, `@` references, and attachments.

| A common problem | How WorkDSH approaches it |
| --- | --- |
| Re-explaining the context in every conversation | **Projects** bring instructions, plans, tasks, material, and capability configuration together. |
| Files scattered across chats and directories | The **library** manages local files, search, and previews; tasks can reference material and its revision. |
| Useful working methods are hard to reuse | **Skills** hold callable instructions and resources; **experts** publish role and capability configurations as fixed revisions. |
| A chat answer still needs a separate delivery tool | The **deliverable workspace** previews or edits supported working copies of documents, spreadsheets, presentations, HTML, and PDF. |

### From material to deliverable

```text
File in library ──reference──> Project task ──choose──> Expert / Skill / Connector
                                            │
                                            └──> Inspect the process and result; keep editing in supported editors
```

This path is WorkDSH's product direction. End-to-end validation of project document references, expert execution, and different Office formats is ongoing during Alpha. Preview, editing, and export fidelity differ by format; the [current capabilities and limits](workdsh-web/README.md) describe them in more detail.

<details>
<summary>See an HTML deliverable from a real local conversation</summary>

![WorkDSH conversation, deliverable cards, and right-side HTML preview](workdsh-web/docs/assets/screenshots/workdsh-html-dashboard-preview.png)

<sub>A local task example showing deliverable cards and right-side preview; it does not imply lossless editing for every file.</sub>

</details>

## A path into a large Skill ecosystem and DSH plugins

WorkDSH uses two complementary kinds of extension; a skill is different from a plugin:

| | Skill: reuse a working method | DSH plugin: extend the system |
| --- | --- | --- |
| Purpose | Give an agent instructions, scripts, references, and resources | Extend the Harness Host, client, tools, or services |
| How to add it | Import a file or ZIP package containing `SKILL.md`, inspect it, then confirm installation | Use the official plugin loading and composition mechanism for the pinned DSH version |
| In WorkDSH | A local skill catalog supports search, enable/disable, and management; WorkBuddy-style and community Skills can be tried for migration | WorkDSH projects, library, experts, skills, and connectors are feature packages; third-party DSH plugins can be adapted to the pinned version |

**“Large compatible ecosystem” describes an open import format, not a huge preinstalled catalog.** Many WorkBuddy-style skills use `SKILL.md` as their entry point. WorkDSH supports that structure and bundles a skill-creation guide inspired by WorkBuddy's full authoring workflow. Scripts, external services, permissions, and proprietary formats still need individual validation. Third-party DSH plugins must likewise be checked against the current upstream version; a community directory listing is not a compatibility test. [Skill management](workdsh-web/packages/plugins/skills/README.md) · [Plugin development](docs/plugin-development.en.md) · [Ecosystem manifesto](docs/plugin-ecosystem.en.md)

![WorkDSH skill catalog with local entries, categories, and install actions](workdsh-web/docs/assets/screenshots/workdsh-skills-alpha8-dark.png)

<sub>The installable entries shown here come from the demonstration machine's local skill directory. They are neither bundled with the installer nor an officially hosted online marketplace.</sub>

## Download Desktop

The current public desktop installer release is **2.0.5-alpha.21**. These links point directly to files in its [GitHub Release](https://github.com/techflag/workdsh/releases/tag/desktop-v2.0.5-alpha.21):

| Platform | Download |
| --- | --- |
| Windows x64 | [WorkDSH Setup.exe](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.5-alpha.21/dsh-plugin-desktop-windows-x64--WorkDSH-2.0.5-x64-Setup.exe) |
| macOS Apple Silicon | [WorkDSH arm64.dmg](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.5-alpha.21/dsh-plugin-desktop-macos-arm64--WorkDSH-2.0.5-arm64.dmg) |
| macOS Intel | [WorkDSH x64.dmg](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.5-alpha.21/dsh-plugin-desktop-macos-x64--WorkDSH-2.0.5-x64.dmg) |

Ordinary users do not need to install DSH, Node.js, or Python separately; the desktop package contains pinned runtimes. The macOS DMGs are currently unsigned, and updates are downloaded manually from [Releases](https://github.com/techflag/workdsh/releases). Start with the [user guide](docs/user-guide.en.md) and [FAQ](docs/faq.en.md).

## Technical foundation and current limits

WorkDSH uses a pinned, unmodified [official DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) submodule. Electron handles the window, startup, and packaging. WorkDSH features are composed as plugins in one Profile; Desktop does not install a second DSH runtime. See [`upstream.json`](upstream.json) for the pinned version. Whether models or third-party services use the network depends on user configuration.

This is an **Alpha preview**. Real cross-platform tasks, long-running expert team execution, fidelity for arbitrary Office files, and the community plugin marketplace still need validation or implementation. Published desktop packages may differ from the development branch; consult each [Release](https://github.com/techflag/workdsh/releases) for its scope and assets. Report issues on [GitHub](https://github.com/techflag/workdsh/issues).

## Development and documentation

Source ownership: [WorkDSH feature packages and Web](workdsh-web/README.md) · [Desktop carrier](dsh-plugin-desktop/README.md) · [Architecture](docs/architecture.en.md) · [All documentation](docs/README.en.md). Running from source requires Node.js 22.19+ or 24+, Corepack, and Yarn 4.18.0:

```sh
git submodule update --init --recursive
corepack yarn install --immutable
corepack yarn dev
```

Run checks with `corepack yarn check`. [Contributing](CONTRIBUTING.en.md)

## Community and acknowledgements

Thanks to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), [Cordis](https://github.com/cordiverse/cordis), and the open-source community. Thanks to Alibaba Cloud Wuying Cloud Computer, [UCloud AstraFlow](https://www.ucloud.cn/site/active/astraflow?ytag=geo_waituo_dsh), and [88API](https://88api.ai/sign-up?aff=VnEb) for supporting the project.

[GitHub Issues](https://github.com/techflag/workdsh/issues) · [Discord](https://discord.gg/TJeGqKRNM) · [Contact maintainers](mailto:t4wefan@qq.com)

WorkDSH uses the [MIT License](LICENSE). It is an independent community project and is not affiliated with, partnered with, authorized by, or endorsed by DeepSeek or WorkBuddy. Those names appear only to describe technical origins, compatibility, and design references. Upstream contributors shown on GitHub are inherited from synchronized commit history; this does not imply that they maintain this repository.

## Star history

[![WorkDSH star history](https://api.star-history.com/chart?repos=techflag/workdsh&type=date)](https://www.star-history.com/?repos=techflag%2Fworkdsh&type=date)
