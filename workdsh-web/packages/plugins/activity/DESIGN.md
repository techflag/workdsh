# 活动与协作展示插件 0.1

## 2026-09-15：团队展示交给官方 Team

按用户决定退役自建团队执行与展示。工作动态条仅用于个人任务；团队资产或已有子成员的任务不显示旧团队头像、成员轮询详情和“主理人处理中”分支。团队名册、任务操作与成员导航由 `@deepseek-ai/dsh-experimental-client-ui-agent-team@0.1.6-alpha.1` 的公开 Client 负责。以下早期团队样式记录保留为历史，不是当前实现。视觉证据见 `.artifacts/dsh-0.1.6-upgrade/native-team-web/`，验收结论以 STATUS 为准。


## 用户已确认需求

独立DSH标准插件，默认顶部40px一行（头像、身份、真实状态、长任务耗时、展开入口）。下面的正文、工具调用、输入框、文件卡片保持原生。适用于普通问答、技能、单专家、专家团；Skill是助理能力，不能装成员工。多次调用同一专家合并身份，不把累计子会话数当人数/并行数。

轻量情绪表达：准备和完成时微笑，执行时专注；呼吸/完成点头动效，长任务减缓动画。中断/失败停止工作动效，如实显示状态。动画可在展开详情中关闭，浏览器偏好可持久化；系统prefers-reduced-motion始终优先。关闭动画不关闭数据订阅。真实日志两分钟无进展显示暂未收到新进展；8分钟属于长任务展示阈值，不暗示即将完成。

展开使用紧凑浮层，不把正文下推。查看成员过程经官方openSubagent跳转；Escape和关闭按钮收起。头像仅使用已有、可安全展示的图片，否则姓名首字/助理表情占位，不生成或猜测真人头像。工具状态与真实终态读取结构化事件，不分析思考正文、任意文本或工具描述来虚构工作。

## 官方复用记录（P1-01）

基线0.1.6-alpha.1，公开发布包ui-conversation README/contract/slots及api-session-controller SessionBinding/eventSource、sessions.list、subagentAddress/openSubagent。使用官方Loader/Profile/dsh.client；不增加HTTP事件源、模型、执行器、任务数据库或第二个React root。身份经公开ActivityPresentation契约由专家插件核验会话固定修订；技能插件提供已有中文标题；可选适配器缺失时回退助理/子任务，不猜专家身份。

锁定版没有标题下方增量Slot。使用公开的 list `conversation.session.header.utilities` 注册独立组件，通过只匹配包含 `.wd-activity` 的原生header的CSS，预留48px并把40px栏定位在标题/标签下方。不读取/复制/覆盖原生Header组件，不重新声明其children，不改正文或Composer。卸载后effect删除组件与CSS，原生布局自动恢复。若升级提供专门附加Slot，优先迁移。初版Header包装在浏览器验证发现声明时序及子Slot所有权问题，已移除。

## 所有权与扩展

activity插件只拥有展示、动效和偏好；Session事实由Harness拥有，SOP验收由专家Host拥有。本轮completed只显示本轮结束，文件presented只表示文件已交付，不能据此声称SOP全部accepted。展示接收身份不能授予权限。

ActivityPresentation通过Cordis effect托管可选身份/技能标签resolver及订阅，不持有会话事实；跨插件只依赖contracts/activity。普通DSH无专家/技能适配仍可安装。动效通过局部[data-phase]、[data-motion]、[data-long]与CSS变量扩展，关闭与减少动效规则不可被主题绕过。首版不伪造待评审成员、不追加任务预算/签收写入接口。

## 验收

状态投影：completed/interrupted/failed区分；Host running优先；文件交付不等于阶段签收；工具/技能加载失败不假称使用成功。事件窗口替换重新折叠，切换会话取消元数据查询与计时器。真实浏览器：顶部只一行，原生工具/正文/input保持；关闭动画后状态更新正常、刷新保留；卸载恢复原header；不发送模型请求。

## 0.1验证结果（2026-09-13）

根build/typecheck、112项现有集成测试及9项活动投影/可选适配测试通过。独立官方CLI Profile安装/包字节核对、真实浏览器单行40px、保留原生正文、关闭动画后刷新保留、系统减少动态效果、Escape收起及无pageerror通过；独立Profile停用本插件后无组件/样式、恢复原生Header/正文通过。命令 `corepack pnpm test:activity`、`corepack pnpm probe:activity`、`corepack pnpm probe:activity --disabled`。浏览器探针前先安装到固定隔离目录；它只使用原生历史夹具，不调用模型。真实专家团端到端和TM-01验收不在该UI验证结论内。

后续正式preview验证：18989安装独立包并重启，在用户原1000万预算会话确认协作栏、固定主理人/会计/出纳身份、历史终态与文件交付显示，无pageerror；未重跑模型任务。

2026-09-13外观修订：保持40px单行，重叠圆形头像、细竖线、蓝色姓名与职责状态分段，结束摘要弱化到右侧，SVG展开图标；窄屏收敛次要段。姓名剥离已有职责后缀，避免重复。头像仅从会话固定修订的内嵌资源读取；未发布草稿图片不应用到历史任务。

用户再次要求按认可图校准：单行调整为46px，标签下留出12px，宽屏最大1120px居中，轻边框与圆形头像；普通助理取消双轮廓，工作时眨眼/呼吸和三点波动，右侧直接暂停/开启动效。仅真实working时循环，终态不假装持续工作；关闭和系统减少动态效果全局优先。

用户明确要求Siri式边框四周滚动色条：局部伪元素conic-gradient与mask-composite只保留1.5px边缘，@property角度每5秒循环；working且动画开启时滚动，关闭或减少动态效果静止，终态撤掉光带。不计量百分比，不新增执行事件。

用户要求进一步缩减一半并居中：宽度为原可用宽度的一半，最大560px；手机窄屏保留两侧10px以确保可用。高度46px与彩边动效不变。

## 2026-09-14 成员场景栏

用户收敛范围：只实现参考图顶部栏，保留半宽居中；团队56px双层文字、36px成员圆头像、运行成员光圈、Siri沿边动画及关闭开关。普通任务46px保留。团队组成来自绑定固定修订的定义；成员运行来自原生子任务目录，不把配置成员显示为已执行。没有已核实交接事件时不制造箭头、交接文字或运动光点；无成员运行显示主理人处理中。缺失头像保持姓名首字，不伪造写真。

官方复用记录：锁定Harness0.1.6-alpha.1；原conversation.session.header.utilities Slot和useSession/useSessions/eventSource保持。跨插件仅给workdsh-contracts/activity的ActivityIdentity添加可选teamName/members展示字段，专家提供绑定修订的只读身份，不改变执行/授权/存储。原生正文、文件卡及展开详情所有权保持。公开Slot证据来自既有隔离官方Profile浏览器探针；新增56px布局验证，不把CSS探针冒充真实多人运行验收。

2026-09-14 子任务动态刷新修复：官方ISessions.refreshSubagents公开入口读取catalog中的Agent driver采样状态。活动栏只读缓存会漏掉任务进行中的状态变化；组件首次/终态刷新一次，父任务运行时每3秒刷新官方目录，卸载/切换清理计时器，失败保留官方错误状态。不使用setSubagentCatalogOpen共享菜单开关，避免影响原生菜单生命周期，不另造执行状态。
