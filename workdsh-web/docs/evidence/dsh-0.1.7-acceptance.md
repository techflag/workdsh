# DSH 0.1.7-alpha.1 升级验收（2026-09-22）

结论：本次升级核心兼容链通过，发现的 UI-017-01 已修复并复验；不是全产品无条件通过，也不是发布验收完成。已按用户授权切换 18989 开发预览，未提交、推送或发布。

## 环境与范围

- Node 22.23.2 / pnpm 10.34.5，macOS / Playwright Chromium，独立临时 DSH_HOME 与 DSH_AGENTS_HOME。
- 使用正式打包的九层插件及官方 CLI 安装、公开服务与原生 Agent Loop；仅测试模型和诊断插件为测试夹具，没有替换产品调度器。
- 项目和资料通过真实 API 建立；`@` 选择、提交、消息引用点击、重启后从项目任务列表重开均经浏览器交互。
- 模型夹具检查输入同时含项目指令和资料正文后才返回成功标记。不消耗付费模型额度，不代表真实模型分析质量。

## 本轮结果

|检查|结果与边界|
|---|---|
|独立安装、专家 Host、绑定原生 Session|通过|
|DOCX / PPTX / XLSX / XLS / CSV / TSV 默认原生预览|六种均通过，候选首位为官方预览，已保存并检查截图|
|DOCX / PPTX / XLSX 切换 Office 浏览器编辑|三种均打开；XLSX 等待初始化后显示测试单元格。本轮不验收编辑保存、复杂格式保真|
|项目输入 `@`、引用标签、提交原生任务|通过，项目归属显示且消息保留可点击文件引用|
|资料正文与项目指令进入执行上下文|通过，实际 Agent Loop + 确定性模型检查|
|点击消息引用打开右侧资料内容|通过，无虚构文件路径或文件不存在提示|
|Host 冷重启后从项目重开任务|通过，结果、文件引用和可读取正文保留；固定资产修订一致|
|资料库打包、两次冷启动、卸载重装|通过，卸载保留数据，重装可恢复资产|
|旧专家修订|合成旧格式夹具验证：历史修订不变，拒绝新执行，显式重新发布后可创建任务；不是用户全量历史数据迁移|

浏览器探针 **16 项通过、0 页面/控制台错误、0 指针回退**。专家集成 **20/20**（本轮增加一项旧格式回归）。前轮全量 build/typecheck、110 项集成、资料库 5、项目 10、Activity 15、规划 2 的证据继续有效；本轮没有改产品运行代码，不将前轮全量结果冒充本轮重跑。

## 遗留问题

**UI-017-01：资料引用预览未跟随浅色主题（已修复）。** 官方外框浅色时，右侧资料正文仍为深色。定位 `packages/plugins/library/src/client/LibraryReferencePage.tsx:46`，容器硬编码 `background: '#111214', color: '#eee'`。内容读取正确，属于界面一致性问题。续轮已改用官方主题变量；浅色→深色→浅色无需刷新切换通过，截图与计算样式均验证。

旧 `probe-office-native.mjs` 仍断言默认打开自建编辑器，不适用于原生优先策略；本轮新增独立验收脚本。旧 0.1.6 专家专项脚本同样不能作为新版通过依据。

## 复现与证据

```sh
node scripts/probe-upgrade017.mjs
node --test tests/integration/expert-manager.test.mjs
node scripts/probe-library-release.mjs
```

先按仓库步骤安装、build，并使用 Node 22。固定生成文件在 `tests/fixtures/upgrade017/`，不含用户文档。

- 最终浏览器日志：`.test-runtime/upgrade-017/acceptance-final.log`。
- 结构化结果：`.artifacts/upgrade017-acceptance/result.json`。
- 截图：同目录 `native-*.png`、`editor-*.png`、`project-task.png`、`project-reference-preview.png`、`project-cold-reopened.png`。
- 专家回归：`.test-runtime/upgrade-017/legacy-acceptance2.log`。
- 资料库生命周期：`.test-runtime/upgrade-017/library-acceptance.log`。
- 早期失败日志为测试假设修正过程，最终运行以上述 final 日志为准；包括原生表格画布无 DOM 单元格文本、新 Profile 初始化对话框等。

## 未执行与后续

未执行：用户 Profile 原地迁移、所有历史任务续跑、付费模型业务质量、专家团小时级长任务、OAuth、Windows/Linux、Office 全格式编辑导出保真。本次未部署预览或制作发布版。

下一步：备份用户 Profile、升级预览并验证真实历史数据。仍需独立进行发布门禁，不能把这份核心兼容验收当作全产品稳定版签收。

## UI-017-01 修复复用记录

依据 `docs/dsh-v0.1.7-alpha.1/docs/web-styling.zh.md` 的 ui-theme 语义 token 约定，资料引用容器直接使用官方背景、文字、状态色和分割线变量，不注册第二套主题。HTML 原件的独立文档画布保留原始样式。验收采用系统浅色→深色→浅色实时切换，检查正文仍可见、计算样式等于官方变量解析值并保留截图。

修复复验：资料库 build/typecheck 通过；浏览器探针现为 **17 项通过、0 浏览器错误**，包含主题往返切换和原有项目冷恢复链路。日志 `.test-runtime/upgrade-017/theme-acceptance.log`，截图 `.artifacts/upgrade017-acceptance/reference-theme-light.png` / `reference-theme-dark.png`，计算样式 `reference-theme-colors.json`。本轮使用既有未发布 Library alpha.3，不追加发行版本；未更新用户预览。

## DEV-017-02：开发预览声明确认保存失败（已修复）

官方能力复用记录：P0-02；依据 `docs/dsh-v0.1.7-alpha.1/docs/subsystems/settings.zh.md`、官方 `@deepseek-ai/dsh@0.1.7-alpha.1` CLI/Profile 与 `dsh-app-boot` 发布包。设置和声明持久化仍归原生 Settings/ConfigEditor，不加旁路或浏览器假确认。实际预览 `/api/settings/mutate` 返回 `settings/rejected: dsh: profile reload requires the root Include entry`。仓库 CLI 与 Profile 的 ConfigEditor 解析到不同物理 app-boot 模块，模块内登记不共享。拟将精确版本官方 CLI 安装到 Profile 的同一依赖图并从该位置启动，安装后校验启动端与设置端模块路径一致。验收要求：原生继续按钮成功、刷新及进程重启后不再弹出；无需真实模型调用。

实际修复：preview:install 将精确版本官方 CLI 安装到 Profile 同一依赖图，显式补齐账号适配器声明的原生 account peer（Profile 禁止自动安装 peer）；start-preview 从该 CLI 启动，安装和启动均校验 app-boot 物理实例一致，拒绝旧版本或缺失运行时。未修改上游包。

验证：preview:install 成功，原生 `/api/settings/mutate` 返回 ok:true，welcomeNoticeVersion 保存至原生 cordis.patch.yml；刷新、重启 Host 后全新浏览器均不再出现声明；最终启动无 inactive entry 告警。脚本语法与 diff 检查通过。证据：`.artifacts/upgrade017-acceptance/declaration-save.json`、`declaration-saved.png`、`declaration-cold-restart.png`；安装和运行日志在 `.test-runtime/upgrade-017/`。本次未重新执行全仓构建/全量测试、未调用真实模型。

## UI-017-03：能力中心与弹窗跟随主题（已修复）

官方复用记录：P0-02；依据锁定 0.1.7 的 `docs/web-styling.zh.md` 与发布包 ui-theme 的公开 `--dsw-alias-*` CSS 变量。主题偏好与系统监听继续由官方 ui-theme/ui-layout 拥有；WorkDSH 仅将技能、专家和共享 Modal 的硬编码色替换为语义变量，不添加主题监听器或覆盖系统设置。验收：系统浅色→深色→浅色无需刷新，页面、卡片、按钮及专家弹窗同步变化。

UI-017-03 实现：技能/专家样式的页面、卡片、输入、按钮、状态与详情颜色改用原生变量；共享 Modal 使用原生遮罩、表面和 elevation；保留 logo/内容图片原色。新增 `scripts/probe-preview-theme.mjs`，在运行中的开发预览逐页验证浅色→深色→浅色（含卡片/按钮/弹窗），无需模型调用。截图里的旧专家 preset 异常是独立的旧修订兼容提示，此次不重新发布或改写历史专家。

UI-017-03 验收通过：全量构建、UI/技能/专家 typecheck、check:versions、check:plan、diff 检查通过；实际安装后的页面执行浅色→深色→浅色，技能页面/卡片/添加按钮与专家页面/详情弹窗/关闭按钮均通过，文字与原生主题一致，无需刷新。错误提示改为低透明度语义色背景，禁用示例保持可读。证据 `.artifacts/upgrade017-acceptance/capability-theme.json` 与 `capability-{skills,experts}-{light,dark}.png`；日志 `.test-runtime/upgrade-017/capability-theme.log`。未执行真实模型任务、全量业务回归或发布。

## UI-017-04：连接器、项目和资料库主题补齐（已修复）

复用同版本官方 web-styling 语义颜色；修复连接器、项目和资料库固定深色及项目强制 color-scheme:dark。保留文件类型/品牌图标和文档正文颜色。验收覆盖三页及连接器配置、项目创建弹窗的明暗往返，不改写业务对象或触发连接器外部操作。

UI-017-04 验收：三个受影响包构建/typecheck通过；安装到18989后，技能、专家、连接器、项目、资料库五页浅色→深色→浅色通过，包含添加MCP与新建项目弹窗及输入框；已检查浅色截图。未创建项目、未修改MCP配置、未调用模型。回执为 `.artifacts/upgrade017-acceptance/capability-theme.json`，截图同目录 `capability-*-light.png`/`dark.png`；日志 `.test-runtime/upgrade-017/theme-extra-browser.log`。连接器没有单独URL映射，浏览器探针通过技能页的原生连接器标签进入。
