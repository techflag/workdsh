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

The SkillHub and DSH plugin catalogue is provided by
[`@cocofhu/skillhub`](https://www.npmjs.com/package/@cocofhu/skillhub),
pinned at 0.2.16 in the Desktop Profile. It is a third-party project licensed
under MIT; its source and license are at <https://github.com/cocofhu/skillhub>.

This file intentionally does not freeze a dependency inventory from an older
DSH release. Check the bundled Profile and its license files when publishing.
