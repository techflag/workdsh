# Office U1：独立插件与原生文档编辑证据

日期：2026-09-12；Office 模块 0.1，开发包 `workdsh-plugin-office@0.1.0-alpha.1`。本次是 U1 最小链路及 U2 确定性工具/UI 场景，不是八类最终交付。

## 已落地

- 根 Host 用 `ctx.plugin` 装配 ContentService、Connection、Tools；必需治理依赖显式声明。安装不需要 experts、skills、workbench 或默认 WorkDSH bundle。
- `workdsh-contracts/office` 只导出 TypeScript 类型；Host 构建不内联 Cordis/Harness，也不引用 private contracts 运行值。
- 一个 StorageDomain 文档记录拥有内容、修订、幂等收据和审计 outbox；同工作区可信 Session / owner 授权。审计临时失败不把已提交内容谎报为未提交。
- 注册五个原生工具 `content_open/read/capabilities/edit/present`。新建/重开、严格段落操作、最新修订读取与 Session 定向展示可用。`content_export` 未实现，不注册空工具。
- 官方右侧 Tab + Tiptap 3.31.0 原生正文编辑；Client model 负责轮询、编辑租约、暂存事务和修订镜像；React 展示组件接收状态/actions，不持有 Cordis Context 或通用 RPC。
- 人工 30 秒租约 / 10 秒续期，成功保存后释放；AI 不覆盖正在编辑的内容。完整段落修改、标题、分段、加粗/斜体/下划线/删除线、Unicode 文本均归一为有界 typed operations。

## 执行结果

| 检查 | 结果与实际范围 |
| --- | --- |
| contracts build、Office typecheck、Office build | 通过，Node 22.23.2 / pnpm 10.34.5 |
| `node --test tests/integration/office-content.test.mjs` | 2 个集成用例通过；真实 Storage/JsonStorage/StorageDomain/AccessManager/AuditJournal；身份目录是测试替身，不是远程认证验收 |
| 原子提交与恢复 | 多步失败不部分落盘；旧成功请求先去重再 CAS；参数不一致拒绝；旧修订拒绝；重启后状态/收据恢复，旧代人工凭证失效 |
| 权限 | 两主体同组织、另一组织、未知 Session、成员停用均拒绝越权读取；人工租约阻止 AI / 第二页面写入 |
| `node scripts/probe-office-live.mjs` | 6 项通过；临时 Home + web Profile 安装四个预构建产品包（Office + identity/access/audit）和一个仅测试的诊断插件 |
| 原生工具执行 | 诊断请求使用真实 SessionAccessBridge 创建/解析 Session，经官方 Tools.execute 调用五个工具，经过输入、输出、权限与渲染管线；没有发送模型请求 |
| 原生页面 | content_present 打开调用 Session 的右侧 Tab；三批提交逐次显示；用户直接改段落、Enter 分段、加粗、emoji；工具再读最新状态并追加；浏览器重载后恢复 |
| 输入组合 | 浏览器模拟 compositionstart/end 分支通过：组合中不提交，结束后保存；不是 macOS/Windows 真 IME 验收 |
| 浏览器错误 | 探针收集 pageerror 为空；截图已检查，正文/原生工具条可见且未出现旧式文字片段表单 |

运行原始结果：`.artifacts/office-live/result.json`；截图：`.artifacts/office-live/live-document.png`；本地插件包：`.artifacts/office-live/workdsh-plugin-office-0.1.0-alpha.1.tgz`。这些是测试制品，不是 GitHub/npm 发布。

另经 9 份文档的链接/围栏与 JSON 检查、规划检查、git diff 空白检查；Host 构建不含 private contracts 运行时导入。工具重名会拒绝注册；服务卸载后依赖工具撤销已在集成用例验证。

真实安装首次发现根 Loader 行没有声明子服务的治理前置，导致内容服务未激活；补齐根 inject 后上述包实测通过。重载测试最初抢在原生 Session 列表恢复前选择 Session，已改为等待官方 refresh，不改上游 Session 实现。

## 保留的范围与门槛

U1 仅覆盖新建的原生 document 工作副本。旧 DOCX/PPTX/XLSX 文件适配器保持原有范围，尚未接入本次内容协议；不能宣称 Word 文件原位编辑或完整 Office 保真。

下一步 U2：真实模型按工具完成写作、原生/PTC 可见性与失败分支、人工粘贴/撤销及系统 IME、Session 切换和显式未保存缓冲恢复。U3：受控 DOCX 导入、冻结修订导出及重开、断线/取消/卸载在途故障矩阵；目前关闭 Tab 前应完成编辑，尚未覆盖未提交缓冲的完整恢复机制。U4/U5 按计划接入其余七类及联合验收，八类范围不删减。

许可：新增 Tiptap/ProseMirror 使用实际 MIT 发行物。构建输出包含已打包依赖清单与可得许可证原文；`@univerjs/protocol@0.25.1` 缺失的包内 LICENSE 已用同版本 upstream LICENSE 补齐。`dist/license-review.json` 仍列出六项旧依赖缺完整许可文本（franc-min、ot-json1、ot-text-unicode、pptx-preview、react-remove-scroll-bar、unicount），其中 pptx-preview 延续旧有许可疑点，不能仅信 manifest。U5 发布前补齐或替换；本次不宣称整个旧 Office 包已满足最终商业分发门槛。

未执行：真实模型、PTC、完整八类文件往返、系统 IME、完整热卸载故障、企业远程认证、全仓回归、发布。未修改用户 Profile/文档，未重启 18989 人工应用，未提交、推送或发布。

## U2 创建即展示回归（2026-09-12）

用户截图暴露旧运行构建模型不可见工具并退回 Markdown 文件；之前工具/UI 的确定性测试不等于用户真实模型通过。修正版新建记录原子拥有 presentation，现有文档重开也展示；工具描述不再要求手动 content_present，根入口补齐 tools/connection 载体。

Office typecheck/build、服务集成 2 项通过；独立包探针更新为 7 项通过：按真实 Session 的 assembleContextFor 调用官方 systemPrompt.assemble，仅检查工具名，五个 content_* 全部可见；浏览器在首批提交之前显示空文档，完全不调用 content_present；后续三批更新和人工编辑/重载回归通过。真实模型未调用，逐 token 流式尚未实现。已安装并重启项目 preview 服务，用户原文件不迁移为原生工作副本。
