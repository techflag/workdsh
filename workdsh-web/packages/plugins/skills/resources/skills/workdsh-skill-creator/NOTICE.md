# 来源与修改说明

创建流程及 scripts/init_skill.py、quick_validate.py、package_skill.py 改编自用户提供的 WorkBuddy 内置 skill-creator，缓存版本 5.5.6-wb.38337834.g5f969292.hbc6253c2f32f。原 Apache-2.0 许可证保留在 LICENSE.workbuddy.txt；原文件未提供单独 NOTICE。

WorkDSH 修改：保留完整制作方法，替换平台专用目录、元数据和安装行为；初始化只面向工作草稿目录，校验阻止占位文件及失效引用，打包排除缓存并避免覆盖源文件。正式安装仍由 Harness 解析及 WorkDSH 导入服务拥有。
