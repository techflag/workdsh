<h1 align="center">WorkDSH</h1>

<p align="center">
  <strong>An open-source desktop client for Windows and macOS, built on DeepSeek Harness.</strong>
</p>

<p align="center">
  Official DSH runtime with WorkDSH projects, library, experts, skills, and connectors.
</p>

<p align="center"><sub>An independent community project, not affiliated with, authorized by, or endorsed by DeepSeek.<br>No DeepSeek employee or official upstream DeepSeek Harness team member currently participates in this repository; upstream contributors shown by GitHub are inherited from synchronized fork history.<br><a href="README.md">中文</a> · English</sub></p>

<p align="center">
  <a href="https://github.com/techflag/workdsh/releases"><img src="https://img.shields.io/github/v/release/techflag/workdsh?include_prereleases&amp;style=flat&amp;label=release&amp;color=4D6BFE" alt="Latest release"></a>
  <a href="https://github.com/techflag/workdsh/releases"><img src="https://img.shields.io/github/downloads/techflag/workdsh/total?style=flat&amp;label=downloads&amp;color=4D6BFE" alt="Total downloads"></a>
  <a href="https://github.com/techflag/workdsh"><img src="https://img.shields.io/github/stars/techflag/workdsh?style=flat&amp;label=%E2%98%85&amp;color=08C" alt="GitHub stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2EA44F?style=flat" alt="MIT License"></a>
  <a href="https://discord.gg/TJeGqKRNM"><img src="https://img.shields.io/badge/Discord-5865F2?style=flat&amp;logo=discord&amp;logoColor=white" alt="Join Discord"></a>
  <img src="https://img.shields.io/badge/macOS%20%7C%20Windows-4493F8?style=flat-square" alt="Supported platforms: macOS and Windows">
</p>

WorkDSH integrates the local Web UI, Host service, and plugin system from [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) into a native desktop window. It runs a pinned upstream version unchanged; projects, library, experts, skills, and connectors come from the WorkDSH Profile.

<a id="run"></a>

## Download and install

The desktop app is in Alpha testing, targeting Windows x64 and separate macOS Apple Silicon (arm64) and Intel (x64) packages. On [Releases](https://github.com/techflag/workdsh/releases), choose the newest Desktop release that **actually contains installers**. A release containing only source archives does not mean desktop installers have shipped.

| Platform | Download | Installation |
| --- | --- | --- |
| Windows x64 | [Browse Desktop Releases](https://github.com/techflag/workdsh/releases) | Download the Windows Setup or Portable file for that release; run the installer or extract the portable archive |
| macOS arm64 / x64 | [Browse Desktop Releases](https://github.com/techflag/workdsh/releases) | Choose the DMG for your computer and drag WorkDSH into Applications |

> This is an Alpha preview. Projects, Library, and cross-plugin composition remain under active validation; back up your workspace and profile before upgrading.

See the [user guide](docs/user-guide.en.md) and [FAQ](docs/faq.en.md) for plugin commands, platform details, and troubleshooting.

Together with every plugin author, we want to build an open, composable, and sustainable DSH plugin ecosystem where plugins grow alongside each other. Read the [DSH plugin ecosystem manifesto](docs/plugin-ecosystem.en.md).

<details open>
<summary>❤️ Sponsors</summary>

| Logo | Introduction |
| --- | --- |
| <img src="assets/sponsors/wuying-cloud-computer-logo.png" alt="Alibaba Cloud Wuying Cloud Computer" width="96"> | **Alibaba Cloud · Wuying Cloud Computer**<br>Thanks to Alibaba Cloud Wuying Cloud Computer for sponsoring this project. |
| <a href="https://astraflow.ucloud.cn/modelverse/playground?ytag=geo_waituo_dsh"><img src="assets/sponsors/astraflow-logo.png" alt="UCloud AstraFlow" width="96"></a> | [**UCloud · AstraFlow**](https://astraflow.ucloud.cn/modelverse/playground?ytag=geo_waituo_dsh)<br>Thanks to **UCloud** AstraFlow for sponsoring this project. **UCloud** AstraFlow ModelVerse supports one-click access to 200+ models, including Kimi K3, DeepSeek V4/V3, Qwen 3, GLM5.2, happyhorse, and other leading open-source models worldwide, with no self-training required.<br><br>[**Visit website →**](https://astraflow.ucloud.cn/modelverse/playground?ytag=geo_waituo_dsh) |
| <a href="https://88api.ai/sign-up?aff=VnEb"><img src="assets/sponsors/88api-logo.png" alt="88API" width="120"></a> | [**88API**](https://88api.ai/sign-up?aff=VnEb)<br>88API is a one-stop multi-model API aggregation platform operated by an overseas company, with stable, efficient service and invoice support. It provides official-transfer and open-source DeepSeek channels, with pricing as low as 50% off, and is designed to work well with WorkDSH. One API key can connect to many domestic and overseas models across text chat, image, audio, music, and video generation APIs for AI coding, agent automation, content creation, and application development.<br><br>[**Register now →**](https://88api.ai/sign-up?aff=VnEb) |

</details>

## Documentation

Ordinary users can start with the [user guide](docs/user-guide.en.md); the developer documentation is only needed when extending or maintaining the application.

### User documentation

| Goal | Entry point |
| --- | --- |
| Install and use the application | [User guide](docs/user-guide.en.md) |
| Check platforms, prerequisites, and product boundaries | [FAQ](docs/faq.en.md) |
| Understand why the project exists | [Why WorkDSH](docs/why-desktop.en.md) |
| See the full documentation and README map | [Documentation index](docs/README.en.md) |

### Developer and maintainer documentation

| Goal | Entry point |
| --- | --- |
| Read the plugin ecosystem manifesto | [Plugin ecosystem manifesto](docs/plugin-ecosystem.en.md) |
| Build ordinary or Desktop plugins | [Plugin development](docs/plugin-development.en.md) |
| Join the unified plugin-contract discussion | [DSH Community Fabric Draft](dsh-community-fabric/README.md) |
| See the research behind the unified plugin framework | [Framework and real-plugin research](dsh-community-fabric/docs/research/mature-plugin-frameworks.md) |
| Read the plugin market product and safety design | [DSH Community Market](dsh-community-market/README.md) |
| Understand Desktop and feature ownership | [Ownership boundaries](docs/desktop-boundaries.md) |
| Understand how the desktop works | [Architecture](docs/architecture.en.md) |
| Read package-level build and release details | [`dsh-plugin-desktop/README.md`](dsh-plugin-desktop/README.md) |

## Features

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>Projects</h3>
      <p>Manage instructions, assets, experts, skills, and connectors in one project. Tasks start inside the project and retain their context, references, and execution history for ongoing business work.</p>
    </td>
    <td width="50%" valign="top">
      <h3>Library</h3>
      <p>Store documents and previewable assets in one place, then reference them from conversations or projects as needed. The Library owns document content while tasks retain stable revision references.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>Desktop</h3>
      <p>Bring the upstream DeepSeek Harness local Web UI to a native desktop application. The app starts the local Harness service in a desktop window and requires no separate Node.js installation.</p>
    </td>
    <td width="50%" valign="top">
      <h3>Mobile Remote Control <img src="https://img.shields.io/badge/COMING_SOON-F59E0B?style=flat-square" alt="Coming Soon"></h3>
      <p>Connect to Desktop from iOS and Android to start tasks, monitor Agent progress, and send follow-ups from your phone.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>WorkDSH Product Plugins</h3>
      <p>Experts, skills, connectors, projects, and the library work together within WorkDSH and follow the product release.</p>
    </td>
    <td width="50%" valign="top">
      <h3>Co-build the Plugin Ecosystem</h3>
      <p>WorkDSH composes capabilities through the Harness plugin mechanism. The shared plugin contract and community marketplace are still in design; see the <a href="docs/plugin-ecosystem.en.md">plugin ecosystem manifesto</a> and <a href="dsh-community-market/README.md">marketplace design draft</a>.</p>
    </td>
  </tr>
</table>

## Plugin ecosystem

WorkDSH uses the official DSH plugin mechanism. Projects, library, experts, skills, and connectors are WorkDSH product packages; activity, Office, audit, access, and providers support the same Profile. The Electron carrier owns only the window, startup, and installer, without another DSH Host or Web Client. Community Fabric and Market remain design documentation.

Developers can read [plugin development](docs/plugin-development.en.md), the [architecture](docs/architecture.en.md), and [ownership boundaries](docs/desktop-boundaries.md). The current carrier has no former tray, multi-Profile selector, or automatic update manager. Download updates manually from [Releases](https://github.com/techflag/workdsh/releases).

## Relationship to DeepSeek Harness

WorkDSH is an independent community project built on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) and the Cordis plugin model, intended to provide an open and composable DSH desktop experience.

This repository is independently maintained by the community. No DeepSeek employee or member of the official upstream DeepSeek Harness team currently participates in its development, maintenance, or governance. Contributors from the upstream project may appear on GitHub's Contributors page because this repository inherited and later synchronized upstream commit history when it was forked. Such attribution reflects commit provenance only and does not imply involvement in this repository or any affiliation, partnership, authorization, or endorsement.

The upstream project provides the core agent capabilities, plugin system, and Web UI. WorkDSH primarily provides:

- Desktop application packaging
- Starting and stopping the local service
- Desktop window integration
- Projects, library, experts, skills, and connectors
- macOS and Windows installer builds and releases
- An interface designed for desktop use

If you prefer to run DeepSeek Harness from the command line or contribute to its core functionality, refer to the upstream repository first.

## Special Thanks

Special thanks to the [original DeepSeek Harness repository](https://github.com/deepseek-ai/deepseek-harness) and the DeepSeek AI team. WorkDSH is built from a pinned upstream checkout, and its core agents, models, tools, sessions, Web UI, and plugin ecosystem come from that project.

We also thank [Cordis](https://github.com/cordiverse/cordis) for the plugin foundation that makes this composition possible. WorkDSH would not exist without these open-source projects.

We are also grateful to the [Koishi.js](https://koishi.chat/) project and community for their long-standing work on plugin practices, tooling, and shared knowledge, and to everyone who contributes discussions, testing, feedback, and plugins.

Also, and you.

<a id="run-from-source"></a>

## Development

Desktop source lives in `dsh-plugin-desktop/`; the Web application and WorkDSH feature packages live in [`workdsh-web/`](workdsh-web/README.md). Desktop uses the root Yarn workspace and pinned `deepseek-harness/` submodule, while Web retains its own pnpm workspace. `upstream.json` keeps both on one DSH version. To start Desktop from the repository root:

```sh
git submodule update --init --recursive
corepack yarn install --immutable
corepack yarn dev
```

For Web development, run `corepack pnpm install --frozen-lockfile` and its scripts from `workdsh-web/`. The root `corepack yarn check` includes the Web planning check and a cross-workspace DSH version gate. The [architecture](docs/architecture.en.md) and Desktop package [`README`](dsh-plugin-desktop/README.md) describe the full build, test, and release boundaries. See [CONTRIBUTING.en.md](CONTRIBUTING.en.md) for how to contribute.

## Community

Choose whichever platform you prefer to discuss usage, plugin development, and project updates.

<table>
  <thead>
    <tr>
      <th align="center">WeCom</th>
      <th align="center">QQ Group</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><img src="assets/community-wechat-group.png" alt="WorkDSH WeCom QR code" title="Scan to add us on WeCom" width="180" height="180"></td>
      <td align="center"><img src="assets/community-qq-group.jpg" alt="WorkDSH QQ group QR code" width="180" height="180"></td>
    </tr>
  </tbody>
</table>

Discord: [Join the WorkDSH community](https://discord.gg/TJeGqKRNM)

If you would like to join our technical team, contact us at [t4wefan@qq.com](mailto:t4wefan@qq.com).

## Related Links

Ecosystem projects and developer tools around DeepSeek Harness.

| Project | About | Link |
| --- | --- | --- |
| dshfind | The learning & sharing community for DeepSeek Harness (DSH). | [GitHub](https://github.com/hikariming/dshfind) · [Website](https://dshfind.com) |
| DSH 1024Store | A community plugin directory for the DeepSeek Harness (DSH) ecosystem (4,120 plugins), open-sourcing an online marketplace, a collection pipeline, and a public query API — fork it to deploy your own marketplace. | [GitHub](https://github.com/imsai-sh/awesome-deepseek-harness-plugins) |
| Awesome DSH Plugin | Curated list of DeepSeek Harness (DSH) plugins. | [GitHub](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) |
| dsh-market | Visual plugin market for DeepSeek Harness, with browsing, search, and one-click installation. | [GitHub](https://github.com/dsh-market/dsh-market) |
| ModLens | Adds OCR, layout, and semantic vision capabilities to DeepSeek Harness and text-only coding agents. | [GitHub](https://github.com/liustack/modlens) · [Website](https://liustack.dev) |
| DeepSeek Harness Orange Book | Community field manual for DeepSeek Harness. | [GitHub](https://github.com/alchaincyf/deepseek-harness-orange-book) |
| dsh-web-ui | DeepSeek Harness Web UI plugins and themes. | [GitHub](https://github.com/zhu1090093659/dsh-web-ui) · [Gallery](https://gallery.dsh-market.com) |
| dsh-TUI | Full-screen interactive terminal interface for DeepSeek Harness. | [GitHub](https://github.com/ccch1mneyyy/dsh-TUI) |
| dsh-tianshu-tui | Minimalist interactive terminal UI plugin for the DSH web client with a self-developed ANSI rendering core for silky-smooth output; adds TDD, evidence gates, and vision/image module workflows on top of the official UI. | [GitHub](https://github.com/huiliyi37/dsh-tianshu-tui) |
| dsh-context | DSH context insight panel: Context dashboard + `/context` command + Context browser for one-stop context lifecycle management — category composition, content details, evolution trends, compaction/injection events, and statistics. | [GitHub](https://github.com/bowenliang123/dsh-context) · [NPM](https://www.npmjs.com/package/dsh-context) |
| Agents-Anywhere | Remote-control your desktop coding agent from your phone. | [GitHub](https://github.com/anywhere-labs/Agents-Anywhere) |
| deepseek-harness-remote | Remote control and multi-device collaboration plugin for DeepSeek Harness based on P2P and APIProxy. | [GitHub](https://github.com/liguobao/deepseek-harness-remote) |
| DSH-better-sidebar | Sidebar workbench for DeepSeek Harness with files, terminal, Git, and subagents. | [GitHub](https://github.com/omdsh-dev/DSH-better-sidebar) |
| Awesome DeepSeek Harness | Curated list of DeepSeek Harness plugins, tools, and infrastructure. | [GitHub](https://github.com/0xsline/awesome-deepseek-harness) · [Website](https://deepseekdocs.com/) |
| Shenqiu Community (DeepSeek.club) | The world's largest third-party DeepSeek open-source ecosystem community, bringing together model libraries, app rankings, the Harness plugin library, and Harness Academy to serve developers, researchers, and enterprise users in one place. | [Website](https://deepseek.club) |
| MkSaaS · TanStarter | Commercial SaaS starter templates for indie developers. MkSaaS is built on Next.js; TanStarter on TanStack Start and Cloudflare, with AI, auth, payments, and admin baked in. | [MkSaaS](https://mksaas.com) · [TanStarter](https://tanstarter.dev) |

<sub>To list your project, join the WeChat group and message @王博升Benson, or contact t4wefan@qq.com, or <a href="https://github.com/techflag/workdsh/issues">open an issue</a>.</sub>

## License

This project is licensed under the [MIT License](LICENSE).

> “DeepSeek Harness” is a registered trademark of DeepSeek AI. The name is used here solely to accurately describe compatibility, technical origin, and this project's relationship to upstream software.

> WorkDSH is an independent community project and is not affiliated with, sponsored by, authorized by, or endorsed by DeepSeek.

## Star History

<a href="https://www.star-history.com/?repos=techflag%2Fworkdsh&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=techflag/workdsh&type=date&theme=dark&legend=top-left&sealed_token=BRTkOyC4czCEkIyFb5-QxrsC-kaDotBJ8tsjxrWs-UGfmBqfRCXSwieZPlVTCYOjJVEZ29uLvmBjAPREB524J5dPN1jk-UA7ajFdLdrbjumJqoOBeGWmig" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=techflag/workdsh&type=date&legend=top-left&sealed_token=BRTkOyC4czCEkIyFb5-QxrsC-kaDotBJ8tsjxrWs-UGfmBqfRCXSwieZPlVTCYOjJVEZ29uLvmBjAPREB524J5dPN1jk-UA7ajFdLdrbjumJqoOBeGWmig" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=techflag/workdsh&type=date&legend=top-left&sealed_token=BRTkOyC4czCEkIyFb5-QxrsC-kaDotBJ8tsjxrWs-UGfmBqfRCXSwieZPlVTCYOjJVEZ29uLvmBjAPREB524J5dPN1jk-UA7ajFdLdrbjumJqoOBeGWmig" />
 </picture>
</a>
