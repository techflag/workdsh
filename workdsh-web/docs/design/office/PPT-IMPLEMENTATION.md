# PPT-01 原生画布与语义适配器

**选型校正：** [GenOffice Slides复核](GENOFFICE-SLIDES-REVIEW.md)确认对方生产路线为自研pptx-engine＋pptx-render＋Konva/react-konva。下文Konva＋PptxGenJS为我们的新建导出探针，不能等同完整对方方案；PPT-02接线前先校正中心旋转契约，已有PPTX保留编辑仍待实施。

2026-09-12，下一阶段优先PPT，Word开发暂停。PPT-01是最小技术切片：私有语义模型/原子操作、Konva浏览器画布和PPTX导出探针；不开放运行入口，不将该切片当完整AI实时PPT能力。随后PPT-02接入原内容服务的修订/租约/授权、六工具和右侧页面，再做完整独立制品验收。

## 官方能力复用记录（编码前）

锁定 Harness0.1.5-rc.1 https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/capability-seams.zh.md、公开dsh-tools README与既有ContentService/Connection/StorageDomain/Slots。PPT-01不新增底座；PPT-02需要基于类型适配器扩展现有业务服务，不能复制第二套持久化/权限/Agent执行。Konva10.5.0（npm version/license核对MIT）、PptxGenJS4.0.1（已发布包MIT）公开浏览器入口；沿用React19.2.4，不需新增react-konva包装。依赖精确锁定、后续打包实际许可文本验收，禁止商业SDK。

公开文档：https://konvajs.org/docs/react/Transformer.html、Drag_And_Drop.html；https://gitbrent.github.io/PptxGenJS/docs/api-text.html 。直接复用Konva draggable/Transformer，不自写拖拽/缩放手柄。官方说明Transformer需绑定节点并将scale归一到尺寸；它不包含完整演示文稿编辑器/文本输入/导出，因此最小语义绑定是我们的业务差异，不声称Konva有完整Office工具栏。PptxGenJS承担可编辑文字/嵌入图片PPTX组装，不将截图导出冒充可编辑PPTX。

模型：幻灯片与元素分别有稳定ID，独立presentation state，坐标/字体使用pt，导出除72转in；画布用同一逻辑坐标，缩放只是展示。支持文字/PNG-JPEG图片、页序、背景、位置尺寸/旋转；不导入全部PPTX/母版/动画/复杂图表。操作先作用于副本并整体验证，任何失败不改变原状态。Host仍拥有baseRevision/operationId/lease，不在画布再保存一份事实真源。画布只反映输入快照并回调语义操作，生命周期销毁Stage/监听，图片不允许网络URL。

验收：两页增删/重排、文字与图像、边界/未知字段/批次回滚，浏览器真实鼠标拖动和原生Transformer尺寸归一、状态保存重建、PPTX XML/图片字节与位置可编辑性。PPT-01探针不发模型请求、无图形应用自动启动、不改18989人工预览。未过Host/UI闭环前/office仍标PPT待接入。

## Konva API 深入核对（2026-09-12）

本轮按用户要求核对公开 API 与官方实例，并以锁定 Konva10.5.0 的浏览器探针验证：

| 原生能力 | 采用方式与边界 |
| --- | --- |
| Stage / Layer / Text / Image | 一页一个 Stage、当前仅一个绘制层，背景 listening:false；直接使用原生文字/图片节点，不自建 Canvas 渲染引擎 |
| Node draggable / dragBoundFunc / dragend | 原生鼠标拖动，结束回调语义操作；dragBoundFunc 返回绝对位置，目前 Stage 无缩放，不能直接照搬到后续缩放页面 |
| Transformer.nodes / keepRatio / flipEnabled | 原生选择和缩放手柄，图片维持比例、禁止翻转；不另做 DOM 拖拽手柄 |
| transformend / scaleX / scaleY | 将缩放归一为语义宽高，再清零 scale。节点 ID 不混入严格操作载荷 |
| boundBoxFunc | 绝对坐标、rotation 为弧度；当前仅大小限制，最终逻辑边界由共同 reducer 校验。后续展示缩放须先通过 getAbsoluteTransform().copy().invert() 做坐标换算 |
| getClientRect | 后续实现旋转外接矩形约束时复用此 API；当前只约束未旋转逻辑框，不声称已有完整旋转边界限制 |
| Node.destroy / Stage.destroy | 彻底关闭画布，销毁期图片 decode 中断不再提交；不将 remove 当卸载 |
| 原生 DOM 输入 | Konva.Text 不支持直接编辑，后续按照 Editable_Text 示例叠加 textarea；不模拟光标、选择和输入法 |
| Stage.scale | 后续参考 Responsive_Canvas 按逻辑尺寸缩放 Stage，语义坐标不随容器尺寸改变 |
| 语义持久化 | 参考 Best_Practices 持久化业务状态并重建节点，不用 Stage.toJSON 作为第二份事实源；图片和监听不依赖 Konva JSON 保存 |

官方来源：[Transformer](https://konvajs.org/api/Konva.Transformer.html)、[Node](https://konvajs.org/api/Konva.Node.html)、[文字编辑](https://konvajs.org/docs/sandbox/Editable_Text.html)、[保存重建](https://konvajs.org/docs/data_and_serialization/Best_Practices.html)、[容器缩放](https://konvajs.org/docs/sandbox/Responsive_Canvas.html)、[销毁](https://konvajs.org/docs/performance/Avoid_Memory_Leaks.html)、[拖动缩放限制](https://konvajs.org/docs/sandbox/Limited_Drag_And_Resize.html)、[性能建议](https://konvajs.org/docs/performance/All_Performance_Tips.html)。

导出需单独处理旋转：Konva 节点以左上原点旋转，PPTX 形状以中心旋转；codec 将旋转后的中心转换为 OOXML 未旋转框的偏移，不能直接复制 x/y。当前文本框缩放改变框尺寸而保留字号，不宣称完整字体/段落排版保真。
