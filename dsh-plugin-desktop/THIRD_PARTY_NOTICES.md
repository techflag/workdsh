# Third-party notices

WorkDSH Desktop contains Electron and a pinned DeepSeek Harness runtime Profile.
The official DeepSeek Harness version is recorded in the repository's
[`upstream.json`](../upstream.json); the installed app's `workdsh-runtime` directory
contains the actual Profile package manifests and applicable license files.

DeepSeek Harness is distributed under the MIT License. Its version-specific
third-party notices are maintained by the upstream project:
<https://github.com/deepseek-ai/deepseek-harness/blob/master/THIRD_PARTY_NOTICES.md>.
WorkDSH bundles and their dependencies retain their own license terms, which
must be checked from the exact release artifacts used for an installer.

The Desktop Profile bundles two separate third-party plugins:

- [`@cocofhu/skillhub`](https://www.npmjs.com/package/@cocofhu/skillhub)
  version 0.2.16 for SkillHub integration. Source and MIT license:
  <https://github.com/cocofhu/skillhub>.
- [`dshmarket`](https://www.npmjs.com/package/dshmarket) version 1.66.1 for
  DSH community plugin discovery. Source and MIT license:
  <https://github.com/dsh-market/dsh-market>.

The SkillHub catalog and API are maintained separately by
[`Tencent/skillhub`](https://github.com/Tencent/skillhub). The plugin catalog
used by dshmarket is maintained by
[`awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin).

This file intentionally does not freeze a dependency inventory from an older
DSH release. Check the bundled Profile and its license files when publishing.
