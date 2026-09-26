# 为什么做 WorkDSH Desktop

[English](why-desktop.en.md)

DeepSeek Harness 提供智能体、工具、会话和 Web UI。WorkDSH Desktop 的目标是把固定版本的官方运行时放进容易安装、启动的原生窗口，而不是长期维护一份修改后的 Harness。普通用户下载 macOS 或 Windows 安装包即可运行，不必先准备 Node.js 或 Python。

WorkDSH 自己的项目、资料库、专家、技能和连接器通过 DSH Profile 中的包组合。Electron 外壳负责应用窗口、启动本机服务和安装包；它不实现第二套 Host 或 Web Client。这样的边界让上游 DSH 升级时，重点落在 Profile 兼容性和安装包验证，而不是迁移另一套复制的源码。

当前版本只承诺源码和安装包中确实存在的功能。托盘、自动更新、多 Profile 选择、社区市场、手机远程等旧设计或未来方向，不应误写成已交付能力。开发者可看[架构说明](architecture.md)与[插件开发](plugin-development.md)；用户从[用户指南](user-guide.md)开始。
