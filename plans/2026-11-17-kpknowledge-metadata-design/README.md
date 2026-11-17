# KPKnowledge 元数据三文件设计稿

日期：2026-11-17。修订：**v2，设计稿，未启用**。前版原样归档见提交 `86771a33d95c997ed62449bd2606c56b4c1c1229`；本目录现在保存经过讨论后修订的设计内容，不再声称与撤回前运行文件逐字节一致。

本轮增加模块分面、拆分技术体系与组件登记，并为每个 profile 定义正文结构和证据绑定。当前运行仓的三个资源文件保持撤回后的状态。设计中的新规则尚未接入生成、校验、索引或查询；这里也不引入新的 bundle 概念。

## 三个文件

| 文件                                                 | 职责           | v2 内容                                                                                                                             |
| ---------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [frontmatter.schema.json](./frontmatter.schema.json) | 元数据字段形状 | 保留原有 12 个全局必填字段，增加可选、多选、非空且去重的 `module` 字段。                                                            |
| [profiles.yaml](./profiles.yaml)                     | 页面契约       | 保留 16 个 profile、既有 type 和额外元数据 required；增加各自的 `requirements`、统一正文契约 schema、模块登记项 schema 和关系约束。 |
| [registries.yaml](./registries.yaml)                 | 受控分类       | 六类 registry；新增结构化 `module`，统一 UnifiedBus 标识，并区分组件、独立技术和概念主题。                                          |

来源基线、前版候选散列、本版设计散列、恢复后的运行文件散列与迁移映射见 [snapshot.json](./snapshot.json)。验证范围见 [verification.md](./verification.md)。

## technology、module 与 tags

`technology` 表达技术体系或可独立识别的语言、协议、库、框架。`module` 表达有明确技术关联的具体组件、子系统或子模块。`tags` 表达读者任务、机制主题和对象类别。驱动、固件、芯片属于对象类别；设计文档、用户手册、寄存器手册、数据手册、勘误和测试报告属于来源资料类别，不据此新增 profile。

页面的相关字段示意：

```yaml
technology: [unified_bus]
module: [unified_bus.unified_remote_memory_access]
tags: [task.debugging, topic.memory, object.driver]
```

技术总览可以省略 `module`；出现该字段时至少有一个已登记标识。多个模块可并列，不分主次，不继承父页或整本手册的分类。页面中每个模块的登记技术必须出现在 `technology` 中；这一关联不证明物理包含、厂商独占、平台兼容或实测适用性。

模块登记项含 `name`、`description`、`technology`、`kind`、`sources`，另可选 `parent`。`name` 使用有依据的正式全称；来源保留资料语境和版次，动态分支不能冒充不可变证据。当前登记 11 项：8 项 UnifiedBus 相关模块和 3 项 Kunpeng Accelerator Engine 模块。

后续发现新的 UB 子模块，只需提交符合 `module_entry_schema` 的登记项及来源，再用于对应知识页。下级模块可填写已登记的 `parent`，父子模块须关联同一技术，禁止循环；点号前缀不自动产生父子关系。现有资料不足以确定具体父模块，因此初始条目未臆造 `parent`。新增模块无需改变 frontmatter 的字段形状，也不自动给旧页面增加标签。

`module` 只存标识。模块私有元数据和专用验证器需另行设计登记与类型约束，本轮未开放任意扩展字段。

## 技术与组件的重新放置

`huawei.unified_bus` 改为 `unified_bus`。厂商背景保留在说明中，技术身份不使用厂商与技术混合的层级。Unified Remote Memory Access、UnifiedBus Management 等组件进入 `module`；UB Processing Unit、UB Bus Controller 等有明确关联的命名单元也移到 `module`。

UB over Ethernet 作为命名协议保留在 `technology`，改为独立标识 `ub_over_ethernet`；不能仅因名称与 UnifiedBus 相近就判作软件子模块。Unified Bus Virtual Address 与 UnifiedBus Root Table 仍为概念主题。部分历史命名单元暂留 topic，待明确版本和关联后再评审，不直接等同于新名称的模块。

所有原有全称说明在迁移后保留，没有用缩写替换正式名称。裸 UB 不成为全局同义词；UnifiedBus 与 Unified Buffer 继续区分。HCCS、SCCL、UMMU、UMDK、URPC、UACCE、iBMC、K-NET、HHA 的上下文差异继续保留，不强制合并。

本版相对前版的显式映射如下；这是候选设计间的映射，不表示运行知识库已经完成迁移：

| 前版登记位置                                                  | v2 登记位置                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `technology.huawei.unified_bus`                               | `technology.unified_bus`                                                             |
| `technology.unified_bus.over_ethernet`                        | `technology.ub_over_ethernet`                                                        |
| `technology.unified_bus.to_ethernet`                          | `module.unified_bus.to_ethernet`                                                     |
| `technology.unified_bus.unified_remote_memory_access`         | `module.unified_bus.unified_remote_memory_access`                                    |
| `technology.unified_bus.memory_based_socket`                  | `module.unified_bus.memory_based_socket`                                             |
| `technology.unified_bus.management`                           | `module.unified_bus.management`                                                      |
| `technology.unified_bus.unified_lock`                         | `module.unified_bus.unified_lock`                                                    |
| `technology.unified_bus.unified_socket`                       | `module.unified_bus.unified_socket`                                                  |
| `tags.topic.unified_bus.processing_unit`                      | `module.unified_bus.processing_unit`                                                 |
| `tags.topic.unified_bus.bus_controller`                       | `module.unified_bus.bus_controller`                                                  |
| `tags.topic.kunpeng_security_engine`                          | `module.kunpeng_accelerator_engine.kunpeng_security_engine`                          |
| `tags.topic.kunpeng_high_performance_rsa_engine`              | `module.kunpeng_accelerator_engine.kunpeng_high_performance_rsa_engine`              |
| `tags.topic.kunpeng_hardware_acceleration_compression_engine` | `module.kunpeng_accelerator_engine.kunpeng_hardware_acceleration_compression_engine` |

跨字段移动不是简单别名：从 `technology` 移到 `module` 时，应补上该模块关联的技术；从 `tags` 移出模块标识后，重新确认页面仍有有效的 task.* 和 topic.* 标签。生成、索引和查询需要同步处理；不能只做字符串替换，也不能通过重新标注自动证明内容适用性。内容与来源未变的纯分类修订可单独评审，不默认要求重读全部资料；涉及语义变化时重新核对来源。

## profile 的两类强绑定

原有 `required` 只表示额外 frontmatter 必填项：14 个普通 profile 为 `[platforms]`，glossary 为 `[]`，interoperability 为 `[platforms, source_technology, target_technology]`。全局字段要求另由 JSON Schema 定义。v2 不为制造差异而随意增加元数据字段，而在每个 profile 下增加正文 `requirements`。

| Profile          | 必需内容角色                                                           | 额外约束示例                                                |
| ---------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| concept          | definition、scope                                                      | 定义绑定来源                                                |
| glossary         | terminology、definition                                                | 全称和定义绑定对应资料                                      |
| architecture     | scope、components、relationships、design_state                         | description_state 区分 current/proposed/mixed               |
| mechanism        | entry、execution、invariants                                           | 入口与机制过程分别绑定来源                                  |
| api              | interface、constraints、scope                                          | context.interface_id；契约绑定版本化来源                    |
| reference        | interface、constraints、scope                                          | context.reference_id；条目与约束绑定来源                    |
| guide            | prerequisites、procedure、success_criteria、verification               | verification_state                                          |
| tutorial         | learning_goal、prerequisites、procedure、milestones、verification      | verification_state                                          |
| example          | prerequisites、procedure、expected_result、verification                | 预期与实测区分                                              |
| runbook          | trigger、prerequisites、procedure、checkpoints、recovery、verification | 处置与恢复依据                                              |
| troubleshooting  | symptoms、environment、diagnosis、cause、remedy、verification          | confirmed 根因必须有证据；允许明确记录未知或假设            |
| change           | before、after、impact、verification                                    | 前后版本；code_diff 再要求 base/head、diff 及 metadata 来源 |
| decision         | problem、alternatives、decision                                        | 非 proposed 状态要求原始决策记录                            |
| optimization     | baseline、method、environment、tradeoffs                               | result_state；本地实测绑定原始制品                          |
| evaluation       | problem、method、environment、limitations                              | result_state；结果与实验计划区分                            |
| interoperability | mapping、compatibility_limits、verification                            | 两端为不同已登记技术，且都列入 technology                   |

同一技术内部两个模块的接口或机制关系可使用 api/mechanism/change；不把它们冒充两个 source_technology/target_technology。decision_state 不替代页面 status；页面 stable 不意味着人工批准。

## 正文契约格式与执行语义

正文包含一个语言标识为 `kpknowledge-contract` 的 fenced YAML 块。`profiles.yaml` 的 `requirements_contract.body_schema` 定义其字段形状。块内的 `profile` 与 frontmatter 一致；`subjects` 标识描述对象，并绑定 frontmatter 中的来源；`context` 按所选 profile 的 context_schema 校验；`sections` 将角色绑定到正文显式锚点及证据。

下面是 mechanism 契约的格式示意。resource/version 是占位符，需替换为该页面 sources 中完全相同的 resource/version/role 三元组；该示意不声明任何真实实现行为：

```kpknowledge-contract
schema: kpknowledge.body-contract/v1
profile: mechanism
subjects:
  - name: Unified Remote Memory Access
    source_refs:
      - resource: <same-resource-as-frontmatter>
        version: <same-version-as-frontmatter>
        role: primary
context: {}
sections:
  - role: entry
    anchor: mechanism-entry
    evidence:
      - resource: <same-resource-as-frontmatter>
        version: <same-version-as-frontmatter>
        role: primary
  - role: execution
    anchor: mechanism-execution
    evidence:
      - resource: <same-resource-as-frontmatter>
        version: <same-version-as-frontmatter>
        role: primary
  - role: invariants
    anchor: mechanism-invariants
    evidence: []
```

正文应分别有 `<a id="mechanism-entry"></a>` 等显式锚点及非空正文。锚点以英文字母开头，后续仅字母、数字、下划线或连字符，区分大小写；不依赖 Markdown 渲染器的标题 slug。角色与锚点各自唯一；正文契约块本身不能充当所指正文或证据。

- stable/deprecated 要求恰好一个契约块、必需角色、必需 context 和证据引用；draft 可以暂缺，缺项给出诊断。draft 中已经给出的值仍须通过类型、枚举、登记项与引用检查。
- 每个正式描述对象至少绑定一条与 frontmatter sources 完全相同的来源三元组。要求证据的角色至少有一条匹配引用。结构检查只能证明引用一致，不能证明资料支持该结论。
- `conditional.when` 仅支持 `context.<字段>` 的 `equals` 或 `in`。所有命中规则的效果取并集。`required_roles` 要求角色存在；`evidence_roles` 要求这些角色有引用；`required_context` 要求指定字段；`required_source_roles` 要求 frontmatter 中存在各类来源；`evidence_source_roles` 进一步要求指定正文角色引用对应类型的来源（如 diff 正文必须引用 diff 来源）；`required_status` 对所有状态生效。
- 角色允许集合是该 profile 基础要求和各条件规则提及角色的并集，均须在 role_definitions 中定义。实际必需集合按命中条件计算；未知角色报错。
- result_state=planned 仅允许 draft；reported 要有结果来源；measured 再要求原始测量制品。verification_state=locally_verified 要求环境、结果与本地制品，source_reported 要求转述结果的来源，not_run 不得表述为已执行。
- cause_state=confirmed、已接受/被否决/被替代的决策状态、原生代码差异等分别触发自己的证据条件。非空文字不能代替证据，引用存在也不等于结论成立。

## 后续实现与验证边界

这是契约设计，不是当前消费者已执行的规则。当前 schema 解释器只支持一个有限子集；新增 module 的词表准入、模块关系、正文契约解析、条件规则、索引和查询筛选均需接入。不能把本目录直接拷贝进运行资源后宣称能力完成。

实现顺序应覆盖：共享字段与模块登记准入、生产者输出正文契约、提交与离线校验共用规则、索引与查询保留 module、既有候选迁移，最后分别验收代码、PR/补丁、文档生命周期。历史设计留作身份与迁移记录，不加载为第二套运行规则。

本次检查仅确认设计文件的结构和内部引用一致、词项迁移没有丢失原说明，以及运行三文件未改变。前版的 57/46 项检查属于当时配置的历史验证，不能证明本版正文契约已运行。
