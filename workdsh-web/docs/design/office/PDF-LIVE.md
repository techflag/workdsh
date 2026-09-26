# PDF 首版实时工作副本

2026-09-13 用户指定只推进 PDF，画布/多维表格取消本专项开发。

官方复用记录 PDF-01：沿用 docs/dsh-v0.1.6-alpha.2/subsystems/skills.md、tools.md、sidebar-right.zh.md，以及已验证 Office ContentService、官方 storageDomain/Connection/Sidebar Tab/present。业务差异是 PDF 页/元素数据及 PDF 编码器，不新增 Agent loop、文件服务器或模型路由。公共类型见 workdsh-contracts/office；接口在实现与验证后才进入工具定义。

首版 kind=pdf，modelVersion=1，pages 按序，每页稳定 id、尺寸 pt、背景及严格 text/rectangle 元素。坐标左上，text 显式宽高及字号/行距/颜色；单页更新保留其他页面，全文页列表替换不开放给 AI。pdf-lib 生成可选取的文字与矢量，静态字体由应用携带并完整嵌入（子集路径实测漏字，已禁用）。PDF.js 实际解码和 canvas 预览。固定修订派生文件，预览/下载/最终交付使用同一编码器；源状态为唯一真源。沿用 CAS/幂等/人工租约/授权/审计，取消不交付。

验收：新建立即请求展示、中文文字可读取、双修订更新、单页修改不丢其他页、拒绝越界/溢出/未知元素、人工编辑冲突、重启持久、导出真实 PDF 并解码重开、独立包无机器字体或 Python 依赖。

边界：首版仅新建 PDF 页对象，非已有任意 PDF 导入编辑器；OCR、扫描件文字替换、图片编辑和 PDFium 内容对象修改未实现，不能伪装成功。界面明确说明范围，不继承历史八类计划的完整 PDF 功能声明。

实现检查：服务的授权/CAS/幂等/人工租约/保存恢复及已有 Office 回归 21 项通过，真实 PDF.js 浏览器测试加入逐中文字形可见像素检查并通过。OTF、变量/静态 TTF 的 fontkit 子集路径均发现漏字，首版禁用子集并完整嵌入静态 wght=400 字体。字体在开发期由 fontTools 实例化并随包固定 SHA256；用户运行不需要 Python。导出通过官方持久 Bash 分块执行 Node 写入，每块仍经过原生策略/沙箱链路，完整文件 SHA256 验证后才原子链接到最终路径；避免完整字体使单条命令超过参数/终端输入上限。真实模型生成及复杂版式评测未执行。独立包真实侧栏、官方 present（测试轮次夹具）、Host 冷恢复检查见 .artifacts/office-pdf-live/result.json。

真实模型案例（2026-09-13）：通过隔离官方 Agent 任务生成两页《预算执行简报》，首工具 content_open，约 3.2 秒创建、28.6/36.5 秒提交修订 1/2，content_read/content_export 后官方文件卡片成功交付。初次完整探针因合法千位分隔 1,000 被核对器拒绝；修正规则后对已交付文件离线解码/渲染复查通过，未重复模型调用、未伪造完整主探针 PASS。两页中文完整，无明显重叠/裁切，业务数值和三项未知信息正确。原生模型回执 real-result.json、实际 PDF real-budget-report.pdf、两页截图及 real-recheck.json 位于 .artifacts/office-pdf-live-real。修正后完整主探针重新执行、真实模型任务冷恢复与该案例浏览器下载字节对比未执行；确定性适配器链路仍由先前独立包测试覆盖。
