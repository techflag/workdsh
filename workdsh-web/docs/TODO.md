# WorkDSH 后期 ToDo

## 企业版服务端与管理 Web

状态：待排期，不进入当前本地单用户版本的实现或发布门槛。

- 建设独立 WorkDSH 企业服务端：组织、成员、授权、审计、组织 Skill、不可变修订和制品存储。
- 建设独立管理 Web：组织 Skill 列表、分类、版本、启停、可见范围、下发策略和成员个人上传策略。
- 建设执行节点同步：本机 Harness Host 或隔离 Worker 按主体同步精确授权修订，校验后原子投影到官方 Skill provider。
- 验证两组织两主体、撤权、黑白名单、跨设备、冷启动、离线 last-good、摘要/签名失败和历史修订。
- 暂不建设公共 Skill 市场；平台公共目录若后续立项，作为独立来源接入。
- 增加企业认证 provider 与受控 Session、文件、工具 Remote/API；浏览器身份字段不能成为可信主体。
- 增加执行节点注册、精确修订同步、摘要/签名校验、last-good、回滚和版本兼容策略。
- 验证成员停用或撤权后阻止新调用，并取消支持协作式取消的在途运行；外部已提交写入通过回执与补偿处理。
- 企业部署采用服务器端认证、租户数据边界、隔离 Worker、备份恢复和审计留存，不把可信本机 local provider 暴露为公网身份系统。

完整边界与工作包见[企业版架构说明](ENTERPRISE-EDITION.md)，架构决策见 [ADR 0015](adr/0015-skill-control-plane-and-runtime-projection.md)，产品参考见 [WorkBuddy 企业 Skill 管理](https://www.workbuddy.cn/docs/enterprise/adminguide/Skill%E7%AE%A1%E7%90%86)。
