# GenOffice Slides 实际方案复核

2026-09-12。固定提交 `de139a061537bea40f0cc81ef8f09a95f77ac52a`。仅静态审阅公开源码，审阅副本在 `.artifacts/genoffice-review/`；未导入产品、未运行GenOffice。此前将“Konva＋PptxGenJS”表述为对方完整Slides方案不准确，现更正。

## 实际代码路径

| 层 | 源码证据 | 实际职责 |
| --- | --- | --- |
| AI生成页面 | `apps/slides/src/main/page-spec.ts`：buildPagePptx | 结构化JSON页面→createBlankPptx/openPptx→addElement/addPicture→savePptx；直接用自有引擎，不是PptxGenJS生成生产页面 |
| PPTX引擎 | `packages/pptx-engine/src/index.ts`：openPptx/savePptx/savePptxToFile | 解包解析幻灯片及继承链、稳定元素身份、OOXML元素修改、保留未改内容并保存；磁盘流式保存另有Node入口 |
| 渲染布局 | `packages/pptx-render/src/index.ts`、coords.ts | EMU/pt/显示坐标分离，布局、文本度量/换行、填充描边与RenderTree；Konva不是文字布局引擎 |
| 画布交互 | `apps/slides/src/renderer/SlideCanvas.tsx`、konva-adapter.ts | react-konva画布/交互，适配渲染树；以中心offset表达OOXML旋转，避免模型携带Konva左上旋转语义 |
| 导出依赖定位 | `packages/pptx-engine/package.json` | PptxGenJS4.0.1位于devDependencies；277份审阅文件中非vendor TS/TSX检索无pptxgenjs导入。不以此推断仓库全部测试/其他应用均未使用它 |

固定来源：[AI页面生成](https://github.com/genspark-ai/genoffice/blob/de139a061537bea40f0cc81ef8f09a95f77ac52a/apps/slides/src/main/page-spec.ts)、[引擎API](https://github.com/genspark-ai/genoffice/blob/de139a061537bea40f0cc81ef8f09a95f77ac52a/packages/pptx-engine/src/index.ts)、[渲染API](https://github.com/genspark-ai/genoffice/blob/de139a061537bea40f0cc81ef8f09a95f77ac52a/packages/pptx-render/src/index.ts)、[Konva适配](https://github.com/genspark-ai/genoffice/blob/de139a061537bea40f0cc81ef8f09a95f77ac52a/apps/slides/src/renderer/konva-adapter.ts)、[包声明](https://github.com/genspark-ai/genoffice/blob/de139a061537bea40f0cc81ef8f09a95f77ac52a/packages/pptx-engine/package.json)。

## 能复用什么

1. 已采用相同基础库Konva，直接复用官方拖动/Transformer等能力；无需推倒已经验证的原生交互探针。
2. 引擎、渲染包声明Apache-2.0、private:true、源码exports。private是发布元数据，不代表代码闭源或不可商用；但它们不是已验证可直接安装的公开发行SDK，源码还有workspace依赖、Node入口与第三方vendor。项目现行规则优先官方文档及已发布包，不能把源码下载直接变成生产依赖。
3. 根LICENSE/NOTICE与MTX README已核对；MTX为libeot的MPL-2.0端口。不能将整套依赖说成MIT，也不能因MPL简单认定禁止商用。若将来决定源码复用，须明确vendor来源/文件许可/修改维护和发布方式，不以对方公司规模替代核对。
4. 可直接参考的架构：文件读写、布局RenderTree、Konva交互分别适配；语义模型与显示缩放分离；稳定元素ID与未改文件内容保存；AI使用结构化元素操作。不要引入对方Electron、AI-provider/agent-core/project-store/IPC，Harness继续拥有执行、会话、工具和传输，Office原服务拥有工作副本治理。

## 对当前实现的修订

当前PPT-01 Konva＋PptxGenJS仅是新建文字/图片演示文稿技术切片。已验证原子操作、拖动缩放、重建与可编辑导出，不等于完整PPTX编辑器。保留此探针，不提前当作完整生产选型或启用PPT菜单。

下一步顺序：

- 在PPT-02接线前确定内部坐标/旋转契约，采用OOXML未旋转矩形＋中心旋转，Konva通过原生offset表示；避免当前左上旋转导出补偿长期进入API。
- 将文件codec与画布适配分离；PptxGenJS只负责新建导出，不用于已有PPTX往返，不重建未知对象造成静默损失。PPTX导入/保留编辑路线仍待独立实施与实际文件验收。
- 明确基础版支持文字/图片/常用形状及页管理；Konva没有整套PPT原生工具栏，必须补业务操作UI，但拖动/缩放/旋转手柄复用原生API。DOM文字编辑依官方示例实现，避免自造光标/输入法。
- 原统一ContentService通过类型适配承接presentation、修订、授权、幂等和租约；右侧只渲染可信快照。AI调用现有六工具；不新增执行框架或第二套持久化。
- 接通新建→自动打开→逐页更新→人工修改→保存→下载→原生文件卡后，独立制品安装/卸载/重装验收，之后再开放/office PPT。

没有决定复制GenOffice自研引擎或新增完整文字布局引擎。此复核为既有“同基础库＋OOXML适配”方案校正，源码复用与完整导入路线仍待决定，不伪造已完成。

## 本轮验证

GitHub API固定树SHA、277份非vendor TS/TSX及相关声明静态审阅；检查实际生成和保存调用、browser/Node边界与许可证来源。未执行GenOffice构建/运行、PPTX往返探针、新版本应用验收或制品发布。本轮不修改Word，不更新18989预览。
