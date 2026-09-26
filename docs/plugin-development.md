# WorkDSH 插件开发

[English](plugin-development.en.md)

WorkDSH 基于官方 DeepSeek Harness 的插件体系。普通 DSH 插件应使用上游公开的 Host、Client、工具和服务接口；插件兼容性以当前固定的 DSH 版本为准。上游源码位于只读子模块 `deepseek-harness/`。

WorkDSH 的项目、资料库、专家、技能和连接器由运行时 Profile 中的 WorkDSH 包提供。扩展这些功能时，应在对应 Profile 包中实现和测试，不要向 Electron 外壳添加另一个 Host、Client 或 DSH 依赖。活动记录、Office、审计、访问控制及 provider 是同一 Profile 的支撑服务，不是独立发行的 Desktop 版本。

`dsh-plugin-desktop` 现在只有 Electron 启动和安装包职责。旧 `desktopProfiles`、`desktopPnpm`、窗口模式与托盘 service 已随未发布的旧 Host/Client 实现移除，不能作为新插件的 API。需要桌面专有能力时，先确认当前上游和 WorkDSH Profile 是否有公开接口；不要引用 Electron 私有对象或安装包路径。

升级 DSH 时，先更新唯一的上游固定版本，再验证插件的实际加载、服务注入、客户端呈现及目标平台安装包。默认跟随上游最新正式版；预发布版需要单独决定。具体边界见[架构说明](architecture.md)和[归属约束](desktop-boundaries.md)。社区 Fabric 与 Market 仍是设计文档，不能作为现成运行时依赖。
