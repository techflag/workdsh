# Remote 发布包兼容性探针

任务 P0-02；阶段 P0 / D01，状态 in_progress。仅本地集成验证，不是业务插件或团队入口，不纳入产品 workspace。

最小包在 packages/probe，真实 Cordis 生命周期测试在 tests/remote；命令由根 package.json 提供。生成器错误保持非零，尚未完成 Gateway / Client 端到端验证。

详见 [探针说明](packages/probe/README.md) 与 [证据和下一步](../../docs/evidence/d01-remote.md)。
