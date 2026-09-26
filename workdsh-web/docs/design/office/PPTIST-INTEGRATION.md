# PPTist 与 Harness 的接入边界

状态：技术核对完成，挂载选择待最小兼容验证；2026-09-13。用户要求暂停实现，先核对官方说明。本记录修正之前把隔离 iframe 优先方案表述得过早的结论。

## 官方能力复用记录

任务 OFFICE-AI-01/PPTist；锁定发布包 `@deepseek-ai/dsh-client-ui-slots`、`dsh-client-ui-renderer`、`dsh-client-ui-sidebar-right` 为 `0.1.5-rc.1`，Cordis `4.0.2`。没有读取或修改 Harness 上游源码。

| Owner | 本地官方说明 | 核对的公开面 | 用法 |
| --- | --- | --- | --- |
| Client Modules | ../../dsh-v0.1.6-alpha.2/subsystems/client-modules.zh.md | package 的 dsh.client / exports["./client"] | Office 包交付浏览器构建；由官方发现、加载，不单独启动 PPTist 服务器 |
| Slots / Renderer | ../../dsh-v0.1.6-alpha.2/subsystems/slots.zh.md | ctx.slots.inject/register、PropsRuntime；发布包 SlotComponent=(props)=>ReactNode | 插件贡献 React 容器；Vue 组件不能直接作为 Slot component 注册 |
| Sidebar Right | ../../dsh-v0.1.6-alpha.2/subsystems/sidebar-right.zh.md | ctx.sidebarRightTabs.register、sidebar.right.pane.tab、openTab/openResource、useTabInfo、tab.signal | 复用官方会话页面、全屏和关闭生命周期；注册器放 ctx.effect |
| Client / Host | ../../dsh-v0.1.6-alpha.2/subsystems/web-client.zh.md、../../HARNESS-OFFICIAL-DEVELOPMENT.md | 官方生成 Remote；现有外部生成兼容缺口的 Connection exact Fetch route | 继续复用现有 Office 通信和同一授权/CAS/审计服务 |
| Client Resources | ../../dsh-v0.1.6-alpha.2/subsystems/client-resources.zh.md | ctx.resources、useResource、source | 地址式资源是官方能力；资源流与组件生命周期不同，不为接编辑器复制资源框架 |

文档镜像不能自动当作锁定版本 API：本次同时核对发布包声明。现有 Office 已注册 workdsh-office-live 类型及 keyed body，Tab API 可用；不需要为了 Vue 更换 Harness Renderer。

检索本地文档中的 iframe/webview/Vue/shadow DOM，未找到专用编辑器嵌入契约（Vue 的命中为翻译规范）。这只能说明未找到官方专用方案，不代表官方禁止组件使用浏览器 iframe，也不代表官方已经承诺该方案兼容。

## 不随挂载方式变化的架构

正式 Office 插件 → 官方右侧 React Slot 容器 → PPTist Vue 编辑器适配 → Office Client model → 官方 Connection / Remote → Office Host service。

AI 工具同样调用 Office Host service。只有该服务持久化工作副本、校验权限、处理修订冲突和审计。Pinia 只拥有编辑器的本地交互状态；PPTist 原生历史数据库不作为业务真源。PPTist 外部 AI、在线服务和默认 mock 不直接接管 WorkDSH 用户数据。

适配接口属于 WorkDSH，自有而非官方 SDK：mount(container, initialSnapshot, callbacks)、applySnapshot(snapshot)、flush()、exportPptx()、dispose()。它只交接原生文档快照、焦点和变更回调，不另造插件装载器或 Agent loop。具体方法需要实现和验证，当前不能称为已有 API。

## 两种承载方式

| 方式 | 官方部分 | 自有适配 | 实际代价 |
| --- | --- | --- | --- |
| 同文档 React 容器挂载 Vue | Slot、Tab、Client Modules、业务通信 | Vue createApp/unmount、样式作用域、弹窗目标、事件和 DOM 查询作用域 | 符合用户优先方向；必须修改原生全局假设，不能只写一个 ref 就交付 |
| 插件内部独立 iframe | 同上 | 浏览器 MessageChannel、内嵌构建、隔离环境与原生初始化 | 较少改编辑器全局实现；不是 Harness 专用接口；更多就绪/保存/下载边界。当前不是确定方案 |

Shadow DOM 或 Web Component 并不会自然解决全部边界：PPTist 使用 document.querySelector、body Teleport、全局鼠标监听，需明确适配这些行为。

直接挂载探针显示原生 Vue Editor 正常渲染，unmount 移除组件；原生 CSS 改变宿主 body overflow，原生 App 的 onbeforeunload 卸载后仍存在。它证明可以挂载及确有副作用，不能证明必须采用 iframe。独立隔离桥接试验尚未通过就绪验收，不得作为已完成接入证据。新增原生依赖也引起 ProseMirror 类型重复，尚未解决；不修改 Word 行为来掩盖依赖冲突。

## 下一步的有限验证

优先直接挂载方案，但先验证而不扩大正式接入：

1. 自有初始化入口替代 PPTist App 的 mock / beforeunload，保留原生 Editor、Screen、导出与历史能力。
2. 将样式、Teleport、contextmenu、全局快捷键和 DOM 查询明确限定在编辑器容器；组件卸载清理，多个实例隔离。避免 patch 全局 document/window 伪装沙箱。
3. 复用官方 Tab 的会话上下文、全屏和 signal；区分 Vue 组件卸载与 Tab 记录关闭，不在切换时丢掉未保存数据。
4. 验证宿主聊天输入的快捷键/粘贴不被夺取，弹窗和拖动正常；打开/关闭/切换/全屏后无残留，双实例不会串数据，保存与原生图表导出工作。
5. 验证通过才接 Office 服务并安装18989。若需要广泛修改 PPTist 才能满足边界，记录实际失败和维护代价，再评估隔离方案；不因文档未提 iframe 就改用运行时私有接口。

当前18989仍是旧候选加费用插件；19092独立演示不代表正式产品接入。正式服务联测、发布和全量检查未执行。旧稿件不迁移或覆盖，Word暂停。
