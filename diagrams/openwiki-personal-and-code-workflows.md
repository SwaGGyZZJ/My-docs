# OpenWiki 个人知识库与代码仓知识库：技术流程与职责边界

整理日期：2026-10-28。

版本范围：基于本次核对的官方 `langchain-ai/openwiki` 仓库 `main` 公开源码，`package.json` 显示 **0.7.2**。部分公开源码页面存在抓取缓存，未锁定实时提交 SHA，因此本文不能保证对应阅读时的最新 HEAD。后续版本变化时，应重新核对文末源码链接。

本文覆盖语料进入、消化生成、更新维护和查询使用。两张图中的数字分别表示各自流程的阅读顺序；虚线表示回查、下一轮更新或重新规划，不代表步骤并行。

## 图例与阅读约定

| 标识 | 颜色 | 执行主体与约束含义 |
| --- | --- | --- |
| 【程序】 | 蓝色 | TypeScript/Node.js 代码执行、状态管理或强制校验；并非外接 Shell 脚本。 |
| 【模型】 | 紫色 | LLM 决定阅读、理解和综合方式；Prompt 是行为指导，不等于程序保证。 |
| 【协作】 | 橙色 | 模型发起工具调用，程序执行操作并控制权限、输入和结果校验。 |
| 【产物】 | 绿色 | 保存下来的知识文件、原始数据、证据或状态。 |

> 核心结论：两种模式都不是“先把全部语料 embedding，再通过向量召回生成 wiki”的管线。个人模式主要依靠模型融合多源知识；代码模式在模型写作外，增加页面任务状态机和源码级证据维护。

## 一、个人知识库

核心路径是：**连接器采集 → 模型融合 → Wiki 优先问答**。它不是代码仓的逐页任务队列。运行由 DeepAgents、配置的 LLM、连接器工具和受限文件系统工具共同完成。

```mermaid
flowchart TB
    START["入口<br/>personal --init / --update<br/>ingest 指定来源 / 定时采集"]

    subgraph INPUT["A · 语料进入与预处理"]
        direction TB
        CONFIG["①【程序】读取配置与初始化运行环境<br/>TypeScript · Node.js · Provider 适配<br/>连接器配置、凭据、来源范围"]
        FETCH["②【程序 / 协作】采集来源<br/>直接 API 或只读 MCP 工具<br/>按连接器设置拉取、分页、限量"]
        RAW["③【产物】原始数据与采集清单<br/>connectors/来源实例/raw/<br/>JSON 等原始结果 + manifest"]
        META["④【程序】保留来源元信息<br/>来源 ID、时间、游标、覆盖范围<br/>内容哈希等字段取决于连接器"]
        CONFIG --> FETCH --> RAW --> META
    end

    subgraph SYNTH["B · 语料消化：Agent 循环，而非固定逐页流水线"]
        direction TB
        CONTEXT["⑤【程序】建立 Agent 上下文<br/>DeepAgents + 配置的 LLM<br/>SQLite checkpoint 保存运行/会话状态<br/>虚拟文件系统，不开放通用 Shell"]
        MAP["⑥【模型】建立知识盘点<br/>查看已有 wiki、目录索引和待解问题<br/>判断此次来源与哪些知识主题有关"]
        READ["⑦【协作】按需阅读证据<br/>模型选择 ls / glob / grep / read_file<br/>raw 数据通过专用读取工具访问<br/>程序限制可访问范围"]
        THINK["⑧【模型】跨来源理解与融合<br/>提炼主题、实体和长期有用信息<br/>比较新旧信息，合并重复知识<br/>保留矛盾、日期和置信度"]
        WRITE["⑨【协作】更新 Markdown<br/>模型写新内容或修改已有页面<br/>程序执行 write_file / edit_file<br/>不是把原始数据整份复制成 wiki"]
        CONTEXT --> MAP --> READ --> THINK --> WRITE
        WRITE -. "需要更多证据" .-> READ
    end

    subgraph SAVE["C · 收尾与持久化"]
        direction TB
        CHECK["⑩【程序】确定性整理与检查<br/>OKF 元数据处理、目录 index 同步<br/>Mermaid 与内部链接检查<br/>生成来源记录"]
        WIKI["⑪【产物】个人 wiki<br/>默认 ~/.openwiki/wiki/<br/>主题页、来源说明、导航及相关知识<br/>原始数据仍与综合知识分开保存"]
        CHECK --> WIKI
    end

    subgraph QUERY["D · 查询：先读知识，再决定是否回到原文"]
        direction TB
        ASK["用户问题"]
        NAV["⑫【模型 / Prompt】Wiki-first<br/>先导航 quickstart / index / 主题页<br/>用 grep / glob 定向寻找内容"]
        ENOUGH{"【模型】Wiki 能否支持回答？"}
        ANSWER["⑬【模型】基于 wiki 组织回答"]
        BACK["⑭【协作】必要时回查原始证据<br/>缺失、过时、矛盾或用户要求原文时<br/>需要新数据则定向采集与更新"]
        ASK --> NAV --> ENOUGH
        ENOUGH -->|"能"| ANSWER
        ENOUGH -->|"不能"| BACK
        BACK --> ANSWER
    end

    START --> CONFIG
    META --> CONTEXT
    WRITE --> CHECK
    WIKI --> NAV
    RAW -. "按需回查" .-> BACK
    WIKI -. "下次更新读取已有知识" .-> MAP

    classDef prog fill:#e8f1ff,stroke:#7195c5,color:#193957;
    classDef model fill:#f0e9fb,stroke:#a387bf,color:#49315e;
    classDef mix fill:#fff0dc,stroke:#c49a62,color:#674520;
    classDef output fill:#eaf3e2,stroke:#91ac76,color:#36502a;
    class CONFIG,META,CONTEXT,CHECK prog;
    class MAP,THINK,NAV,ENOUGH,ANSWER model;
    class FETCH,READ,WRITE,BACK mix;
    class RAW,WIKI output;
```

### 个人知识库图注

1. **采集与理解是两步。** 连接器先保存 raw 数据和 manifest，随后由来源特定的 Agent 运行综合知识。采集成功不等于内容已经被充分理解或写进 wiki。
2. **并非所有输入都必须重新抓取。** 图从连接器采集入口展开；已有 raw 数据或已经提供的来源材料，可以进入相关证据阅读和综合阶段。普通问答也不会默认重新采集所有连接器。
3. **模型负责语义融合。** 来源选择、知识主题判断、去重合并、置信度和 Wiki-first 问答，主要通过 Prompt 指导模型完成。“要求模型去重”不是数据库唯一键约束。
4. **程序负责执行边界。** 连接器落盘、raw 读取范围、虚拟文件系统权限和确定性索引处理属于程序机制；个人模式不开放通用 Shell 工具。
5. **原始语料与综合知识分开存储。** 默认 raw 路径是 `~/.openwiki/connectors/<来源实例>/raw/`，wiki 路径是 `~/.openwiki/wiki/`；配置目录可通过 `OPENWIKI_CONFIG_DIR` 改变。
6. **SQLite checkpoint 不等于向量数据库。** 此处用于 Agent 运行/会话状态，不表示已经生成语料 embedding。
7. **更新感知依赖来源能力。** 时间戳、游标、内容哈希和采集覆盖范围因连接器而异；不能由本图推断所有链接都会自动感知原文变化，也不能把有哈希理解为有自动轮询。
8. **个人模式不照搬代码仓的 Claims 队列。** 本图未将 `submit_plan → next_page → submit_page` 或源码证据 sidecar 画成个人知识库的通用机制。
9. **查询首先导航 wiki。** 默认通过 quickstart/index、主题页及定向 grep/glob 寻找知识。仅在知识缺失、过时、矛盾或用户要求原始证据时回查 raw；不能将此图读成强制每次问答都展开原文。

## 二、代码仓知识库

核心路径是：**源码检查 → Plan → 页面 Worker → Claims → 确定性收尾**。模型决定知识内容，TypeScript 生命周期决定当前阶段允许哪些操作。

```mermaid
flowchart TB
    ENTRY["入口：二选一<br/>原生 CLI + DeepAgents<br/>或宿主编码 Agent + OpenWiki MCP"]

    subgraph PREP["A · Begin：确定语料范围与源码状态"]
        direction TB
        BEGIN["①【程序】初始化 / 恢复运行<br/>读取模式、语言、用户 INSTRUCTIONS<br/>加载忽略规则、旧 wiki 与运行状态"]
        SNAP["②【程序】建立源码状态标识<br/>源码内容指纹 + Git HEAD（可用时）<br/>检查本次生成期间源码是否漂移"]
        MODE{"【程序】Init 还是 Update？"}
        INIT["Init：准备全新生成"]
        UPDATE["Update：检查已有覆盖与证据<br/>比较源码状态、检查旧 Claims<br/>定位失效 / 缺失证据与需要关注的变化"]
        NOOP{"【程序】是否满足严格无须更新条件？"}
        SKIP["【程序】No-op<br/>跳过模型生成，记录检查结果"]
        BEGIN --> SNAP --> MODE
        MODE -->|"Init"| INIT
        MODE -->|"Update"| UPDATE --> NOOP
        NOOP -->|"是"| SKIP
    end

    subgraph PLAN["B · Plan：模型探索与页面规划"]
        direction TB
        EXPLORE["③【协作】Planner 按需探索原文<br/>目录 / 清单 / 入口 → 代表性调用链 → 测试<br/>模型选择读取位置，程序执行文件工具<br/>不是把所有代码逐行预先输入"]
        DESIGN["④【模型 / Prompt】设计知识结构<br/>按系统、概念、工作流组织页面<br/>确定页面范围、相关源码路径、页面关系<br/>Update 结合已有页面与变化决定修改范围"]
        SUBPLAN["⑤【程序】submit_plan<br/>校验并持久化计划与页面任务<br/>.run.json：阶段、队列和页面状态"]
        EXPLORE --> DESIGN --> SUBPLAN
    end

    subgraph PAGE["C · 逐页任务：正文与 Claims 在这里形成"]
        direction TB
        NEXT["⑥【程序】分配待处理页面<br/>next_page / 原生 Worker 队列<br/>每个 Worker 只负责一页"]
        READ["⑦【协作】Worker 定向查证<br/>读取计划相关代码、文档及必要的邻接实现<br/>Update 可检查该页已有 Claims"]
        AUTHOR["⑧【模型】理解并撰写<br/>综合解释机制、调用关系、边界与失败路径<br/>组织 Markdown 正文和可核查论断"]
        CLAIM["⑨【模型 → 程序】提交页面与 Claims<br/>模型给出论断、证据引用和处理结果<br/>程序检查当前任务、提交数据与证据"]
        RESOLVE["⑩【程序】证据解析与持久化<br/>repo:// 文件或行范围 → 确定性解析<br/>SHA-256 内容版本 + 行范围重定位锚点<br/>保存页面、Claim sidecar 与覆盖状态"]
        NEXT --> READ --> AUTHOR --> CLAIM --> RESOLVE
        RESOLVE -->|"还有页面"| NEXT
    end

    subgraph FINISH["D · Finish：通过门禁后发布本轮结果"]
        direction TB
        GATE["⑪【程序】完成门禁<br/>不能把未完成队列直接当成成功<br/>再次检查源码状态，处理漂移 / 中断"]
        FINAL["⑫【程序】确定性收尾<br/>Mermaid 校验 → index 同步 → 内链检查<br/>同步 Claim 来源与生成来源记录"]
        OUT["⑬【产物】仓库中的可维护知识<br/>openwiki/ 下的 Markdown 与 quickstart<br/>.claims/ 证据 sidecar、页面覆盖记录<br/>更新元数据；完成运行状态清理"]
        GATE --> FINAL --> OUT
    end

    subgraph RETRIEVE["E · 查询：这是生成后的另一条路径"]
        direction TB
        QUESTION["用户问题 / Agent 任务"]
        SEARCH["⑭【协作】模型决定检索词和范围<br/>调用 openwiki_search<br/>可使用已链接的多仓 wiki 工作区"]
        INDEX["⑮【程序】临时词法检索<br/>解析 wiki Markdown，按引言 / H2 构造单元<br/>SQLite 内存 FTS5 + BM25<br/>结合路径提示、词项覆盖度排序"]
        DEEP["⑯【协作】渐进式深读<br/>先看紧凑结果，再 openwiki_read 读章节<br/>必要时回到源码核实"]
        REPLY["⑰【模型】基于所读证据完成任务 / 回答"]
        QUESTION --> SEARCH --> INDEX --> DEEP --> REPLY
    end

    ENTRY --> BEGIN
    INIT --> EXPLORE
    NOOP -->|"否"| EXPLORE
    SUBPLAN --> NEXT
    RESOLVE -->|"队列处理完成"| GATE
    OUT --> INDEX
    OUT -. "下次 Update" .-> BEGIN
    GATE -. "源码漂移，需要重新规划" .-> EXPLORE

    classDef prog fill:#e8f1ff,stroke:#7195c5,color:#193957;
    classDef model fill:#f0e9fb,stroke:#a387bf,color:#49315e;
    classDef mix fill:#fff0dc,stroke:#c49a62,color:#674520;
    classDef output fill:#eaf3e2,stroke:#91ac76,color:#36502a;
    class BEGIN,SNAP,MODE,INIT,UPDATE,NOOP,SKIP,SUBPLAN,NEXT,RESOLVE,GATE,FINAL,INDEX prog;
    class DESIGN,AUTHOR,REPLY model;
    class EXPLORE,READ,CLAIM,SEARCH,DEEP mix;
    class OUT output;
```

### 代码仓知识库图注

1. **这是内嵌 TypeScript 编排。** 原生 CLI 使用 DeepAgents 创建 Planner 和页面 Worker；宿主集成由宿主模型阅读和写作，通过 MCP 调用 OpenWiki 生命周期。可选 CI/YAML 只是外层触发方式，不负责核心知识生成逻辑。
2. **Begin 图为逻辑分组，不是函数逐行调用顺序。** 源码状态、Claims 准备、更新预检和恢复检查在实现中有具体调用顺序，不能据图推断每个内部函数的严格先后。
3. **Plan 不是源码切块算法。** 模型按清单/入口、代表性调用链、测试逐步探索，设计主题结构。相关路径是阅读线索，不是 embedding 检索结果；不要求完整穷举所有文件。
4. **Plan 中的页面先作为任务存在。** `submit_plan` 保存的是页面规划和任务状态，不代表正文或该页 Claims 已经写好。Worker 在写页面时形成正文和论断，再通过提交操作交给程序检查与保存。
5. **多 Worker 的粒度是一页。** 原生 CLI 可配置并发，宿主集成使用顺序页面生命周期。`quickstart` 最后写；其他页面没有统一的“前一页写完，后一页才能启动”依赖链。图中的循环是任务队列逻辑，不表示所有原生 Worker 串行运行。
6. **页面提交后即可持久化。** 不需要等全部 Worker 完成后，再由一个模型拼接所有正文。最终收尾主要是结构、索引、链接、来源记录和状态检查。
7. **Claims 不等于自动事实证明。** 模型给出论断与证据关联；程序检查引用能否解析以及证据版本。哈希能发现内容变化，不能单独证明模型解释一定正确。
8. **哈希不是 embedding。** 整文件证据使用全部文件内容的 SHA-256；行范围证据使用所选内容的哈希与重定位锚点。Git HEAD 是提交身份，不等于文件内容哈希，也不能单独覆盖未提交的源码变化。
9. **sidecar 与 Claim 不是同一个概念。** Claim 是论断数据；sidecar 是与 Markdown 分开保存的配套记录载体。代码仓的版本化 Claim sidecar 位于 `openwiki/.claims/`。
10. **中断不等于完成。** `openwiki/.run.json` 保存可恢复阶段和页面队列；恢复时若源码发生漂移，会使旧计划失效并要求重新规划。Finish 不能绕过未完成任务直接发布成功结果。
11. **查询与生成分开。** 图 E 展示提供检索工具时的渐进式路径，不代表每个 Agent 都必定调用 MCP。工具不可用时，受其指令影响的 Agent 也可能直接读取 `quickstart.md` 和相关 Markdown。
12. **检索分节作用于生成后的 wiki。** `marked` 解析 Markdown，主要按引言/H2 构造搜索单元，再用临时 SQLite FTS5/BM25 检索；不是在生成前将全部原始源码向量化。索引按检索调用创建，并在该调用结束时关闭，不是等待整个对话结束才销毁。
13. **FTS5 结果仍需深读。** 紧凑结果用于定位章节，`openwiki_read` 负责展开所选内容；词法匹配不能直接等同于语义向量召回或通用拼写纠错。

## 三、两种模式对照

| 维度 | 个人知识库 | 代码仓知识库 |
| --- | --- | --- |
| 主要输入 | 连接器采集结果、已有 wiki、来源元数据 | 源码、仓内文档、测试、已有 wiki 和证据状态 |
| 消化方式 | 模型跨来源融合并更新持久知识 | Planner 规划主题，页面 Worker 定向阅读和写作 |
| 主体编排 | Agent 工具循环与来源特定运行 | 程序生命周期与持久化页面任务队列 |
| 更新依据 | 重新采集的数据、来源元信息、已有知识 | 源码状态变化、页面覆盖与失效 Claims |
| 证据维护 | 来源说明、引用、时间与置信度等 | 源码文件/行范围、内容版本与 Claim sidecar |
| 图中默认查询路径 | Wiki-first 导航和定向文件搜索 | search → 章节定位 → read → 必要时查源码 |
| 是否统一全量 embedding | 本文核对路径未体现 | 本文核对路径未体现 |

## 四、官方代码与说明依据

以下均指向官方仓库 `main`，链接内容可能随上游更新而变化：

- [版本与依赖：package.json](https://github.com/langchain-ai/openwiki/blob/main/package.json)
- [模式、CLI、连接器、并发与存储说明：README](https://github.com/langchain-ai/openwiki/blob/main/README.md)
- [个人模式 Agent 工厂、工具、权限与 checkpoint：src/agent/index.ts](https://github.com/langchain-ai/openwiki/blob/main/src/agent/index.ts)
- [个人知识融合与 Wiki-first 提示词：src/agent/prompts/personal.ts](https://github.com/langchain-ai/openwiki/blob/main/src/agent/prompts/personal.ts)
- [仓库 Planner、逐页 Worker 与并发：src/agent/repository-runner.ts](https://github.com/langchain-ai/openwiki/blob/main/src/agent/repository-runner.ts)
- [仓库探索、规划与写作提示词：src/agent/repository-prompts.ts](https://github.com/langchain-ai/openwiki/blob/main/src/agent/repository-prompts.ts)
- [仓库生命周期、恢复与持久化状态：src/generation/repository-run.ts](https://github.com/langchain-ai/openwiki/blob/main/src/generation/repository-run.ts)
- [MCP 共享生命周期与会话控制：src/integrations/core/session-manager.ts](https://github.com/langchain-ai/openwiki/blob/main/src/integrations/core/session-manager.ts)
- [OKF、索引、Mermaid、内链与来源收尾：src/agent/wiki-finalizer.ts](https://github.com/langchain-ai/openwiki/blob/main/src/agent/wiki-finalizer.ts)
- [Claims、源码证据与内容版本说明](https://github.com/langchain-ai/openwiki/blob/main/openwiki/concepts/grounded-claims.md)
- [Markdown 分节、临时 FTS5/BM25 与章节读取：src/retrieval/wiki.ts](https://github.com/langchain-ai/openwiki/blob/main/src/retrieval/wiki.ts)

> 渲染说明：本文使用 GitHub 原生支持的 Mermaid 代码块。Markdown 原文保留可编辑图结构，不需要额外上传图片或依赖本地文件。
