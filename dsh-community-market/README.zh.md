# DSH Community Market 设计草案

[English](README.md)

此目录目前只保存插件市场的产品和技术设计，**没有可加载的 Host、Client 或安装器代码**，也不会进入 WorkDSH Desktop 安装包。此前试验性的运行代码依赖旧版 DSH，已从当前产品工程中移除。实际开发市场功能时，需要重新以当时固定的官方 DSH 版本为兼容基线，并先审查接口与安全边界。

草案拟支持插件发现、来源选择、安装确认与卸载。目录结果不代表安全审核或推荐；安装第三方 npm 包意味着在用户权限下运行代码。市场设计不能依赖已经移除的 `desktopPnpm` 或 `desktopProfiles` 服务，应使用届时公开的 DSH/WorkDSH Profile 接口。

- [目录提供方合同](docs/catalog-provider-contract.zh.md)
- [目录适配器指南](docs/catalog-adapter-guide.zh.md)
- [安装与卸载设计](docs/install-and-uninstall.zh.md)
- [界面设计](docs/market-shell.zh.md)
- [安全策略](SECURITY.zh.md)
- [Desktop 归属约束](../docs/desktop-boundaries.md)

文档和示例使用 [MIT License](LICENSE)。目录提供方是独立项目，各自负责其数据和服务策略。
