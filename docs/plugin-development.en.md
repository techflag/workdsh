# WorkDSH plugin development

[中文](plugin-development.md)

WorkDSH uses the official DeepSeek Harness plugin system. Ordinary DSH plugins should use upstream public Host, Client, tool, and service contracts. Compatibility is determined against the currently pinned DSH version. The upstream source is the read-only `deepseek-harness/` submodule.

WorkDSH projects, library, experts, skills, and connectors are provided by packages in the runtime Profile. Implement and test extensions in the relevant Profile package rather than adding another Host, Client, or DSH dependency to the Electron carrier. Activity, Office, audit, access, and providers support that same Profile; they are not separately released Desktop editions.

`dsh-plugin-desktop` now owns only Electron startup and packaging. The former `desktopProfiles`, `desktopPnpm`, window-mode, and tray services belonged to an unshipped legacy Host/Client implementation and are no longer plugin APIs. For desktop-specific capabilities, first check whether upstream DSH or the WorkDSH Profile offers a public contract. Do not import private Electron objects or installer paths.

For a DSH upgrade, update the sole upstream pin, then verify actual plugin loading, service injection, Client presentation, and installers on target platforms. Prefer the latest official stable upstream release; a pre-release requires a separate decision. See the [architecture](architecture.en.md) and [ownership boundaries](desktop-boundaries.md). Community Fabric and Market remain design documents, not runtime dependencies.
