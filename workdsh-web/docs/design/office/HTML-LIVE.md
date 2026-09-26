# HTML 工作副本实时预览

2026-09-13 用户要求网页与Word/PPT一样先展示、AI持续更新。首个切片为自包含单文件HTML，看板与展示页；不承担多文件工程服务或部署。

官方能力复用：锁定0.1.5-rc.1，复用subsystems/sidebar-right.zh.md的sidebar-right pane/tab、既有Office Client及内容展示确认，subsystems/tools.md的defineTool/tool registry。复用现有Office授权、Storage Domain、CAS修订、幂等回执、Connection及原生bash/present导出；不增加文件监听器、Loader、RPC、Agent loop或另一存储。Host内容是权威，iframe仅是已提交修订的展示。

新增kind=html与state={modelVersion:1,html}，content_open先建立空壳并展示；content_edit使用html.replaceDocument，基于baseRevision更新完整有效页面，模型分批提交有用内容，不展示逐token半截标记。content_read获取最新版；导出当前修订为真实HTML。单文件大小限制1MiB，请求继续使用现有Office限制。

iframe使用sandbox且不授予same-origin、表单、弹窗或顶层导航权限，预览CSP阻止外部脚本、样式、图片和连接，只允许内联脚本/样式及data图片。用户HTML不进入父页面DOM。首版只读预览和源码查看，不宣传可视化网页编辑或第三方CDN支持。下载保留原HTML字节，预览CSP只用于隔离展示。

验收：新建即pending展示，连续更新修订，冲突不覆盖、跨主体拒绝、重启持久化、导出准确；浏览器渲染实际内容、隔离父DOM和外部请求、下载入口。未验证项不得记通过。已生成独立HTML文件不自动导入或监听，新任务须由创建链路主动进入工作副本；文件导入后续另验收。

## 实施验证

已实现 Service/Connection/tools/客户端路由、预览与真实 HTML 导出。office-content 12 项通过，office-html 浏览器测试验证双修订刷新、交互、父页面隔离、网络请求限制与源码下载；全项目 typecheck 通过。预览非可视化 DOM 编辑器，现存独立文件不自动导入。
