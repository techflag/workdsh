# 侧栏分界视觉（2026-09-22）

复用官方 shell.overlay 插槽挂载可卸载样式，保留原生 Sidebar / Layout / 拖动命中区。基线0.1.7-alpha.1。发布包 layout 的 CSS 使用 sidebarCol 的 border-right 和 macOS centerCol 的 border-left；未提供单独分界 token。局部展示适配通过 CSS module 语义后缀选择器透明化边框，不改变全局 border token，不复制或改写上游。该选择器是版本相关适配，升级必须复查，失配时回退原生外观，不影响导航或拖动。

保留左右背景差异，鼠标悬停/拖动时显示低透明度反馈。验收须覆盖明暗主题边框、拖动宽度以及项目主页。

安装后 scripts/probe-sidebar-divider.mjs 通过：明暗 borderRightColor 透明，拖动宽度变化并恢复，无 pageerror。bundle build/typecheck 通过，已检查深色截图。
