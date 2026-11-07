# V8 并发标记 GC SIGSEGV：最小复现与现场分析

本文件是为上报 Node.js / V8 上游而整理的自包含材料。全部数据来自 2026-09-17 / 09-18 在一台
Linux 服务器上的实测，未做推测性填充；凡未验证的部分均在「未排除」一节显式标注。

## 1. 摘要

在 Linux x86_64、Node.js **v24.21.0（V8 13.6.233.17-node.53）** 上，一个 **约 20 行、零依赖的纯 JS
负载**可以稳定触发 SIGSEGV，故障点固定在：

```
MarkingVisitorBase<ConcurrentMarkingVisitor>::ProcessStrongHeapObject<FullHeapObjectSlot>
```

故障线程是 `node::PlatformWorkerThread`（V8 平台工作线程池），故障指令在同一 node 二进制上恒为
`0xe971d9`（`mov (%r14),%rax`，前一条是 `and $0xfffffffffffc0000,%r14`，即把传入的 HeapObject
掩码成 256 KiB 页基址后解引用）。实测崩溃率约 35%（7/20），**不需要** `--stress-compaction`、
**不需要** 任何原生 addon、**不需要** Node 主进程业务代码。

同一脚本在 macOS arm64、V8 13.6.233.17-node.**48** 上 **0/20 崩溃**（含进一步加压的 0/5），因此
该问题与平台强相关，但当前证据**不足以区分**是 CPU 架构（x86_64）还是操作系统（Linux）导致。

## 2. 环境

| 角色 | 平台 | Node | V8 | ABI |
|---|---|---|---|---|
| 复现 | Linux x86_64，20 核，Docker（`node` 官方二进制，sha256 与上游一致） | v24.21.0 | 13.6.233.17-node.53 | 137 |
| 复现（另一运行时） | 同机，宿主 `/usr/bin/node` | v22.22.2 | 12.4.254.21-node.39 | 127 |
| 对照 | macOS 15.7.5，arm64 | v24.15.0 | 13.6.233.17-node.**48** | — |

复现环境所用 node 二进制与上游官方包 sha256 完全一致
（`7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c`），非自编译。

## 3. 最小复现器

```js
// biggc.js —— 零依赖，纯 JS
const keep = [];
for (let i = 0; i < 400000; i++) {
  keep.push({ i, s: 'str' + i, arr: [i, i + 1] });
}
for (let k = 0; k < 300; k++) {
  global.gc({ type: 'major' });
}
console.log('alive', process.version, Math.round(process.memoryUsage().heapUsed / 1048576) + 'MB');
```

运行方式：

```
node --expose-gc biggc.js
```

- 存活堆约 **62 MB**，每轮约 **300 次** 老生代 Mark-Compact。
- 复现环境的观测：N=5 时 2/5；作为旗标矩阵基线 N=10 时 8/10；N=20 时 **7/20**。
- 对照环境（macOS arm64）：**0/20**。把堆加大到约 119 MB、GC 加到 400 次后仍是 **0/5**。

触发条件可归纳为「**较大的存活堆 + 反复老生代 Mark-Compact**」，与 GC 次数本身关系较弱：
零分配的对照脚本（`while` 空转 3 秒）在同一夹具下累计约 6000 次 Mark-Compact 仍 0/8 崩溃。

### 3.1 与线上生产现场的同一性

该最小复现器并非「另一个 bug」：它的崩溃栈与线上生产进程的现场**逐帧一致**（含同一条故障指令）：

```
#0  0x0000000000e971d9  MarkingVisitorBase<ConcurrentMarkingVisitor>::ProcessStrongHeapObject<FullHeapObjectSlot>(...)
#1  0x0000000000e975b2  BodyDescriptorBase::IteratePointers<ConcurrentMarkingVisitor>(...)
#2  0x0000000000e9b554  ConcurrentMarking::RunMajor(...)
#3  0x0000000000e9d4dc  ConcurrentMarking::JobTaskMajor::Run(...)
#4  0x000000000207da55  v8::platform::DefaultJobWorker::Run()
#5  0x00000000009de618  node::(anonymous namespace)::PlatformWorkerThread(void*)
```

## 4. 现场数据

故障瞬间（gdb 附加，`handle SIGSEGV stop print nopass`）：

- `Thread 5 "V8Worker" received signal SIGSEGV, Segmentation fault.`
- `rip = 0xe971d9`（即 `ProcessStrongHeapObject<FullHeapObjectSlot>+41`）
- 寄存器：`r12 = rcx = 0x000071f5df19c8f1`，`r14 = 0x000071f5df180000`
  （`r14` 恰为 `r12` 掩码 256 KiB 后的页基址，与故障指令前的 `and $0xfffffffffffc0000,%r14` 吻合）
- 取故障瞬间的 `/proc/<pid>/maps`（843 条映射）做归属分类：**`r12`、`r14` 两者都不落在任何映射内**，
  落在 `0x3fc677640000-0x7f45d4000000` 的空洞（约 69 TiB）中
- `r12` 低位为 1（按 V8 表示法像 Smi），但数值远超 31 位 Smi 范围，不是可用标记值
- 另有一次现场（同一进程族、默认旗标）落在同一函数同一指令，寄存器形态相同

同一服务器上，对生产进程用 80 ms 间隔采样 `/proc/<pid>/maps` 得到的结论：故障页**从未映射**
（`grep -c` = 0），排除「页面被回收」这一解释。

### 4.1 故障点跨 GC 子系统

在确定性夹具下另抓到 4 个现场，故障线程**全部**是 `PlatformWorkerThread`，但落在三个子系统：

| # | 故障函数 | 子系统 |
|---|---|---|
| 1 | `Sweeper::RawSweep` → `HeapObject::SizeFromMap`（`rcx=0x19`） | 清扫 |
| 2 | `ConcurrentMarking::RunMajor` → `HasBytecodeArrayForFlushing` | 并发标记 |
| 3 | `ConcurrentMarking::RunMajor` → `ProcessStrongHeapObject<FullHeapObjectSlot>` | 并发标记 |
| 4 | `Evacuator::RawEvacuatePage` → … → `SharedFunctionInfo::BodyDescriptor::IterateBody<RecordMigratedSlotVisitor>` | 压缩 / 迁移 |

这说明不是某条遍历链的局部错误，而是**被遍历的对象引用本身在 GC 期间失效**。

## 5. 已排除

| 假设 | 实验 | 结果 |
|---|---|---|
| 原生 addon 内存破坏 | 用 `process.dlopen` 桩把 `.node` 全部中性化（插件树仍完整加载） | 崩溃率未下降（10/12 vs 对照 6/12），**排除** |
| 业务/第三方 JS 代码 | 上述最小复现器（不含任何业务代码、零依赖） | 同样崩溃，**排除** |
| `--stress-compaction` | 最小复现器只用 `--expose-gc` + 显式 major GC | 同样崩溃，**该旗标只是加速器** |
| Node 主版本 | 换 v22.22.2（V8 12.4）同一夹具 | 8/8 仍崩，**排除「13.6 回归」** |
| V8 旗标可规避 | 见下 | **无任何单旗标或组合将崩溃率降到 0** |
| `--verify-heap` / `--track-heap-objects` | 全程无任何 V8 断言，进程始终以裸 SIGSEGV 退出 | 失效对象不在堆校验覆盖范围内 |

### 5.1 旗标矩阵

夹具为上述 `biggc.js`。N=10 一轮后，对表现最好的单旗标与组合做了 N=20 复核：

| 旗标 | N=10 崩溃 | N=20 崩溃 |
|---|---|---|
| 基线 `--expose-gc` | 8/10 | **7/20** |
| `--no-concurrent-marking` | 5/10 | — |
| `--no-concurrent-sweeping` | 5/10 | — |
| `--predictable` | 4/10 | — |
| `--no-parallel-marking` | 2/10 | — |
| `--jitless` | 2/10 | — |
| `--no-incremental-marking` | 1/10 | **6/20** |
| `--single-threaded` | 1/10 | — |
| `--no-incremental-marking --no-parallel-marking` | — | **4/20** |
| 以上四个 no-\* 全开 | — | **8/20** |

**N=10 出现的 1/10、2/10 是小样本假象**：N=20 复核后全部落在 20%—40% 区间，与基线 35% 无统计
显著差异（Fisher 精确检验，7/20 vs 4/20 → p≈0.48）。**关键结论是没有任何组合给出 0 崩溃**——
若某旗标真能规避，20 次运行应全部正常。

## 6. 未排除

- **架构 vs 操作系统未分离**。macOS arm64 不崩，但复现环境是 Linux x86_64，两个变量同时变化。
  做 x86_64 macOS（Rosetta）对照需要下载 x64 node 二进制，而本次实验中下载源（`nodejs.org`）在
  两台机器上都无法解析，未能执行。
- **是否为上游已知问题未核实**。未检索 V8 / Node issue tracker（同样受网络限制），故本文件不声称
  这是新发现，只提供可复现性与现场。
- macOS 对照所用 V8 补丁号（-node.48）与复现环境（-node.53）不同，严格来说不是「同版本跨平台」，
  但二者同属 13.6.233.17。
- 未在第三台机器上复现，因此「该服务器特有的内核 / 内存子系统」这一可能未被独立排除。

## 7. 建议的排查方向

1. `ConcurrentMarking` 在标记工作列表（worklist / bailout）与对象可达性判定上的边界条件；故障
   现场横跨清扫 / 标记 / 迁移三个子系统，指向**对象引用生命周期**而非单条遍历链。
2. 平台差异：x86_64 与 arm64 在内存模型、页大小、弱内存序重排上的差异，是否会使某个「先发布后
   可见」的顺序在 x86_64 上暴露为垃圾指针。
3. 崩溃只在「较大存活堆 + 反复老生代 Mark-Compact 迁移」下出现，建议关注**迁移（Evacuate）与并发
   标记重叠**时的对象地址更新路径。

## 8. 证据文件索引

复现环境（服务器 `192.168.11.205`，隔离目录 `/home/luoji/wd-repro/`）：

- `bare/biggc.js`、`bare/big.js`、`bare/zero.js`、`bare/alloc.js` —— 四档纯 JS 负载
- `bare/bigger.js` —— 加压版（~119 MB / 400 次 major GC），用于 macOS 对照
- `gdbdump4/caught-2.gdb` —— 最小复现器上捕获的完整现场（栈 / 寄存器 / 内存窗口）
- `gdbdump4/maps-2.txt` —— 同一时刻的 `/proc/<pid>/maps`（843 条），用于归属分类
- `gdbdump2/caught-{1,2}.gdb`、`gdbdump3/caught-{1,2}.gdb` —— 生产负载上的现场
- `/tmp/bare-*.out`、`/tmp/flags.out`、`/tmp/flags2.out` —— 各臂逐轮结果
- `/tmp/wd-mapsclassify.py` —— 寄存器 / 映射归属分类器

## 9. 2026-11 生产复核：Node v26.10.0 上运行期频发，故障点扩展至 Minor GC

> 追加记录（2026-11-07）。上文 §1—§8 形成于 2026-09-17/18（Node v24.21.0）。
> 本节证据全部来自 dsh.10ge.cn 生产容器（同一台 192.168.11.205），运行时为
> `/data/dsh/runtime/bin/node26`（**Node v26.10.0，V8 14.6.202.34-node.34**，官方二进制）。

### 9.1 结论

**同一缺陷在 Node v26.10.0 上仍然存在，且从「启动期偶发」恶化为「运行期频发」。**
故障点落在第四个 GC 子系统——年轻代并发标记 `ConcurrentMarking::RunMinor`，寄存器与
内存形态与 §4 完全同构，进一步支持 §7「对象引用在 GC 期间失效、而非单条遍历链」的判断。

### 9.2 崩溃规模与节律（2026-11-04 19:45 → 11-07 12:24，容器日志全量）

- **status 139（SIGSEGV）退出共 222 次**；另有少量 status 0 / 1（见 §9.4 噪声说明）。
- **26 次为运行期首崩**：进程已稳定运行 **36–458 分钟**后崩溃，随后进入连崩簇。
- 连崩簇内相邻退出间隔 2–30 秒（进程刚就绪即死），典型簇：
  11-06 00:22–00:26（4 分钟约 21 次）、13:08–13:10（约 9 次）、14:23–14:25（约 10 次）、
  19:04–19:07（约 8 次）。
- 崩溃时刻覆盖全天各小时（00/03/05/06/07/08/12/13/14/15/19/22/23 时均有），
  与业务高峰无关；首崩前日志仅见 model listing 刷新、SSE abort、门户心跳、
  一次 `prompt-enhance` 调用——**不需要特定业务输入**，与 §3「较大存活堆 + 反复
  Mark-Compact」的触发条件一致。

### 9.3 core dump 现场（决定性证据）

`/data/dsh/coredump/core.V8Worker.1`（1.15 GB，2026-11-04 22:38；单槽，新崩溃会覆盖）。
容器 core_pattern 已配置到该目录。gdb（`node26` + core）：

```
Core was generated by `node --expose-internals .../dsh/lib/bin.js web ...'
Program terminated with signal SIGSEGV.
#0  0x0000000000ec1059 in v8::internal::ConcurrentMarking::RunMinor(v8::JobDelegate*) ()

rip = 0xec1059   <ConcurrentMarking::RunMinor+11273>
r12 = rcx = 0x7c548e502789        ← 正在处理的对象指针
r14       = 0x7c548e500000        ← 恰为 r12 & ~0x3FFFF（256 KiB 页基址），与 §4 同一形态
x/gx $r12 → Cannot access memory at address 0x7c548e502789   ← 故障页未映射，同 §4
```

与 §4 的 v24 现场逐点对应：故障线程同为 V8 平台工作线程（core 文件名 `V8Worker`）、
同为「指针掩码页基址后解引用」、同样指向未映射地址。差异仅在子系统：§4 为
`RunMajor`/`ProcessStrongHeapObject`，本次为 `RunMinor`。

### 9.4 噪声排除：56 份 node report 全部与本缺陷无关

`/data/dsh/tmp/reports/` 内 56 份 `--report-*` JSON **全部是 Exception 类、全部不含
nativeStack/javascriptStack**。逐份核对 commandLine：均来自 agent 会话里的一次性
`node26` 调用（`pnpm --version`、`enumtest.mjs`、`probe.mjs`、`scripts/semver_tool.cjs`
等）——包装器 `/data/dsh/runtime/bin/node` 把 `--report-uncaught-exception` 等旗标
注入**每一次** node26 调用，短命脚本的普通报错被全量落盘。**SIGSEGV 不产生 node report**
（包装器注释已用 3 次真实崩溃证伪；与本节 §9.3 只能依靠 core dump 一致）。

### 9.5 版本遍历汇总（同一缺陷）

| 运行时 | V8 | 状态 |
|---|---|---|
| v22.22.2 / v22.23.3 | 12.4 | 崩（§5 旗标矩阵实验 + 10 月生产） |
| v24.21.0 | 13.6.233.17-node.53 | 崩（§1—§8） |
| **v26.10.0** | **14.6.202.34-node.34** | **崩，且运行期频发（本节）** |

### 9.6 缓解与残余风险

2026-11-07 起在 `/data/dsh/runtime/bin/node` 包装器 exec 行追加
`--no-concurrent-marking --no-concurrent-sweeping`（把并发标记/清扫收回主线程，收窄
竞态窗口）。注意：§5.1 旗标矩阵在压测夹具下**没有任何旗标组合降到 0 崩溃**，该缓解
预期只降低频率、不是修复；GC 停顿会变长。效果以生产 24h+ 崩溃计数回归验证。

## 10. 生产事故闭环：对话确认「无权访问」与 node26 回滚（2026-11-07）

### 10.1 用户现象与根因链

用户 18938845688 报告「对话确认，提示无权访问」。逐层排除（密码 scrypt 校验 MATCH、
当日多次 login.succeeded、身份闸门 activated、花名册 active/admin、600 条审计 0 拒绝、
Caddy 无 401/403）后定位为业务对象丢失：

- 报错文案 = `assistant/not-found`「助理不存在或无权访问。」（workdsh-plugin-assistant
  `requireAssistant`）；专家侧对应 `experts/not-found`。
- 实证：进程 A 内 `experts list` 含 `expert-e8e683cd4812`，12:58 崩溃重启后进程 B
  不再含；全 data/dsh 树（含 `.json.bak.*` 备份命名）**无任何该对象落盘痕迹**。
- 持久化协议本身完好：`dsh-storage-json` per-record `putRecord` 为
  writeFile(`.tmp`)+close+rename 全 await 原子写（`lib/index.js` L26-35、L461），
  domain 层在 putRecord resolve 后才写内存（`dsh-storage-domain` `KvTableImpl.put`）。
  旁证：operations/bindings/preferences 于 11-06 11:25 正常落盘。
- 结论：对象在两次崩溃窗口内仅存于内存，重启即丢失；用户在对话中确认/继续引用
  已消失对象时得到「无权访问」。助理状态文件自 09-28 起为空态同理（期间所有
  写入均随崩溃丢失）。

### 10.2 处置：回滚 node26 → 镜像自带 v22.23.3

- 事故放大源锁定：`/data/dsh/runtime/bin/node26`（149MB 二进制，11-01 21:20 落盘，
  同时刻存在 `node.bak.v22.20261101132106`）——**11-01 从 v22 换到 node26 后崩溃率
  数量级上升**（3 天 222 次 status 139 vs 10 月 v22 低频）。
- 镜像 `1panel/deepseek-harness:0.2.0-rc.2` 自带 `/usr/local/bin/node` = **v22.23.3**
  （官方配套运行时）；原生模块全为 N-API（node-pty prebuilds、
  `node-addon-require-builtin-...-napi-v9.node`、`@deepseek-ai/node-addon-system-*`），
  无 ABI 风险。
- 已执行：包装器 `REAL_NODE` 改为 `/usr/local/bin/node`（备份
  `node.bak-node26-20261107055740`），`docker restart dsh`。验证：容器 healthy、
  包装器 PATH 解析 `node -v` = v22.23.3、web 正常、公网 `/` 302 `/portal/` 200。
- 保留：`--report-on-fatalerror` 等取证旗标、`--max-old-space-size`、
  `--no-concurrent-marking --no-concurrent-sweeping`（§9.6 缓解继续生效）。
- 回滚方式：`cp node.bak-node26-20261107055740 node` 后重启容器。

### 10.3 残余风险与后续

- §9.5：v22 同样存在该 V8 缺陷（10 月生产有崩溃记录），本次回滚是**消除 node26
  放大效应**、回到 10 月基线，**不是根治**。继续以 crash-counter 回归：目标 <
  10 月基线；若 v22 崩溃率仍不可接受，下一步是有上限 core dump 拿 native 栈
  （需宿主 core_pattern + compose ulimits）并向上游报缺陷。
- 丢失的业务对象（expert-e8e683cd4812 及 09-28 后该用户的助理）从未落盘，
  **不可恢复**，需用户在 UI 重建；现有 21 个专家与 11-06 会话绑定
  （session-16c82ac6…→expert-7cd888f7beae）完好。
- 未解疑点（不影响处置）：e8e683cd4812 在「全路径均 await 落盘」前提下出现
  内存态无盘痕，疑似崩溃瞬间的窄窗口或未走 withOperation 的旁路；未复现不深究。

### 10.4 追加处置：修正看护脚本的「边缘层误判重启」（2026-11-07 14:13 CST）

回滚后 13 分钟（06:11Z）容器再次被 `SIGTERM` 重启，查 `journalctl` 定位为
`dsh-avail-watch.sh`：该脚本用**公网探针** `https://dsh.10ge.cn/` 判健康，06:10Z 探测到
Cloudflare `530`（隧道抖动，容器内 3080/业务接口一切正常），连败 3 次后执行 L1
`docker restart dsh`。这与「隧道故障」被当成「应用故障」的已知风险一致——每多一次
无谓重启，就多一次内存态业务对象丢失的机会。

已修正（备份 `dsh-avail-watch.sh.bak.edge530.20261107061301`）：把
`502` 特判扩展为 `502|520|521|522|523|524|525|526|527|530`，全部归入边缘/入口层，
只告警、不做 L1/L2/L3 容器处置（502/52x/530 意味着请求未到达宿主 nginx，重启容器无效）。

验证：用本地返回 530 的假探针 + 隔离状态目录运行，日志为
`probe=530 edge/ingress-layer failure; skip container action`，`restarts` 未增加、
容器未被重启；`bash -n` 语法通过。隧道本身的看护由 `tunnel-watchdog.sh` 负责，职责不再重叠。

### 10.5 追加处置：对话框内容无法提交（session/prompt 被拒，2026-11-07 16:5x CST）

**现象**：用户报告「现网站对话框内容无法提交」。浏览器实测旧对话与**新建对话**都返回
`remote access: session/prompt: access denied (workdsh-account-scope: portal:18938845688 无权访问 session/prompt) (remote-access/denied)`；
同时 `session/follow`、`costMeter/getLocalState` 被拒。

**根因**：`workdsh-account-scope` 的会话级授权完全依赖
`/data/dsh/storages/workdsh_runtime_binding/sessions/*.json` 里的归属绑定。但
**UI 新建会话走官方 `session/create` 远程端点**，不经过 `workdsh-plugin-access`
的 `workdshSessionAccess.create()`，因此从不写绑定；服务端磁盘上 203 个会话中
有 8 个（含浏览器新建的）无绑定 → 无匹配 binding → 整条会话动作被 deny。
绑定域本身是 11-07 才启用的，历史会话也天然缺绑定。

**处置（两层）**：

1. **一次性补绑**：`/data/dsh/tools/workdsh-account-scope/restore-kit/files/backfill-unbound-sessions.mjs --apply`
   新增 8 条（全部 → `portal:18938845688`），备份 `/data/dsh/tmp/backfill-unbound-20261107075605`；
   同日新增的 2 条会话再次补绑。补绑后旧对话首次实测可发送（页面标题变为
   `Ping — DeepSeek Harness`，会话文件增长到 74KB，说明模型回合真实执行）。
2. **持久修复（只读推导，不写盘）**：`dist/index.js`（备份
   `index.js.bak.autobind.20261107`，`revision: autobind-tree-mtime-20261107`）：
   - 索引新增「会话目录补归属」：未绑定会话按物理目录所属工作区推导 owner
     （`--data-dsh-home-dsh--`→`portal:18938845688`，`--data-dsh-home-wangr--`→`portal:19925318318`）；
     已有显式绑定优先，推导不覆盖，也不写任何绑定文件。
   - 修复**新会话竞态**：`_bindingsFor()` 每次先比对会话目录 mtime，目录新增/删除时
     立即重建索引与绑定缓存（否则新建后立刻发送的**首条消息**仍会被 15s TTL 判 deny）。
   - `costMeter` 白名单兜底：`dsh-cost-meter` 为手写 `typertRemote` 绑定，`remoteMethods()` 返回空，
     端点整体缺席 global 白名单，表现为页面红色
     `costMeter/getLocalState: access denied`；按该包 manifest 显式补录 `EXTRA_GLOBAL_ACTIONS`。

**验证（服务端）**：重启后 `/workdsh-account-scope/status` 返回
`revision=autobind-tree-mtime-20261107`、`index.ok=true`、`indexErrors=0`；
索引会话数 14294 ＞ 绑定文件数 14278，说明 16 个无绑定新会话已按目录推导纳入；
`principals` 含 `portal:18938845688` / `portal:19925318318` 两域。
浏览器复测：页面加载不再出现 `costMeter/getLocalState` 错误，改版前已验证旧对话可发送。

**边界**：浏览器自动化平台在输入框聚焦上多次失败（`Type target page lost focus`），
**「新建会话 → 立即发送」全链路仍缺一次干净的人工复测**；后续若 UI 改为真正调用
`workdshSessionAccess.create()`（补写绑定）或新增第二工作区，需要同步复核目录推导映射。

## 11. 2026-11-07 二次复核：复现器缺陷修正与新旗标对照

本节回答「当前版本与旗标能否永久消除崩溃」。结论：**不能**；故障与机器/架构相关，
换运行环境或等上游修复是唯二的「永久」路线。

### 11.1 先修正复现器缺陷（重要）

§3 的 `biggc.js` 把 `keep` 定义在模块作用域且**从未被外部引用**，V8 会把它判为死代码，
整个分配循环被消除。实测本机 Node v22.22.2 上：

```
node --expose-gc biggc.js   → alive v22.22.2 3MB   （应约 62MB）
```

即**原脚本在部分运行时不再触发**。修正版只需再加一行 `globalThis.keep = keep`，
其余不变；下述所有对照均使用修正版（单次约 4.5 s，存活堆 62 MB）。

### 11.2 崩溃率对照（同一台 192.168.11.205，i7-13700H / Linux 5.15）

| 配置 | 结果 |
|---|---|
| 基线 `--expose-gc`（修正版） | 3/15 + 6/20 = **9/35（约 26%）** |
| + `--no-maglev` | 3/15（与基线无差异，**排除 Maglev 写屏障假设**） |
| + `--single-threaded` | 1/20 |
| + `--single-threaded --no-concurrent-marking --no-concurrent-sweeping` | 首轮 20/20 通过；追加 30 次出现 2 次崩溃（合计 **2/50**，未归零） |
| macOS 15.7.5 arm64，Node v24.15.0（同一修正版脚本） | **0/20** |

判读：

- 任何旗标组合都**没有降到 0**；单线程组合的 0/20 是小样本假象，加大样本后 2/50 即破。
- 崩溃与本机强相关：同一脚本在 arm64 上 0/20。仍无法区分「x86_64 架构」与「这台机器
  /这个内核」，需在另一台 x86_64 或 arm64 Linux 上各跑 30 次才能定论。
- `--no-maglev` 无改善，说明不是 CVE-2026-5865 那类 Maglev 缺失写屏障。

### 11.3 生产现状（2026-11-07 09:20–09:30 UTC）

- 09:20 窗口：`seg=0`；09:30 窗口：`seg=4 post_ready_crash=4 startup_fail=0`；近 30 分钟
  `status 139` 共 10 次。
- 当前运行时为镜像自带 v22.23.3，包装器已带 `--no-concurrent-marking --no-concurrent-sweeping`，
  仍以约每 10 分钟 4 次的频率在**运行期**崩溃，页面出现数十秒「服务正在自动恢复」。

### 11.4 可选路线（按「能否永久消除」排序）

1. **换到 ARM64 Linux 主机**（或换成已验证不崩的物理机）：唯一有可能从根上消除的路线；
   迁移前必须在目标机用修正版脚本跑 30 次 0 崩溃，再做 dsh 全链路验收。
2. **换另一台 x86_64 机器**：同样先跑 30 次验证，结果可能仍崩。
3. **上游上报 V8 / Node**：本文件 + core dump 已具备材料；提交前需用修正版脚本重跑并附
   §11.2 对照，避免维护者按失效脚本复核得到「不可复现」。
4. **短期兜底（非永久）**：保留 crash-watch + 入口重试的自愈，把不可用窗口压到最小；
   同时降低常驻堆（减少插件/会话规模）只能降频。

注意：`1panel/deepseek-harness:0.2.0-rc.2` 的 arm64 清单因服务器无法访问 Docker Hub
未核实；迁移前需确认镜像或改用 npm 方式在 arm64 Linux 上部署。

