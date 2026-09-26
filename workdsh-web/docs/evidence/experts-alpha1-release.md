# 单个专家 alpha.1 发布验证

2026-09-12；发布基线Harness0.1.5-rc.1、Cordis4.0.2、Node22.23.2、pnpm10.34.5、macOS/Playwright Chromium。

用户授权提交并发布单个专家版本，GitHub tag为experts-v0.1.0-alpha.1。不发布npm注册表，不安装到用户Profile，不改变现有任务。配套独立包为identity-localalpha.4、auditalpha.3、accessalpha.4、Skillsalpha.25及可选bundlealpha.40，contractsalpha.6为开发依赖。

本轮执行并通过：

- corepack pnpm build：全量模块构建，含专家预构建Client。
- corepack pnpm typecheck：全量类型检查。
- corepack pnpm test:integration：52/52。
- corepack pnpm probe:experts：六个独立tgz经官方CLI在仓库外临时Profile安装，真实浏览器搜索/复制/草稿/Skill选择/完整预览/受信确认发布/原生任务及两次冷重启绑定通过，无page error。
- corepack pnpm check:plan及test:planning：规划完整性及2项规划测试通过。

浏览器报告在.artifacts/experts-package/report.json；真实示例截图复制至docs/assets/screenshots/expert-detail-alpha1.png与expert-list-alpha1.png，使用隔离演示数据。截图不代表团队SOP已实现。

真实模型验收沿用[本轮之前D04证据](d04-experts-review-fixes.md)，此次未再次调用模型。正常/缺信息/脏数据原生工具、计算、成果及冷重启绑定已验证，脏数据报告单位假设排除与局部转化率向整体推断两处专业语义问题仍保留。D04/AT-27不能整体签收；稳定性E收尾保留。旧Desktop、Windows/Linux端到端和完整热卸载未验收；团队SOP、公共技能与企业后台仅规划。

GitHub Release附件为本轮六个插件包、SHA256SUMS与release-manifest.json。最终包来源是本次提交源文件及声明版本；不把测试Home、用户凭据、日志或真实业务输入加入下载附件。
