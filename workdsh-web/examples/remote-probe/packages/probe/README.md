# D01 Remote 发布包兼容性用例

仅测试用，不属于 workspace 交付模块、不安装进产品 Profile。使用官方 protocol 定义无业务数据的服务，固定 rc.1 生成器分析 Host project reference。

- `corepack pnpm probe:remote:generate`：编译后调用公开生成 API，失败返回非零；诊断写到 `.artifacts/workdsh-typert-*`。修复后才可接 Loader/Gateway/Client。
- `corepack pnpm test:remote:lifecycle`：真实 Cordis 服务中的成功、取消、并发请求互不影响、卸载及重装；不证明网络 Remote 或团队隔离。

生成器需要 `lib/types` 类型出口，以及逐文件列出的生成物 `files`，目录包含不足以通过其校验。当前 rc.1 在纯 npm 外部工程中识别了服务和方法，却未生成 Remote 元数据；详见 `docs/evidence/d01-remote.md`。
