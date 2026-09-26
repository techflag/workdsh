# Third-party notices

Native document editing uses the MIT-licensed Tiptap core, StarterKit and ProseMirror packages, pinned through the workspace lockfile. No paid Tiptap collaboration, AI, import/export or pagination extension is included.

The existing browser file adapters continue to bundle Univer OSS (Apache-2.0), ExcelJS, docx-preview and their required dependencies. They are distinct from the new native document working-copy API.

The CSV table preview delegates RFC 4180 parsing and delimiter detection to PapaParse 5.7.0 (MIT); byte decoding (UTF-8/GB18030/UTF-16 BOM) and the display limits remain WorkDSH code. Its complete license text is collected into `dist/THIRD-PARTY-LICENSES.txt`, and it is absent from `dist/license-review.json`.

Each build writes `dist/THIRD-PARTY-LICENSES.txt` with the license/copyright/notice texts found in every dependency actually bundled by esbuild, and `dist/bundled-dependencies.json` with its exact version. These files travel inside the prebuilt plugin archive. Framework peer dependencies remain owned by the Harness installation. This inventory is not a claim that DOCX/PPTX conversion is lossless or that optional commercial SDKs have been licensed.

`dist/license-review.json` records packages for which the build did not collect a complete license text. The current alpha.5 candidate has 10 such versioned entries. Their declared license metadata and repository references are retained in the report and listed in the root README; this notice does not relabel them as complete. The release manifest separately records `@univerjs/telemetry@0.25.1`, whose installed package metadata has no license field.

Tiptap UI Components (MIT), commit 799929bea4804c73767562b69f8acc2acdb8ac86; adapted Toolbar/Button and official SVG icons. Source and changes: src/live/tiptap-ui/SOURCE.md; license included in dist/THIRD-PARTY-LICENSES.txt.

## Release candidate packaging

`corepack pnpm release:office:pack` builds the complete current Office plugin. The release manifest records the dependency count, declared licenses, packages without declared metadata, the exact missing-text list and `licenseTextsComplete`. The 10 known missing texts do not stop this alpha candidate by product decision, but they remain visible and must not be described as collected. Historical alpha.1/alpha.2 Word-only archives are unchanged. isarray 1.0.0's MIT text is retained from its packaged README License section, not inferred from metadata. Dual-licensed `(MIT OR GPL-3.0-or-later)` code is distributed under its MIT option; `(MIT AND Zlib)` includes both texts.


Word alpha.2 added the MIT-licensed @tiptap/extension-table and @tiptap/extension-image at exactly 3.31.0. Native TableKit commands, column resize/cell selection and Image/ResizableNodeView are reused without copying their implementations. Collected bundled license texts remain included in generated THIRD-PARTY-LICENSES.txt.

## Current native PPT development integration

The current full development build uses pptx-react-viewer 3.16.5 and pptx-viewer-core 3.14.3 from ChristopherVR/pptx-viewer (Apache-2.0). It adapts the toolbar, Chinese localization and Inspector presentation while retaining the native parsing, editing and export implementation. These replace the previous PPT adapters. i18next/react-i18next are MIT-licensed; Lucide icons are ISC-licensed. Exact bundled versions and license texts are recorded in the generated inventories. This development integration does not change the scope of previously published Word-only archives.

WorkBuddy/CodeBuddy product experiences and locally inspected tencent-pptx/ppt-implement design guidance are references, not dependencies of this editor runtime. Their proprietary resources and brand assets are not declared open source by this notice.

New PDF working copies use pdf-lib 1.17.1 (MIT), @pdf-lib/fontkit 1.1.1 (MIT), PDF.js 5.4.624 (Apache-2.0), and bundled Noto Sans SC (SIL Open Font License 1.1). The font license is included in the generated notices; The static Chinese font is fully embedded in each derived PDF to avoid verified missing glyphs in fontkit subsetting. No system font lookup, Python, third-party conversion or CDN is required at runtime.
