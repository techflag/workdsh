# 后续AI提交重新展开右栏 / OFFICE-AI-01 U2

官方复用记录见 U1-IMPLEMENTATION.md。复用锁定 rc.1 sidebarRight.openTabIn、现有pending/acknowledge及内容原子记录。首次ACK后pending为空，而旧edit未更新presentation；Client旧seen在open前写入，打开抛错会吞掉后续重试。新agent提交刷新presentation，human保存/相同operationId重放不刷新。Client成功open返回后才seen，抛错保持可重试。

Office typecheck/build、7项集成测试及11项确定性浏览器检查通过。新增服务ACK→新AI提交→新请求、Session隔离、重复重放不重开、human保存不重开。浏览器等待pending被ACK清空，通过公开sidebarRight API收起右栏，确认正文不可见，首批AI提交后确认正文重新可见并包含最新批次，之后格式/保存/下载/重开等原回归通过。使用真实Harness工具和浏览器，模型调用为确定性探针；本轮真实模型与全仓回归未执行。

不将截图文字当作Session执行日志。历史失败未完整复现；独立officecli/binary文件产物不等同content_*实时工作副本，文件卡自身仍可点击打开。未新增文件监听或劫持全部present。当前每次新AI提交都请求揭示，用户关闭后下一批仍会打开，符合本轮自动显示需求；人工编辑受租约保护。
