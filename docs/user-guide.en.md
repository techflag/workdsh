# WorkDSH user guide

[中文](user-guide.md)

## Install and launch

Download a release with actual installer assets from [GitHub Releases](https://github.com/techflag/workdsh/releases). Use the x64 Setup or Portable package on Windows. On macOS, choose the Apple Silicon (arm64) or Intel (x64) DMG for your computer. The installer includes Electron, Node, and a pinned DSH Profile; ordinary users do not need to install Node.js or Python.

WorkDSH starts the official DSH service from that Profile locally and opens its page in the application window. Projects, library, experts, skills, and connectors come from the WorkDSH Profile. Closing the Windows window exits the application; macOS follows its normal window lifecycle. The current carrier does not include the former tray, multi-Profile selector, or automatic update panel described in older documentation.

## Data and plugins

Runtime data lives in a DSH home under the local application-data directory. The installer contains the pinned Profile dependencies; the Electron carrier does not install a second DSH npm tree into `app.asar`. Models and external tools may access the network according to user configuration.

WorkDSH features update with the downloaded release. To add third-party plugins through official DSH mechanisms, follow the upstream documentation for the pinned version and inspect the active Profile. Do not use the former `desktopProfiles` or `desktopPnpm` APIs. Manage projects and library content through the product UI.

## Updates and troubleshooting

The current Desktop has no automatic update manager. To upgrade, download a newer installer for your platform from [Releases](https://github.com/techflag/workdsh/releases). Back up important workspaces and application data first.

If no window appears, check that the installer matches your OS architecture, restart, and record the error. Include the OS, WorkDSH version, reproduction steps, and error in a [GitHub Issue](https://github.com/techflag/workdsh/issues). See the [architecture](architecture.en.md) for development and packaging boundaries.
