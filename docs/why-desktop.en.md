# Why WorkDSH Desktop

[中文](why-desktop.md)

DeepSeek Harness provides agents, tools, sessions, and a Web UI. WorkDSH Desktop packages a pinned official runtime in a native window that is easy to install and launch, rather than maintaining a long-lived fork of Harness. Ordinary users can run the macOS or Windows installer without preparing Node.js or Python first.

WorkDSH projects, library, experts, skills, and connectors are composed through packages in the DSH Profile. The Electron carrier owns the window, local service startup, and installers; it does not implement a second Host or Web Client. This boundary focuses upstream upgrades on Profile compatibility and installer validation instead of migrating copied source.

The current release should promise only features present in source and installers. Former tray, automatic updates, multi-Profile selection, community marketplace, and mobile remote designs must not be described as delivered. Developers can read the [architecture](architecture.en.md) and [plugin guide](plugin-development.en.md); users can start with the [user guide](user-guide.en.md).
