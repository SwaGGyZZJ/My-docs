# CANNBot 对齐执行路标与 S0 Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans task-by-task when applicable; checkboxes track actual evidence. 本任务在现有隔离worktree连续执行，不在每小批后询问是否继续。

**Goal:** 关闭审计缺陷并按批准的B顺序交付审核、词表、接入/采纳、质量/CI与consumer-only HTTP/Docker。
**Architecture:** 保留三域原生生命周期、稳定KID/CID和immutable格式，新增能力在host授权、公开派生合同和外层服务适配；不修改已有历史产物，不以候选替代reviewed，不伪造旧proof。
**Tech Stack:** Node24.15+、TypeScript/ESM、SQLite、Zod、现有MCP SDK，尽量复用现有依赖。
**Spec:** ../specs/2026-11-11-cannbot-alignment-discussion-design.md；用户2026-11-11明确授权“根据计划修复以上问题，直到全部解决”。

## Global Constraints

- S0—S4均属本次任务，不以修完六缺陷当全部完成；实现/专项/真实/发行/用户验收分列。
- 当前562fba7工作区已有15文件修改和subscription-policy.ts，先保存patch与SHA再复核，禁止重置用户改动及.DS_Store。
- 原oracle v1未复现、新v2独立对照与superseded分列，不改写历史证据。
- build成功结束后才跑dist测试；测试运行期间不clean/build共享dist。全量使用独立冻结源码和独立dist。
- 不push/PR；不远程执行工作树内容；包/源码/安装/语义与用户审核分别绑定。
- 读KB不等于读raw，回执不证明语义；未授权模型不自签human-reviewed；新revision不继承旧review。

## 顺序路标（每阶段开始前细化对应子计划）

| 阶段 | 交付单元 | 主要文件边界 | 当前状态 |
|---|---|---|---|
| S0 | 六缺陷、真实语义误述追踪、协议/链接一致性 | knowledge-migrations、codewiki scheduler/update-service、controller、governance public-policy/lint、Skill | 六项修复及专项复核通过；45e81e2完整回归1500pass/1skip+controller95pass，最终源码仍另冻验 |
| S1a | 原生审核事件与reviewed过滤、人机评估分列、工具和公开契约 | 新review模块；query-common/query-controller/consumer-query/public document；runtime/CLI；公开spec | 专项集成通过，发行/语义/用户验收未代替 |
| S1b | 词表声明扩展、alias/deprecation、独立applicability三态 | governance registries/contract/filter；显式迁移API与CLI | 专项集成189/189、controller95/95；最终发行/语义另验 |
| S2 | bootstrap、public consume/index adopt/producer support矩阵 | setup、repositories/consumer、knowledge migrations、CLI | bounded实现/复审/真实冷安装通过：7a0606b修复隔离编译器后封包、sealed imports及16阶段SDK冷测；最终全源发行另验 |
| S3 | 聚合check/public-only lint/导航、独立标注检索、语义评审、双轨CI/precommit与贡献文档 | scripts/evals、governance lint/publication、provider-neutral CI、CONTRIBUTING/recipes | 实现/专项已收敛：聚合check与契约、双轨CI实际OCI构建47/47、最新当前治理审计及36/36联合通过；真实doc/code原生纠错与PR治理重验独立复核通过；冻结检索评估器已完成，正式同输入质量对比待最终S4封包 |
| S4 | consumer-only HTTP、逐工具能力授权、token轮换/撤销、探活、观测、Docker | 新transport server适配与CLI、容器/工具文档 | Task1 token存储/CLI/轮换撤销/真实SIGKILL恢复9c0d746完成并独立复测11/11；Task2能力/取消/末端守卫b13ac87完成并复审，最终62/62、较广74/74分列；Task3 HTTP/等价/限流/S1只读564e2bb完成复审，最终68/68+独立真实TCP3/3；Task4 OCI/文档/脚本已实现并复审；实际中间 sealed runtime 容器七阶段通过；最终整体验证、同源封包重放和固定检索对比待执行 |

## S0 Task 1：既有修复复核与真实回归

**Files:** 当前patch中15文件及src/unified/codewiki/subscription-policy.ts；测试tests/knowledge-identity.test.mjs、codewiki-scheduler.test.mjs、codewiki-executor-rescue.test.mjs、governance-lint.test.mjs、document-presentation.test.mjs、controller/document-lifecycle.test.mjs。
**Interfaces:** identityStore.withSnapshot/apply并发互斥；isSubscriptionRevocation(error)共享确定性撤权分类；resolvePublicationLink/validateResolvedPublicationLink/publicationLinks共享线上与离线链接合同；仅operator abandon可容忍同源配置漂移。

- [x] 保存继承patch及源码SHA到仓外2026-11-11-alignment-implementation。
- [ ] 逐项对应audit.json的六项原反例，不用测试名称代替实际RED；需要新修复时先写反例。
- [ ] 静态复核锁协议、controller末端权限和线上/离线链接等价性。
- [ ] 使用Node24执行构建：`npm run build`，确认exit0。
- [ ] 联合执行：`node --test --test-concurrency=1 tests/knowledge-identity.test.mjs tests/codewiki-scheduler.test.mjs tests/codewiki-executor-rescue.test.mjs tests/governance-lint.test.mjs tests/document-presentation.test.mjs`；controller用`node scripts/test-controller.mjs`。
- [ ] identity实际SIGKILL后可重获互斥，未知旧锁不删；持锁活进程仍独占；侧文件替换/符号链接拒绝。
- [ ] 临时SQL/IO失败保留订阅，确定撤权仍失效；完整心跳轮失败达到预算才中止，成功整轮才清零。
- [ ] 新文档按随包Skill完成实际read/submit/READY；legacy仍按session pin恢复；修配置后可CAS清理原坏会话但不能扩大source根/visibility。
- [ ] 固定真实三域公开产物对账lint/发布/消费链接与来源；PR69语义误述独立登记/正式修订，不手改managed投影，不把旧误述当检索gold。
- [ ] 记录源码绑定、命令/退出码/日志SHA/独立审查结论，更新本表并单独提交S0。

## S0 Task 2：冻结检查

- [ ] S0提交后冻结git archive到独立目录，继承固定依赖/参考，单独dist完整npm test。
- [ ] 在冻结安装检查kernel/upstream/parity/domain-parity-v2/smoke；旧v1缺失不掩盖。
- [ ] 期间继续S1设计与测试，禁止修改冻结快照或用其结果覆盖之后的HEAD。

后续S1—S4分别先写有精确接口、实际反例及命令的子计划，再实现，不凭路标表声称完成。

## S2冷安装与S3当前边界补充

S2冷测试验证实际native SYNTHETIC产物、原private/public生产者目录删除、离线npm安装、consumer bootstrap/select/adopt/index、安装内SDK stdio检索/精确KID/CID读取，以及实际Codex物理可执行文件的producer bootstrap preview/apply。没有启动Codex或外部模型；不构成真实语料语义通过。直接共享node_modules封包的越界归档及外部tsc借用两问题均保留原失败证据，修复后7a0606b新归档SHA5585db7021bd5aaed9e52c485c856315dbe9f4afa710e56fab4ad523c968f327，16阶段冷测22.809s，sealed15,369成员/1,676观测模块均在安装内。新S3/S4代码仍需最终重新封包与全量检查。

S3文档原生修订使用现有真实KB根、正常read/plan/submit/complete和本地同步。DocPR新publication733cabd100749a46bd17c3d968c7dd38aeb9512aa8f771967383ae0426855eab，原source revision不变，7CID保留，纠正11PMULL+2hw-fold+dispatcher。DocCRC新publicationa3a3a424b630c8a87fa8bf29c0f503b8e175ea9dda0493b2522bbadb136390f8，恢复官方header导致真实新来源版本，9技术CID保留并重绑证据，演练CID通过retract变更/parent历史保留，退出当前active集合。独立agent核对16有效主张、原始来源、收据、撤回链和21旧publication文件字节；人审仍unreviewed，不冒称外部宿主/模型证明或远端发布。代码三处路径原生更新首次官方Git核验FETCH_TIMEOUT，旧版保持可查，网络路径另诊断。检索gold/留出尚未运行；绝对质量和对冻结45e81e2的同输入防回退阈值已在首跑前声明。

## S0结果（2026-11-11）

六项原审计缺陷修复经复核并补身份锁DB替换/父目录替换、projection current提交点拒绝与文档双范围receipt句柄用例。私有protocol持续绑定parent/gate/DB/marker，实际进程SIGKILL可恢复，替换DB不能分裂互斥；apply/public index/projection current在同步提交点复查lease。未知旧锁及半初始化不猜测删除。可见materialize仍可能超前正式pointer，不能声称所有可见文件完全没改。Skill明确plan阶段选行范围，作者阶段逐sourceReads带receiptId实际读。

联合71/71（54872.665958ms），controller95/95（57126.671833ms），build/kernel51/固定0.7.2发布runtime逐字节通过；真实code/document/PR retained公开产物离线lint全部无findings（精确数见s0-verification.json）。静态复核两新增确认缺陷关闭。以上是机制/合同专项，不等于全量发行、事实或用户验收。已知PR69语义误述继续作为S3正式修订及独立gold筛查任务，不手改原历史产物。

下一步冻结本提交完整回归，同时继续S1a审核事件及reviewed入口；S1—S4未完成，不以本批结果结束总任务。

## 冻结S0完整回归补充

4341dad冻结完整test为1319pass/3fail/1skip（1323），不改写原失败。两项research失败确认为runner PATH漏实际rg，修测试执行环境不改搜索语义；一项historical test的14子例通过、teardown ENOTEMPTY，确切后台写入者未证实。固定同一源码并带实际rg路径、禁Git自动维护后，失败所在3测试文件48/48通过（20.003s）；这是补充复跑，不冒称完整全量重跑。证据s0-full-failure-diagnosis.md、s0-failed-tests-rerun.json。最终发行仍需绑定最终源码重新完整检查。

## S1b integrated result

Trusted namespace/admission/alias/deprecation and independent exact-target applicability completed targeted integration. Native governance scopes and latest interpreter implementation are pinned; old knowledge bytes/IDs not rewritten. Actual operator preview/CAS and producer→publiccompanion→Git→coldconsumer are tested separately from review/raw/nativeproof. Joint189pass/controller95pass/kernel51/fixed0.7.2runtime comparepass. See vocabulary-applicability subplan and s1b-integration-verification.json. S2–S4 next; final fullsource/package/install/semantic/user acceptance not inferred from this result.

## S3质量与CI收敛 / S4接力（2026-11-11）

S3聚合检查3e572728/4d7e45b完成实际工具契约、源码/dist/依赖绑定、固定最小gate、staged真实索引导出与refs/replace防护。CI至88db60f实际Docker兼容OCI非root、只读root/candidate、networknone、限额与清理验证；固定候选真实构建及47/47专项通过，Linux物理目录缓存缺陷299/300失败修为300/300成功，外部oracle原始pin不变。公开审计7f5c18f默认仍严格all-publications；显式canonical-current保留全部历史完整性/Claims/链接/替代/epoch约束，只有历史治理重验披露为非必需not_run。最终联合36/36通过。

真实Code Wiki路径已通过正常lease/research/read_source/write_draft/submit/finish更新，其他三页不变、旧9文件不变；DocPR/DocCRC保留CID及历史链，PR69再通过原生更新匹配最新治理，7条主张及证据完全相同、旧4文件不变。新的派生公开CRC快照91c423380bca199f3fe0d1a96b1d7cd174d6ae01含7当前KID/61声明文件+根索引，当前治理模式实测通过，严格模式仍明确报告9历史旧pin。公开消费不代表raw来源可用或人审通过。

冻结评估器74a7551已独立审查、合成实际SDK ABI通过；真实12题gold标签与阈值在首跑前固定，尚未执行计分查询。基线45e81e2源码归档匹配原始SHA并独立封包冷装，针对新CRC快照实际采纳/7KID精确定位通过。正式基线/候选检索对比等待S4最终源码及封包冻结，避免中途调留出题。

S4 Task1 9c0d746已实现私有owned0600/hash-only bearer存储、CAS/持久lease、issue/rotate/revoke/inspect CLI；实际进程SIGKILL恢复、CLI及存储独立11/11通过，冻结checkrunner+token23/23通过。Task2按构造期collection/page-only权限和请求取消/末端守卫继续开发；HTTP SDK会话、stdio等价、真实OCI服务、最终全量/封包/冷安装/检索语义/统一用户验收仍分列。

## 最终源码冻结前检查点

截至本检查点，S0—S4的功能实现与分任务审查已收敛。S4当前driver f106878以已sealed runtime348fbeb完成真实Docker兼容OCI七阶段、容器内外SDK及安全拒绝/只读/UID/限额/清理，严格分开绑定，不冒称当前driver已同源封包。独立Node24测试14/14通过；默认Node23导致的一次绑定失败保留为环境差异。

下面仍属本次连续任务：整分支独立复核；冻结最终源码；full/controller/kernel/upstream/固定OpenWiki0.7.2parity/domain-v2/smoke；最终pack/seal/cold与同源OCI重放；冻结CRC gold/基线45e81e2/候选同输入检索对比和当前公开审计。最终gate-by-gate结果记在仓外version3-development-evidence/2026-11-11-alignment-implementation/final-validation-matrix.md及对应JSON回执。本文件是冻结前计划检查点，最终结论以绑定源码/安装产物的实测回执为准。人工统一验收不由agent自签。
