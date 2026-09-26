# WorkDSH 常见问题

[English](faq.en.md)

## 这是 DeepSeek 官方产品吗？

不是。WorkDSH 是基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的独立社区项目，未获得官方背书。

## 支持哪些平台？

以 [GitHub Releases](https://github.com/techflag/workdsh/releases) 中实际附带的文件为准。当前打包目标是 Windows x64，以及分别提供的 macOS arm64、x64 版本；没有 Universal 或 Linux 安装包。

## 需要自己安装 Node.js、Python 或 DSH 吗？

普通用户不需要。安装包附带固定版本的运行时与 DSH Profile。开发者从源码构建时需要仓库要求的 Node.js 和包管理器。

## 是否修改了官方 Harness？

没有。仓库固定一个未修改的上游子模块。Electron 外壳启动该版本的 DSH Profile，WorkDSH 功能由 Profile 包组合。

## 数据与插件在哪里？

DSH home 位于本机应用数据目录。项目、资料库、专家、技能和连接器属于 WorkDSH Profile；市场与 Fabric 目前仅是设计文档。外部模型是否接收数据取决于用户的配置。

## 如何更新？

当前版本不提供自动更新管理器。到 [Releases](https://github.com/techflag/workdsh/releases) 手动下载新安装包；升级前备份重要数据。问题可在 [GitHub Issues](https://github.com/techflag/workdsh/issues) 报告。
