# WorkDSH product website

Static, bilingual marketing site for WorkDSH: an independent open-source implementation of the WorkBuddy style of AI workspace, built on DeepSeek Harness.

- `zh-CN.html`: Chinese website.
- `index.html`: English website and the existing GitHub Pages default entry.
- `changelog.zh-CN.html` and `changelog.html`: concise bilingual release history covering every published Git tag.
- `style.css`: shared responsive layout and decorative animation.
- `app.js`: feature tour, screenshot tabs, native image/video dialogs, source navigation and command copying.
- `assets/`: local brand marks, real application screenshots, and the 24-second product film.

No build, model credentials, API service or remote font is required. Open either HTML file together with the rest of this directory, or serve the directory with any static web server. No analytics or network calls are made by the page itself. External links navigate to the relevant repositories and documentation.

## Published website

- Chinese: https://techflag.github.io/workdsh/zh-CN.html
- English: https://techflag.github.io/workdsh/
- Chinese changelog: https://techflag.github.io/workdsh/changelog.zh-CN.html
- English changelog: https://techflag.github.io/workdsh/changelog.html

Push changes under `website/` to `main` to run `.github/workflows/pages.yml`. The workflow publishes this directory to GitHub Pages; it does not build or deploy the WorkDSH application. The folder is also self-contained for deployment to another static host.

## Content and visual direction

The page follows one reading sequence, also reflected in the navigation:

1. **Positioning:** an independent, open-source take on WorkBuddy.
2. **Evidence:** real application screenshots show the work and its results.
3. **Orientation:** the eight sidebar entries explain the workspace and current feature scope.
4. **Reasons to choose it:** WorkBuddy package reuse and native DSH plugin development are two parts of one section.
5. **Getting started:** release/source installation, a short FAQ and the footer.

The separate generic feature cards, four-step workflow, foundation metrics strip and repeated closing pitch were removed. Skills, file results and plugin development are explained where they help the reader make the next decision. The sidebar retains all eight entries, with fewer repeated labels and descriptions.

WorkBuddy compatibility covers package reuse: skills can be imported as ZIPs containing `SKILL.md` and resources; the expert importer accepts WorkBuddy's `.codebuddy-plugin/plugin.json` metadata, professional definitions and bundled assets. This wording was checked against `skills/src/services/import-staging.ts`, `experts/src/services/portability.ts` and `experts/src/authoring/documents.ts`. The compatibility FAQ distinguishes content reuse from proprietary tool or SDK compatibility and account/permission migration. The developer section links to existing feature plugins and instructions for building independent DSH plugins.

The open-source navigation contains exactly two destinations:

- https://github.com/techflag/workdsh
- https://gitee.com/techflag/workdsh

The sidebar tour is an editorial feature guide, not an embedded running application. Assistants, Projects, Scheduled Tasks and Library are explicitly marked as in development, matching the current `BusinessPanel` implementation. Experts/Skills/Connectors distinguish implemented and planned portions. No full feature parity or affiliation with Tencent/WorkBuddy is claimed.

Visual design uses a dark background, electric blue brand accents, a CSS orbital illustration, local system font stacks, responsive layouts and reduced-motion support. Product images can be enlarged. The film starts only after an explicit click and pauses when its dialog closes.

## Assets

Existing PPT/Skills images remain reused. Dashboard and team images are unchanged copies of the publicly documented captures in `docs/assets/screenshots/`. Brand artwork comes from `assets/brand/`. The film and poster reuse the project's existing marketing-video output; the film is made from real product screenshots, not a continuous screen recording. Images contain example user task and cost information already published with the original screenshots.

All assets are local. The approximately 19 MB film uses `preload="none"`; it is not downloaded during ordinary page viewing. Use a static server with HTTP Range support for video seeking. GitHub Pages deployment continues to upload only `website/` through `.github/workflows/pages.yml`.

## Local preview

```sh
python3 -m http.server 19101 --bind 127.0.0.1 --directory website
```

Open `http://127.0.0.1:19101/zh-CN.html`. The standard Python server is sufficient for page review; use a server with byte-range support when checking video seeking.

## Verification

Earlier Chrome/Playwright verification covered desktop widths 1440 and 1920, mobile widths 390 and 320, both languages, eight feature-tour panels and their states, keyboard tab navigation, both repository links, image zoom/focus restoration, video playback/close, command copying, FAQ, reduced motion and opening the local HTML directly. The copyable commands match the root README.

Review captures, executable verification scripts and the result JSON are local under `.artifacts/website-review/`; they are not deployed. Safari/Firefox and a fresh public Pages deployment have not been tested as part of this change.

The content reordering received focused in-app browser checks: five-section order in both languages, navigation order, all eight feature panels and four screenshot tabs, both compatibility FAQ links, Chinese widths 1440/390/320 and English widths 960/320 with no horizontal overflow. Chinese desktop and mobile screenshots were visually reviewed, and the English navigation fits at 960 pixels. The full earlier regression suite was not rerun for this edit. These are website checks, not new end-to-end WorkBuddy package runtime tests.
