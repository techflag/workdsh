# 专家与专家团制作 S1：创建提示词迁入随包 SKILL.md

状态：S1 已实施并验证通过（2026-09-13）。创建提示词从 TS 字符串迁入随插件发布的 `resources/expert-manager/SKILL.md`，TS 只加载、校验与注册，全部业务接口与旧行为保持不变；安装包资源可读与内容一致性已用 pack 解包与真实 SkillRegistry 实测。S2 及后续批次未开始；未安装 preview、未提交推送。外部交接输入归档于 [AUTHORING-IMPLEMENTATION-HANDOFF](../design/experts/AUTHORING-IMPLEMENTATION-HANDOFF.md)。

## S1 实施前官方能力复用记录（2026-09-13）

按 PLUGIN-DELIVERY 要求记录官方能力复用；编码前应完成核对，本节在同日实施后回填实测结果。

| 字段 | 内容 |
|---|---|
| 任务与范围 | S1：把 `expert-manager` 创建提示词从 `src/authoring/guide.ts` 的 TS 字符串迁入随包发布的 `resources/expert-manager/SKILL.md`；TS 仅加载、解析、注册；迁移不改文案语义；build/pack 必须包含 MD 与 references；安装包资源可读；注册内容与文件一致；普通任务不被额外注入 |
| 官方能力 | 文档：`https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.6-alpha.2/docs/subsystems/skills.md`（技能子系统与资源基地址）；锁定包 `@deepseek-ai/dsh-skill` 0.1.5-rc.1（`SkillRegistration`：`content` 为静态 string、注册同步、返回 Cordis effect disposer；`SkillResourceBase { kind: 'directory', path }`）、`ctx.effect` 生命周期托管；`dsh-skill-filesystem` 的 frontmatter 惯例（`name`/`description`/`when-to-use`）作格式对照 |
| 复用选择 | 继续使用官方 `ctx.skills.register` 与 `resourceBase`（directory 渲染给模型“Base directory for this skill”，相对路径由模型按需读取 references）；不新增 provider、第二注册表或加载器；正文唯一来源为随包 MD，运行时同步读取（`import.meta.url` 相对；`src/`、`dist/`、解包安装三种布局一致），不采用构建生成薄模块以避免生成物漂移 |
| 自有边界 | 仅新增资源文件与薄加载模块（读取、frontmatter 解析、字段校验）；业务接口、工具、存储、连接面均未改动；Harness 未修改 |
| 证据与差异 | pack 解包验证（tgz 资源存在、sha256 一致、解包 dist 读取包内 MD 成功）+ 集成测试（内容逐字节一致、注册可发现、catalog 摘要不含正文、dispose 撤销）；差异：preview 安装态未重装，安装可读性以 tgz 解包为准 |
| 验收 | a) 安装包资源可读：tgz 含 `resources/expert-manager/SKILL.md` 与两份 references，解包后 dist 可加载；b) Skill 内容与文件一致：正文与 frontmatter 三字段逐字一致；c) 普通任务不被额外注入：注册只进 catalog，摘要不含正文，正文仅经官方按需加载路径渲染 |

## S1 结果：资源迁移与注册实测（2026-09-13）

| 验证 | 实测结果 |
|---|---|
| 正文逐字节迁移 | 新 `SKILL.md` 正文 3439 字符，与迁移前 dist `expertManagerSkillContent` 完全一致（脚本比对 `byte-identical: true`）；文件 sha256 `3eb6e7db932f3ba57a70456d587a3a01df8dd76e59bc9ed939fcc97a842452f1` |
| frontmatter 三字段 | `name`/`description`/`when-to-use` 与迁移前 `index.ts` 注册文案逐字一致（YAML 解析后严格比较，三项均 `identical: true`） |
| 安装包资源可读 | `pnpm --filter workdsh-plugin-experts pack` 后 tgz 含 `package/resources/expert-manager/SKILL.md` 与 `references/material-and-methods.md`、`references/trial-and-delivery.md`；源文件与包内文件 sha256 相同 |
| 解包安装读取 | 从解包目录加载 `dist/authoring/guide.js`：成功读取包内 SKILL.md，content 与包内正文一致、meta 解析正确、body 长度 3439（`UNPACKED_DIST_READS_PACKAGED_MD: true`） |
| 注册路径 | 真实 `SkillRegistry`：`list()` 可见 `workdsh-expert-manager`（`source=bundled`、description/whenToUse 与 meta 一致）；`resourceBase` 指向包内真实目录（SKILL.md 与两份 references 存在）；`get()` 返回正文与文件一致；dispose 后技能撤销 |
| 普通任务不注入 | catalog 摘要不含正文（测试断言 `JSON.stringify(list) 不含正文前缀`）；正文仅经官方按需加载（skill 工具/用户显式调用）渲染，本插件注册不发送任何会话消息；官方按需路径既有验证见 `tests/integration/skill-loading.test.mjs` |
| 回归 | Node 22.23.2：专家包 build（contracts/ui/tsc/esbuild client）EXIT=0、typecheck EXIT=0；新测试 2/2；全量集成 90/90（原 88 + 新 2，13.6s）；未跑全根 build 与 check:plan 之外的项目（见“未执行”） |

新增/修订代码（均为专家插件内部实现，未发布/未安装 preview）：

- `resources/expert-manager/SKILL.md`（新增）：frontmatter（name/description/when-to-use）+ 迁移原文；随 `files: ["resources"]` 进包。
- `src/authoring/guide.ts`（重写）：同步读取随包 SKILL.md、解析 YAML frontmatter、校验字段（`expert-skill/missing`、`expert-skill/invalid-frontmatter`、`expert-skill/empty-body`），导出 `expertManagerSkillMeta` 与兼容导出 `expertManagerSkillContent`（始终来自文件，无第二份文案）。
- `src/index.ts`：注册改用 MD 派生；新增导出 `registerExpertManagerSkill(ctx)`（`ctx.effect` 托管），`applyIntegration` 经它注册。
- `tests/integration/expert-authoring-skill.test.mjs`（新增）：内容一致、注册可发现与撤销、摘要不含正文。

未执行与缺口（如实登记，不随 S1 关闭）：

- preview 安装态未重装（未跑 `pnpm preview:install`、未启动 18989）；安装可读性目前以 `pnpm pack` 解包证据为准。
- 真实模型未回归：SKILL.md 迁移后未用真实模型验证创建引导行为（S2 改写后统一做）。
- references 拆分与新模板/示例（`templates/`、`examples/`）未做（S2）；团队定义/草稿/发布未做（S3，与 TM-02 目标合流）；页面（S4）、运行与恢复集成（S5）、MD 导入导出（S6）未开始。
- 全根 build、根 typecheck、check:plan 未在本批重跑；仅专家包 build/typecheck 与全量集成测试。

下一批：S2 补齐 references、角色模板与完整示例，改善入口提示词质量（以正向制作步骤为主），完成后回填本目录新证据并更新 STATUS 与台账。未完成 S3 前不得宣称可保存专家团。
