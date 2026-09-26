# ADR-0008：功能插件集中到 plugins 目录

状态：已采纳；依据：用户要求整理平铺插件目录。

将 packages 下 16 个 plugin-* 功能目录迁到 packages/plugins/<domain>。plugins 仅归类，不声明 npm 包；子插件保持独立版本、公开契约、存储和生命周期。bundle/contracts/ui 与 provider 包不在本次移动范围。

同步 pnpm workspace 嵌套包发现、模块清单、文档链接和计划检查器。未实现插件仍为 planned，不因迁移新增可执行 manifest。D01 当前步骤与 D00—D15 顺序不变。
