# 开发与恢复工作

## 本地交互预览

首次运行或更新代码后，先构建并在预览 Host 停止时运行 `corepack pnpm preview:install`，通过官方 CLI 将 Skill 和产品展示包分别安装到预览 Profile。随后运行 `corepack pnpm preview` 启动 `http://127.0.0.1:3031`。该脚本默认使用项目内 `.test-runtime/preview` 作为 Harness Profile 数据目录，同时使用当前用户的 `~/.agents` 作为 `DSH_AGENTS_HOME`，因此官方 Skill 文件提供方可以发现用户原有技能。

`probe:browser`、`probe:install` 等自动化验收继续使用独立临时 `DSH_HOME` 与 Agents home，避免测试写入用户技能。不能把自动化测试的空 Agents home 用于人工预览，否则技能库只会显示 bundle 自带技能。需要显式测试另一套技能目录时，可在启动前设置 `DSH_AGENTS_HOME`。

## 当前可执行内容

`node scripts/check-plan.mjs` 校验目录和规划文件完整性，不依赖安装包。也可在准备好 pnpm 后运行 `pnpm check:plan`。

已加入发布依赖和 pnpm-lock.yaml，当前真实命令如下。安装探针会自动创建隔离测试 Profile、启动本机测试 Host，并在结束后关闭，不打开图形窗口。

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm check:env
corepack pnpm check:versions
corepack pnpm build
corepack pnpm typecheck
corepack pnpm test:planning
corepack pnpm test:integration
corepack pnpm probe:install
corepack pnpm probe:browser
corepack pnpm probe:skills
```

先 build 再执行集成测试和打包探针。测试数据位于 .test-runtime，tarball 位于 .artifacts，均不提交。当前尚无 WorkDSH 业务页面启动命令或发布入口。

## 目标环境

Node 22 LTS（22.19+）或 24；`.node-version` 默认 22.19.0。pnpm 固定 10.34.5。通过 Corepack 使用固定版本，不修改其他项目环境。

规划落盘时当前 shell 为 Node v21.0.0，不符合项目运行目标；仅使用内置 Node API 验证计划检查器。本轮实际验证使用 Node 22.23.2；后续命令同样必须先切换到合规 Node。

## 后续真实命令

P0 增加 build、typecheck、test、pack:check 和 smoke:harness；P1 增加 test:e2e。命令必须对应真实实现和断言，缺功能不能返回固定成功。

所有集成测试使用隔离 Harness home 和 Profile。打包后通过官方 dsh plugin 安装 tgz；启动使用官方 dsh CLI。开发工具可以封装命令，但不能成为另一个私有 Agent 启动器。

## 接续工作步骤

1. 阅读 AGENTS、STATUS 和当前阶段。
2. 查看 git status，不覆盖已有用户变更。
3. 选择未完成任务，列出依赖和验证方式。
4. 更新功能代码、测试和契约；若方向变化先补 ADR。
5. 记录实际检查输出、缺口与下一步。

不得因为新会话忘记 P2/P3；所有规划目录和任务 ID 都由完整性检查保留。

开发入口：先阅读 [逐插件交付计划](PLUGIN-DELIVERY.md) 和 development-order.json，只开展当前步骤允许的任务。每步完成记录证据再切换，不按目录顺序随意选择插件。

实现 Host/Client、Remote、Settings 或 Tool 前同时阅读 [Harness 扩展交付清单](research/harness-extension-delivery-checklist.md)。该清单区分可用于外部发布包的公开模式与只适用于 Harness 上游源码仓库的流程；本项目不修改官方 Session 格式、不 vendoring Harness 包，也不照搬上游 workspace 生成器。

浏览器探针使用 @playwright/test 1.58.2 的 headless Chromium；新机器如缺浏览器，运行 corepack pnpm exec playwright install chromium。截图保存为 .artifacts/client-probe.png。探针结束会关闭浏览器及测试 Host，不留下常驻服务。

## 真实交付路径验收

测试必须记录实际 Profile、构建产物与目标 origin。修改既有页面时在原地址核对渲染、交互及刷新；新开的隔离测试服务只能证明自身结果。HTTP 200、认证 cookie、启动 manifest 和页面可用是不同证据，不互相替代。不要用裸 Vite 启动完整 Harness 页面。

每个可见插件至少验证一次打包产物经真实 Loader 的核心操作，覆盖必需注入和可选服务缺席。快照之外独立断言必需工具、结构化错误和外部产物；不把 UNKNOWN_TOOL 或失败页面刷新成正确预期。测试分配独立临时资源并等待 teardown；无密钥路径不得因没有模型凭据而整体跳过。

## 局域网访问限制

锁定Harness 0.1.6-alpha.1实际CLI拒绝`--host 0.0.0.0`，提示会暴露远程代码执行能力。预览保持127.0.0.1，不按较新文档推断当前版本支持LAN监听。可在另一台具备SSH客户端的设备上建立 `ssh -N -L 3031:127.0.0.1:3031 techflag@<本机局域网IP>`，随后在该设备访问 `http://127.0.0.1:3031/`；要求本机已开启远程登录并完成SSH认证，官方浏览器认证仍保留。该方式不是多租户远程部署。

## preview启动内存恢复措施（2026-09-14）

实际启动触及Node默认约4GB堆上限并崩溃。预览脚本暂将子进程堆上限设为8192MB，可用`WORKDSH_PREVIEW_HEAP_MB`覆盖；上限不代表预分配，不是内存增长根因修复。旧依赖备份`node_modules.before-alpha4-1789048561`移至`/Users/techflag/.cache/workdsh-preview-backups/`保留，未删除用户会话/技能/对象。启动稳定性与内存增长仍需继续定位；不能把提高上限称为彻底修复。
