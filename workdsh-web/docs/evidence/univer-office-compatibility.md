# Univer Office 接入调查与验收边界

日期：2026-09-12。对象：npm dsh-univer-office@0.2.14；WorkDSH 固定 Harness 0.1.5-rc.1。

## 已执行与结论

从 npm 下载发布包，SHA512 与 registry integrity 完全一致。在临时独立目录指定当前 Harness/Cordis 版本，以 --ignore-scripts --strict-peer-dependencies 安装；退出码 1。七个 Harness peer 的声明范围都是 0.1.1-rc.2 || 0.1.2-rc.1，不包含当前版本。只证明依赖契约不兼容，不能由此推断所有运行 API 必定失效。未降级、未放宽工作区依赖、未启动混合版本运行时。

发布包 Host 构建 Gateway 地址为 http://127.0.0.1:<port>，state 返回基于该地址的 viewerUrl；Client cardTarget 使用 state.viewerUrl。远程浏览器的 loopback 指向浏览器所在机器，因此现有默认路径不能直接作为服务器＋Web 的部署方案。尚未验证全部 URL/WS 路径重写，不能宣称反向代理已可用。

发布包包含 Host/Client、Gateway、Viewer、Office 交换与原生计算依赖，属于真实插件。主包只公开根入口、./client、package.json；没有已确认的独立转换服务导出契约。发布包未检索到 documentPreviews/sidebar.right.tab.document 注册标记；结合其对话卡片及 .univer 工作流，不能承诺安装后原始 xlsx/docx/pptx 会自动接入官方文件面板。

证据保存在 .artifacts/univer-compatibility：原 tarball、manifest.json、install.log、result.json、提取的发布 bundle。未改应用 Profile、未触碰用户文档、未执行生命周期脚本。此次未执行运行冒烟、Office 保真或远程 Web 验收。

## 用户要求与实施范围

客户端不依赖本机 Office、LibreOffice 或桌面文件关联。原始 Office 产物在右侧原生文件面板可读，转换和必要依赖位于 Host/服务器。只读预览不调用模型，不把查看动作变成自动导入并提交用户工作区的编辑任务。企业账户、管理后台、组织发布仍在后期计划，不因预览而提前实现。

## 有限实施顺序

1. **版本接入**：优先获得/制作基于公开 API 的第三方插件适配版本；完整评估旧 API 与当前 API 差异，固定全部 Harness 依赖，独立 Loader 验证 Host/Client。不能只修改 peer 范围当作验收。
2. **服务器路径**：通过官方 Host Web 服务提供经授权的同源 Viewer/资源/HTTP/WS 路径；禁止向远程客户端返回 loopback 地址。核实多会话文件隔离、反向代理子路径、静态资源、重连与失效行为。需先确定可公开使用的转换/Viewer 契约；不存在则明确适配第三方实现，不能依赖其未导出的私有服务。
3. **右侧接入**：独立 Office 预览插件，通过官方 documentPreviews 和 sidebar.right.tab.document 扩展接入；沿用原生文件寻址、权限、刷新和 Tab 状态。读取授权文件并生成只读派生缓存，原件不修改。xlsx/docx/pptx 分别显示兼容范围和降级提示，不能把纯数据展示写成完全 Office 保真。
4. **可使用验收**：另一台机器用浏览器访问 Host，打开真实三类文件、刷新、切换 Tab、修改原件后重新预览、拒绝越权文件、取消转换、Host 重启。只有这些完成才可宣布交付。

## 必须核实的兼容性

Excel：多表、合并、公式/显示值、格式、原生图表；PPT：分页、图形、字体、图表与图片；Word：段落、表格、图片、分页。特别以用户带六张原生图表的 Excel 验证，不能用简单 CSV 代替。复杂格式未覆盖时明确提示且保留下载原件。

转换需支持大小/时间/并发限制、取消、失败重试与临时资源清理；缓存以资源身份＋内容版本＋转换版本区分，不能只用文件名。读取失败或超时要给出具体原因，不能空白。绝不把用户工作区全部挂到公开静态目录。

## 方案比较

直接安装现有插件：最少开发，但当前 peer 范围、loopback 和原始文件面板接入尚不满足。
适配现有插件＋原生面板桥接：优先路线，复用成熟 Office 交换能力；代价是第三方 API 适配、服务器路由与保真测试。
直接以 Univer SDK 自建所有 Office 交换：掌控界面，但导入导出与复杂保真工作更多，暂不优先。
本机 Office/LibreOffice：不符合本次客户端要求。

## 参考

- https://github.com/dream-num/dsh-univer-office/
- https://github.com/dream-num/dsh-univer-office/blob/main/docs/architecture.md
- https://registry.npmjs.org/dsh-univer-office/0.2.14
- ../dsh-v0.1.6-alpha.2/subsystems/sidebar-right.zh.md
