<p align="center"><img src="apps/web/assets/brand/workdsh-logo.svg" width="88" alt="WorkDSH logo"></p>
<h1 align="center">WorkDSH</h1>
<p align="center"><strong>A WorkBuddy-style workspace where skills, experts, and plugins shape new workflows.</strong></p>
<p align="center">Inspired by WorkBuddy’s workflow and built on DeepSeek Harness plugins: start with personal use, then install Enterprise Connection for company models, collaboration, and colleague mentions.</p>
<p align="center"><a href="#download-desktop">Download Desktop</a> · <a href="#from-material-to-deliverable">Explore the workflow</a> · <a href="#personal-and-enterprise-use">Personal and enterprise</a> · <a href="docs/user-guide.en.md">User guide</a> · <a href="README.zh-CN.md">简体中文</a></p>

[![Desktop release](https://img.shields.io/badge/Desktop-2.0.6--alpha.5-176BFF)](https://github.com/techflag/workdsh/releases/tag/desktop-v2.0.6-alpha.5) [![GitHub stars](https://img.shields.io/github/stars/techflag/workdsh?label=stars)](https://github.com/techflag/workdsh) [![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[![GitHub Actions](https://github.com/techflag/workdsh/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/techflag/workdsh/actions/workflows/ci.yml) [![Gitee stars](https://gitee.com/techflag/workdsh/badge/star.svg?theme=dark)](https://gitee.com/techflag/workdsh/stargazers) [![Gitee forks](https://gitee.com/techflag/workdsh/badge/fork.svg?theme=dark)](https://gitee.com/techflag/workdsh/members)

## Feature requests and bug reports

**Help shape WorkDSH: tell us what you need, what feels awkward, or what is broken. No coding experience is required.**

| Feedback | Where to submit | What helps |
| --- | --- | --- |
| 🐛 Broken features, installation or UI problems | [Report a bug](https://github.com/techflag/workdsh/issues/new?template=bug_report.yml) | App version, personal/enterprise mode, reproduction steps and error screenshots. |
| 💡 New features or usability improvements | [Request a feature](https://github.com/techflag/workdsh/issues/new?template=feature_request.yml) | Your use case, current difficulty and desired outcome. |
| 🔎 Existing reports and progress | [Browse Issues](https://github.com/techflag/workdsh/issues) | Search first; add details or a reaction to an existing report. |

A GitHub account is required to submit. Unsure which category fits? [Start here](https://github.com/techflag/workdsh/issues/new/choose). For backend account, permission or model-forwarding issues, report to [WorkDSH Admin](https://github.com/techflag/workdsh-admin/issues). **Issues are public: do not upload passwords, tokens, API keys or confidential company material.**

**A personal workspace with installable enterprise capabilities is a defining WorkDSH feature.** Projects, the library, experts, skills, and connectors share the same implementation. Install Enterprise Connection and sign in to share text and files with `@` colleagues and use Collaboration; add company models through model settings. Independent business plugins can also reuse member authentication through `workdshEnterprise` to call company business APIs.

The enterprise plugin is **not listed in a plugin marketplace**. [Download Enterprise Connection](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.6-alpha.5/workdsh-enterprise-connection-0.1.0-alpha.2.tgz), enter the downloaded file’s full path in “Plugins → Add plugin”, install and activate it, then connect through “Settings → Enterprise account”. [Installation and login](#enterprise-connection-download-install-and-sign-in) · [Business plugin authentication](#enterprise-authentication-that-independent-plugins-can-reuse) · [Separate admin backend](https://github.com/techflag/workdsh-admin)

![WorkDSH projects home with project templates and the complete desktop sidebar](apps/web/assets/screenshots/workdsh-projects-alpha8-dark.png)

<sub>Captured from a local WorkDSH session. Project names and account figures are demonstration data, not bundled with the installer.</sub>

## A WorkBuddy-style experience, an open DSH ecosystem

WorkDSH draws on WorkBuddy's way of organizing projects, material, experts, skills, and connectors, and implements those pages and management features on DeepSeek Harness. DSH is a complete agent application in its own right; it composes models, tools, skill support, and UI through plugins. WorkDSH adds its workspace features through the same mechanism.

| What you need to do | Where WorkDSH helps |
| --- | --- |
| Keep working toward a long-term goal | **Projects** bring instructions, plans, tasks, material, and capability settings together. |
| Give AI the files you already have | The **library** manages local files, search, and previews; tasks can reference material and its revision. |
| Reuse a team's working methods | **Experts** save role and capability settings; **skills** carry callable instructions and resources. |
| Keep the result beyond the chat | The **deliverable workspace** previews or edits supported working copies of documents, spreadsheets, presentations, HTML, and PDF. |

### What WorkDSH adds

- **Desktop execution, central administration**: the Agent and tools run on the employee’s computer; the server handles accounts, authorization, collaboration data and model forwarding.
- **The full official UI with shared feature plugins**: personal and enterprise modes reuse the same library, experts, skills, and connectors.
- **Bundled runtime**: Desktop includes Node.js, pnpm, Python, and built-in plugins without downloading them on first login. Community skills and plugins are installed on demand.
- **Reusable enterprise authentication for business plugins**: independent plugins inject `workdshEnterprise` to call the company backend using the current member login, without reading or storing tokens.
- **Mention colleagues and share AI results**: select organization colleagues with `@`, share analysis text and files, and review received or sent shares in Collaboration. Requires the Enterprise Connection plugin and company login.
- **Personal and company models together**: connect the company model API and select company models in the conversation model picker while retaining personal providers. Supplier keys remain in the admin backend.

### Enterprise authentication that independent plugins can reuse

Enterprise Desktop exposes **`workdshEnterprise`** to Host plugins. It reuses the current member login without returning backend tokens, local bridge credentials or passwords. Desktop Main authenticates requests; the backend enforces member and business permissions.

Run this example in your plugin's **Host entry**, not in its browser page. The Enterprise Connection plugin provides the service after installation, activation and company login; personal mode does not provide it.

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

This calls `POST /api/extensions/reports/list` on the company backend. Implement the business endpoint and its authorization without another login flow. Requires Desktop `2.0.6-alpha.3` and Enterprise Connection `0.1.0-alpha.2`. `workdsh-contracts` is not a published public npm SDK; see the [integration guide](docs/ENTERPRISE-PLUGIN-AUTH.md) for packaging the type dependency and request restrictions.

### From material to deliverable

```text
File in library ──reference──> Project task ──choose──> Expert / Skill / Connector
                                            │
                                            └──> Inspect the process and result; keep editing in supported editors
```

This path is WorkDSH's product direction. End-to-end validation of project document references, expert execution, and different Office formats is ongoing during Alpha. Preview, editing, and export fidelity differ by format; the [current capabilities and limits](apps/web/README.md) describe them in more detail.

<details>
<summary>See an HTML deliverable from a real local conversation</summary>

![WorkDSH conversation, deliverable cards, and right-side HTML preview](apps/web/assets/screenshots/workdsh-html-dashboard-preview.png)

<sub>A local task example showing deliverable cards and right-side preview; it does not imply lossless editing for every file.</sub>

</details>

## Skills and plugins

It helps to distinguish **the content people use** from **the software extension that manages it**. A skill usually consists of instructions and resources containing `SKILL.md`; it can be installed directly into the local DSH Skills directory and is not necessarily a plugin. WorkDSH's skill manager is a DSH plugin. An expert configuration is not itself a plugin either; a WorkDSH plugin manages experts. Other DSH plugins can add tools or UI features directly. The plugin system can therefore support skills, experts, and software functions without making every skill or expert a separate plugin.

DSH plugins can be individual tools or combine UI, services, and other resources into a larger application scenario. For example, a data-management plugin could add data views and processing tools, then work with skills and experts across a workflow. This illustrates what the plugin model can support; it does not mean this release bundles such a data-management system. Users can discover and install skills through SkillHub and find DSH community plugins through dsh-market. Before installing a plugin, check what it provides and whether it supports the current DSH version.

WorkDSH connects two independently maintained catalogs: [SkillHub](https://skillhub.cn/) for Skills and [dsh-market](https://dshmarket.com/zh/) for DSH plugins. SkillHub entries show their source and version, and open the source page for license information before installation. The DSH catalog is provided by the third-party dsh-market plugin inside the existing plugin page. Catalog entries are **not all preinstalled, reviewed, or endorsed by WorkDSH**; check each item's license, dependencies, and DSH compatibility. [Skill management](packages/plugins/skills/README.md) · [Plugin development](docs/plugin-development.en.md) · [Ecosystem manifesto](docs/plugin-ecosystem.en.md)

![SkillHub catalog inside WorkDSH, showing skill icons, versions, sources, and install actions](apps/web/assets/screenshots/workdsh-skillhub-2026-09.png)

<sub>Live SkillHub results; catalog size and entries change over time. The local session shown is a demonstration environment.</sub>

![DSH community plugin catalog opened from WorkDSH's existing plugin page](apps/web/assets/screenshots/workdsh-dshmarket-2026-09.png)

<sub>The third-party dsh-market plugin supplies discovery and installation. The screenshot does not imply that catalog plugins are bundled with WorkDSH.</sub>

## Personal and enterprise use

WorkDSH supports personal use and Enterprise Desktop. Personal and enterprise modes use the complete official DSH interface and the same WorkDSH feature packages. [WorkDSH Admin](https://github.com/techflag/workdsh-admin) manages company accounts, organizations, permissions and internal model APIs.

| Mode | Where the Agent and tools run | How to enter |
| --- | --- | --- |
| Personal Desktop | On your computer, using personal files and model settings. | Open the app and choose personal use. |
| Enterprise Desktop | On the employee's computer, using local files and tools. | Install the desktop app and enterprise account plugin, then choose enterprise login. |

Desktop keeps personal and enterprise data and credentials in separate spaces. Install the enterprise account plugin when needed, then sign in with the company address and account; the backend still authorizes membership. Projects are included in Desktop. Enterprise collaboration is installed on demand and activates after company login; personal mode does not activate it. Enterprise Agent execution is not deployed on ECS. Notifications and business applications remain independently installed plugins.

### Enterprise management backend (separate repository)

The enterprise backend is developed and deployed independently in **[techflag/workdsh-admin](https://github.com/techflag/workdsh-admin)**. This repository provides the WorkDSH client and plugins. The backend provides company accounts, organization permissions, collaboration data, member-authorized conversation auditing and internal model API forwarding.

Administrators should follow the [workdsh-admin deployment and usage guide](https://github.com/techflag/workdsh-admin#readme), then provide members with the backend address and company accounts. Members install this repository's desktop app and Enterprise Connection plugin and connect to that address; the Agent and tools continue to run on their computer.

### Enterprise Connection: download, install and sign in

**Enterprise features are enabled by an explicitly installed Enterprise Connection plugin, not bundled in the base Desktop.** One package provides company accounts, colleague collaboration and authenticated requests for independent business plugins.

1. Download `workdsh-enterprise-connection-0.1.0-alpha.2.tgz` from this release and retain the file.
2. In personal mode, open Plugins → Add plugin, enter the full tgz path, install and click Enable now.
3. Open Settings → Enterprise account → Connect enterprise and sign in using the company backend address and member account.
4. Open Collaboration to review shares and configure the company API manually in model settings. Developers can inject `workdshEnterprise`; see the [integration guide](docs/ENTERPRISE-PLUGIN-AUTH.md).

**Enterprise Connection is not listed in a plugin marketplace. Install the downloaded local `.tgz` file by its full path; searching the package name will not install it.**

Example paths in the Add plugin input:

```text
macOS: /Users/your-name/Downloads/workdsh-enterprise-connection-0.1.0-alpha.2.tgz
Windows: C:\Users\your-name\Downloads\workdsh-enterprise-connection-0.1.0-alpha.2.tgz
```

Use your actual username and location. On macOS, select the file in Finder and press `Option + Command + C`; on Windows, right-click and choose Copy as path, removing surrounding quotes before pasting. Paste the full path into Plugins → Add plugin, install, then click Enable now. Do not enter only the package name or upload the archive to the admin backend.

[Download this release's Enterprise Connection tgz](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.6-alpha.5/workdsh-enterprise-connection-0.1.0-alpha.2.tgz). Retain the original `.tgz` if your browser extracts downloads; an extracted folder path is not the archive path.

The Enterprise Connection package is delivered independently through our [GitHub Releases](https://github.com/techflag/workdsh/releases), without a third-party marketplace. Download `workdsh-enterprise-connection-<version>.tgz` and enter its full path in Add plugin. Starting with Desktop 2.0.6-alpha.5, local plugin archives are copied into the application’s account-specific cache; moving or deleting the original download after successful installation does not block later plugin installations. Release assets include the compatible DSH version manifest and `SHA256SUMS`.

In personal mode, open **Plugins → Add plugin**, enter the administrator-provided Enterprise Connection package path or installation address, verify the source and install, then click **Enable now** when installation finishes. One package provides account and collaboration plugins. Then open **Settings → Enterprise account → Connect enterprise**, enter the backend address and sign in. Installation uses the official progress and error feedback; no terminal command is required. Enterprise plugins are not yet published to a searchable catalog.

### Enterprise login and account

Desktop uses one base installer. Enter personal mode and install the Enterprise Connection package through plugin management, which includes account and collaboration. Then switch modes from the workspace menu, enter the administrator-provided backend address and sign in with your company account. Administrators can also preset the address when packaging. The management console remains accessible through a browser.

![Desktop personal and enterprise entry](assets/screenshots/desktop-login.png)

<sub>The enterprise screenshots in this section use demonstration accounts, organizations and local addresses. This sample data is not shipped with the app.</sub>

After signing in, use **Settings → Enterprise account** to view your name, organization and role, or sign out.

<details>
<summary>See the enterprise account and sign-out entry</summary>

![Enterprise Desktop account](assets/screenshots/enterprise-account.png)

</details>

Enterprise Desktop synchronizes visible user and assistant conversation text to the backend under the member's account. Thinking, tool traces and attachments are not uploaded as conversation text. Authorized administrators can read their organization's synchronized text through audited, read-only access.

### Example: share an AI analysis with a colleague

This is a completed Desktop acceptance scenario, not a customer deployment claim:

1. Sign in with a company account and add the administrator-provided internal API address, access key and allowed models in the official model settings.
2. Start a conversation, select a company model, and ask AI to analyze work materials or create a deliverable. The Agent and file tools execute on the member’s computer.
3. Mention an organization colleague with `@` and share the analysis text and files.
4. The recipient signs in with their own company account and opens **Collaboration → Received**; the sender can review **Sent** records.

The acceptance screenshots below show company model selection, colleague mentions and collaboration records using demonstration accounts and content. Plugin installation, member login and backend authorization are required; installing a plugin does not grant organization membership.

### Mention colleagues and collaborate

Install and enable the Enterprise Connection plugin, then sign in with your company account. Type `@` in the conversation composer to select organization colleagues and share analysis results and files through your task. **Collaboration** in the sidebar lists received and sent shares so you can review content and files and continue the discussion. One Enterprise Connection package provides identity and collaboration; enterprise collaboration is inactive in personal mode.

![Enterprise collaboration: received and sent shares](assets/screenshots/enterprise-collaboration.png)

### Configure company models

An administrator configures upstream model APIs, supplier keys, protocols and allowed model catalogs in WorkDSH Admin. Members receive an internal API address and access key, then use **Settings → Models → Custom model API**:

| Field | What to enter |
| --- | --- |
| Provider ID and display name | For example, `company-api` and `Company models`. |
| API address | The administrator's internal base URL, for example `https://enterprise.example/api/model-gateway/v1`. |
| API protocol | The protocol supported by that internal endpoint. |
| API key | The internal access key supplied by the administrator. |
| Model catalog | Fetch available models, or add the allowed model IDs provided by the administrator. |

Save the provider, then choose a model under Company models in the conversation model picker. The same composer supports mentioning colleagues with `@`.

![Mention colleagues and select a company model](assets/screenshots/enterprise-mention-model.png)

 Personal model providers can coexist with the company provider. Real supplier keys stay on the server; company providers are configured through the official settings rather than automatically injected into DSH. Model requests go to the configured API independently of where the Agent runs.

<details>
<summary>See company model configuration in the official settings</summary>

![Enterprise Desktop company model settings](assets/screenshots/company-model.png)

</details>

<details>
<summary>See the management console</summary>

WorkDSH Admin — organization overview:

![WorkDSH Admin organization overview](assets/screenshots/admin-overview.jpg)

</details>

## Download Desktop

Desktop **2.0.6-alpha.5** is published. The [GitHub Release](https://github.com/techflag/workdsh/releases/tag/desktop-v2.0.6-alpha.5) provides these complete installers:

| Platform | Download |
| --- | --- |
| Windows x64 | [WorkDSH Setup.exe](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.6-alpha.5/dsh-plugin-desktop-windows-x64--WorkDSH-2.0.6-alpha.5-x64-Setup.exe) |
| macOS Apple Silicon | [WorkDSH arm64.dmg](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.6-alpha.5/dsh-plugin-desktop-macos-arm64--WorkDSH-2.0.6-alpha.5-arm64.dmg) |
| macOS Intel | [WorkDSH x64.dmg](https://github.com/techflag/workdsh/releases/download/desktop-v2.0.6-alpha.5/dsh-plugin-desktop-macos-x64--WorkDSH-2.0.6-alpha.5-x64.dmg) |

**Downloads in China**: the [Gitee 2.0.6-alpha.3 release](https://gitee.com/techflag/workdsh/releases/tag/desktop-v2.0.6-alpha.3) provides split archives for Windows x64 and macOS Apple Silicon. The current repository allows 100 MB per attachment and 1 GB total; download every part for your platform and its merge script, then follow the release instructions. The script verifies SHA256 before producing the installer. For Intel Mac or a complete single-file installer, use the GitHub links above. Enterprise plugin TGZ/ZIP files are also available directly on the Gitee release page.

**Development and feedback**: GitHub is the sole development source; Gitee mirrors source and release assets. Report problems through [Gitee Issues](https://gitee.com/techflag/workdsh/issues) or [GitHub Issues](https://github.com/techflag/workdsh/issues). See the [China distribution roadmap](https://gitee.com/techflag/workdsh/issues/IKJN8I), [cross-platform testing request](https://gitee.com/techflag/workdsh/issues/IKJN8J), and [business-plugin authentication example task](https://gitee.com/techflag/workdsh/issues/IKJN8K). Accepted Gitee code contributions enter GitHub through review before synchronization; there is no second product codebase.

Desktop installers include Node.js, pnpm and Python runtimes by default, so users do not need to install them separately. This is an **Alpha release**: end-to-end project document references, expert execution, and different Office formats are still being validated. The macOS DMGs are unsigned; download updates from [Releases](https://github.com/techflag/workdsh/releases). Start with the [user guide](docs/user-guide.en.md) and [FAQ](docs/faq.en.md).

The base Desktop package does not preinstall enterprise plugins. Install them separately to enable enterprise login. For existing downloads, available features are described in their corresponding release notes.

The **Tools → Terminal command dsh (optional)** menu lets you inspect, install, repair or remove the terminal command. Desktop chat does not require it; its dialog appears only when you select the menu. Installation creates a command entry using the packaged Node, pnpm and official CLI. Removing it does not delete the app or workspace. Commands display the active Desktop space; use `--workdsh-space=personal` or `--workdsh-space=enterprise` to select it explicitly. Initialize the space in Desktop first and keep Desktop signed in for enterprise operations. Plugin changes apply to that space’s Profile.

### Build plugins with enterprise authentication

Host plugins inject `workdshEnterprise` and call `request({ plugin: "reports", operation: "list", method: "POST", body: { page: 1 } })`. Desktop attaches the current member authentication without exposing tokens. The backend must authorize every business operation. See the [integration guide](docs/ENTERPRISE-PLUGIN-AUTH.md) for code, type-package setup and the required new Desktop/plugin versions.

## Development and documentation

Source ownership: [WorkDSH feature packages and Web](apps/web/README.md) · [Desktop carrier](apps/desktop/README.md) · [Architecture](docs/architecture.en.md) · [All documentation](docs/README.en.md). Running from source requires Node.js 22.19+ or 24+, Corepack, and Yarn 4.18.0:

```sh
corepack yarn install --immutable
corepack yarn dev
```

Run checks with `corepack yarn check`. On macOS or Windows, `corepack yarn release:pack` builds the Web Profile and Desktop package from the current commit. Once the Web package is published, use `corepack yarn release:pack:published` for the final installer. Both commands share the same [packaging script](scripts/package-desktop-release.mjs). [Contributing](CONTRIBUTING.en.md)

The official DSH core uses published npm packages. Desktop Node, pnpm, Python, Office resources and command helpers are extracted from official installers. `upstream.json` locks their version, URLs, sizes and SHA-512 digests; no official source checkout is required. Initial packaging downloads the platform release. Windows build machines require 7-Zip to extract the installer.

The source layout separates application entry points from shared packages:

```text
apps/desktop/   Electron application and installer
apps/web/       Web launch, deployment and verification
packages/       Shared plugins, providers, UI and contracts
profiles/       Personal and enterprise plugin composition
scripts/        Product build and release checks
```

### Enterprise Desktop packaging configuration

After deploying [WorkDSH Admin](https://github.com/techflag/workdsh-admin), the company administrator provides the public backend address when packaging Desktop. The configuration file contains only the address, for example:

```json
{
  "enterprise": {
    "backendUrl": "https://enterprise.example"
  }
}
```

Set `WORKDSH_DEPLOYMENT_CONFIG` to this file. Packaging writes it to `workdsh-config.json` in application resources, and the employee entry uses the fixed address. Model API addresses and internal access keys are configured in the official model settings, outside the packaging configuration. See the [Desktop packaging instructions](apps/desktop/README.md).

## Community and acknowledgements

Thanks to the maintainers and contributors of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), the foundation of our runtime and plugin system; [Tencent SkillHub](https://github.com/Tencent/skillhub), whose public catalog API powers skill discovery; [@cocofhu/skillhub](https://github.com/cocofhu/skillhub), the bundled DSH SkillHub plugin; and [dsh-market](https://github.com/dsh-market/dsh-market) with the [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) catalog, which power community plugin discovery. WorkBuddy inspired the workspace design. The bundled skill-creator adaptation retains its [Apache-2.0 notice](packages/plugins/skills/resources/skills/workdsh-skill-creator/NOTICE.md). Feedback and contributions: [GitHub Issues](https://github.com/techflag/workdsh/issues) · [Contributing](CONTRIBUTING.en.md)

WorkDSH uses the [MIT License](LICENSE). It is an independent community project and is not affiliated with, partnered with, authorized by, or endorsed by DeepSeek or WorkBuddy. Those names appear only to describe technical origins, compatibility, and design references. Upstream contributors shown on GitHub are inherited from synchronized commit history; this does not imply that they maintain this repository.

## Star history

[![WorkDSH star history](https://api.star-history.com/chart?repos=techflag/workdsh&type=date)](https://www.star-history.com/?repos=techflag%2Fworkdsh&type=date)
