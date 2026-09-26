# WorkDSH

**DeepSeek Harness as an installable desktop workspace.** Use conversations, projects, documents, experts, skills, and connectors together on Windows and macOS.

[Download Desktop](https://github.com/techflag/workdsh/releases) · [User guide](docs/user-guide.en.md) · [中文](README.md)

[![Release](https://img.shields.io/github/v/release/techflag/workdsh?include_prereleases&label=release)](https://github.com/techflag/workdsh/releases) [![Downloads](https://img.shields.io/github/downloads/techflag/workdsh/total?label=downloads)](https://github.com/techflag/workdsh/releases) [![Stars](https://img.shields.io/github/stars/techflag/workdsh?label=stars)](https://github.com/techflag/workdsh) [![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

WorkDSH runs a pinned version of the [official DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) runtime. Electron provides the desktop window and installer; one WorkDSH Profile provides projects, library, experts, skills, and connectors. This is an independently maintained community project, not an official DeepSeek product.

## Start with a project

1. **Collect material:** save working files in the library and reference them from conversations or project tasks.
2. **Configure the project:** keep its instructions, material, experts, skills, and connectors together.
3. **Complete a task:** start a conversation inside the project, use its configuration, retain task and document references, and continue the work later.

You can also open an ordinary conversation and use Harness's native models, tools, `/` commands, `@` references, and attachments. This is still an Alpha release; project and cross-plugin workflows are under active validation. Please [report issues](https://github.com/techflag/workdsh/issues).

## Skills and plugins

**Open to the large body of WorkBuddy-style and community Skills.** WorkDSH imports skill files or ZIP packages containing `SKILL.md`, with inspection, confirmation, enable/disable, and management. Existing skills in this structure can be tried for migration. Skills requiring special scripts, external services, or other dependencies need individual validation and are not guaranteed to run unchanged. This is an import path, not a claim that those skills are preinstalled. The bundled skill-creation guide also draws on WorkBuddy's complete authoring workflow. [Skill management details](workdsh-web/packages/plugins/skills/README.md)

**Participate in the DSH plugin ecosystem.** WorkDSH retains Harness's official plugin loading and composition mechanisms; third-party DSH plugins can be adapted against the currently pinned upstream version. WorkDSH's own projects, library, experts, skills, and connectors are feature packages in the same Profile. The community plugin marketplace is still being designed: a directory listing does not mean a plugin is preinstalled or tested. [Plugin development and compatibility](docs/plugin-development.en.md) · [Plugin ecosystem manifesto](docs/plugin-ecosystem.en.md)

A skill is a set of instructions and resources for an agent. A DSH plugin extends the Host, client, tools, or services. Both can extend the workspace, but they have different installation methods and dependencies.

## Download and install

On [GitHub Releases](https://github.com/techflag/workdsh/releases), choose the latest Desktop release that **actually contains `.exe` or `.dmg` installers**. A source-only release is not a desktop installer.

| System | File | Install |
| --- | --- | --- |
| Windows x64 | Windows Setup | Run the installer |
| macOS Apple Silicon | arm64 DMG | Open the DMG and drag WorkDSH into Applications |
| macOS Intel | x64 DMG | Open the DMG and drag WorkDSH into Applications |

The installer includes the required DSH, Node.js, and Python runtimes; ordinary users do not need to install them separately. For now, download updates manually from Releases. [Platform details and FAQ](docs/faq.en.md)

## Project status and documentation

- [User guide](docs/user-guide.en.md): installation, data location, and everyday use.
- [FAQ](docs/faq.en.md): runtime, versions, and troubleshooting.
- [Architecture](docs/architecture.en.md): the desktop carrier, upstream runtime, and WorkDSH Profile.
- [Plugin development](docs/plugin-development.en.md): build, install, and validate extensions against the pinned DSH version.
- [Documentation index](docs/README.en.md): design, validation records, and maintenance documentation.

The upstream `deepseek-harness/` checkout is a pinned Git submodule. WorkDSH feature source lives in [`workdsh-web/`](workdsh-web/README.md), and the Desktop carrier in [`dsh-plugin-desktop/`](dsh-plugin-desktop/README.md). See [`upstream.json`](upstream.json) for the pinned version. Desktop does not install a second DSH runtime.

Running from source requires Node.js 22.19+ or 24+, Corepack, and Yarn 4.18.0:

```sh
git submodule update --init --recursive
corepack yarn install --immutable
corepack yarn dev
```

For builds and checks, see [`dsh-plugin-desktop/README.md`](dsh-plugin-desktop/README.md) and [CONTRIBUTING.en.md](CONTRIBUTING.en.md).

## Community and acknowledgements

Thanks to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), [Cordis](https://github.com/cordiverse/cordis), and the open-source community. Thanks to Alibaba Cloud Wuying Cloud Computer, [UCloud AstraFlow](https://www.ucloud.cn/site/active/astraflow?ytag=geo_waituo_dsh), and [88API](https://88api.ai/sign-up?aff=VnEb) for supporting this project.

[GitHub Issues](https://github.com/techflag/workdsh/issues) · [Discord](https://discord.gg/TJeGqKRNM) · [Contributing](CONTRIBUTING.en.md) · [Contact maintainers](mailto:t4wefan@qq.com)

WorkDSH is released under the [MIT License](LICENSE). “DeepSeek Harness” is used only to describe technical origin and compatibility. WorkDSH is not affiliated with, partnered with, authorized by, or endorsed by DeepSeek. Upstream contributors shown on GitHub come from inherited and synchronized commit history; this does not imply their participation in maintaining this repository.

## Star history

[![WorkDSH star history](https://api.star-history.com/chart?repos=techflag/workdsh&type=date)](https://www.star-history.com/?repos=techflag%2Fworkdsh&type=date)
