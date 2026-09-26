# 专家专业任务验收数据

均为虚构门店数据。normal.csv 用于真实模型验收；incomplete.csv 只有收入，无法推断门店、客流和转化驱动；dirty.csv 含一条重复记录、一处客流缺失、一条以分计价的记录。

expected.json 是验收答案，必须留在仓库侧，不能复制到模型工作区或配备技能中。SKILL.md 提供方法与输出约定，不包含答案。原始输入必须保留。

真实探针只在显式执行 probe:experts:professional 时调用模型，使用临时 Home/Profile 和此目录的合成数据。凭据来自本项目预览已配置的 DeepSeek 引用，不进入参数、日志、成果或测试包，探针退出删除临时凭据。正常业务测试不依赖模型或网络。

专业报告另需人工复核：事实与假设分离、相对百分比与百分点、指标变化不冒充业务因果、可执行建议与必要追问。文件存在或数值校验通过不能独自代表全部专业验收。

运行命令（仓库根目录，Node 22）：

```sh
corepack pnpm probe:experts:professional
corepack pnpm probe:experts:professional incomplete
corepack pnpm probe:experts:professional dirty
```

持久日志核对使用系统 `zstd`，只解码官方 v3 格式、不改日志。模型任务已结束而浏览器断言失败时，可执行 `node scripts/recheck-expert-professional.mjs <制品目录> <场景>`，独立复查完成事件、固定技能回执、真实文件与数值，再冷启动核对绑定；不会再次发送模型任务。报告中的 `professionalReview` 保持 required，人工专业签收单独记录。
