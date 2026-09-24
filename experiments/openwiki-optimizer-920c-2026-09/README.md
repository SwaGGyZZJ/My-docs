# 920C OpenWiki × Optimizer 实验结果快照

快照时间：2026-09-24 14:54（北京时间）。DFT 和 CRC 仍有未归档格，本页不是最终实验结论。

- [Excel 工作簿](./session-results-2026-09-24.xlsx)：首张表为正式实验组别汇总，第二张表为全部 69 个预设格的明细。
- [可粘贴 Excel 的 TSV 明细](./session-results-2026-09-24.tsv)：在 GitHub 点 **Raw**，全选复制后粘贴到 Excel 的 A1；若未自动分列，按 UTF-8、制表符导入。
- 明细把 isal_zero_detect 的 pilot 和正式实验放在同一张表，以“阶段”区分；组别汇总只纳入正式有效格，不混算 pilot。

## 组别汇总

| 算子 | 组别 | 正式有效/计划 | 性能提升中位数(%) | 非缓存 Token 中位数 | 耗时中位数(分钟) | 平均迭代轮数 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| gf_vect_mul | A | 3/3 | 20.51 | 399,097 | 55.0 | 3.0 |
| gf_vect_mul | B | 3/3 | 19.47 | 383,477 | 39.4 | 3.0 |
| gf_vect_mul | C | 2/3 | 18.31 | 273,605 | 35.9 | 3.0 |
| gf_vect_mul | D | 3/3 | 20.43 | 580,321 | 38.7 | 2.7 |
| crc32_ieee | A | 3/3 | 35.57 | 673,029 | 89.2 | 2.7 |
| crc32_ieee | B | 3/3 | 49.14 | 886,744 | 119.4 | 3.0 |
| crc32_ieee | C | 3/3 | 28.72 | 764,022 | 85.6 | 3.0 |
| crc32_ieee | D | 2/3 | 45.65 | 669,724 | 90.7 | 3.0 |
| libm_sin_cos_dp | A | 3/3 | 8.10 | 431,885 | 43.9 | 3.0 |
| libm_sin_cos_dp | B | 3/3 | 3.63 | 403,229 | 47.1 | 3.0 |
| libm_sin_cos_dp | C | 3/3 | 4.98 | 447,985 | 42.5 | 3.0 |
| libm_sin_cos_dp | D | 3/3 | 2.36 | 628,022 | 73.5 | 3.0 |
| dftbench_double | A | 2/3 | 26.57 | 419,591 | 79.7 | 3.0 |
| dftbench_double | B | 2/3 | 20.40 | 661,347 | 65.6 | 3.0 |
| dftbench_double | C | 2/3 | 20.76 | 543,849 | 60.6 | 3.0 |
| dftbench_double | D | 2/3 | 32.07 | 817,234 | 100.0 | 3.0 |
| tlfloat_quad_arithmetic | A | 3/3 | 6.06 | 439,339 | 61.2 | 2.3 |
| tlfloat_quad_arithmetic | B | 3/3 | 3.29 | 516,102 | 98.3 | 3.0 |
| tlfloat_quad_arithmetic | C | 3/3 | 15.78 | 487,120 | 80.2 | 3.0 |
| tlfloat_quad_arithmetic | D | 3/3 | 3.67 | 430,132 | 89.8 | 3.0 |

正式实验共 54/60 格已归档并通过正确性、7 次性能样本、补丁重放和处理门禁。当前缺口：GF C3、CRC D1、DFT A3/B3/C3/D3。pilot 为 8/9 格有统一复测分数；A3 未形成可比的统一复测结果。空白表示未取得可比数据，不表示零提升或零 Token。

## 口径

“性能得分”是本算子吞吐量相对本次基线的提升百分比，即 `(最终 7 次测量中位数 / 基线 7 次测量中位数 − 1) × 100`；不是 eval_framework 官方评分。GF/CRC/isal 用 MB/s，libm/TLFloat 用 Mops/s，DFT 用 Mflops。只能在同一算子、同一测试口径下比较 A/B/C/D，不把不同算子的绝对吞吐量直接相加。

非缓存 Token = input + output + reasoning + cache write；cache read 单列，不混入该值。耗时为整个优化 session 的墙钟时间，迭代轮数是已记录的优化轮次数，不是重复实验次数。源码 grep 次数和输出字节只统计源码发现类搜索；Wiki 读取数来自 trace 的非空读取。OpenWiki 生成成本不在每个 session 的 Token 内。正式组别汇总仅汇总已有有效格；组别缺格时，中位数不能当作完整配对的因果结论。

A：原始源码搜索、不读 Wiki。B：在搜索阶段增加 OpenWiki 参考，源码 grep 不限范围。C：用 Wiki 导航并按 5 文件/2 目录的首轮范围做定向搜索，未命中可扩展一次。D：原始 optimizer skill 加仓库根目录 AGENTS.md 触发规则；改架构前读 index.md、运行构建/测试前读 quickstart.md，禁止无边界全仓搜索。

早期 pilot 的旧搜索计划门禁与后来规则不同：缺 plan 只保留为标签，不自动断言“未使用 Wiki”。明细同时给出非空 Wiki 读取和首次源码 grep 前读取数；旧 pilot 未完整记录“首次源码编辑前”时间，不能据此断言已满足后来的处理门禁。pilot 性能使用 2026-09-18 的统一低负载复测，Token、耗时、轮数仍取各自优化 session；不可把这两种时间点当作同一轮测试。A3 原优化归档缺轮次 JSON，且未纳入统一复测。

数据来源：920C 正式 `run_manifest.json`；920B 已迁移的 GF、TLFloat、libm 正式归档；920B 的 isal pilot 归档与 `shared-retest-20260918T020704Z/summary.json`。此目录只公开统计摘要，不包含 trace、原始 session、补丁或凭据。
