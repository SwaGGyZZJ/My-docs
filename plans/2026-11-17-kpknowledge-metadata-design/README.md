# KPKnowledge 元数据三文件设计稿

日期：2026-11-17。状态：**设计归档，未启用**。

按本轮讨论，将已经试写的三个运行配置文件撤回，完整候选内容保留在本目录，供后续评审与实现。本文中的规则和词项是设计建议；归档不表示已发布或已完成产品验收。这里不引入新的 bundle 概念，也不改变代码、PR/补丁、文档知识的三类生命周期。

## 文件与职责

| 文件 | 职责 | 本轮候选内容 |
| --- | --- | --- |
| [frontmatter.schema.json](./frontmatter.schema.json) | 页面的字段、形状与基础约束 | 保留原有 12 个必填字段，明确字符串、数组、时间与系统生成字段等约束；不新增业务顶层字段。 |
| [profiles.yaml](./profiles.yaml) | 页面表达形式与写作、证据要求 | 共 16 个 profile；增加 architecture、mechanism、reference、tutorial、troubleshooting、change、decision、evaluation，并补充芯片领域例子。 |
| [registries.yaml](./registries.yaml) | 领域、技术、范围、平台与标签的受控词表 | 保持既有五类 registry 结构，扩展芯片对象、活动主题及有公开全称证据的华为／鲲鹏相关技术。 |

三个文件是撤回前候选内容的原样快照，原运行位置均为 `src/governance/resources/`。来源基线与逐文件 SHA-256 见 [snapshot.json](./snapshot.json)；候选散列与恢复后的运行文件散列分别记录，不能混用。

## 分类观点

页面的表达形式、讨论对象、读者任务、技术名称和原始资料类别应分别表达。

- `profile` 回答“这一页怎样组织知识”：解释机制、查接口、执行步骤、排查故障、记录变更或评估结果。驱动、固件、芯片不是 profile。
- `object.*` 回答“主要讨论什么对象”：芯片、IP、寄存器、驱动、固件、板卡、工具等。按局部页面实际内容选取，可多选，不按父页面或整本手册静默继承。
- `task.*` 表达读者任务，`topic.*` 表达机制或活动主题，`technology` 表达命名协议、库、框架或技术体系。
- 设计文档、用户手册、编程手册、参考手册、寄存器手册、数据手册、勘误与测试报告是原始资料类别。由它们提炼出来的页面仍按自身内容选择 profile；候选没有擅自新增尚无消费者实现的 `doc_type` 字段。
- 型号、stepping、板卡修订以及固件和驱动配套关系需要版本化来源和适用性条件；通用标签不能证明兼容性、实测结果或人工审核。

例如，一页讨论固件如何配置芯片寄存器，可采用 `mechanism`，并按内容选择固件、芯片、寄存器对象；一页驱动安装步骤采用 `guide`；一次固件故障的根因分析采用 `troubleshooting`。来源是用户手册不意味着所有提炼页面都标成“用户手册”。

## 全称与华为／鲲鹏专用术语

候选词表纳入 44 条有明确全称依据的名称：31 条放入 `technology`，13 条命名单元、地址模型或表结构放入 `topic.*`。全称为主体，简称只作说明；保留厂商正式名称本身的 UB、RSA、RAID、IO 等写法，不自行扩写出新的产品名。

代表名称包括 UnifiedBus、Unified Remote Memory Access、Kunpeng Math Library、Kunpeng Unified Acceleration Framework、User Space Accelerator Development Kit，以及 UnifiedBus Root Table。命名空间用于区分技术上下文，不把开放生态或昇腾相邻组件统称为鲲鹏专有。

不登记裸 `UB` 的全局同义词：UnifiedBus 与 Unified Buffer 必须区分。HCCS、SCCL、UMMU、UMDK、URPC、UACCE、iBMC、K-NET、HHA 这九组有多种官方表述或需要来源上下文，本轮没有将其强行归一为一个全局词项。名称出现于资料，只能支持名称登记，不能直接证明功能、性能或版本兼容性。

具体全称、解释和来源链接保留在 `registries.yaml` 的条目及注释中。主要依据为华为／鲲鹏官方文档、UnifiedBus 规范、openEuler 官方文档、官方开源项目和 Linux 上游资料。例如：

- [Kunpeng Glossary](https://www.hikunpeng.com/document/detail/en/kunpenggrf/gls/kunpengglossary_0000_01.html)
- [UnifiedBus Root Table Specification](https://www.unifiedbus.com/static/UB-Root-Table-Spec-1.0-en.pdf)
- [openEuler URMA 用户指南](https://docs.openeuler.org/zh/docs/24.03_LTS_SP3/unifiedbus/unifiedbus/urma/URMA%20User%20Guide.ch.html)
- [Kunpeng KAE 官方项目](https://github.com/kunpengcompute/KAE/blob/kae2/README.md)
- [Linux Uacce 文档](https://docs.kernel.org/misc-devices/uacce.html)

公开资料可能存在版本差异；系统搜集不表示穷尽未公开设计资料或所有产品版本。部分前序检索依赖官方搜索索引，不能将名称表视为每个链接都已直接读取并固定版本的证据库。

## 执行边界与后续评审

当前 profile 加载器只强制执行 `type`、`required` 及已有跨字段规则。`guidance` 中的正文结构和证据要求是给生产者的指导，不是已经实现的正文质量检查。JSON Schema 中写出的约束也需要核对当前解释器实际支持范围，不能仅凭配置文本宣称全部生效。

再次启用前，应评审新增 profile 的区分和历史内容迁移，决定原始资料类别是否确有独立检索需求，再同步生成、校验、索引和查询消费者。需要分别验证代码、PR/补丁、文档三类工作流的行为，不能用配置单测代替端到端验收。

本次归档只撤回这三个运行资源的候选改动，不代表回退或清理仓库内其他开发工作。验证记录见 [verification.md](./verification.md)。
