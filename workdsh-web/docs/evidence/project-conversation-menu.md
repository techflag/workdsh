# 项目对话输入菜单统一（2026-09-22）

用户确认效果稿：一个＋入口，文件、专家、技能、连接器级联选择，空态留在小菜单内；项目首页与会话保持一致。

## 官方能力复用

- 基线 `0.1.7-alpha.1`，`docs/dsh-v0.1.7-alpha.1/docs/subsystems/slots.md`：list 同 id 以 priority 替换展示，disposer 释放恢复。
- 发布包 `dsh-client-ui-input-trigger/client` 的 InputTriggerController：menu、launcher、pick、dismiss。仅项目会话的原生 command launcher 临时替换 slash-menu；普通 `/`、`@` 不替换。
- 实测：原生光标 track 会将 launcher 清为 null，保留零宽 synthetic hit 的 command-only menu。适配同时识别此公开 menu 快照；没有读写私有 controller 字段。
- `conversation.input.overlay` / `input.dock` / `input.left`：菜单与连接器标签、收拢 WorkDSH 自有资料/连接器入口。未复制原生编辑器、上传、发送、队列或执行器。
- 文件通过原生 command 的 file 候选 pick 打开。项目资产引用继续由资料库 source 的 codec 序列化；载荷抽为 `LibraryComposerReference` 公开契约。

## 实现

- ProjectMenu 共用于首页与项目会话，具有 hover/click、搜索、键盘上下/返回/Escape、外部关闭、窄屏单面板、主题语义颜色。
- 首页选择仅存本项目草稿，Host 创建任务固定配置修订和显式能力选择；专家须显式选择一位，不自动取首位。
- 项目会话允许选择任务创建时绑定的能力。连接器持久选择以现有 connector selection 为真源，不写项目默认配置；失败保持原选择。展示所有当前选择（包括旧会话历史选择），不隐瞒旧连接器。
- 技能通过 InputActions 插入原生 `/name`；项目资产使用资料库原生引用 chip。
- 专家菜单说明并确认新建项目任务，调用现有专家 prepare/create execution，保留原任务，不自动发送复制的草稿。
- 权限、模型、语音、发送/停止及原生输入框布局保留；本切片统一菜单交互，不声称逐像素替换原生会话布局。

## 验证

- 项目和资料库构建/typecheck 通过。
- 项目 12 项测试通过，含任务空选择、其他任务隔离、原配置更新后历史任务固定、主体隔离。
- check-plan 与 git diff --check 通过。计划检查不等同产品验收。
- `scripts/probe-project-conversation.mjs`：真实预览级联、Escape、原生文件 chooser、明暗背景、390px 返回、原生 `/` 回退、连接器保存失败/重试及项目默认配置不变、技能插入、首页菜单、新会话退出。
- 探针对当前测试会话的连接器选择做一次往返并还原，未发送模型消息。503 是显式故障注入，不是实际服务异常。
- 截图和结果 `.artifacts/project-conversation/`。开发验证可用 PROBE_LOCAL_BUNDLE 注入当前客户端制品；最终已安装重启 18989，并在无该环境变量时复验通过。启动等待阶段两次探针因尚无登录 URL 退出；服务就绪后的完整探针通过。

未执行：真实模型执行、专家新任务实际交付、完整附件上传和发送回放、屏幕阅读器、全库业务回归。专家已发布修订若与当前 Harness 不兼容，仍显示服务端诊断，不静默修改旧修订。

## 项目主导航修复

复用锁定版本官方 main key 与 layout.selectPanel（slots.md、发布包 layout service.d.ts），将 workdsh-projects 主页与 workdsh-project-detail 详情分开。侧栏仍由官方拥有；卡片与 lineage 显式进入详情，主页不恢复旧 project 查询参数。不拦截原生 DOM，不覆盖导航服务。验收：详情再次点侧栏返回列表、跨页面返回列表、lineage 进入所属详情。

上述导航验收已在安装后的 18989 通过：scripts/probe-project-navigation.mjs，详情/会话返回主页、lineage 与刷新详情均通过，无 pageerror。项目/bundle build/typecheck 与 diff 检查通过。
