# 归档与撤回校验

日期：2026-11-17。以下为本次执行记录，范围是三文件设计归档与共享治理边界，不是完整产品验收。

| 检查 | 结果 |
| --- | --- |
| 归档的三个候选文件与撤回前运行文件逐字节比较 | 相同；SHA-256 见 snapshot.json |
| JSON 与 YAML 解析 | 通过；12 个必填字段、16 个 profile、5 类 registry |
| 撤回前针对性检查 | 57 项通过、0 失败、0 跳过 |
| 撤回后共享治理回归 | 46 项通过、0 失败、0 跳过 |
| 三个运行文件与来源基线 HEAD 比较 | 无差异；原始备份与基线逐字节一致 |
| 其他已跟踪开发改动 | 撤回前后 git diff HEAD --binary 排除这三个路径后相同 |

57 项包含下列 46 项既有检查，以及本轮临时编写的 5 项芯片分类探针和 6 项全称词表探针。临时探针未作为项目测试提交；这些数字只记录本次检查，不表示设计目录本身带有可独立运行的完整测试工程。

46 项既有检查覆盖 contract、applicability、conditions、vocabulary、latest-only、history 与 lint。于原 KunpengKnowledge 工作区运行：

```sh
node --test --test-concurrency=1 \
  tests/governance-contract.test.mjs \
  tests/governance-applicability.test.mjs \
  tests/governance-conditions.test.mjs \
  tests/governance-vocabulary.test.mjs \
  tests/governance-latest-only.test.mjs \
  tests/governance-history.test.mjs \
  tests/governance-lint.test.mjs
```

未用这些检查声称代码、PR/补丁、文档三类生命周期端到端验收通过，也没有发布新的运行配置包。
