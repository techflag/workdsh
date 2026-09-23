<p align="center"><img src="assets/brand/workdsh-logo.svg" width="104" alt="WorkDSH"></p>
<h1 align="center">WorkDSH</h1>
<p align="center"><strong>Give AI a job. Watch it work. Open the result.</strong></p>
<p align="center">English · <a href="README.zh-CN.md">简体中文</a></p>

WorkDSH is an open-source AI workspace built on the official DeepSeek Harness. Organize conversations, material and capabilities in projects, reuse your local Library, and review editable deliverables alongside the task.

**Web/plugins v0.1.0-alpha.8 · DeepSeek Harness 0.1.7-alpha.1 · Alpha preview**

[Web/plugin download](https://github.com/techflag/workdsh/releases/tag/v0.1.0-alpha.8) · [Release notes](docs/releases/v0.1.0-alpha.8.md) · [Quick start](#quick-start) · [Website](https://techflag.github.io/workdsh/) · [Gitee mirror](https://gitee.com/techflag/workdsh)

![WorkDSH project home — full application in dark mode](docs/assets/screenshots/workdsh-projects-alpha8-dark.png)

## What you can do

| Area | Capabilities |
| --- | --- |
| Projects | Keep tasks, plans, assets and activity together; select project capabilities from the conversation. |
| Local Library | Import material, browse folders, search and preview files, and reference selected revisions in tasks. |
| Skills and experts | Install reusable skills and publish expert configurations with pinned revisions. |
| Connectors | Configure MCP services and explicitly select the capabilities used by a task. |
| Office deliverables | Preview and edit supported document, presentation, spreadsheet, HTML and PDF working copies. Format fidelity varies. |
| Activity | Inspect native task and child-agent activity; an expert-team label alone does not mean multiple agents are executing. |

The alpha.8 bundle includes **11 installable modules**, including Projects and Library. It refreshes the project home, navigation, theme-aware menus and conversation capability selection, and adapts expert presets to Harness 0.1.7. Native attachment, input and send behavior remain owned by Harness.

## Screenshots

Full application captures from a local workspace; example projects, installed skills and account figures are not bundled sample data.

<details>
<summary>Light theme — project home</summary>

![WorkDSH project home — full application in light mode](docs/assets/screenshots/workdsh-projects-alpha8-light.png)

</details>

<details>
<summary>Skills — local installed catalog</summary>

![WorkDSH skills — full application](docs/assets/screenshots/workdsh-skills-alpha8-dark.png)

</details>

<details>
<summary>Office example — conversation and HTML deliverable</summary>

![Conversation with an HTML analysis dashboard](docs/assets/screenshots/workdsh-html-dashboard-preview.png)

Earlier local preview showing the artifact workflow; it is not an alpha.8 acceptance result for every document format.

</details>

## Quick start

Requirements: Node.js `^22.19.0 || >=24.0.0`, Corepack/pnpm and the official `dsh` CLI **0.1.7-alpha.1**.

1. Download all 11 `.tgz` packages, `release-manifest.json`, `SHA256SUMS` and `install-workdsh.mjs` from the [alpha.8 release](https://github.com/techflag/workdsh/releases/tag/v0.1.0-alpha.8) into one directory.
2. For an upgrade, stop the target Profile and keep a recoverable backup of its configuration and data.
3. Run from the download directory:

```sh
node install-workdsh.mjs --profile workdsh --dry-run
node install-workdsh.mjs --profile workdsh
```

The installer verifies package checksums, pins the tested package manager and transitive Harness versions, and installs the matching official base, Web app and CLI into the Profile. **Start with the Profile-local CLI command printed by the installer.** This avoids mixing a global CLI with a different runtime installation. Use `--dsh /absolute/path/to/dsh` if the matching CLI is not on your PATH.

Modules remain independently versioned and installable through the official `dsh plugin` lifecycle. The release manifest is the authoritative package/version list; GitHub release assets are not an npm publication.

### Upgrading experts

Old directory-style expert presets must be explicitly republished through **Edit authoring files → Publish**, then used in a new task. For a read-only built-in expert, first copy it to your own experts. Historical tasks and project bindings retain their pinned revisions and do not silently switch to the new configuration. Review and update those bindings explicitly where needed.

### Run from source

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm preview:install
corepack pnpm preview
```

## Architecture and development

WorkDSH extends the published Harness packages through plugins, services and UI slots. It does not maintain a modified upstream runtime. Business modules own their data; the bundle composes navigation and presentation.

```sh
corepack pnpm typecheck
corepack pnpm test:integration
corepack pnpm test:projects
corepack pnpm test:library
corepack pnpm check:versions
```

[Architecture](docs/ARCHITECTURE.md) · [Module versions](docs/MODULE-VERSIONS.md) · [Release history](docs/RELEASES.md) · [Status](docs/STATUS.md) · [Roadmap](docs/ROADMAP.md)

This is an alpha preview. Cross-platform installation, long-running real-model teams, arbitrary Office fidelity and multi-user governance are not fully accepted. Harness upgrades require compatibility checks for the native UI adapters. See the release notes for the exact validation scope.

## Open-source components and acknowledgements

Thank you to these projects and their maintainers. This list covers major direct dependencies; package manifests, the lockfile and generated license inventories describe the full dependency set.

| Project | Use in WorkDSH | License |
| --- | --- | --- |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) / Cordis | Native tasks, model execution, skills, Loader, Profile, services and UI extension APIs | MIT |
| [React](https://github.com/facebook/react) | Feature pages and editor UI | MIT |
| [Tiptap](https://github.com/ueberdosis/tiptap) / [ProseMirror](https://github.com/ProseMirror) | Word working-copy editing, tables and images; adapted open-source Tiptap UI components | MIT |
| [pptx-viewer](https://github.com/ChristopherVR/pptx-viewer) | `pptx-react-viewer` 3.16.5 and `pptx-viewer-core` 3.14.3: the sole current PPT editing, parsing and export implementation | Apache-2.0 |
| [docx](https://github.com/dolanmiu/docx) | DOCX generation within the supported scope | MIT |
| [docx-preview](https://github.com/VolodymyrBaydalka/docxjs) | Original-layout DOCX preview | Apache-2.0 |
| [Univer OSS](https://github.com/dream-num/univer) / [ExcelJS](https://github.com/exceljs/exceljs) | Existing experimental spreadsheet adapters in development builds; full online spreadsheets remain planned | Apache-2.0 / MIT |
| [PDF.js](https://github.com/mozilla/pdf.js) | Decode and display generated PDF files with a bundled worker | Apache-2.0 |
| [pdf-lib](https://github.com/Hopding/pdf-lib) / [fontkit](https://github.com/Hopding/fontkit) | Encode PDF working copies and embed Chinese glyphs | MIT |
| [Noto Sans SC](https://github.com/google/fonts/tree/main/ofl/notosanssc) | Bundled static Chinese font; license and derivation metadata retained | SIL Open Font License 1.1 |
| [i18next](https://github.com/i18next/i18next) / [react-i18next](https://github.com/i18next/react-i18next) | Chinese localization for the PPT editor | MIT |
| [Lucide](https://github.com/lucide-icons/lucide) | PPT toolbar icons | ISC |
| [dsh-cost-meter](https://github.com/Han-1413141/dsh-cost-meter) | Separately installed spending plugin in the local preview Profile; not bundled in WorkDSH releases | See the independent project's license |

WorkDSH explicitly takes **WorkBuddy / CodeBuddy** as a product-experience reference: a real task should expose its process and end in an editable artifact. Skill-market organization, grouped toolbars, and PPT design guidance also draw on those experiences. WorkDSH is an independent open-source implementation for DeepSeek Harness; it does not reuse WorkBuddy branding or claim an official partnership, endorsement, or Tencent PPT engine integration.

Third-party skills and materials retain their providers' terms. Generated archives retain copyright and license texts for dependencies actually bundled; see [Office third-party notices](packages/plugins/office/THIRD-PARTY-NOTICES.md).

### Additional bundled Office dependencies / Office 其他打包依赖

The current build inventory additionally includes the following package versions. Licenses below are the declarations in the installed package metadata. Existing bundled notices are retained.

当前构建另包含下列依赖版本；许可证栏记录安装包元数据的声明，来源链接指向对应项目。完整199项打包依赖见[Office依赖清单](docs/evidence/office-bundled-dependencies-2026-09-14.md)。

下表 10 项是“已声明许可证、但构建未收集到随包文本”的精确报告。此外，`@univerjs/telemetry@0.25.1` 的安装包元数据没有许可证字段，发布清单单独记录为 `dependenciesWithoutDeclaredLicense`。两类缺项均未伪装为许可证收集完成。

| Dependency / 依赖 | Version / 版本 | Declared license / 声明许可证 |
| --- | --- | --- |
| [@ai-sdk/provider-utils](https://github.com/vercel/ai) | 5.0.0 | Apache-2.0 |
| [@ai-sdk/provider-utils](https://github.com/vercel/ai) | 5.0.28 | Apache-2.0 |
| [@nodable/entities](https://github.com/nodable/val-parsers) | 3.0.0 | MIT |
| [@pdf-lib/fontkit](https://github.com/Hopding/fontkit) | 1.1.1 | MIT |
| [franc-min](https://github.com/wooorm/franc/tree/main/packages/franc-min) | 6.2.0 | MIT |
| [ot-json1](https://github.com/josephg/json1) | 1.0.2 | ISC |
| [ot-text-unicode](https://github.com/ottypes/text) | 4.0.0 | ISC |
| [pptx-viewer-mcp](https://github.com/ChristopherVR/pptx-viewer) | 2.5.1 | Apache-2.0 |
| [react-remove-scroll-bar](https://github.com/theKashey/react-remove-scroll-bar) | 2.3.8 | MIT |
| [unicount](https://github.com/josephg/unicount) | 1.1.0 | ISC |
