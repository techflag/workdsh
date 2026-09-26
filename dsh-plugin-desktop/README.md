# WorkDSH Desktop carrier

[中文](README.zh.md)

This package builds the Electron application. The installer contains `lib/workdsh-main.js` and one bundled runtime Profile. DeepSeek Harness Host, Web Client, and core capabilities come from the pinned upstream release in that Profile. WorkDSH projects, library, experts, skills, connectors, and their supporting services are composed by `workdsh-bundle`; they are not separate desktop editions.

## Development

Use Node.js `^22.19.0` or `>=24` and Corepack Yarn 4.18.0. At the repository root:

```sh
git submodule update --init --recursive
corepack yarn install --immutable
corepack yarn dev
```

`dev` builds the carrier, prepares the pinned Profile and primary runtime, then launches Electron. It is the only command here that starts a graphical application. For headless verification use `corepack yarn check` and `corepack yarn check:desktop-dsh-alignment`. `corepack yarn workspace dsh-plugin-desktop package:dir` creates an unpacked application and checks that it contains no duplicate DSH dependency tree.

The upstream checkout is read-only from this package. When upgrading DSH, update the submodule pin and runtime preparation version together, then validate the WorkDSH Profile, both platform package checks, and the resulting installers before publishing. Prefer the latest official stable DSH release; pre-releases require an explicit product decision.

The carrier sources and package scripts live in this directory. The Profile package source and its release are owned by the WorkDSH repository; see [Desktop ownership](../docs/desktop-boundaries.md).
