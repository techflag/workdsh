# PPT-01 适配器证据（2026-09-12）

范围：私有presentation模型、Konva原生画布、PptxGenJS可编辑导出；不是应用内实时PPT完成收据。采用记录：[PPT-IMPLEMENTATION](../design/office/PPT-IMPLEMENTATION.md)。源码alpha.3未发布，Word alpha.2不变。

验证命令：Node22.23.2、pnpm10.34.5。

- `corepack pnpm --filter workdsh-plugin-office typecheck`：通过。
- `node --test tests/integration/office-presentation.test.mjs tests/integration/office-content.test.mjs`：11/11通过（PPT4、既有内容服务7）。
- `git diff --check`：通过。

PPT覆盖：两页创建和重排；原状态不变；未知元素、自移、越界、保留身份与远程图片拒绝；真实鼠标拖动、原生Transformer图片缩放及比例；快照重建后宽高不变/scale归一；只读与Stage销毁；销毁时异步图片decode不再提交；PPTX两页/可编辑中文文字/逻辑尺寸/原PNG字节；90度旋转Konva原点转PPTX中心后的EMU偏移。最初旋转XML断言因空白匹配失败，修正测试允许XML空白后通过，实际输出几何正确。

制品：`.artifacts/office-presentation/native-slide.png`（已实际查看，文字及图片正常）、`sample.pptx`（ZIP/XML检查）。未用截图作为PPTX内容。PPTX在Office/WPS/LibreOffice的视觉核验未执行，不能据XML断言完整排版保真。

未执行：全仓build/check、真实模型、Host/右栏PPT实时展示、独立制品许可和安装/卸载/重装、文字输入/IME/缩放页面、全部旋转边界。当前画布只接受已验证快照并发出语义操作，尚无生产服务提交/租约绑定；后续必须复用现有ContentService治理，不能单独保存在浏览器。18989人工应用未变更。
