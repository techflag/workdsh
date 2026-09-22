# 0.1.0-alpha.52 — 2026-09-22

- 搭载 `workdsh-plugin-workbench@0.1.0-alpha.15`：「新建任务」由「点击即起空会话」改为任务创建器（UI-DESIGN 第 5 节）。组合包自身代码未变，本版只为携带客户端制品。
- 需与 `workdsh-plugin-workbench@0.1.0-alpha.15` 同批安装。

# 0.1.0-alpha.51 — 2026-09-22

- 侧栏导航按 2026-09-22 用户决定改为「新会话 → 新建任务 → 项目 → 助理 → 专家 · 技能 · 连接器 → 定时任务 → 资料库 → 更多」+ 底部设置。
- 新增「新建任务」导航行（`workdsh-workbench-client` 注册，`order: 0`）：官方 `sidebar.panellist` 的行按钮由官方 shell 固定调用 `ctx.layout.selectPanel(id)`，公开面没有自定义 onClick，因此该行与一个不渲染内容的 `workdsh-new-task` `main` 面板配对，面板挂载即调用官方 `ctx.uiWorkspace.startSession()`，随后由官方 `replaceMain`/`clearMain` 回到原生空会话；不复制输入器、会话与执行状态。
- 「项目」行 `order` 由 20 调整为 5，排在「新建任务」之后、「助理（10）」之前。
- 官方 `ui-plugin-manager` 已在 profile 层 `cordis.patch.yml` 禁用：导航行「插件」消失，插件管理继续由「设置 → 内置插件」提供；探针记录见 `docs/STATUS.md` 2026-09-22。
- 需与 `workdsh-plugin-workbench@0.1.0-alpha.14`、`workdsh-plugin-projects@0.1.0-alpha.3` 同批安装。

# 0.1.0-alpha.50 — 2026-09-20

- 合并上游 `0.1.6-alpha.2` 线：官方依赖与 `pnpm.overrides` 精确锁定统一到 `0.1.6-alpha.2`，组合包保留本线的 10GE 侧栏字标与 `DSH JOB AI` 品牌名（上游同版为官方默认品牌）。
- 外部 URL 契约按「待开放」策略取本线：`?workdsh-view=assistant|projects|automation|more|library` 仍映射到对应的 `main` 面板，面板未注册时静默回落对话视图且不报错；上游「隐藏未实现入口」带来的 `assistant|automation|more` 链接失效行为不再适用。
- 版本号撞号修复：本线已发布到 `0.1.0-alpha.49`，上游线发布过 `0.1.0-alpha.46`/`0.1.0-alpha.47`，合并后重新定版为 `0.1.0-alpha.50`。
- 需与 `workdsh-plugin-workbench@0.1.0-alpha.13`、`workdsh-plugin-projects@0.1.0-alpha.2`、`workdsh-plugin-library@0.1.0-alpha.3`、`workdsh-plugin-skills@0.1.0-alpha.32`、`workdsh-plugin-office@0.1.0-alpha.8` 同批安装。

# 0.1.0-alpha.49 — 2026-09-19

- 侧栏品牌位 `sidebar.brand.mark` 由原 W 图标（`workdsh-ui` 的 `LogoMark`）替换为 10GE 字标：按官方 owner props 的 `size`（官方传 24px）等比绘制的自绘 SVG，`viewBox` 235×70 单带，“1 / 眼球 / G / E”共用同一光学高度。
- 眼球用“24 齿虹膜环 + 白巩膜 + 蓝虹膜 + 深瞳 + 高光”构成，替字标中的 0；`1/G/E` 为蓝色，环随 `currentColor`（0.85 不透明度）取自官方 `--dsw-alias-label-primary`，暗色主题保留原稿的钢灰观感，浅色主题不会没入 #f9fafb 侧栏。
- 官方模块加载器不提供图片静态路由，故不引入位图资源：字标以纯 SVG 内联，不新增资源目录、不依赖打包器的资源 loader。
- 名称 `DSH JOB AI`（`sidebar.brand.name`）与两个席位的 owner props 未改动；`workdsh-ui` 的 `LogoMark` 仍导出，未删除。

# 0.1.0-alpha.48 — 2026-09-19

- 工作台不再为「资料库」登记侧栏行：入口和页面同属 `workdsh-plugin-library`（`0.1.0-alpha.2` 起自持），只装组合包不装资料库时不再出现点击即抛错的死入口。
- 本版必需与 `workdsh-plugin-library@0.1.0-alpha.2` 同批安装；只升组合包会让「资料库」入口消失。

# 0.1.0-alpha.47 — 2026-09-19 / 2026-09-20（本线与上游线撞号，此处合并记录）

- 资料库面板 `workdsh-library` 的 `main` 席位交还 `workdsh-plugin-library`；组合包不再为它注册占位面板，避免同 key 重复注册。
- 助理、项目、定时任务、更多仍是未实现入口，侧栏标签追加「待开放」并在面板内说明原因与当前可用路径。
- 官方 `sidebar.panellist` 公开注册面没有 disabled 语义，待开放状态只能通过注册标签与说明面板表达。
- 修复设置页「外观」切换不生效：工作台客户端不再注册并强制 `workdsh` 深色主题、不再拦截 `theme/change`；外观改由官方 ThemeRuntime 与用户偏好驱动，浅色/深色/跟随系统切换即时生效，三个选项的选中态恢复显示。

# 0.1.0-alpha.46 — 2026-09-18 / 2026-09-16（本线与上游线撞号，此处合并记录）

- 跟随 DSH 0.1.6-alpha.2 升级：组合包与功能插件的官方依赖精确锁定同步至 `0.1.6-alpha.2`；projects、experts、skills、library、office、activity 六个客户端插件完成 Client Session 迁移。
- 外部 URL 契约一次性变化（上游按「隐藏未实现入口」处理）：`?workdsh-view=assistant|automation|more` 外部链接不再切换视图，静默回落到对话视图且不报错；项目任务改由原生会话导航打开，旧链接遗留的 `?task=` 参数在项目面板打开时被清理。
- 按用户要求把侧栏品牌名称由 `WorkDSH` 改为 `DSH JOB AI`，继续由公开 `sidebar.brand.name` 席位提供，未改动 mark 与 owner。
- 同步 `scripts/probe-browser.mjs` 中的品牌断言文本。

# 0.1.0-alpha.45 — 2026-09-15

- 显式安装 DSH 0.1.6 官方实验性 Auto review 层。
- 仅在当前会话的权限选择器中提供 `Auto review`；不改变默认权限，也不把它写入新会话默认值。

# 0.1.0-alpha.44 — 2026-09-15

- 显式组合 DSH 0.1.6 官方 Browser Use 注册服务与 Playwright MCP 提供方。
- 默认使用每个活动 Session 独立拥有的无头 Chromium，保留官方跨轮次状态与释放规则。

# 0.1.0-alpha.43 — 2026-09-15

- 显式组合 DSH 0.1.6 官方 Computer Use 注册服务与原生 Cua Driver 提供方。
- 增加只读原生驱动探针，核对工具目录及 macOS 辅助功能、屏幕录制权限。

# 0.1.0-alpha.42 — 2026-09-15

- 组合本轮共享弹框、内置技能、专家管理和 Office 模板能力候选。
- 更新隔离安装探针以覆盖当前原生 DOCX/PPTX 界面与首次依赖安装。

# 0.1.0-alpha.39

## 0.1.0-alpha.40 — 2026-09-12

- 单个专家 alpha.1 配套：独立 Host 组合、共享 Skill 修订与受控任务入口。
- Companion for Experts alpha.1: standalone Host composition, shared Skill revisions and governed task entry points.


- 移除 Skill Host/Client 的内嵌初始化和运行依赖，默认预览通过官方 CLI 显式安装独立 Skill alpha.24 配置层。
- Workbench alpha.10 使用 ctx.plugin 注册子插件；品牌和诊断不再等待 Skill 专属服务。
- 初始 URL 待官方 Client 组合后恢复，并核对目标页面是否已注册，防止独立功能加载时出现空白页。

# 0.1.0-alpha.38

- 组合共享 UI alpha.4：公开入口、TSX 组件、设计令牌与样式模块分离，保持现有组件 API 兼容。
- 增加 WorkDSH 品牌 Logo 的可维护 SVG 与应用图标视觉稿。

# 0.1.0-alpha.37

- 将 Client 公开入口、Harness 装配、品牌、URL 状态、诊断 TSX 和样式拆分，移除入口文件中的 `createElement` 页面结构。
- 接入验证仅在显式 `diagnostics=1` 时注册；普通产品 URL 中的 diagnostics 请求回到原生 Conversation。

# 0.1.0-alpha.36

- 组合 workbench alpha.9：将 Harness Slot 装配与 TSX 页面/样式拆分，保持公开入口和官方 UI 所有权边界清晰。

# 0.1.0-alpha.35

组合 skills alpha.23：认证 Fetch 增加超时与取消结算；导入打包、流式上传、预检和原子安装传播 AbortSignal，并提供可见取消操作。发布前取消不安装，已验证暂存可继续确认。

# 0.1.0-alpha.34

组合 skills alpha.22：补齐批量管理、卸载依赖影响与确认后竞态复核；新增受管导入、资源保留、冷进程重启和官方调用的组合验收；修复卡片菜单点击层级和导入弹框关闭顺序。

# 0.1.0-alpha.33

组合 skills alpha.21：接入 Harness 官方类型化 Tool 注册，新增受控草稿、校验、显式确认发布闭环；无效本地技能不再静默消失，列表和详情展示诊断并允许修复。

# 0.1.0-alpha.32

组合 skills alpha.20：全局同名安装使用跨进程技能锁，覆盖所有官方根、扁平 `.md`、目录技能及其他已注册提供方；暂存和复制安装使用完整文件清单内容指纹复核，拒绝预检后同长度篡改。补充并发确认与 Host 重启后确认回归。

# 0.1.0-alpha.31

组合 skills alpha.19：增加规范的技能导入弹框与认证流式上传，Host 先对 `.zip`、`.md` 或文件夹做结构和安全预检，用户确认后才写入官方技能目录；保留未来公共技能分类的禁用设计位。

# 0.1.0-alpha.30

组合 skills alpha.18：保留停用技能原始作用域并原位恢复，以跨进程锁封闭 revision 检查与写入竞态；增加受控根/符号链接校验、资源文件查看编辑、新建资源、最近卸载与恢复，并在页面重新获得焦点时刷新全局目录。

# 0.1.0-alpha.29

组合 skills alpha.17：全局技能页改用 Host SkillManager，经 Harness Connection 的鉴权 `/api` Fetch route 读取与管理；编辑保存含 revision 冲突检测，打开目录复用 session.openWorkspacePath，启停与可恢复卸载直接生效并刷新全局列表。

# 0.1.0-alpha.28

组合 skills alpha.16：将 Client 的 Harness 装配、页面组件、任务草稿和样式拆分，保持官方 Slot 与唯一 renderer 运行契约不变。

# 0.1.0-alpha.27

组合 skills alpha.15：技能 Host 增加导入目录预检、符号链接与体积限制、官方共享/Profile 目标选择、临时目录复制后复核及原子安装；失败时清理临时产物。

# 0.1.0-alpha.26

技能库对齐 WorkBuddy 的紧凑已安装卡片、操作菜单和浮层详情；组合共享 Modal，并加入本地技能正文、资源、修订冲突、启停与可恢复卸载 Host 服务。

# 0.1.0-alpha.25

技能 Client 页面改用 TSX 表达 React 结构；继续通过 Harness 官方 Slot 和注入 props 组合，行为与数据边界不变。

# 0.1.0-alpha.24

修正从长列表进入详情时沿用旧滚动位置的问题，详情每次从标题与试用入口开始显示。

# 0.1.0-alpha.23

技能列表按“我安装的”真实范围组织，卡片进入独立摘要详情；详情提供原生“去试试”任务入口。完整正文、编辑、打开目录、启停和卸载在 Host 管理契约接入前不显示假动作。

# 0.1.0-alpha.22

将 `skill-creator` Host 注册迁回技能插件源码所有，组合包在构建时装配；所有任务共享技能默认写入官方 `DSH_AGENTS_HOME/skills`，补充同名冲突、显式更新和公共分类元数据边界。

# 0.1.0-alpha.21

技能库移除没有真实元数据支撑的办公协同、开发工具、数据分析、内容创作和知识学习分类，并将无动作的“我安装的”按钮改为静态已安装数量状态；搜索和添加技能保持可操作。

# 0.1.0-alpha.20

“添加技能”改为查找、上传、创建三项菜单；上传与创建进入 Harness 原生 Conversation，分别预填导入说明和 WorkBuddy 参考创建文案，继续保留原生附件、命令、权限、模型与发送能力。skill-creator 增加导入检查约束，避免执行未审查脚本或建立第二套技能注册表。

# 0.1.0-alpha.19

技能库移除当前产品不存在的 SkillHub/套件，并开放“添加技能”。入口创建 Harness 原生 Session，通过公开 InputActions 预填 `/skill-creator`；随包引导技能注册到官方 SkillRegistry，创建结果继续由官方文件提供方、watcher 和 `/name` 调用链处理。

# 0.1.0-alpha.16

组合 workbench alpha.8：在官方 Sidebar 骨架中恢复 WorkBuddy 参考的 WorkDSH 业务导航和能力中心入口，同时保留原生工作区/会话能力。

# 0.1.0-alpha.14

组合 workbench alpha.6 与 skills alpha.4：恢复 Harness 官方 Sidebar 的完整工作区/会话操作，并删除原生侧栏中残留的“专家 · 技能 · 连接器”入口。

# 0.1.0-alpha.13

组合 workbench alpha.5：删除自建新任务输入器，首页与未知路由统一落到 Harness 原生 Conversation 空会话，从官方输入链获得 `/`、`@`、附件、权限、模型和 preset 能力。

# 0.1.0-alpha.12

组合 workbench alpha.4：左侧显示真实工作区与所属会话，首页只显示当前工作区；删除左侧能力中心聚合入口。

# 0.1.0-alpha.11

补齐首页依赖的 `workspaces` 与 `conversation` Client 服务注入声明，确保 Cordis 在渲染首页前完成官方服务装配。

# 0.1.0-alpha.10

组合 workbench alpha.3：默认 home 改为 WorkDSH 新任务入口，使用 Harness 官方工作区、Session 与 Conversation 服务创建任务；接入验证移至 `workdsh-view=diagnostics`。

# 0.1.0-alpha.9

组合 skills alpha.3：技能页改为全局技能库，移除任务选择与“打开对应任务”，增加已安装、SkillHub、分类和安装入口骨架；未接入的写操作保持禁用。

# 0.1.0-alpha.8

修正设置弹框主按钮受侧栏通用文字色覆盖的问题，并锁定按钮宽度与悬停对比度。

# 0.1.0-alpha.7

组合 workbench alpha.2：设置入口改为显式的设置说明弹框，避免点击后无解释地进入 Harness 新会话页。

# 0.1.0-alpha.6

固定公共侧栏窄屏图标栏呈现，避免预览同版本制品缓存；沿用 alpha.5 已验证功能。

# 0.1.0-alpha.5

组合 workbench 与 ui 首版，正式侧栏使用原型导航结构和共用图标；任务读取官方实时模型，保留原生导航往返。skills alpha.2 复用公共图标并提供“我的技能”范围入口。

# Changes

## 0.1.0-alpha.2 — local Client probe

- Add a browser diagnostic panel through official main/sidebar Slots.
- Read live Host plugin inventory through the official Remote namespace.
- Declare the package root Host export for rc.1 Client discovery; retain ./probe.
- Build a single-file browser artifact using the public ClientBundleRegistration protocol; React remains a platform external.
- Add headless Chromium checks for discovery, navigation, Remote response and page reload.
- No business workbench, database, model request or external account integration yet.

## 0.1.0-alpha.1 — local P0 candidate

- Add a compiled lifecycle probe and a public dsh.bundle patch.
- No business tools, model calls, credentials or UI changes.
- Local tarball testing only; no registry release.

## 0.1.0-alpha.3

组合 skills 0.1.0-alpha.1：真实任务技能目录、搜索、说明弹框、新建/返回任务及命令复制。使用官方 Session/skills Remote，尚不含技能导入、修订与团队管理。

## 0.1.0-alpha.4

修正原型偏差：官方深色主题、能力分类工具栏、折叠任务范围、中性技能卡片；正常入口隐藏接入诊断导航。业务侧栏尚未整体迁移。
