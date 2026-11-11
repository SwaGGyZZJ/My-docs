# CANNBot 对齐讨论与收敛设计（待用户验收）

日期2026-11-11。原方案8c2b648；产品审计代码1120dc1、审计记录c847bbf。当前已有六项缺陷及Skill/lint一致性修复在脏工作树中，本设计不覆盖、不丢弃、不把它们算作新增适配已实施。本轮只读研究和设计，不push/PR、不实现新适配。

## 证据和角色

- 原方案来自用户指定文件；“由cannbot/glm5.3提出”是用户归属说明，原会话尚未核验。
- root：对11项挑战组织证据、方案和最终取舍，最终用户验收。
- 独立agent：/root/alignment_independent_review，只读审查，有原始消息记录。其观点不等于GLM观点。
- 实际GLM：用户已授权发送最小11项提纲及对应评审意见；同一会话ses_e39858a2fffe8COUrWk6xU9OLc完成两轮实际讨论。CLI请求与本地导出的两条assistant元数据均为provider=cannbot/model=glm-5.3、finish=stop。独立agent读取两轮实际输出并回应，非root代写。GLM只获授权的最小提纲及对应评审意见，未读取完整内部审计或产品文件，不构成独立源码审计。
- 原完整内部附件调用被自动审批拒绝且未运行；拒绝原因、后续最小载荷和用户授权保留于仓外evidence。模型session数≠provider请求数。
- 本轮证据目录：`version3-development-evidence/2026-11-11-cannbot-alignment-discussion/`（工作区根下）。包含原方案、audit、载荷、独立意见、GLM原始事件和后续收敛表。
- 用户参考654f897与当前官方2ece3a8分别归因；不能把新参考scope机制倒归旧参考。

## 方案选择

A 原顺序HTTP优先：能较早演示团队服务，但扩权成本大，不能解决默认reviewed空结果、恢复和Skill漂移。无明确团队需求时不推荐。
B 推荐分批：先关闭已证实缺陷与协议漂移，再补审核/用户路径和公开合同、质量与CI，HTTP作为可选独立消费服务。每批有限退出，无全库重构。
C 只修六缺陷并冻结：交付面最小，但reviewed/贡献/采纳等产品缺口仍在，只适合作为短期维护发行，不能称全部对齐。

## 推荐顺序与有限退出条件（两轮讨论后由root收敛，待用户验收）

| 批 | 内容 | 放行证据 |
|---|---|---|
| S0 已授权修复 | 身份锁可恢复、临时故障不永久撤权、整轮心跳预算、lint/发布链接合同、Skill新旧协议、改配置后原会话清理；明确已知真实PR69误述 | 六原反例RED→GREEN，实际Skill入口，新旧路径回归，同真实三域材料经过提交/发布/lint/消费；不以历史全量绿色替代 |
| S1a 审核闭环与公开契约 | reviewed真实审核事件、公开spec、工具/错误参考、贡献/AI声明 | KID+精确pageRevision/claims hash+reviewer/方法/结论/时间绑定；未经审核不入reviewed；实质更新旧review失效；producer自述不授review权；candidate默认不悄悄替代reviewed |
| S1b 词表/适用条件 | 核心词表+仓库声明式扩展，alias/deprecated迁移；scope仍是原分类；独立versioned applicability | 旧知识不改KID/不强制重digest，字段兼容；match/unknown/conflict不可混同；any/all规则确定；仓内声明不执行JS，不产生授权 |
| S2 接入与采纳 | stdio bootstrap、public snapshot消费、派生索引重建/adopt、producer写入采纳分三能力 | 干净目录不依赖开发.acceptance；preview不写；坏hash/错误仓/旧协议/缺证明/dirty投影分别拒绝；rollback/recover保留原字节；unsupported诚实列出 |
| S3 门禁与质量 | 聚合check、public-only lint/导航、三域检索基线、独立语义/关系审查、双轨CI、precommit | 固定源码/包SHA/安装，门禁失败可定位；真语料独立标注和留出+合成负例分列；越权/错版本/tomb零容忍；引擎候选在无secret无发布权隔离测试，内容校验用可信策略 |
| S4 可选HTTP/Docker | 先预置公开snapshot的consumer-only服务，明确团队场景后再做 | 工具及输入分支副作用清单；默认不含acquire/update/producer/raw；跨token/collection/ticket/会话负例、Origin/Host、最小health/readiness、取消并发quota与脱敏；HTTP/stdio语义一致 |

S1a与S1b可在合同层分开验收，不把审核、词表和条件一起重写为新三域格式。S2 producer write adoption若原始证明不足，先交付消费/索引两层和明确unsupported矩阵，不能用hash通过伪称续写可用。

## 对原方案逐项取舍初表

| 原条目 | 取舍 | 理由/改动 |
|---|---|---|
| CANN仅静态仓定位 | 修改 | 654f897已有通用/专用producer、LLM mine/curate+独立审查。KP回执也不等于语义正确 |
| HTTP/Docker排全部P0首位 | 暂缓/条件采纳 | 无团队需求依据则后置S4；若用户明确需求，可提前consumer-only小范围，但不拖延S0 |
| 按工具前缀放只读权限 | 不采纳 | acquire/update有下载/缓存写；catalog选择分支和sources/原文读也需逐输入分支审查 |
| 观测面 | 修改采纳 | 留本地、最少字段、脱敏与保留限额；不自动传Git；不把session/child数充provider请求数 |
| 工具文档/recipes/公开spec | 采纳 | 从实际schema与运行协议生成/对账，不把draft API当已实现 |
| bootstrap恢复.acceptance | 不采纳 | 开发验证资源不能成为用户依赖 |
| hash即producer adopt | 不采纳 | 消费、派生索引和producer续写能力分层，原始proof/权限独立 |
| 聚合check/precommit | 采纳并补版本绑定 | 分冻结/快速/发行，CJS实际摘要只校验对应owned文件，保留原上游pin |
| lint需要原私有registry/receipt | 修改 | 冷消费只依赖public index/manifest/claims；字节、来源声明、原生重放、语义分列 |
| 导航缺失一律warning | 修改 | 必需入口/断链接按发布可用性阻断；非必需孤儿提示不自动判错 |
| 只用真实CRC且首跑设合格阈值 | 不采纳 | 已知误述先修正或明确负例，独立标注/留出；质量合格与防回退分别有门槛 |
| CI完全不执行候选src | 不采纳 | 知识内容trusted validator；引擎src在隔离无密钥环境实际执行；评论触发要权限+head固定 |
| 知识不可人工起草、知识PR只能改工具 | 不采纳 | 人工候选经正式import/update和证据审核进入；知识PR可承载实际生成产物，仍禁直接改managed投影 |
| 调用计数替代AI参与声明 | 不采纳 | 平台/模型/方法与未知usage分列，不强迫公开私有prompt/trace |
| claim有证据故免语义/关系反例审查 | 不采纳 | receipt证明字节/操作；相关性、事实解释和条件适用需独立评审 |
| 默认reviewed审核晋级 | 新增 | 当前恒[]是有意fail-closed，缺产品功能而非授权漏洞；不得直接放宽视图 |
| 词表扩展和条件三态 | 新增 | 声明式/可选/版本化，不更改原scope语义或KID |
| 稳定ID、immutable、CAS/tomb、KB/raw分权 | 保留 | 不以CANN路径身份或滚动恢复替代 |

## 审核与条件合同建议

review事件绑定精确KID/修订/pageSHA/claimsRevision、可信reviewer identity+role、human/model/automated方法、结论与时间、证据引用；审核者身份和晋级权限由operator信任配置授予，页面verified.by字符串不构成能力。机器评估与人审分别显示。新修订默认不继承旧review；未来若允许元数据变更继承，也须显式事件重新绑定新修订，不能靠标题/路径推定。

applicability与现有scope分类分离，独立schema/version，条件字段从当前受信声明式词表读取。老页缺字段保持unknown而非match；普通查询按显式策略展示unknown，高置信过滤不能将unknown充真。条件冲突不给授权；授权仍原KB/raw合同。条件语义/别名弃用迁移仅改显式适用范围，不自动全库改正文。

## 不得混淆的验收状态

实现、专项、真实业务、冻结全量/发行、语义/人工审核、远端发布、用户验收分别报告。旧oracle v1未复现与新v2独立基线通过/superseded记录分开；此设计不追认或豁免此前基线变更。参考检查通过不代表宿主应用、全仓check或语义通过。

## 用户需验收的产品选项

1. 推荐S0→S1→S2→S3→S4；是否存在需要提前HTTP的明确团队场景？未指定则默认后置。
2. reviewed审核者可为哪些可信角色/方法，机器评估如何命名和展示？不能冒充人工验收。
3. producer write adoption如果旧proof不足，是否接受分阶段交付的明确unsupported矩阵？不能改成隐式续写。

## 两轮交锋与主agent裁决

| 议题 | GLM第一轮 | 独立agent反驳 | GLM第二轮 | root最终取舍 |
|---|---|---|---|---|
| native replay | 当作依赖目标硬件的算子重执行 | KP为receipt/事件/文件span/证据图验证 | 明确承认误解并修正 | 按字节/原生证据重放/语义/硬件实验分列，不缺proof充通过 |
| CAS/GC | 混为内容寻址并建议GC | CAS是compare-and-swap | 撤回混淆；仍建议未来GC引用测试 | 保留CAS冲突不部分可见及引用不变量，不扩张为首批GC项目 |
| 关系合理性 | 以版本引用存在作结构例 | 两真实claim组合仍可能语义不成立 | 接受结构与语义分开 | 独立语义/关系抽查，有限反例不声称全覆盖 |
| 投影写保护 | 要求本地写目录直接拒绝 | 用户文件所有者可改，产品能检测并拒不完整对象 | 明确修正 | 既有hash/末端epoch不降级；HTTP加只读挂载；恢复先preview/备份/staging，不覆盖用户内容 |
| reviewed空集 | 可provisional二选一 | 不得默认回退到candidate | 接受显式candidate，保留审核吞吐/橡皮图章问题 | reviewed默认保持；独立模型与human方法分开，生产者不自签，审核方法记录独立核验还是仅背书 |
| break-glass | 建议快速通道 | 不得绕auth/hash/版本/tomb/CAS | 同意，增加回滚审计 | 仅显式已验恢复，版本回撤事件可见且不能复活tomb；不列自动化首批项目 |
| HTTP权限 | 能力层强制而非仅分类 | 专用consumer能力、逐工具和隔离约束 | 接受，加轮换/过期/撤销 | HTTP子批必测token/ticket失效；没有团队需求不提前做 |
| claim真值 | 第一轮讨论硬件核验 | 需按claim类型选方法 | 第二轮仍有“执行依赖claim唯一真值是硬件实验”措辞 | **修改，不原样采纳**：源码归属/机制可精确源码核对及静态分析，功能行为用单测/集成/必要目标实验，性能收益须条件匹配的真实实验。没有一种方法是全部claim唯一真值 |

独立agent二轮后确认八项核心边界无已知分歧；root对硬件“唯一真值”保留上述限定，这是root裁决而非声称GLM另行接受了第三轮修订。对HTTP是否有当前业务阻塞、审核角色与方法、producer采纳分批接受度，证据不能替代用户选择。

## 默认验收建议

1. 推荐B顺序，HTTP/Docker后置；若用户明确团队接入硬阻塞，再单列consumer-only前置小批，不挤掉S0。
2. 默认reviewed以授权人工审核事件为人审依据；独立模型语义评估另显方法/结论，不自动标human-reviewed、不把candidate换名。若希望模型评估也进入某种默认可用视图，需要用户明确其名称/规则。
3. 原proof不足的旧库，先验收公开快照只读与派生索引两层，producer续写明确unsupported/migration-required；不偷偷补造原回执。后续单列写入采纳批。
4. 六项已授权缺陷修复单独提交、复验；本轮新增适配在用户验收本设计后才写可执行实施计划并开发。既有全量1307+91/新v2 domain parity通过不能替代这六项关闭或本新功能验收。

## 讨论证据与限制

原意见：original-plan.md（8c2b648副本）、source-audit.json（审计副本）、independent-round1.md、independent-round2-original.md、independent-final.md。实际外发：glm-approved-payload-draft.md、independent-round2-payload.md。实际回答：glm-round1.jsonl/.md、glm-round2.jsonl/.md。模型身份/usage：glm-session-export-final.json。摘要与所有文件SHA：discussion-status.json。

会话有2条成功assistant输出，均cannbot/glm-5.3。导出usage合计25819 tokens（input14615/output2278/reasoning8926）；不含root/独立agent用量，不等于外部低层请求/重试数或费用。首次完整附件尝试被审批拒绝，未启动；用户之后明确授权最小提纲及对应意见。无产品代码实现、无新测试/构建、无push/PR；原方案保留，不覆写归属。

本设计待用户验收。实现/专项/真实/发行/人工与用户验收各状态不因本讨论完成而提升。
