# iOfficeAI/OfficeCLI PPT独立测试（2026-09-13）

仅测试本机既有officecli1.0.149，未安装/升级，未改18989/19093或产品依赖。本机officecli技能及load_skill pptx、help pptx add chart/chart-series/watch作为已安装版本契约。使用公开create/add/get/set/close/validate/view/watch，不改第三方源码，不配置模型或账户。

## 结果

- create +逐项add/get创建五页pie/column/line/doughnut/area，各1个原生图表。每步记录CLI退出码，不从模型说明判断成功。
- set /slide[1]/chart[1]/series[1] values=77,3,5；close后重新get保留77,3,5。其它图仍7,3,5。
- OpenXML validate通过，0错误。
- ZIP包含ppt/slides/charts/chart1.xml～chart5.xml，分别pieChart/barChart/lineChart/doughnutChart/areaChart，5原生图表；无嵌入xlsx工作簿。不能宣称PowerPoint/WPS编辑数据完整兼容。
- 原生watch绑定19094，浏览器五图显示。CLI将第五页文字设为唯一Live preview时间戳，浏览器经原生SSE刷新看到新文字，无pageerror，本样本无外部网络请求。
- **第五页更新后仍不在当前视口**，top约3034px；watch goto <file> /slide[5]/shape[1]失败，帮助/实际诊断仅支持Word段落/表格等。之后测试脚本手工scrollIntoView才能看到第五页，不能把这步记为原生PPT焦点跟随。
- 五图截图独立视觉复核通过：图形/标题/图例不重叠、不截断。功能样本不是设计成品。

## 证据

.artifacts/officecli-trial/test.py、commands.json、result.json、charts.pptx、preview.html、watch-result.json、chart-1.png～chart-5.png。

可复测原生watch脚本：node scripts/probe-officecli-watch.mjs（需先运行officecli watch .artifacts/officecli-trial/charts.pptx --port 19094）。脚本将nativeGoto失败作为已观察缺口记录，整体退出0不意味着PPT跟随已通过。独立页面http://127.0.0.1:19094/保留供用户体验。

未执行：真实模型AI自然语言生成、全部图表类型、Word/Excel新测试、表格/图片往返、PowerPoint/WPS文件打开/编辑数据、完整Host/资源/身份/审计/CAS生命周期接入及发布门禁。watch帮助明确外部程序改文件不自动检测；与另一可视化编辑器联合使用需定义受控刷新和保存边界，不能默认同步。

## 结论

作为AI Office文件操作工具值得采用评估，常见PPT原生图表创建和读改保存已验证。原生watch当前是预览/选择辅助，不等于完整人工PPT编辑器，也未解决当前制作页自动跟随。后续若采用仍走Harness工具执行和资源/同一Office服务边界；本轮没有引入第二个AI执行器或替换默认PPT编辑器。
