# KunpengKnowledge 分类元数据生命周期时序图

整理日期：2026-11-17。源码仓为 KunpengSDK/KunpengKnowledge，核对时 HEAD 为 `395e1a61287cff31a06200b055171b1b8362ba09`。根据源码静态核对，展示受治理知识的生成、校验、检索和读取；各知识域实际使用的开始、提交及完成接口不同。本图不是一次真实运行的调用记录。

`profiles.yaml` 定义页面类别、对应的页面 `type` 和额外必填字段；`registries.yaml` 定义 domains、technology、scope、platforms、tags 的合法取值。参见同目录的 [知识系统精简说明](knowledge-system-notes.md)。

```mermaid
sequenceDiagram
    autonumber
    participant A as 宿主 Agent／模型
    participant C as MCP／治理代码
    participant V as profiles＋registries
    participant K as 知识存储
    participant S as SQLite FTS5

    Note over A,V: 第一阶段：生成知识，选择分类
    A->>C: 开始代码／PR／文档知识任务
    C->>V: loadGovernanceBundle()
    V-->>C: profiles、五类 registries、字段规则及治理指纹
    C-->>A: 返回分类 guidance 和提交要求

    Note over A,V: profiles：选择页面类别<br/>concept／api／guide／optimization<br/>runbook／example／glossary／interoperability
    Note over A,V: registries：选择领域 domains、技术 technology<br/>工作范围 scope、平台 platforms、任务／主题 tags<br/>模型根据实际内容选择；词表本身不会自动分类

    A->>C: 提交页面内容或提案及分类<br/>例如 profile=optimization，type=Optimization<br/>technology=[c]，scope=[implementation]<br/>platforms=[cpu]，tags=[task.optimization, topic.memory]

    Note over C,V: 第二阶段：校验分类，决定能否接受提交
    C->>V: 查找 profile 定义及登记值
    V-->>C: optimization 对应 Optimization<br/>要求存在 platforms 等字段
    C->>C: 校验 profile 是否存在<br/>校验页面 type 是否与 profile.type 一致<br/>校验 profile 指定的额外必填字段
    C->>C: 校验五类分类值是否已登记<br/>支持扩展词表时解析已准入别名<br/>tags 至少含一个 task.* 和一个 topic.*
    C->>C: 校验平台规则<br/>agnostic 不能和其他平台混用<br/>非术语页平台未知时要求 draft

    opt profile 为 interoperability
        C->>C: 要求 source_technology、target_technology<br/>两者必须是不同的已登记技术值
    end

    alt 分类校验不通过
        C-->>A: 返回 PROFILE_TYPE／REGISTRY_UNKNOWN<br/>TAG_DIMENSION／PLATFORM_CONFLICT 等诊断
        A->>C: 根据诊断修正并重新提交
    else 分类校验通过
        Note over C,K: 继续执行证据、Claims、任务完成等其余校验<br/>分类通过本身不代表整个生命周期完成
        C->>K: 完整流程通过后保存知识及分类元数据
    end

    Note over A,V: 第三阶段：查询时，模型选择哪些条件必须满足
    A->>C: knowledge_search<br/>query=alignment，type=code<br/>profile=optimization<br/>tagsAll=[topic.memory]<br/>platformsAny=[cpu]，view=candidate
    Note over A,C: 模型根据用户要求填写可选过滤条件<br/>未传相应条件，就不增加对应过滤<br/>服务端不自动把自然语言映射成这些分类
    C->>V: 校验请求中的 profile、标签和平台是否合法<br/>有扩展词表时解析标签／平台别名
    V-->>C: 返回规范分类值，或拒绝未知条件
    C->>K: 按类型、来源、版本和权限取得候选知识页
    K-->>C: 页面字节及治理描述符
    C->>C: profile 精确比较<br/>只保留 optimization 页面
    C->>C: tagsAll 全包含比较<br/>只保留具有 topic.memory 的页面
    C->>C: platformsAny 任一包含比较<br/>普通平台相关页面需包含 cpu
    Note over C,K: glossary 或 platforms 含 agnostic 的合法页面<br/>可绕过平台包含检查<br/>这不代表已证明满足具体运行环境
    Note over C,K: domains／technology／scope 当前仅被解释、校验和保留<br/>没有对应的结构化查询过滤条件<br/>也不会仅因这些 YAML 字段而进入全文匹配
    C->>C: 应用内容状态及审核视图条件<br/>默认内容状态为 stable<br/>reviewed 另要求审核准入

    Note over C,S: 第四阶段：对保留页面进行章节全文搜索
    C->>C: searchUnits() 按二级标题拆章节<br/>提取 frontmatter 的 description 和 tags
    C->>S: 新建本次请求的内存 FTS5 表<br/>逐章节 INSERT
    Note over C,S: 索引列：title、description、heading、prose、identifiers<br/>页面 tags 和路径等一起进入 identifiers<br/>profile、domains、technology、scope、platforms<br/>没有作为独立评分列加入
    C->>S: MATCH 查询词<br/>bm25(units,8,4,6,1,3)
    S-->>C: 返回命中章节及 BM25 分数
    C->>C: 按查询 token 覆盖数、BM25 等排序<br/>取前 N 个章节命中
    Note over C,S: profile 不加分；通过平台过滤也不加分<br/>tagsAll 通过本身不加分<br/>只有页面 tags 的文本被查询词命中时<br/>才作为 identifiers 列的一部分参与全文计分
    C-->>A: 返回标题、章节摘要、分类、状态及读取票据

    Note over A,K: 第五阶段：按需披露正文
    A->>C: knowledge_read，选择章节或整页票据
    C->>K: 校验当前权限、固定版本、哈希和范围
    K-->>C: 返回选定正文
    C-->>A: 正文、来源票据及实际读取 trace
    Note over A,K: 原有分类仍可作为理解上下文<br/>本次读取按票据定位，不再按标签重新搜索
```

## 图中概念的边界

- 搜索参数 `type=code/kernel/document` 是知识域；页面 `type=Guide/Optimization/...` 是与 profile 对应的页面类别，二者不同。
- `task.*`、`topic.*` 表示标签维度；图中“至少一个”是提交时的规则，不是通配搜索语法。
- `profile=optimization` 不要求自动配对 `task.optimization`；它们分别描述页面类别和任务。
- 分类通过、原生完成、存储同步、人工审核、项目激活及远端 Git 发布是不同状态。
- 图中的读取和索引都是服务端操作；服务端读取了候选全文，不代表这些全文都进入模型上下文。

## 源码定位

以下为 KunpengKnowledge 源码仓内的相对路径；本目录不包含生成的知识产物或私有状态。

| 环节 | 实现位置 |
|---|---|
| profile 定义 | `src/governance/resources/profiles.yaml` |
| 核心词表 | `src/governance/resources/registries.yaml` |
| 加载指导与提交校验 | `src/governance/contract.js`：`loadGovernanceBundle`、`guidance`、`validatePage` |
| 查询过滤 | `src/governance/query.js`：`validateGovernanceFilters`、`matchesGovernance` |
| 查询侧词表解释 | `src/unified/knowledge/knowledge-query-policy.ts`：`normalizeRequest`、`rows` |
| 章节、FTS5 与排序 | `src/domains/query-rank.cjs`：`searchUnits`、`rankEntries` |
| 查询与读取主链路 | `src/unified/knowledge/query-controller.ts`：`searchImpl`、`readImpl` |
