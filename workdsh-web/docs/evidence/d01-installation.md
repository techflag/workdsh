# D01 发布包安装与生命周期验证

> 2026-09-12 收口说明：后续证据已完成本地 bundle/Host/Client 安装、浏览器组合、重连、移除与重装。本文件中“仍在进行”保留为 2026-09-10 当时记录；D01 现按本地单用户范围完成。企业部署另见 [企业版架构说明](../ENTERPRISE-EDITION.md)。


日期：2026-09-10。D01 仍在进行，仅 P0-01/P0-02 的部分证据。

## 实际环境与产物

Node 22.23.2、pnpm 10.34.5、DSH 0.1.5-rc.1、Cordis 4.0.2。根锁文件和精确 overrides 固定发布依赖；没有上游 checkout。发布元数据清单见 p0-published-packages.json。bundle 为 0.1.0-alpha.1 本地测试包，不代表产品发布。

## 本轮检查

- build、typecheck：通过。
- test:integration：真实 Cordis 加载 bundle，effect 注册、释放、重复 dispose、再次加载及释放通过；不是模拟加载器。
- probe:install：tgz 安装到独立 DSH_HOME/Profile，配置包含探针，Host 激活通过。
- HTTP：匿名访问 401；本机临时登录后 200。凭据仅测试内使用，不存入本证据。
- 停止 Host 后 CLI remove：配置移除；重启 Host 可访问且无探针激活。重新 add 并重启后激活通过。

## 明确限制

前次在 Host 运行时 CLI remove 后等待 disposer 超时。此次没有把此项改称成功：停止 Host 再变更安装组合是当前验证的操作方式；运行时 CLI 热卸载、Client 注册与订阅清理仍需独立验证。Cordis fiber 清理通过不代表 CLI 自动热卸载通过。

Client 模块发现、Remote 调用、页面贡献、取消与重连尚未实测。已核对官方 Web Client / Client Modules 文档与发布包公开类型：dsh.client 和 ./client 导出需要专用浏览器产物；不能把 Host ESM 直接当浏览器插件。后续按公开构建协议实现探针。

专家预设、技能、跨主体授权、文件写入隔离、数据库和真实模型请求均未验证。P0/P1 验收不据此整体通过。

## 复现

见 ../DEVELOPMENT.md 的命令。默认安装探针不打开浏览器；`probe:browser` 会启动无头 Chromium。两种模式都不请求模型、不写用户默认 Profile。生成测试目录保留便于排查；每次使用新目录，测试 Host 在 finally 中关闭。

## 2026-09-11 补充：Skill 状态的打包重启验收

带 `--browser` 的安装探针现会在 bundle 保持安装时额外执行两次 Host 冷重启。它通过真实认证 Web 验证导入、回收站恢复、正文编辑、资源文件和停用来源凭据能够跨进程恢复；随后仍执行停服移除、缺席检查和重装。该结果补充上文早期限制中“技能未验证”的陈述，但不改变运行中 CLI 热卸载仍未验证的边界。

验证命令：Node 22.23.2 下运行 `corepack pnpm probe:browser`，全部通过。测试只写新建的 `.test-runtime/install-*` 隔离目录，不读取或修改用户默认 Profile，也不请求模型。
