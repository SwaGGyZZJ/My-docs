# CannBot × OpenWiki SWE-bench 实验汇总

数据复核日期：2026-09-22。执行环境：920 ARM64。得分来自官方 SWE-bench ARM64 Harness；token、耗时、迭代和 Wiki 使用由最终入表 solver trace 重新计算。

| 试验组 | 模型 | 介入方式 | 解决率 | Wiki trace依据 | 平均耗时(秒) | 平均总token | 最终session总token | 平均非缓存token | 平均迭代 |
|---|---|---|---|---|---|---|---|---|---|
| Baseline | cannbot/glm-5.2 | 仅修复前源码，无 Wiki | 15/18 (83.3%) | 原始 trace：无 openwiki/*.md 非空内容读取 | 1002.7 | 3,884,564 | 69,922,154 | 403,003 | 65.44 |
| Forced OpenWiki | cannbot/glm-5.2 | 强制先读 quickstart.md 和至少一个相关 Wiki 页面 | 15/18 (83.3%) | 原始 trace：18/18 有效读取，且均早于首次源码编辑 | 1109.3 | 4,277,842 | 77,001,160 | 461,971 | 62.83 |
| Optional OpenWiki | cannbot/glm-5.2 | AGENTS.md 提示 Wiki 存在，由 Agent 按需读取 | 15/18 (83.3%) | 原始 trace：5/18 有效读取；2/18 早于首次源码编辑 | 1137.5 | 5,007,743 | 90,139,370 | 629,339 | 65.72 |
| Nav-packet | cannbot/glm-5.2 | 从 Wiki 生成短导航卡并注入初始 prompt | 14/18 (77.8%) | runner 注入与卡片哈希校验18/18；solver主动Wiki读取0/18 | 1558.5 | 4,757,042 | 85,626,753 | 643,330 | 70.11 |
| Grep quickstart optional | cannbot/glm-5.2 | 提示可 grep quickstart.md，但不强制 | 15/18 (83.3%) | 原始 trace：有效 Wiki 内容读取0/18；(no output)不计调用 | 1082.5 | 3,883,684 | 69,906,319 | 379,119 | 66.83 |
| AGENTS index/quickstart | cannbot/glm-5.2 | index.md 为总地图；改架构前读 index，跑测试前读 quickstart；禁止盲搜 | 13/17 (76.5%) | 原始 trace：已评分17格均读取index和quickstart，且早于首次编辑 | 1586.4 | 6,886,968 | 117,078,453 | 833,889 | 71.65 |
| Wiki-before-source v2 fixed | cannbot/glm-5.3 | 先检索 Wiki，再查源码；严格路由协议 | 12/18 (66.7%) | 原始 trace：18/18有效读取；16/18早于首次编辑；严格协议7/18 | 1657.9 | 5,525,577 | 99,460,387 | 227,650 | 61.50 |

## 下载和复制到 Excel

- [Excel 工作簿](./openwiki-swebench-experiment-summary.xlsx)：含完整30列数据与证据口径。
- [制表符表格](./openwiki-swebench-experiment-summary.tsv)：打开 Raw 后全选复制，可直接粘贴到 Excel；文件含 UTF-8 BOM。
- [结构化源汇总](./openwiki-all-experiments-2026-09-22.json)：报告生成所用的冻结汇总。

## 结论边界

- GLM-5.2 的 Baseline、Forced、Optional、Nav-packet、Grep 组使用相同18格 cohort；AGENTS 组只有17格官方结果。
- GLM-5.3 严格路由组模型不同，且只有7/18满足严格协议，不能用分差直接推断 Wiki 的因果效果。
- Wiki 实际使用只计 trace 中成功返回非空知识正文的 openwiki/*.md 访问；路径提及、目录列表、读取失败和“(no output)”均不计。
- Nav-packet 的18/18表示 runner 注入记录和卡片哈希一致，不代表 solver 主动读取了 Wiki。
- 各组均值仅计最终入表 session，不含 OpenWiki 建库、官方 Harness 和被替换的重试。GLM-5.3 组全部43个 solver attempt 共消耗273,506,098 total tokens。
