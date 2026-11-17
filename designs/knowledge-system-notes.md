# KunpengKnowledge：查询、分类与目录精简说明

整理日期：2026-11-17。本文汇总关于检索顺序、分类字段、MCP、索引和目录的讨论。源码仓为 KunpengSDK/KunpengKnowledge，核对时 HEAD 为 `395e1a61287cff31a06200b055171b1b8362ba09`。结论依据当时读取的源码，不代表已安装服务具有全部同版功能，也不代表端到端验收。配套图见 [分类元数据生命周期时序图](metadata-lifecycle-sequence.md)。

## 1. 一次查询怎样找到知识

```text
用户问题＋Skill＋工具说明
  → 宿主模型生成 query 及可选过滤参数
  → MCP 校验，必要时发现授权来源
  → 按知识类型、来源、版本及权限选择输出
  → 按分类、内容状态、审核视图等过滤页面
  → 按章节建立本次请求的内存 FTS5 索引
  → 关键词召回、覆盖数与 BM25 排序
  → 返回前 N 个章节的标题、摘要及读取票据
  → 模型按需读章节、整页及原始证据，再回答
```

宿主模型决定关键词与过滤条件；服务端没有固定的自然语言改写函数，不自动从 query 推断标签。可选路由 `kpbot_route` 使用规则判断类型和动作，也不调用模型。

统一查询不采用“先搜 title，失败再搜 tags，最后正文”的顺序；标题、摘要、章节标题、正文和标识文本一起参与全文匹配。不指定知识域 `type` 时可以混合三类结果，没有固定的代码优先、PR 次之、文档最后的检索顺序。

生产端入口为 `src/unified/mcp/query-mcp.ts`；主链路在 `src/unified/knowledge/query-controller.ts`。Skill 的查询指导在 `skills/kpbot-knowledge/references/query.md`。实际宿主加载了哪些指导、最终发送了什么参数，需要 tool-call trace 才能证明。

## 2. type、profile 与 registries 分别是什么

| 概念 | 含义及实际用途 |
|---|---|
| 查询参数 `type` | `code` 是代码 Wiki，`kernel` 是 PR／补丁，`document` 是文档；先限制输出范围。消费者还接受 `pr`，并兼容 `kernel`。 |
| 页面 `profile` | concept、api、guide、optimization、runbook、example、glossary、interoperability；约束页面 type 和额外字段，也支持查询精确过滤。 |
| 页面 `type` | Concept、API、Guide 等，必须与 profile 的定义匹配；不等于查询参数 type。 |
| `domains` | 领域，例如 systems；当前用于分类校验，不直接作为查询过滤或独立全文字段。 |
| `technology` | 技术，例如 generic、c、cpp；当前不直接作为查询过滤或独立全文字段。 |
| `scope` | implementation、usage、diagnostics 等工作范围；当前不直接作为查询过滤或独立全文字段。 |
| `platforms` | cpu、gpu、agnostic；通过 platformsAll／platformsAny 参与硬过滤。 |
| `tags` | task.* 任务标签和 topic.* 主题标签；既参与 tagsAll 过滤，也作为文字进入全文索引。 |

`registries.yaml` 是受控词典，不是打分配置：描述文字不自动进入页面索引，也不自动把用户用语映射成标签。task.* 与 topic.* 不会因为前缀不同而获得不同权重。

`profile=guide` 与 `tags=[task.optimization, topic.memory]` 可以同时成立，表示“帮助完成内存优化任务的指导页面”。页面类别和标签互补，当前不强制 optimization 类别与 task.optimization 配对。

## 3. 分类规则怎样执行

- 提交时：检查 profile/type 对应关系、通用及额外必填字段、分类值是否登记、task/topic 各至少一项。
- 平台规则：agnostic 不与具体平台混用；非 glossary 页面平台未知时要求 draft。
- interoperability 额外要求已登记且不同的 source_technology、target_technology。
- 查询时：指定 profile 就精确匹配；tagsAll 要求列出的标签全部具备。
- 当前没有 tagsAny。platformsAll 要求普通平台相关页面全部满足，platformsAny 要求任一满足，两者不能同时传。合法 agnostic 页面和 glossary 有平台过滤例外，不等于已证明满足具体运行环境。

例如，下面只查询 CPU 范围、同时具有内存与优化标签的候选稳定代码知识：

```json
{
  "type": "code",
  "query": "memory alignment",
  "tagsAll": ["topic.memory", "task.optimization"],
  "platformsAny": ["cpu"],
  "view": "candidate",
  "contentStatus": "stable"
}
```

候选视图与内容成熟度独立：默认 view 为 reviewed，内容状态默认 stable；读机器生成草稿需要显式 candidate 和 draft。上例为示意请求，不证明当前存在命中。

## 4. 章节怎样切分，SQLite 做什么

按 Markdown 二级标题拆章节，三级及更深标题通常留在所属二级章节内；一级标题后的介绍文字可成为独立单元。没有可用二级章节时整页作为单元。不是按固定字数切块，长章节不会自动切小，超限会报错。

排序器先保留原始内容并添加驼峰、路径和中外文边界拆分表示；中文等文字增加单字及相邻双字。随后使用 SQLite 的 `porter unicode61` tokenizer。

```sql
CREATE VIRTUAL TABLE units USING fts5(
  title, description, heading, prose, identifiers,
  tokenize='porter unicode61'
);
```

每个章节 INSERT 一行，SQLite 自动维护词到章节行、列和位置的索引。query token 用 OR 连接后通过 MATCH 召回，再计算 `bm25(units,8,4,6,1,3)`。

| 列 | 内容 | BM25 权重 |
|---|---|---:|
| title | 条目标题 | 8 |
| description | frontmatter 摘要 | 4 |
| heading | 章节标题 | 6 |
| prose | 章节正文 | 1 |
| identifiers | 页面路径、来源 URI、证据路径、页面 tags | 3 |

独立介绍单元不重复填入页面标题、摘要和标识。生产端代码 Wiki 的条目标题来自正文第一个 H1，缺失时用路径；PR 来自 proposal.title，文档公开查询来自元数据 title 或文件名。不能假设所有路径都直接采用 YAML title。

BM25 根据列加权词频、词稀有程度和长度等因素计分，SQL 中越小越好；项目返回 score 时取反。统计语料是本次过滤后的章节，不同查询范围的分数不宜直接比较。

统一查询最终先比较命中的不同 query token 数量，再比较 BM25 并用固定顺序消除平局。路径提示在底层排序器中有支持，但统一入口没有传入它。因此标题权重高不意味着永远排第一，同一页面也可能有多个章节命中。

该路径使用 Node.js 函数＋SQLite，不调用 grep／rg。`kpbot_codewiki_search_source` 是另一类原始源码搜索接口，使用受限 rg，不能与知识检索混淆。

## 5. 是否查所有文件，是否返回全文

- 只把所选授权输出中、通过条件的知识页面加入全文语料，不把整个文件系统或整个源码仓的文件都加入索引。
- 页面打开、来源发现、权限及完整性核对可能先访问额外文件；前置标签过滤不保证不读取未命中页面。
- limit 限制返回数量，不表示只索引前 N 页；通过筛选的全部章节先参与索引，受资源额度约束。
- 每次 `rankEntries()` 新建 `:memory:` 数据库，插入章节并查询，最后关闭；这里不是复用长期持久化的全文索引。
- 搜索仅返回标题、章节信息、开头最多约 512 字节的摘要和票据，不自动把最高分所在整页交给模型。摘要并非围绕命中词截取的高亮窗口。
- sectionReadTicket 用于读章节，readTicket 用于读整页；单次正文读取受大小限制，大页需要按行段读取。原始来源证据使用另外返回的来源票据。

对模型上下文而言，这是“摘要 → 章节／整页 → 原始证据”的渐进式披露，不是按文件夹逐层缩小。是否扩大阅读由 Agent 决定，没有以 BM25 分数触发整页读取的固定阈值。服务端内部可能已读取候选全文。

## 6. 没有搜到怎么办

先区分错误或来源不可用、审核／内容状态排除、分类过滤过严和关键词未命中。查看 hits、coverage、unavailable、complete；不完整或不可用不能解释为知识不存在。当前也不会为所有空结果自动解释是哪条标签排空了候选。

服务端不自动改词、取消过滤或跨类型重试。Agent 可先检查视图和状态，再移除自行推断的过强条件、调整关键词，并在允许范围内扩展来源。用户明确的硬约束不能因空结果而静默删除。tagsAny 未提供时，可分别查询并按身份去重；不能简单混排不同语料范围的 BM25 分数。

## 7. profile 是否有专用正文模板

`profiles.yaml` 只表达页面类别、对应 type 和额外必填字段。通用 YAML 结构在 `frontmatter.schema.json`，执行校验在 `contract.js`。目前没有按每种 profile 强制“前置条件 → 操作步骤 → 验证”等正文模板的通用机制。

代码 Wiki 正文由页面计划和作者指导组织；PR 主张页由 PR 渲染代码按机制、事实、推断、证据等生成；文档可使用自己的 presentation 协议。领域渲染器不等于 profile 专用模板。

## 8. 文件夹由谁决定

| 知识类型 | 内部路径来源 |
|---|---|
| 代码 Wiki | 模型在页面计划提交 /kpbot/...md；服务端校验边界、保留名、重复和计划约束。发布映射到 `knowledge/code-wiki/<配置的仓库名>/codewiki/...`。 |
| PR 卡片 | `pageCategory(classification)` 将页面 type 转为合法目录段，生成 `<类别>/<pageId>.md`；因此存在 profile → type → PR 分类目录的间接关系。 |
| 文档知识 | 新文档在 digest 计划中指定 logicalPath 并绑定作业／主题；旧流程若使用 sources/documentId 子目录，须绑定对应文档。不是统一由 profile 生成目录。 |

顶层 code-wiki／pr-wiki／doc-wiki 由知识类型固定映射，根位置来自可信运行配置及目的仓绑定。PR／文档启用布局 v2 时，可见路径增加 wiki/；工具 logicalPath 不因此改变。registries 标签不会自动生成目录。路径已参与任务、发布清单与完整性绑定，修订或迁移应走受支持流程。

## 9. MCP 接口怎样选择

| 任务 | 典型接口链 |
|---|---|
| 查知识 | `kpbot_knowledge_sources`（必要时）→ `kpbot_knowledge_search` → `kpbot_knowledge_read` → 读来源证据 |
| 本地代码 Wiki | `kpbot_begin` → `kpbot_submit_plan` → `kpbot_next_page` → 写页／提交主张 → `kpbot_submit_page` → `kpbot_finish` |
| 项目官方 Code Wiki | `kpbot_codewiki_workflow/list/update` → begin／plan → worker claim／research／write_draft／submit_artifact → finish／status |
| PR／文档创作 | `kpbot_sources` → `kpbot_start` → `kpbot_action` 循环 → `kpbot_complete`；中断用 status／resume |
| 代码存储同步重试 | `kpbot_storage_status` → `kpbot_sync`，不重新生成，不 push Git |
| 消费知识子仓 | catalog → 用户明确选择与授权 → acquire／update → 统一查询 |

`kpbot_sources` 是创作输入清单，`kpbot_knowledge_sources` 是知识查询清单；`pr.read_evidence`、`document.plan` 等是 kpbot_action 的动作值，不是独立 MCP 接口。新旧协议不能混用，按 start 返回的协议继续。旧 `kpbot_search/read` 是仓库 Wiki 兼容入口。源码支持不等于当前连接已暴露：具体接口及参数以运行服务公布的 schema 为准。

## 10. 扩展边界与当前缺口

五类 registries 支持带命名空间、知识仓绑定和摘要准入的扩展词表，以及别名和弃用声明；不由该机制扩展 Type/Profile。声明文件本身不授权、不自动生效，也不会自动给旧页补分类。

新增一个 technology 取值，不会自动获得 technology 查询能力。当前 domains／technology／scope 缺少结构化检索入口；新增维度或过滤能力需同步接入 schema、治理、查询比较、消费端及相应验证。适用环境另有 applicability.environment 和显式条件断言，不能把平台分类直接当成环境适用性证明。

## 源码与参考

- 核心配置：`src/governance/resources/{profiles.yaml,registries.yaml,frontmatter.schema.json}`。
- 治理与匹配：`src/governance/{contract.js,query.js,vocabulary.js}`、`src/unified/knowledge/knowledge-query-policy.ts`。
- 查询：`src/unified/mcp/query-mcp.ts`、`src/unified/knowledge/query-controller.ts`、`src/domains/query-rank.cjs`。
- 路径：`src/kernel/claims/brains/code/paths.js`、`src/domains/pr-mechanisms.cjs`、`src/unified/document/document-digest-planning.ts`、`src/unified/knowledge/{projection.ts,knowledge-layout.ts}`。
- 词表与适用性说明：`docs/governance/vocabulary-applicability.md`。
- SQLite 官方：[FTS5 索引结构](https://www.sqlite.org/fts5.html#the_key_doclist_format)、[BM25](https://www.sqlite.org/fts5.html#the_bm25_function)。
