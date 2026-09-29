# RepoProbe 六组：DeepSeek Flash 计价估算

按 2026-09-29 查阅的 [DeepSeek Flash 官方美元价格](https://api-docs.deepseek.com/quick_start/pricing/)折算现有六组 RepoProbe 结果。每组均为同一批 122 题；每题只计**最终一次回答**的所有模型调用，先前重试一律排除。实验模型实际是 `cannbot/glm-5.2`，**下表不是 DeepSeek 实测费用，也不是 GLM 实际账单**。

| 组别 | 均分 /10 | 回答总 Token/题 | 非高峰 USD/题 | 非高峰 USD/122题 | 较仅源码基线 | 高峰 USD/题 | 高峰 USD/122题 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 仅代码仓 | 5.393 | 254,305 | 0.015042 | 1.835128 | 基线 | 0.030084 | 3.670256 |
| 代码仓 + 强制 OpenWiki | 5.656 | 470,792 | 0.024654 | 3.007767 | +63.90% | 0.049308 | 6.015535 |
| 代码仓 + 可选 OpenWiki | 5.615 | 314,703 | 0.017674 | 2.156274 | +17.50% | 0.035349 | 4.312547 |
| 仅 OpenWiki | 3.402 | 183,570 | 0.012906 | 1.574483 | −14.20% | 0.025811 | 3.148967 |
| 代码仓 + `/init` AGENTS.md | 5.287 | 417,287 | 0.020625 | 2.516230 | +37.11% | 0.041250 | 5.032461 |
| 代码仓 + 静默可见 OpenWiki | 5.369 | 291,010 | 0.013970 | 1.704379 | −7.12% | 0.027941 | 3.408757 |

非高峰价，单位 USD / 百万 Token：未命中输入 **0.15**、缓存命中输入 **0.003**、输出（含推理）**0.60**。高峰价分别为 **0.30 / 0.006 / 1.20**；官方定义高峰为 UTC 周一至周五 01:00–04:00、06:00–10:00。由于三类价格都恰好翻倍，高峰下的各组相对基线百分比不变。[价格来源](https://api-docs.deepseek.com/quick_start/pricing/)

计算式：

```text
122题费用 USD = (未缓存输入tokens × 未命中价
               + 缓存读取tokens × 命中价
               + (输出tokens + 推理tokens) × 输出价) / 1,000,000
每题费用 USD = 122题费用 / 122
成本较基线 = 本组122题费用 / 仅源码组122题费用 − 1
```

`cache.read` 是每次模型调用的缓存命中输入 Token **累加值**，同一前缀跨多次调用命中会重复计入，不能当成去重后的 Wiki 大小。这里把原实验 trace 的 `input` 作为未命中输入、`cache.read` 作为缓存命中输入代入 DeepSeek 价格；DeepSeek 真实缓存命中取决于它自己的前缀缓存，不能由 GLM trace 保证。[DeepSeek 缓存口径](https://api-docs.deepseek.com/guides/kv_cache/)

原始 Token 分项及评分来自 [六组共同题汇总 TSV](repoprobe-six-arm-122-summary.tsv)，其本地来源是最终回答的逐次 trace 汇总。费用只含回答阶段，不含官方评分调用、OpenWiki 或 AGENTS.md 的仓库级生成成本，也不考虑两种模型的分词或行为差异。若用于实际部署预算，需要再按预期复用题数摊销生成成本，并以实际 API `usage` 和账单复核。

可下载 [Excel 工作簿](repoprobe-six-arm-122-deepseek-flash-cost.xlsx)（含输入分项、价格和公式）、[CSV](repoprobe-six-arm-122-deepseek-flash-cost.csv) 或 [TSV](repoprobe-six-arm-122-deepseek-flash-cost.tsv)。在另一台电脑复制到 Excel 时，可打开 TSV 的 Raw 页面，复制全文并粘贴到 A1。

按这一价格代理，回答阶段“仅 OpenWiki”和“静默可见 OpenWiki”比仅源码便宜，但前者均分明显下降，后者均分略低；得分高于基线的强制和可选 OpenWiki 组均更贵。这不构成端到端成本节省的结论。
