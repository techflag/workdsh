# workdsh-plugin-activity

独立DSH标准展示插件（0.1）：顶部一行活动/协作状态，按需展开成员，轻量动画可关闭。复用原生Session事件、Header和子会话导航，不执行任务，不替代专家团验收。

构建：根目录 `corepack pnpm --filter workdsh-plugin-activity build`。
安装：将pack后的tgz通过官方 `dsh plugin --profile <profile> add <tgz>` 安装，重启该Profile。无需WorkDSH专家插件；安装专家/技能插件时通过公开可选契约增强身份与标题。

展开箭头 → 取消“启用轻量动画”，偏好按浏览器保存；减少动态效果的系统设置始终生效。所有动画局部作用于 `.wd-activity`，不改变原生正文、工具卡片和输入框。插件卸载恢复原生标题，偏好不会控制其他插件。

设计/边界：[需求](./DESIGN.md)。本轮结束不等于专家团流程验收；未运行成员不显示假进度。

公开扩展契约：从 `workdsh-plugin-activity/presentation` 导入 `ActivityPresentation` 类型，通过 Cordis `ctx.inject(['activityPresentation'], ...)` 注册可选身份/技能标题 resolver，返回 disposer 交给 `ctx.effect`。这只增强展示，不授予执行权限。样式可依据局部 `data-phase`、`data-motion`、`data-long` 增强；增强动画必须保留关闭和系统减少动态效果规则。

验证：`corepack pnpm test:activity`；隔离浏览器 `corepack pnpm probe:activity`（先以 `WORKDSH_PREVIEW_HOME=$PWD/.test-runtime/activity-probe node scripts/install-preview.mjs` 安装）。浏览器探针使用独立夹具，无模型请求；不会重启18989服务。

外观按用户认可图调整为46px单行，宽度为可用区域一半、最大560px并居中（窄屏保持可读宽度）；working时有沿四周循环的柔和彩色光带（Siri风格）、眨眼与三点波动。终态停止；悬停/聚焦可暂停动画，关闭后显示开启动效入口，系统减少动态效果同样停止伪元素动画。

团队栏按参考图采用56px双层布局：团队名称与真实执行状态，固定修订成员头像组（无图为首字）。当前执行成员高亮；配置成员不等于运行成员。普通栏46px、半宽居中与动画开关保持。尚未核实交接事件，不展示虚构的交接光点。
