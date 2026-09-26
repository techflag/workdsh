# PPT-02：CreatPPT 原生适配与编辑导出实测

2026-09-12；按 ADR-0026，使用已发布 @seekskyworld/creatppt 0.1.4，Apache-2.0，依赖精确锁定。只有领域根入口被代码导入，未加载它的 ./dsh 或生产 CLI/server。

## 本轮实现

presentation/creatppt.ts 直接保存原生 DeckSpec，调用 deckFromBrief/parseDeck/planSlide/ensureDeckElements/rebuildSlideElements/refreshSlideElementBindings；没有双模型映射或自建布局。支持原子插页、删页、移页、正文/标题/列表/布局更新与模板切换。工作副本限制 2 MiB、50 页、每页 200 元素，单批 1 MiB/100 操作，重复 ID 和跨类型操作拒绝，资源只接受现有有预算的内嵌 PNG/JPEG 校验。

原生生成函数默认采用需要图片的 cover，默认 starter 资产不能作为工作副本内的可访问资源。实测无图封面导致原生 Export PPT 报 Resolve 1 blocking issue(s) before exporting。纯文字新建改选原生 statement，并调用 planSlide 更新布局候选与一致性；没有关闭质量检查，也没有删除用户已经保存的图片。资产嵌入与用户图片交互仍需下一步正式服务接入。

## 验收证据

Node 22.23.2：node --test tests/integration/office-creatppt.test.mjs tests/integration/office-content.test.mjs，10/10 通过（CreatPPT 3 + 既有 Word/治理内容服务 7）。Office typecheck 与 git diff --check 通过。

1. 使用原生算法生成可编辑元素，原子编辑/排序，非法资源、重复 ID、失败批次不变更原输入。
2. 人工 userEdited 文字与坐标在 AI 内容更新/模板重建后保留。
3. Playwright 独立测试服务加载原封不动的发布包 dist/client，真正修改正文标题，通过原生 PUT 自动保存，刷新重开后保留；点击原生 Export PPT 产生真实下载。ZIP 核对 PPTX 含原生编辑的中文文字及多张可编辑幻灯片。

截图 .artifacts/office-creatppt/native-editor.png 已查看，页面完整，原生模板/元素操作与下载成功提示存在。下载 .artifacts/office-creatppt/native-export.pptx，保存快照 saved-deck.json。测试 HTTP 服务仅是独立原生兼容探针，不是生产身份/存储方案；均在 finally 关闭。

## 尚未完成

正式 ContentService 的 presentation 分支、六工具 schema、官方右侧 Tab 原生页面装配和 AI 修订同步、实际模型、PPT 制品卸载重装、Office/WPS 视觉验证、全仓 build/check 均未执行。当前 19091 是此前用户独立体验服务，没有替换用户的编辑状态；18989 WorkDSH 没有升级成 PPT 接入。不得称为应用集成完成或提前启用实时 PPT 菜单。已发布 Word alpha.2 不变。
