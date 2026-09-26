# PPTist 原生编辑器与图表验证

固定官方提交 e4912589ffdbec389fcc1bf25a85852dfe3040a8，package 2.0.0，AGPL-3.0。当前为独立本机验证，未替换 18989 Office 插件，旧 CreatPPT 数据保留。

## 源码检查

- src/hooks/useExport.ts 的 chart 分支直接调用 addChart；bar/column、line、area、radar、scatter、pie、ring 分别映射 Office 图表类型。ring 使用 doughnut，holeSize 60；不使用图片导出路径。
- doc/AI_PPT_SCHEMA.md 提供 chartType、labels、legends、series、themeColors 的 AI 数据结构。文档明确自身并非完整数据定义；以 src/types/slides.ts、组件和导出代码交叉核对，不依靠文档猜测。
- 导出实现 bar 对应 barDir:col，column 对应 barDir:bar；方向命名与 AI 文档示例存在歧义，需按原生 UI/真实导出核对。
- 原生编辑器还支持文字、图片、形状、线条、表格、音视频和公式；不把所有元素都宣称无损导入导出。
- 项目 private:true，没有已发布嵌入 SDK；不得用 Vue/Pinia 私有运行状态作为产品桥。先实测 JSON 导入、数据编辑和导出，再定义受控接入契约。

## 本机验证

.artifacts/pptist-trial/charts.json 为八页示例数据，包含八类原生 chart 元素。依赖按官方 package-lock.json 安装，npm ci --ignore-scripts；不修改根 pnpm 工作区、不执行源码 prepare。

当前状态：原生构建通过（5.12s）。node scripts/probe-pptist.mjs 的4项实际浏览器验证通过：八类SVG图表显示；原生数据编辑器将饼图第一项10改为77；JSON保存、重置、重导入后8页/77一致；标准PPTX含8个图表XML、8份嵌入xlsx，确认pie/doughnut/bar/line/area/radar/scatter类型及77数值。无pageerror。原生iframe/WorkDSH AI与受控保存接入未执行；Office/WPS视觉验证未执行，不能以ZIP结构检查替代。

体验 http://127.0.0.1:19092/，标准vite preview仅本机。只替换原生公开 dist/mocks/slides.json 为8页样例，没有改Vue/Pinia/图表/导出源码。默认启动每次从mock加载，不承诺原生页刷新自动恢复编辑；已验证通过文件保存重开。源仓库21份字体资源较大，Git稀疏检出排除字体目录；本次只使用校验Git blob匹配的已下载字体与Arial样例。尚未下载的字体不在本次体验范围，完整资源/字体许可门禁未完成。

原生AI按钮属于PPTist自身服务流程，未接WorkDSH模型；本机验证不调用该按钮，不把它算作Office AI接入。原有18989与旧稿件保持原样。
