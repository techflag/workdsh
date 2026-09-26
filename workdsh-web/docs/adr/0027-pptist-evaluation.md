# ADR-0027：PPTist 原生图表验证

状态：验证中，尚未替换产品编辑器。

用户确认常见图表是 PPT 基础能力。CreatPPT 0.1.4 只有柱状图语义模型；不采用由 AI 拼形状补饼图的方式。停止扩大 CreatPPT 接入，评估单一 PPTist 原生编辑器。

固定官方源码 e4912589ffdbec389fcc1bf25a85852dfe3040a8（package 2.0.0）。它是 private 应用而非已发布可嵌入 SDK；当前独立体验构建只位于 .artifacts，不加入根工作区依赖，不读取 Vue/Pinia 私有运行状态。先通过原生 JSON 文件导入、图表数据编辑、PPTX 导出验证能力。产品接入仍需明确受支持的嵌入/桥接契约，再复用既有 Office 授权、存储、审计和六工具，不另建 Agent loop 或插件框架。

源码 LICENSE 为 AGPL-3.0；正式分发与产品许可兼容需要另行确认，独立本机验证不代表完成发布条件。不会删除旧 CreatPPT 工作副本，不会把两种编辑器作为并行默认产品能力。

验收：八种图表页面可见；数据修改后保存重开一致；PPTX 包含原生图表 XML 与数据工作簿；之后验证 AI 与页面同一受控接口。

## 2026-09-13：用户授权接入与直接挂载探针

用户确认PPTist作为唯一默认PPT编辑器，商业授权后期付费；该决定允许推进本机开发，不代表已购买商业授权或正式分发条件已满足。沿用Harness原生右侧页面、Client/Host连接与Office同一业务服务。

直接Vue挂载已通过独立浏览器探针：createApp + createPinia + 原生Directive/App能显示原生编辑器，unmount移除编辑器，无pageerror；但原生CSS把宿主body overflow从visible改为hidden，App设置window.onbeforeunload且卸载后仍保留。源码另有Teleport到body、document查询与全局鼠标监听。不能将“Vue可挂载”当作“原样可嵌入产品”。Shadow DOM仅隔离CSS，不能直接解决这些document查询和Teleport。生产优先保留独立文档隔离以少改原生实现，若直接挂载需显式改造这些边界并重新验证，不宣称Harness存在PPTist原生SDK。

探针scripts/probe-pptist-mount.mjs；构建入口仅在.artifacts/pptist-trial/runtime，未替换18989编辑器。证据.artifacts/pptist-trial/mount-result.json。正式服务适配、旧数据迁移、资源完整打包、真实AI与保存导出联测未执行。

## 2026-09-13：官方文档核对后的修正

按用户要求暂停接入实现，核对Client Modules/Slots/Sidebar Right/Web Client与锁定rc.1发布包。DSH正式扩展面是React Slot + Tab +官方业务通信，没有找到Vue或iframe专用嵌入SDK；未提iframe不代表禁止，但也不能将iframe宣称为官方推荐。撤回先前“生产优先独立文档隔离”的确定结论。下一步优先完成容器内Vue挂载的有限作用域/生命周期验证，依据失败证据再选承载。见[技术核对](../design/office/PPTIST-INTEGRATION.md)。接入候选仍未安装；隔离桥接就绪试验未通过，ProseMirror依赖类型冲突未解决。
