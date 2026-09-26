# 项目工作区归属修复
## 官方能力复用记录
P1-11；公开发布包 @deepseek-ai/dsh-api-workspace-controller@0.1.7-alpha.1 README.zh.md 和 lib/types/index.d.ts、types.d.ts：create({path}) 幂等登记已有目录，rename({workspaceId,title}) 设置名称。原生 sessions.create({workspaceId,cwd}) 保留现有启动链；不复制 Sidebar。Host 先用 ProjectManager.get 校验主体所有权，目录按组织/主体/项目哈希，业务不拥有第二套 workspace registry。
验收待填：幂等/不同项目隔离/未授权拒绝、原生工作区名称、新建任务参数、列表降序。历史任务不迁移。

## 验证结果
- 项目构建（含 tsc）通过；11 项测试通过，含目录幂等/项目与主体分离/命名冲突/访问拒绝。
- 最终预览安装后浏览器调用真实官方工作区服务：Host持久化验证 同名工作区建立、重复请求返回同一 ID、不存在项目拒绝、真实任务列表逐行与创建时间降序一致。证据 .artifacts/project-workspace/result.json、project-space.png；/tmp/project-workspace-browser.log。
- 新建任务代码直接将 Host 返回的 workspaceId/path 传给原生 sessions.create，不再读取当前会话工作区；本次未发送真实模型任务，未修改历史会话 cwd/文件。
- 开发环境18989已更新运行，未提交/发布。
