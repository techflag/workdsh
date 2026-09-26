# OFFICE-INPUT-01：原生输入类型及文档引用（2026-09-12）

独立 Office Client 声明锁定 `@deepseek-ai/dsh-client-ui-input-trigger@0.1.5-rc.1`，通过公开 registerSource 贡献 `/office` 输出选择、`@` 工作副本参考/修改来源。输出标签直接复用官方 Lexical reference chips，可退格删除、正常继续输入，引用无需新文档必填。仅追加 conversation.input.dock 用途摘要，未复制 composer 或新建发送器。

codec 输出明确版本、类型、默认 create、reference/target、真实 session/documentId，提交时重新核验当前任务及 Office.list 授权。Word 使用已有内容工具和右栏，其余七类类型选择保留且菜单标明实时编辑待接入。原生文件/任务引用仍由原 owner 贡献。

验证：Office typecheck/build 通过；`node --test tests/integration/office-content.test.mjs tests/integration/office-input.test.mjs` 6项通过，其中2项新增覆盖八类型、无需引用、角色、拒绝无权限及任务切换。`node scripts/probe-office-live.mjs --input-only` 4项通过，包括独立制品装配、官方工具可见/执行及真实浏览器八类菜单→Word标签→退格删除→@修改→删除→@参考。截图 `.artifacts/office-input/office-input-reference.png`；result.json 浏览器错误为空。

本轮未执行真实模型完整写作、八类实时适配、原生输入标签冷刷新恢复、全仓回归。浏览器首次失败因测试连续 fill 与 native更新时序，改用真实键入并等待原生清空/展示ACK，最终完整流程通过。不将选择器标为八类编辑器完成。无提交、推送或发布。

## UI 纠正（2026-09-12）

删除自有 input.dock 说明及组件，以原生标签表达类型/用途。typecheck/build、2项输入测试及专项浏览器4项检查通过。人工复核标准窗口和900px（右栏收起）截图：无多余说明行，原生标签位于 composer 内；窄窗口检查同时验证输入框 x/y/宽高均在视口内。已安装重启18989。上述早期 dock 汇总描述由本项替代；未执行真实模型、全仓回归。
