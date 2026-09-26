# DSH Desktop repository rules

This repository owns WorkDSH Web and Desktop. The Desktop product runs an unmodified pinned DeepSeek Harness checkout; the Web workspace consumes the same DSH version through published packages.

## Prerequisites and setup

- Use Node.js `^22.19.0` or `>=24.0.0` and the root Yarn `4.18.0` release through Corepack.
- Initialize the pinned upstream checkout with `git submodule update --init --recursive`.
- Install root dependencies with `corepack yarn install --immutable`.

## Build, run, and verify

- Start the desktop development workflow with `corepack yarn dev`.
- Build the desktop package with `corepack yarn build`.
- Run unit tests with `corepack yarn test`.
- Run type checking with `corepack yarn typecheck`.
- Run the complete headless gate with `corepack yarn check`.
- `dsh-plugin-desktop/` is the only Desktop source and release workspace. Do not reintroduce a copied Beta package; optional release channels must build from this same source and pinned DSH version.
- The pinned `deepseek-harness/` version is the single DSH version for the packaged WorkDSH Profile. Desktop source is an Electron carrier without direct DSH dependencies. A DSH upgrade is incomplete until `corepack yarn check:desktop-dsh-alignment`, the Desktop checks, and a packaged-runtime check pass. Default to the newest official stable DSH release after compatibility validation; use a pre-release only by explicit product decision. Do not tag a Desktop release while the version gate fails. The carrier must contain no second DSH installation.
- `workdsh-web/` owns the Web application and WorkDSH feature packages. Its package manifests must declare the same exact DSH version as `upstream.json`; run `corepack yarn check:web-dsh-alignment` when either side changes. The Web workspace remains self-contained and does not import or modify the Desktop submodule.
- Run upstream operations through the root scripts, such as `corepack yarn upstream:build`.

- `deepseek-harness/` is a pinned upstream Git submodule. Never edit files inside it from a desktop feature branch.
- `dsh-plugin-desktop/` owns the Electron carrier, packaging, and release tests. DSH Host and Client code comes from the pinned upstream runtime Profile; WorkDSH features belong to the WorkDSH Profile packages.
- `dsh-community-fabric/` owns the community interoperability RFC. Until schemas and a reviewed reference adapter exist, it remains a private documentation scaffold and must not declare loadable DSH or package entry points.
- `dsh-community-market/` owns the community-market shell. Until its runtime is implemented, it remains a private documentation scaffold and must not declare loadable DSH or package entry points.
- The Desktop workspace uses the root Yarn release with `nodeLinker: node-modules`. The nested `workdsh-web/` workspace retains its own pinned pnpm lockfile and package manager; run its commands from that directory. Do not install it into the root Yarn workspace.
- The upstream submodule keeps its own pnpm workspace. Run upstream commands through the root `upstream:*` scripts, whose Yarn portable-shell commands enter the submodule before invoking Corepack.
- Keep presentation and WorkDSH feature changes in the Profile rather than adding a second Desktop Host or Client implementation.
- Keep graphical application launch explicit. Builds, typechecks, unit tests, and Loader smokes must remain headless-safe.
- Commit before major changes of direction and keep the submodule pin update separate from desktop behavior changes.
- Keep the repository topology and package-manager split consistent with the [owning Agent Note](.agents/notes/implemented/process/2026-08-15-pinned-upstream-and-isolated-yarn-workspace.md).
