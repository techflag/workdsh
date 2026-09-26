# Preview Profile 实际技能整理

日期：2026-09-13。本清单来自正在运行的 18989 preview 服务的已认证只读管理请求 `/api/workdsh-skills`，endpoint=list/catalog；两项均返回 HTTP 200、ok=true。包含管理状态，不是全部技能的成品品质验收。完整本机响应保留 `.artifacts/preview-skill-list.json` 和 preview-skill-catalog.json，不公开认证信息或本机文件路径。

## 装配与数量

preview Profile 已安装 workdsh-plugin-skills alpha.26，以及 bundle/access/audit/experts/office 等插件。`scripts/start-preview.mjs` 默认 DSH_HOME 为项目 `.test-runtime/preview`，DSH_AGENTS_HOME 为用户 `.agents`；技能服务管理共享 agents/skills 和 DSH_HOME/skills。插件通过官方 ctx.skills 发现已合并技能，不是将每个技能声明为 preview npm 依赖。

本次管理清单 161 条：149 启用、2 只读、1 停用、9 格式异常；151 条 modelInvocable=true。清单同时包含管理条目，不能说全部 161 条都可被模型调用。分类可能多值，下方按第一分类分组，完整分类保留在表内。

市场目录 170 条，installed=true 为 137 条、可安装尚未安装 33 条。目录 installed 表示本地检测状态，不能证明实际同名条目的运行来源，也不能证明成功执行。管理清单还有不在市场内的条目。

共享本机文件扫描的 215 个 SKILL.md 包括嵌套参考等；它与官方合并后的 161 条清单是不同统计口径，不能作为技能丢失证据。preview 默认可见共享用户技能，不能说所有技能只属于 preview；DSH_HOME/skills 当前只找到 file-count-by-category 技能目录。不同 Session 的 preset、workspace 和 scope 可能改变实际模型可见集合，本次没有读取每个 Session 的上下文。

## 已配备能力的重点整理

| 能力 | 本次实际条目示例 | 学习与验收重点 |
| --- | --- | --- |
| 技能/专家创建 | skill-creator、expert-manager（只读） | 原生草稿、校验、明确发布确认、修订与真实回执；不能只看生成 Markdown。 |
| Office 与设计 | pptx、pptx-generator、deck-generator、elite-powerpoint-designer、minimax-docx/pdf/xlsx、officecli | 叙事、可编辑结构、格式校验与最终文件；原生 Office 流程继续使用 ContentService，外部技能运行环境单独核验。 |
| 研究与知识 | deep-research、arxiv-reader/watcher、citation-manager、qmd、llm-wiki、book2skill | 引用真实性、资料组织、输入到报告的可追溯性。 |
| 前端与开发 | frontend-design、impeccable、architecture-designer、fullstack-dev、mcp-builder、github、tdd | 设计意图、公开接口、可运行成果及相关检查；项目 UI 规范仍有效。 |
| 内容与传播 | content-factory/ops/repurposer、humanizer、x-longform-post、infographic-maker | 输出风格、事实来源、目标受众和可发布素材；有技能不等于授权对外发帖。 |
| 财务与商业 | finance-ops、market-researcher、stock-analysis、us-stock-analysis、earnings-tracker | 数据时间、计算过程和事实边界；不能由技能名称证明专业结论。 |
| 办公与应用 | gog、lark-unified、gmail、obsidian、apple-notes、trello、calendar 类技能 | 账号选择、凭据与外部写入回执，连接和依赖需实际配置。 |
| 浏览器与自动化 | browser-use、playwright-browser-automation、smooth-browser、cli-anything-hub 等 | 多技能路由与工具可用性，不同时强制介入所有网页任务。 |
| 技能审查 | skills-security-check、skill-scanner、skill-vetter | 区分审查与执行，不执行被审查内容；静态提示不替代真实可用性判断。 |

## 更正上一轮来源判断

preview 的 skill-creator 实际返回 readonly、manageable=false，描述为 WorkDSH 技能创建指南；对应 skills/src/index.ts 的 bundled 注册。已经读取该实现：收集必要信息→保存草稿→校验→明确确认→专用发布工具→真实回执，保留名称冲突与修订检查。它与本机/市场通用 skill-creator 副本不同；不要为了采用另一版本而覆盖现有创建服务。

本次 preview 的 list 和 catalog 都没有 tencent-pptx 或 ppt-implement。腾讯技能确实在 WorkBuddy 本机目录，其优秀方法可继续参考，但不能据此写为当前 preview 已启用能力。前文优秀技能整理补充此运行事实。

## 当前需核对的状态

agently-mail 停用。conversion-ops、fintech-engineer、growth-engine、marketing-skills、revenue-intelligence、sales-pipeline、sales-playbook、seo-ops、team-ops 返回格式异常、modelInvocable=false。返回诊断为 invalid-frontmatter/invalid-name/description-required；应核对实际读取文件、字段与官方解析结果，不能因本机某个同名文件看起来正常便忽略此状态。本轮不修复、不启用、不删改这些技能。

## 全量管理清单

以下描述来自实际管理响应/本地分类元数据，为能力声明而非作者品质评分。描述和类别只做整理，没有执行技能正文或脚本。

### 信息与资讯（1）

| 技能 | 状态 | 模型可调用 | 分类 | 能力说明 |
| --- | --- | --- | --- | --- |
| sino-drug-instructions-search | 启用 | 是 | 信息与资讯 | 药品说明书与用药信息检索 |

### 内容创作（33）

| 技能 | 状态 | 模型可调用 | 分类 | 能力说明 |
| --- | --- | --- | --- | --- |
| apple-notes | 启用 | 是 | 内容创作 | 管理 Apple 备忘录（创建、搜索、导出） |
| awesome-design-md | 启用 | 是 | 内容创作 | 54 个知名网站设计系统模板，一键复用品牌级 UI 风格 |
| brand-guidelines | 启用 | 是 | 内容创作 | 应用 Anthropic 品牌配色和排版到设计产物 |
| canvas-design | 启用 | 是 | 内容创作 | 基于设计哲学创作精美视觉艺术（PNG/PDF） |
| content-factory | 启用 | 是 | 内容创作 | 多智能体内容生产系统，一份素材生成多种格式 |
| content-ops | 启用 | 是 | 内容创作 | 内容质量评分与专家评审面板，递归迭代至 90+ 分 |
| content-repurposer | 启用 | 是 | 内容创作 | 将长文内容转化为多平台优化的社交媒体片段 |
| deck-generator | 启用 | 是 | 内容创作 | AI 驱动的演示文稿生成，统一视觉风格的幻灯片 |
| fbs-bookwriter | 启用 | 是 | 内容创作 | 福帮手出品 \| 高质量长文档手稿工具链：书籍、手册、白皮书、行业指南、长篇报道、深度专题；支持联网查证（宿主允许时启用，离线自动降级）、S/P/C/B 分层审校、中文排版与 MD/HTML 交付。触发词：福帮手、福帮手写书skill、福帮手写书、写书、出书、写长篇、写手册、写白皮书、写行业指南、协作写书、定大纲、写章节、封面、插图、排版构建、导出、去AI味、质量自检、图文书、写报道、写深度稿、写特稿、写专题、写调查报道、写长文、拆书改写、海外本地化改写、爆款结构改写、激活原料、原料盘点、整理素材 |
| gif-sticker-maker | 启用 | 是 | 内容创作 | 照片转动态 GIF 贴纸 |
| gifgrep | 启用 | 是 | 内容创作 | 搜索和下载 GIF 动图 |
| humanizer | 启用 | 是 | 内容创作 | 去除文本中的 AI 写作痕迹 |
| infographic-maker | 启用 | 是 | 内容创作 | 把文章、概念和数据提炼成手绘卡通信息图 |
| llm-wiki | 启用 | 是 | 内容创作 | 用 LLM 增量构建和维护个人知识库 Wiki |
| minimax-docx | 启用 | 是 | 内容创作 | Word 文档生成与编辑 |
| minimax-pdf | 启用 | 是 | 内容创作 | 高质量 PDF 文档生成 |
| minimax-xlsx | 启用 | 是 | 内容创作 | Excel 文件创建与分析 |
| nano-banana-pro | 启用 | 是 | 内容创作 | AI 图片生成与编辑（支持 4K） |
| nano-pdf | 启用 | 是 | 内容创作 | 用自然语言编辑 PDF 文件 |
| note-organizer | 启用 | 是 | 内容创作 | 基于 Joplin 的个人笔记管理与知识库工具 |
| obsidian | 启用 | 是 | 内容创作 | Obsidian 知识库管理与自动化 |
| openai-image-gen | 启用 | 是 | 内容创作 | 批量生成图片并创建图库 |
| openai-whisper | 启用 | 是 | 内容创作 | 本地语音转文字（无需 API 密钥） |
| openai-whisper-api | 启用 | 是 | 内容创作 | 通过 OpenAI API 转录音频 |
| podcast-ops | 启用 | 是 | 内容创作 | 播客内容拆解流水线，一期节目生成 20+ 跨平台内容 |
| pptx-generator | 启用 | 是 | 内容创作 | PowerPoint 演示文稿生成 |
| qmd | 启用 | 是 | 内容创作 | 本地 Markdown 笔记搜索引擎 |
| remotion-video-toolkit | 启用 | 是 | 内容创作 | 用 React + Remotion 编写代码生成程序化视频，支持动画、字幕、3D、云端渲染 |
| sag | 启用 | 是 | 内容创作 | 文字转语音（ElevenLabs） |
| songsee | 启用 | 是 | 内容创作 | 从音频生成频谱图和可视化 |
| summarize | 启用 | 是 | 内容创作 | 总结网页、PDF、音频和视频内容 |
| video-frames | 启用 | 是 | 内容创作 | 从视频提取帧或短片段 |
| x-longform-post | 启用 | 是 | 内容创作 | 撰写 X(Twitter) 长文，创始人语气 + AI 去味检测 |

### 办公协同（13）

| 技能 | 状态 | 模型可调用 | 分类 | 能力说明 |
| --- | --- | --- | --- | --- |
| agentmail | 启用 | 是 | 办公协同 | AI 智能体专属邮箱，收发邮件 |
| apple-reminders | 启用 | 是 | 办公协同 | 管理 Apple 提醒事项（添加、编辑、完成） |
| caldav-calendar | 启用 | 是 | 办公协同 | 同步和查询 CalDAV 日历（iCloud、Google、Fastmail、Nextcloud 等），仅支持 Linux |
| email-skill | 启用 | 是 | 办公协同 | 邮件管理与自动化，支持多邮件服务商收发搜索 |
| gog | 启用 | 是 | 办公协同 | Google Workspace 全家桶（邮件、日历、文档等） |
| himalaya | 启用 | 是 | 办公协同 | 终端邮件管理（收发、搜索、多账户） |
| imap-smtp-email | 启用 | 是 | 办公协同 | 通过 IMAP/SMTP 收发邮件，支持多账户和附件 |
| imsg | 启用 | 是 | 办公协同 | iMessage/短信收发与历史查看 |
| lark-unified | 启用 | 是 | 办公协同 | 飞书/Lark 全能套件（消息、文档、表格、日历、任务、Wiki 等 11 个业务域） |
| outbound-engine | 启用 | 是 | 办公协同 | 自动化外拓邮件引擎，从 ICP 定义到邮件入站全流程 |
| things-mac | 启用 | 是 | 办公协同 | 管理 Things 3 任务和项目 |
| trello | 启用 | 是 | 办公协同 | 管理 Trello 看板、列表和卡片 |
| wacli | 启用 | 是 | 办公协同 | 发送 WhatsApp 消息和同步历史 |

### 办公效率（1）

| 技能 | 状态 | 模型可调用 | 分类 | 能力说明 |
| --- | --- | --- | --- | --- |
| the-entrepreneurship-handbook | 启用 | 是 | 办公效率 | 服务创业者和管理者，解答创业/商业/管理问题，引发深度思考 |

### 商业运营（5）

| 技能 | 状态 | 模型可调用 | 分类 | 能力说明 |
| --- | --- | --- | --- | --- |
| autoresearch | 启用 | 是 | 商业运营 | Karpathy 风格内容优化，50+ 变体 + 专家评分 + 进化迭代 |
| citation-manager | 启用 | 是 | 商业运营 | 学术引用管理，为论文添加真实参考文献并规范引用标注 |
| finance-ops | 启用 | 是 | 商业运营、投资理财 | AI CFO 助手，财务简报、成本分析与场景建模 |
| idea-validator | 启用 | 是 | 商业运营 | 创业想法验证，评估问题-方案匹配度与市场机会 |
| market-researcher | 启用 | 是 | 商业运营、投资理财 | 市场调研专家，提供市场分析、消费者洞察与机会评估 |

### 开发工具（28）

| 技能 | 状态 | 模型可调用 | 分类 | 能力说明 |
| --- | --- | --- | --- | --- |
| agent-team-orchestration | 启用 | 是 | 开发工具 | 多智能体团队编排：角色定义、任务流转、交接协议与质量门禁 |
| android-native-dev | 启用 | 是 | 开发工具 | 安卓原生应用开发指南 |
| anti-distill | 启用 | 是 | 开发工具 | 反蒸馏防御：清洗 Skill 文件，看起来完整但核心知识已脱敏 |
| api-gateway | 启用 | 是 | 开发工具 | 连接 100+ API 服务（Google、Microsoft、GitHub 等），通过 OAuth 管理授权 |
| capability-evolver | 启用 | 是 | 开发工具 | AI Agent 自演化引擎，分析运行历史并自动优化能力 |
| cnb-skill | 启用 | 是 | 开发工具 | CNB 平台全功能操作（仓库、Issue、PR、流水线、制品库） |
| excalidraw-diagram | 启用 | 是 | 开发工具、创作与媒体 | Excalidraw 图解生成与渲染校验 |
| find-skills | 启用 | 是 | 开发工具 | 发现和安装新技能，扩展智能体能力 |
| flutter-dev | 启用 | 是 | 开发工具 | Flutter 跨平台开发指南 |
| frontend-dev | 启用 | 是 | 开发工具 | 前端开发与 AI 媒体生成 |
| fullstack-dev | 启用 | 是 | 开发工具 | 全栈应用架构与开发指南 |
| github | 启用 | 是 | 开发工具 | 管理 GitHub Issues、PR 和 CI |
| impeccable | 启用 | 是 | 开发工具 | 高品质 UI/UX 设计工具集：帮助生成独特、生产级的前端界面，涵盖视觉风格、布局排版、动效交互、质量保障、设计系统等全方位设计能力，避免泛 AI 审美 |
| ios-application-dev | 启用 | 是 | 开发工具 | iOS 应用开发指南 |
| mcp-builder | 启用 | 是 | 开发工具 | MCP 服务器开发指南，集成外部 API 和服务 |
| mcporter | 启用 | 是 | 开发工具 | 管理和调用 MCP 服务器与工具 |
| oracle | 启用 | 是 | 开发工具 | 调用第二个 AI 模型交叉审查代码 |
| prompt-engineering-expert | 启用 | 是 | 开发工具 | 提示词工程专家：编写、分析、优化提示词和 AI 指令，覆盖最佳实践与高级技巧 |
| react-native-dev | 启用 | 是 | 开发工具 | React Native 跨平台开发指南 |
| shader-dev | 启用 | 是 | 开发工具 | GLSL Shader 视觉效果开发 |
| skill-creator | 只读 | 是 | 开发工具 | 创建和维护自定义技能的指南 |
| skill-scanner | 启用 | 是 | 开发工具 | 朱雀实验室出品，Skill 安全风险扫描 |
| skill-vetter | 启用 | 是 | 开发工具 | 安装前审查技能的安全性 |
| skills-security-check | 启用 | 是 | 开发工具 | 腾讯云鼎出品，Skill 安全审计工具 |
| skyline | 启用 | 是 | 开发工具 | 微信小程序 Skyline 渲染引擎（组件、动画、路由、样式） |
| tdesign-miniprogram | 启用 | 是 | 开发工具 | TDesign 微信小程序组件库（60+ 组件、主题定制、AI 聊天） |
| tmux | 启用 | 是 | 开发工具 | 远程控制 tmux 交互式终端会话 |
| wechat-miniprogram | 启用 | 是 | 开发工具 | 微信小程序开发框架（模板、组件、API、云开发） |

### 效率工具（22）

| 技能 | 状态 | 模型可调用 | 分类 | 能力说明 |
| --- | --- | --- | --- | --- |
| agent-browser-core | 启用 | 是 | 效率工具 | 基于 agent-browser CLI 的 AI 友好型网页自动化 |
| browser | 启用 | 是 | 效率工具 | Puppeteer 无头浏览器，渲染 JS 页面并提取纯文本 |
| browser-cash | 启用 | 是 | 效率工具 | Browser.cash 云端反封锁浏览器会话（绕过 Cloudflare 等） |
| browser-use | 启用 | 是 | 效率工具 | 浏览器自动化（导航、点击、截图、数据提取、多会话、云浏览器） |
| browserwing | 启用 | 是 | 效率工具 | BrowserWing HTTP API 浏览器自动化（导航、交互、数据提取） |
| charity-finance-assistant | 启用 | 是 | 效率工具 | 公益票据与财务整理助手。适用于基金会、社会组织、社会服务机构等公益机构的财务和票据管理需求，涵盖捐赠票据开具、日常收支整理、审计准备、费用报销、税前扣除咨询及数据核对等场景。 |
| charity-writing-assistant | 启用 | 是 | 效率工具 | 面向公益从业者的一站式文书工作台。分步引导采集项目信息，自动适配各平台规范，生成可直接提交的专业文书；也可将已有材料一键标准化归档。覆盖腾讯公益、字节跳动公益、支付宝公益、微博微公益、京东公益、美团公益等平台。 |
| clawbrowser | 启用 | 是 | 效率工具 | 通过 Playwright CLI 驱动浏览器（快照、表单、会话管理） |
| cli-anything-hub | 启用 | 是 | 效率工具 | 发现并安装面向 AI 智能体的 CLI 工具市场（创意、生产力、AI 平台等） |
| goal-tracker | 启用 | 是 | 效率工具 | 追踪长期目标、里程碑、每日记录与问责系统 |
| habit-tracker | 启用 | 是 | 效率工具 | 通过打卡、连续记录和可视化培养良好习惯 |
| healthcheck | 启用 | 是 | 效率工具 | 追踪每日饮水和睡眠记录 |
| markitdown-skill | 启用 | 是 | 效率工具 | 文档转 Markdown(PDF/Word/PPT/图片OCR/音频转写/网页) |
| pdfkit-py | 启用 | 是 | 效率工具 | PDF全能工具箱，覆盖阅读分析、自然语言编辑、格式转换、表单处理、加密签名、OCR、IR等全场景 |
| peekaboo | 启用 | 是 | 效率工具 | 截取和自动化 macOS 界面操作 |
| playwright-browser-automation | 启用 | 是 | 效率工具 | 直接调用 Playwright API 实现浏览器自动化（无需 MCP） |
| playwright-scraper-skill | 启用 | 是 | 效率工具 | Playwright 隐身网页抓取，支持反爬绕过与验证码处理 |
| smooth-browser | 启用 | 是 | 效率工具 | Smooth.sh 云端 AI 浏览器代理，自然语言驱动网页操作 |
| stagehand-browser-cli | 启用 | 是 | 效率工具 | Stagehand CLI 自然语言浏览器自动化（支持本地/云端） |
| stealth-browser | 启用 | 是 | 效率工具 | 四层反检测浏览器自动化，支持隐身登录与验证码绕过 |
| web-access | 启用 | 是 | 效率工具 | CDP 直连本地 Chrome，智能调度联网工具，支持登录态、并行批量操作 |
| web-scraper | 启用 | 是 | 效率工具 | 多策略五阶段网页抓取管道（HTTP/解析/渲染/清洗/LLM提取） |

### 数据分析（9）

| 技能 | 状态 | 模型可调用 | 分类 | 能力说明 |
| --- | --- | --- | --- | --- |
| admapix | 启用 | 是 | 数据分析 | 广告素材搜索、竞品分析、应用排行与市场洞察 |
| deep-research | 启用 | 是 | 数据分析 | 结构化深度调研工作流，支持大纲生成、并行搜索、报告输出 |
| earnings-tracker | 启用 | 是 | 数据分析、投资理财 | AI 驱动的 A 股/美股财报追踪与智能分析推送 |
| macro-monitor | 启用 | 是 | 数据分析、投资理财 | 每日自动采集宏观经济数据和政策信息并推送 |
| model-usage | 启用 | 是 | 数据分析 | 通过 CodexBar CLI 统计各模型使用量和费用，支持当前模型或全量明细（仅 macOS） |
| stock-analysis | 启用 | 是 | 数据分析、投资理财 | 股票与加密货币分析（8维评分、组合管理、趋势扫描、传闻探测） |
| us-stock-analysis | 启用 | 是 | 数据分析、投资理财 | 美股综合分析（基本面、技术面、估值、对比报告） |
| xurl | 启用 | 是 | 数据分析 | Twitter 研究与内容情报分析 |
| yt-competitive-analysis | 启用 | 是 | 数据分析 | YouTube 竞品分析，发现爆款视频与标题包装规律 |

### 智能体能力（3）

| 技能 | 状态 | 模型可调用 | 分类 | 能力说明 |
| --- | --- | --- | --- | --- |
| book2skill | 启用 | 是 | 智能体能力 | 把书蒸馏成可执行的技能（拆书、方法论提取） |
| darwin-skill | 启用 | 是 | 智能体能力 | 自主优化 Agent Skill（8维评分、棘轮机制、自动改进） |
| huashu-nuwa | 启用 | 是 | 智能体能力 | 蒸馏人物思维框架，生成可运行的人物 Skill |

### 未分类（25）

| 技能 | 状态 | 模型可调用 | 分类 | 能力说明 |
| --- | --- | --- | --- | --- |
| agently-mail | 停用 | 否 |  | 通过 agently-cli 命令行工具操作邮件：发送、回复、转发、搜索、读取、下载附件、管理收件箱。当用户需要进行任何邮件相关操作时使用此 skill。 |
| architecture-designer | 启用 | 是 |  | Use when designing new high-level system architecture, reviewing existing designs, or making architectural decisions. Invoke to create architecture diagrams, write Architecture Decision Records (ADRs), evaluate technology trade-offs, design component interactions, and plan for scalability. Use for system design, architecture review, microservices structuring, ADR authoring, scalability planning, and infrastructure pattern selection — distinct from code-level design patterns or database-only design tasks. |
| conversion-ops | 格式异常 | 否 |  | 技能文件需要修复 |
| elite-powerpoint-designer | 启用 | 是 |  | Create world-class PowerPoint presentations with professional design, consistent branding, sophisticated animations, and polished visual hierarchy. Use when users request presentations, slide decks, pitches, reports, or want to convert markdown to professionally designed PowerPoint with Apple/Microsoft/Google-level quality. |
| email-daily-summary | 启用 | 是 |  | 自动登录邮箱生成每日邮件摘要(Gmail/Outlook/QQ邮箱等) |
| expert-manager | 只读 | 是 |  | 以对话方式创建或修改 WorkDSH 专家草稿，校验并引导用户在界面确认发布。 |
| file-count-by-category | 启用 | 是 |  | 统计当前工作区或指定目录的文件数量，并按扩展名/文件类型分类汇总，输出可复核的 Markdown 表格或 JSON。当用户提出「文件数量分类统计」「统计各类文件数量」「这个项目有多少 ts/py/md 文件」「仓库文件构成/清单」等需求时使用。Use when the user asks for file counts by type or extension, repository file inventory, extension breakdown, or workspace file statistics. |
| fintech-engineer | 格式异常 | 否 |  | 技能文件需要修复 |
| frontend-design | 启用 | 是 |  | Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics. |
| growth-engine | 格式异常 | 否 |  | 技能文件需要修复 |
| idp-senior-runtime-architect | 启用 | 是 |  | Senior software architecture skill for the TechFlag IDP PoC. Use when designing or implementing medium/high-risk changes to application runtime, asynchronous runs, workbench task detail loading, polling, run state consistency, observability, runtime artifacts, FastAPI/Vue integration, or changes derived from `prd/应用运行性能与证据选择优化PRD.md`. Use for HLDs, implementation plans, code reviews, and risk audits that must avoid business hardcoding and preserve existing IDP behavior. |
| idp-table-evidence-algorithm-expert | 启用 | 是 |  | Algorithm and document-intelligence skill for TechFlag IDP table evidence selection. Use when designing or implementing evidence indexes, table/facts compaction, runtimeContract-driven candidate selection, field_list repair, record_collection/data_table handling, complex-table needs_review rules, table regression sets, or no-hardcoding extraction improvements for `prd/应用运行性能与证据选择优化PRD.md`. |
| marketing-skills | 格式异常 | 否 |  | 技能文件需要修复 |
| multi-agent-dev-workflow | 启用 | 是 |  | Use when the user gives a software development requirement and wants PM, engineering, and testing agents to collaborate. Applies to medium or high-risk changes where requirements, implementation, and validation should be split across multiple agents; small changes should stay local. |
| officecli | 启用 | 是 |  | Create, analyze, proofread, and modify Office documents (.docx, .xlsx, .pptx) using the officecli CLI tool. Use when the user wants to create, inspect, check formatting, find issues, add charts, or modify Office documents. |
| pptx | 启用 | 是 |  | Use this skill any time a .pptx file is involved in any way — as input, output, or both. This includes: creating slide decks, pitch decks, or presentations; reading, parsing, or extracting text from any .pptx file (even if the extracted content will be used elsewhere, like in an email or summary); editing, modifying, or updating existing presentations; combining or splitting slide files; working with templates, layouts, speaker notes, or comments. Trigger whenever the user mentions "deck," "slides," "presentation," or references a .pptx filename, regardless of what they plan to do with the content afterward. If a .pptx file needs to be opened, created, or touched, use this skill. |
| prd-writer | 启用 | 是 |  | Write PRD, 写产品需求文档。Use when: 需要写新功能 PRD（有UI/无UI）、第三方集成、功能重构、性能/安全优化需求。 |
| revenue-intelligence | 格式异常 | 否 |  | 技能文件需要修复 |
| sales-pipeline | 格式异常 | 否 |  | 技能文件需要修复 |
| sales-playbook | 格式异常 | 否 |  | 技能文件需要修复 |
| seo-geo | 启用 | 是 |  | SEO & GEO (Generative Engine Optimization) for websites. Analyze keywords, generate schema markup, optimize for AI search engines (ChatGPT, Perplexity, Gemini, Copilot, Claude) and traditional search (Google, Bing). Use when user wants to improve search visibility, search optimization, search ranking, AI visibility, ChatGPT ranking, Google AI Overview, indexing, JSON-LD, meta tags, or keyword research. |
| seo-ops | 格式异常 | 否 |  | 技能文件需要修复 |
| tdd | 启用 | 是 |  | Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests. |
| team-ops | 格式异常 | 否 |  | 技能文件需要修复 |
| workdsh-import-test | 启用 | 是 |  | 用于验证 WorkDSH 技能导入、资源读取、全局发现和调用流程的安全测试技能。 |

### 知识与学习（19）

| 技能 | 状态 | 模型可调用 | 分类 | 能力说明 |
| --- | --- | --- | --- | --- |
| agent-mbti | 启用 | 是 | 知识与学习 | 基于 MBTI 框架的 AI Agent 人格诊断与配置系统 |
| arxiv-reader | 启用 | 是 | 知识与学习 | 基于 LLM 的 ArXiv 论文分类与深度阅读工具 |
| arxiv-watcher | 启用 | 是 | 知识与学习 | 搜索和总结 ArXiv 最新研究论文 |
| blogwatcher | 启用 | 是 | 知识与学习 | 监控博客和 RSS 订阅源更新 |
| boss-skills | 启用 | 是 | 知识与学习 | 蒸馏老板或生成企业家原型 Skill，模拟管理风格与决策模式 |
| colleague-skill | 启用 | 是 | 知识与学习 | 把同事蒸馏成 AI Skill，采集飞书/钉钉数据生成人格与工作模型 |
| education | 启用 | 是 | 知识与学习 | 学习助手：生成学习计划、测验、抽认卡、复习材料并跟踪进度 |
| github-ai-trends | 启用 | 是 | 知识与学习 | 生成 GitHub AI 热门项目趋势排行榜报告 |
| github-trending-cn | 启用 | 是 | 知识与学习 | 获取 GitHub 今日/本周/本月热门项目，支持语言过滤 |
| multi-search-engine | 启用 | 是 | 知识与学习 | 集成 17 个搜索引擎（8 国内 + 9 国际），无需 API |
| news-summary | 启用 | 是 | 知识与学习 | 从国际 RSS 源获取新闻并生成摘要和语音播报 |
| notebooklm-studio | 启用 | 是 | 知识与学习 | NotebookLM 学习工作室：导入多种来源，生成播客、测验、抽认卡、思维导图等学习产物 |
| open-lesson | 启用 | 是 | 知识与学习 | 苏格拉底式 AI 辅导：生成学习计划、音频对话式教学、诊断推理差距 |
| perplexity | 启用 | 是 | 知识与学习 | 通过 Perplexity API 进行 AI 联网搜索，返回带引用来源的答案，支持批量查询 |
| tutor-skills | 启用 | 是 | 知识与学习 | 将文档/代码转为 Obsidian 学习库，自动出题、测验并跟踪掌握度 |
| weather | 启用 | 是 | 知识与学习 | 查询天气预报，无需 API 密钥 |
| web-search-exa | 启用 | 是 | 知识与学习 | Exa 神经网络语义搜索：网页内容、论文、公司人物研究、代码搜索、深度调研 |
| wechat-article-search | 启用 | 是 | 知识与学习 | 搜索微信公众号文章（标题、摘要、发布时间、来源账号、链接） |
| yourself-skill | 启用 | 是 | 知识与学习 | 把自己蒸馏成 AI Skill，解构聊天记录与日记生成数字分身 |

### 邮件通讯（2）

| 技能 | 状态 | 模型可调用 | 分类 | 能力说明 |
| --- | --- | --- | --- | --- |
| gmail | 启用 | 是 | 邮件通讯 | 通过 Gmail API 收发邮件、管理标签和草稿 |
| porteden-email | 启用 | 是 | 邮件通讯 | 安全邮件管理，支持 Gmail/Outlook/Exchange 多账户 |

## 后续整理顺序与验证边界

先按实际启用能力选代表技能，阅读完整入口及相关资源，登记来源、运行依赖、适用场景和优秀产物标准，再做真实任务对照；不按长度排序删改，不自动引入另一套 Agent/PPT 引擎。当前仅检查共享管理视角，尚未逐项读完 161 个正文、核验全部依赖/许可或运行模型任务，不能宣称全部优秀或全部可用。

重点创建能力补充：以用户指定 WorkBuddy 原版为依据，见 [技能/专家创建对照](WORKBUDDY-CREATION-REVIEW.md)。
