# 项目任务会话与 `@` 引用闭环：当前实现和待解决问题

更新时间：2026-09-17<br>
分支：`codex/dsh-0.1.6-upgrade`<br>
仓库：`/Users/techflag/project/workdsh`

## 用户目标

项目页应形成完整任务闭环：

1. 在项目输入框键入 `@`，立即打开与 `@` 按钮相同的项目内容选择器。
2. 选择计划待办、项目资料或技能后，在输入框显示引用标签。
3. 发送后，用户消息中仍能看到引用；资料正文必须真正进入模型上下文。
4. 任务应在项目工作台内运行和继续对话，不应跳到全局通用会话页。
5. 项目指令应作为模型上下文注入，不应作为普通用户消息正文显示。

## 已完成并验证的功能

### 项目基础能力

- 项目列表、搜索、模板创建、空项目创建。
- 项目指令与能力配置修订。
- 计划待办、项目资产引用、项目任务关联。
- 项目归档、已归档筛选和恢复。
- 单机版“活动记录”，记录项目、配置、计划、资产和任务操作。
- 任务固定创建时的项目配置修订和输入引用修订。
- 同一个待办可创建多个任务，不会自动把待办标记为完成。
- 项目资产只保存资料库固定修订引用，正文仍由资料库统一管理。

### 能力修订保护（尚未提交）

- 新增 `packages/plugins/projects/src/capability-selection.ts`。
- 已绑定能力默认保留旧修订，只有点击“更新到最新修订”才升级。
- 单元测试已覆盖“保留旧修订 / 显式升级 / 移除能力”。
- 项目插件测试曾通过 3/3。

### 本轮 `@` 行为

当前 `ProjectComposer` 已实现：

- 点击 `@` 按钮打开“引用项目内容”选择器。
- 在 textarea 末尾新输入 `@` 时，移除该触发字符并打开同一个选择器。
- 引用选择器可选项目待办、项目资料、项目技能。
- 已选内容以标签显示在项目输入框上方。

运行时验证结果：

```text
menu 1
value 分析
project ▱ 项目 / Host持久化验证
```

对应脚本（忽略文件）：`.artifacts/check-project-at.mjs`<br>
截图（忽略文件）：`.artifacts/project-at-menu.png`

### 项目指令和资料上下文

新增了项目任务上下文查询及系统提示词注入：

- `ProjectService.taskContext(actor, sessionId)` 根据原生 Session 找到项目、固定配置修订和任务引用。
- `packages/plugins/projects/src/runtime/context-injection.ts` 在 `system-prompt/assemble` 中注入：
  - 项目名称；
  - 创建任务时固定的项目配置修订；
  - 项目指令；
  - 非资料类引用（待办、技能）。
- 资料引用仍调用资料库的 `set-task-selection`，由资料库既有的 `buildLibrarySelectionContext` 读取固定修订正文并注入模型上下文。
- 项目指令不再拼接到用户消息正文。

### 项目内任务界面原型

已增加项目内会话界面 `ProjectConversation`：

- 项目顶部面包屑显示“项目 / 项目名 / 任务”。
- 右侧项目配置继续保留。
- 中间显示本轮引用、用户消息、助手文本、错误状态和运行状态。
- 底部可继续发送后续消息。
- 打开任务时 URL 保持 `?workdsh-view=projects`。

一次运行时验证结果：

```text
tasks 9
inside 1
url http://127.0.0.1:18989/?workdsh-view=projects
```

对应脚本（忽略文件）：`.artifacts/check-project-task-view.mjs`<br>
截图（忽略文件）：`.artifacts/project-task-in-project.png`

## 问题与闭环状态

### 1. 历史任务的消息没有加载到项目内界面（已修复 2026-09-17）

原问题：进入历史任务后只出现“正在项目中处理…”，没有历史用户消息和助手回复。原因：仅调用 `ctx.uiConversation.binding(sessionId)` 不足以让未打开的历史 Session 加载事件窗口，必须由 Session Controller `sessions.open(sessionId)`（内部 `manager.select` → `notifyNow` → 事件窗口拉取）先打开该 Session。

修复（`packages/plugins/projects/src/client.tsx` + `src/client/ProjectsPanel.tsx`）：

- `openTask` 保留 `sessions.open` + `selectPanel('workdsh-projects')`，增加 25×200ms 重试与 `onReady`/`onFailed` 回调；实测不会切回通用会话。
- URL 持久化 `?workdsh-view=projects&project=<projectId>&task=<sessionId>`（`replaceState`，与官方 NavigationLocation 不冲突），面板挂载时恢复项目/任务；`openTask` 成功后才恢复会话视图，失败则清除 `task` 参数并提示。
- 新增 `ProjectConversationHost` 包裹 binding 调用（try/catch + 随 session list 更新自动重试）：刷新恢复期间不再因 `uiConversation.binding: unknown session` crash 整个面板。

运行时验证（preview 18989）：有消息任务正确显示 user/assistant 历史（1/1、1/6、1/2）；空任务显示诚实空态；刷新恢复 `inside=1 user=1 assistant=1`，控制台无错误。脚本 `.artifacts/verify-project-task-fix.mjs`，截图 `.artifacts/verify-project-task-reload.png`。

### 2. 新任务发送流程还没有完成运行时验证

当前 `startTask` 流程是：

1. 校验 `ProjectInputRef` 固定修订；
2. 创建原生 Session；
3. 为资料库设置该 Session 的固定资料选择；
4. 为连接器设置该 Session 的选择；
5. 先调用 `management.linkTask(...)`，使系统提示词装配时可按 sessionId 找到项目配置；
6. 通过 Session scope 的 `conversation.send()` 发送普通文本；
7. 用户消息文本末尾附加可见引用名称：`@资料库/文件名` 或 `@项目/名称`。

尚需验证：

- 新任务是否在项目页内直接进入运行界面；
- 用户消息是否显示引用名称；
- `system-prompt/assemble` 是否同时出现 `workdsh:project-task` 和 `workdsh:library-selection`；
- 模型是否直接使用资料正文，不再用 Bash/Glob 查找“资料库/文件名”；
- 任务失败时，已提前写入的 ProjectTaskLink 是否需要标记失败或回滚。

注意：运行真实模型会产生费用。可以先通过 Host/Session 测试替身验证 prompt assembly，再做一次最小真实任务。

### 3. 原生结构化引用标签没有直接复用

最初尝试把官方 `main.conversation` 子插槽直接声明为项目面板的 child：

```ts
children: { 'main.conversation': { kind: 'single', scope: 'session-maybe' } }
```

运行时失败：

```text
slot "main.conversation" is already declared
```

原因是官方 Conversation 插件已经在 `main` entry 中声明该 single slot；其他 `main` entry 不能重复声明。

因此当前实现使用项目内轻量会话呈现，而不是直接嵌入官方 `ConversationPanel`。不要再次走“重复声明 `main.conversation`”这条路径。

当前发送使用 `conversation.send(text)`，所以用户消息内的资料引用是可见文本，不是官方 Lexical `ReferenceInsert` 芯片。资料正文仍通过 `set-task-selection` 正确注入。若产品必须显示完全一致的原生引用芯片，需要选择以下之一：

- 在官方 Conversation 包增加受支持的可复用/嵌入 API；
- 增加公开的“带结构化引用直接提交”API；
- 通过官方可替换的主视图/路由扩展点承载项目壳，而不是重复声明已有 slot。

不要依赖私有 bundle 函数或复制官方完整 Conversation 组件。

### 4. 项目内会话目前只渲染基础节点

`ProjectConversation` 当前读取：

```ts
conversation.views.get('chat').legacy.nodes
```

只呈现：

- `user` / `steering`
- `assistant` 文本块
- `turn-error`

尚未呈现：

- reasoning
- tool call / tool result
- 图片和文件附件
- queue / steering 状态
- token/耗时信息
- 中止、重试、上下文变更
- 加载更早历史

长期更合理的方案仍是由官方 Conversation 提供嵌入 API；当前轻量实现适合作为 Alpha 项目工作台闭环原型。

### 5. `ObservableSnapshot` 的订阅稳定性（已确认无需修改 2026-09-17）

`ProjectConversation` 使用：

```ts
React.useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot)
```

需确认 `subscribe` / `getSnapshot` 是否是已经绑定的箭头函数。如果是依赖 `this` 的方法，应该包装为：

```ts
React.useSyncExternalStore(
  listener => source.subscribe(listener),
  () => source.getSnapshot(),
  () => source.getSnapshot(),
)
```

### 6. 项目任务链接创建顺序的事务问题

为了在第一轮请求装配系统提示词前找到项目配置，目前 `linkTask` 发生在 `conversation.send()` 前。如果发送失败，会留下一个没有成功首轮请求的任务关联。

建议增加明确生命周期：

- `pending`
- `running`
- `completed`
- `failed`

或者提供 `prepareTask` / `failTask`，避免无状态的孤立任务记录。

2026-09-17 现状：仍未实现任务生命周期状态（此项保持未闭环）。当前缓解：空任务（无消息记录）在项目内会话显示诚实空态“该任务还没有消息记录…”，不再误显运行中；发送首条消息可继续使用该任务关联。后续若实现 `failed` 标记，需同步契约、ProjectManager 与 UI。

## 当前未提交修改

运行：

```bash
git status --short
```

预计包含：

- `packages/contracts/src/projects.ts`
- `packages/plugins/projects/package.json`
- `packages/plugins/projects/src/capability-selection.ts`（新文件）
- `packages/plugins/projects/src/client.tsx`
- `packages/plugins/projects/src/client/ProjectsPanel.tsx`
- `packages/plugins/projects/src/client/styles.ts`
- `packages/plugins/projects/src/index.ts`
- `packages/plugins/projects/src/runtime/context-injection.ts`（新文件）
- `packages/plugins/projects/src/services/project-manager.ts`
- `packages/plugins/projects/tests/projects.test.mjs`
- `pnpm-lock.yaml`（依赖元数据变化）
- `scripts/desktop/` 是原有未跟踪目录，不要添加或修改。

## 已执行检查

本轮曾通过：

```bash
export PATH=/Users/techflag/.nvm/versions/node/v22.23.2/bin:$PATH
corepack pnpm --filter workdsh-plugin-projects test
corepack pnpm typecheck
node scripts/check-plan.mjs
git diff --check
```

2026-09-17 修复后重新执行：项目插件测试 3/3、`corepack pnpm typecheck` 退出 0、`node scripts/check-plan.mjs` 通过（29 模块/50 文档）、`git diff --check` 干净；preview 已重装重启并完成上方运行时验证。

## 推荐的下一步顺序

1. build/install/restart preview，验证最后一次 `sessions.open()` 修改。（已完成 2026-09-17）
2. 若项目面板状态丢失，先实现 URL 驱动的 `projectId + task sessionId` 恢复。（已完成 2026-09-17）
3. 验证历史任务 Chat snapshot 能读取并显示消息。（已完成 2026-09-17）
4. 创建一个不带真实模型调用的 Session/Conversation 测试替身，验证：
   - 项目任务关联先于 prompt assembly；
   - 项目指令进入系统上下文；
   - 资料固定修订正文进入资料库上下文；
   - 用户消息不包含项目指令正文。
5. 做一次最小真实模型任务，检查项目页内的首轮消息、引用名称、资料回答和后续追问。
6. 补 UI/集成测试和验收证据后再提交。

## 关键文件

- `packages/plugins/projects/src/client.tsx`：Session 创建、资料/连接器选择、任务关联、发送、会话数据源。
- `packages/plugins/projects/src/client/ProjectsPanel.tsx`：项目 UI、`@` 触发、项目内任务界面。
- `packages/plugins/projects/src/client/styles.ts`：项目和项目内会话样式。
- `packages/plugins/projects/src/runtime/context-injection.ts`：项目指令系统上下文注入。
- `packages/plugins/library/src/runtime/context-injection.ts`：资料正文系统上下文注入。
- `packages/plugins/projects/src/services/project-manager.ts`：项目持久化、任务关联、`taskContext`。
- `packages/contracts/src/projects.ts`：项目公开契约。
- `docs/ACCEPTANCE.md`、`docs/acceptance.json`：总体验收状态。

## 不能遗漏的产品判断

- 当前是单机版，“动态”已改为“活动记录”，不要重新加入成员动态、邀请和协作筛选等虚假多人功能。
- 项目资产必须继续引用资料库固定修订，不能复制正文形成第二份事实源。
- 项目任务要使用原生 Session 作为执行和持久化实体，不能另造假的聊天记录。
- 项目页可以提供自己的呈现壳，但模型请求、历史记录、取消/继续等执行语义必须落在原生 Session 上。
- 资料里的文字是参考数据，不是系统指令或用户授权。
