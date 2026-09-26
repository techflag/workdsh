# WorkDSH 单主线迁移

`master` 原先承载 Desktop，`main` 承载 Web 与功能包；它们是两套独立的 Git 历史，直接删除任一分支都会丢失源码。迁移以 Desktop `d3a7b2143d27` 为第一父提交，并通过 `git subtree add --prefix=workdsh-web github/main` 将 Web `03b63ea14374` 作为第二父提交导入。这样 `master` 可保留两边的提交历史，而当前构建入口不被覆盖。

## 工程边界

- `dsh-plugin-desktop/` 是唯一 Electron Desktop 载体，使用根 Yarn workspace 和固定的官方 `deepseek-harness/` 子模块。
- `workdsh-web/` 是 Web 与 WorkDSH 功能包源码，保留独立 pnpm workspace。Web 继续只依赖官方已发布 DSH 包，不直接读取或修改 Desktop 子模块。
- `upstream.json` 是统一 DSH 版本记录。`corepack yarn check` 检查 Desktop pin、Web 包声明和 Web 规划文件；Web 的锁文件另由 `pnpm check:versions` 检查。
- CI 对 Web 源码改动运行编译、类型检查与集成测试，不生成 Web 安装包；Desktop 打包仅在 Desktop 相关改动或发布 tag 上运行。Desktop 发布作业只依赖 Desktop 检查与安装包构建，不依赖 Web 源码作业。网站工作流从根 `.github/workflows/` 部署 `workdsh-web/website/`。

Web 的功能包仍按各自的 npm 版本发布，Desktop 安装已发布的兼容包；“一个 DSH 版本”不等于所有 WorkDSH 功能包必须拥有同一个包版本。当前 Web 和 Desktop 的 DSH 基线都是 `0.1.7-rc.2`。

## 分支收尾条件

1. 合库 PR 的根检查、Web 检查、Windows 与两种 macOS 架构的 Desktop 检查通过；确认 README、网站构建和发布工作流的路径。
2. 合入 `master` 后将 GitHub 默认分支从 `main` 切换为 `master`。`main` 的历史已作为 subtree 的第二父提交保留，再删除远程 `main`。
3. 浏览器侧栏实验存在发布阻断，实验判断已保存在 [审计记录](WORKDSH-BROWSER-SIDEBAR-AUDIT.md)。实验代码不进入发行线；确认不再继续该分支后，删除远程实验分支。

这一步只统一源码与 Git 主线；不自动发布 Desktop 安装包或 npm 包。
