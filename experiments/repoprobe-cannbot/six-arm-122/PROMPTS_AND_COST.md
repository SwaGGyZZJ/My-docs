# RepoProbe 六组：实际流程、提示词与逐题 Token 成本

本说明使用相同的 122 道共同题、11 个仓库快照、每题每组一次独立回答。`answer_prompt` 的真实拼装代码位于 `local-cannbot/run_local_cannbot.py:120-162`；CANNBot 调用和计量代码位于同文件 `54-116`。静默组代码位于 `local-cannbot/run_silent_wiki_126.py:59-88,118-170`。评分提示词位于 `local-cannbot/run_local_cannbot.py:315-339`。

## 六组输入及执行差异

| 组别 / condition | 工作区内容 | 回答前指令 | 强制读入检查 | 回答时允许的证据 |
|---|---|---|---|---|
| 仅代码仓 / `baseline` | 题目前的代码仓快照 | 通用提示词 | 无 | 代码仓 |
| 代码仓 + 强制 OpenWiki / `openwiki` | 同一代码快照 + 已生成 `openwiki/` | 先读 `quickstart.md` 及另一相关页，再查代码 | 两页须实际返回正文 | Wiki 导航，代码核验 |
| 代码仓 + 可选 OpenWiki / `optional_openwiki` | 与强制组共用 Wiki 工作区 | 明说 Wiki 可用，自行决定是否读 | 无 | 代码，Wiki 可选 |
| 仅 OpenWiki / `wiki_only` | 仅 `openwiki/`，无源码；空 `.git` 元数据 | 必读两页，只能在 Wiki 内读/查 | 两页返回正文，且无越界读取 | 仅 Wiki |
| 代码仓 + /init AGENTS.md / `agents_md` | 代码快照 + 事先生成的根 `AGENTS.md`，无 Wiki | 先读 `AGENTS.md` 再查代码 | 文件须实际返回正文 | AGENTS.md 导航，代码核验 |
| 代码仓 + 静默可见 OpenWiki / `silent_openwiki` | 从基线代码工作区复制 + 相同 Wiki；根 AGENTS/CLAUDE 保持基线状态 | 与基线组完全相同，不提 Wiki | 无 | 代码，Wiki 自发发现时可读 |

每道题启动独立的 `cannbot run --dir <workspace> --model cannbot/glm-5.2 --agent plan --format json <prompt>` 进程；未通过回答/协议检查则按设置重试，超时作为一次尝试记录。每个回答尝试内部可能有多个 `step_finish` 模型调用；“模型步骤”是这些调用数，不是独立重复次数。评分器另在隔离工作区运行相同模型，输入问题、官方参考答案、加权 checklist 和候选答案，先逐项打分，再由脚本验证离散分值并计算总分。

### 所有回答组的共同提示词（原文模板）

`{authority}` 和 `{treatment_protocol}` 的确切替换值见下方；`{question}` 是数据集 CSV 的 `question` 字段原文。

```text
You are participating in RepoProbe, a repository-comprehension benchmark.
Work read-only: do not create, edit, delete, or install anything. Inspect only the current repository.
Answer in English using concrete implementation details. {authority}
Do not ask the user questions and do not discuss the benchmark protocol.
{treatment_protocol}

Question:
{question}
```

基线组与静默可见组：`{authority}` = `Source code is authoritative.`，`{treatment_protocol}` 为空。两组回答 prompt 字节一致，差别只在工作区是否有 `openwiki/`。

强制 OpenWiki 组：`{authority}` = `Source code is authoritative.`，`{treatment_protocol}` 原文为：

```text
This is the OpenWiki treatment condition. Before searching source code, you MUST read
`openwiki/quickstart.md` and at least one additional OpenWiki page relevant to the question.
Use the wiki to form a search plan, then verify important claims against source code.
```

可选 OpenWiki 组：`{authority}` = `Source code is authoritative.`，`{treatment_protocol}` 原文为：

```text
This is the optional-OpenWiki condition. Generated repository documentation is available
under `openwiki/`, alongside the source code. Decide independently whether reading any of
it would help answer this particular question. You are not required to read it. If you do
use it, treat it as a navigation aid and verify important claims against source code.
```

仅 OpenWiki 组：`{authority}` = `OpenWiki is the only available evidence in this condition.`，`{treatment_protocol}` 原文为：

```text
This is the OpenWiki-only condition. The workspace intentionally contains only generated
OpenWiki documentation and no repository source code. You MUST read
`openwiki/quickstart.md` and at least one additional relevant Markdown page before answering.
Use only read, grep, glob, or list operations scoped inside `openwiki/`. Do not use shell,
web, task/subagent tools, parent directories, absolute paths outside this workspace, or any
repository source. Base the answer exclusively on information contained in OpenWiki. If the
Wiki does not contain a requested detail, say that the detail cannot be established from the
Wiki instead of guessing.
```

AGENTS.md 组：`{authority}` = `Source code is authoritative.`，`{treatment_protocol}` 原文为：

```text
This is the source-plus-AGENTS.md condition. Before searching the repository, you MUST
read the generated root `AGENTS.md`. Use that file as a repository map, then verify all
important claims against repository source. Do not access or use any `openwiki/` content.
```

### 预生成步骤的提示词

OpenWiki 在每个仓库只生成一次，四个 Wiki 组共享。首次生成提示词原文来自 `local-cannbot/build_openwiki_cannbot.py:18-24`：

```text
Initialize OpenWiki for this repository from scratch.
Use the OpenWiki MCP lifecycle: call openwiki_begin in init mode, follow its page plan,
write every planned page with openwiki_write_page, and call openwiki_finish only after
all pages are complete. Keep going until openwiki_finish reports completion. Treat source
code as authoritative and do not edit repository source files.
```

同一构建 session 超时/中断后续跑的提示词来自该文件 `25-29`：

```text
Proceed now. Do not ask for confirmation again. Execute the OpenWiki MCP
lifecycle immediately, submit the plan, write and submit every assigned page sequentially,
and call openwiki_finish. Continue until openwiki_finish reports complete. Do not merely
describe the plan and do not stop after partial progress.
```

AGENTS.md 生成不是自定义自然语言 prompt，而是 `cannbot run --agent build --format json --command init` 调用内置 `/init`；见 `local-cannbot/build_agents_md_cannbot.py:45-56`。该产物只给 AGENTS.md 组使用。

### 评分器提示词（六组相同）

```text
Score a RepoProbe candidate answer. Do not use tools or external knowledge.
Apply only the supplied weighted checklist. Score every checklist item independently and
give partial credit exactly as specified. Each item score MUST be one of that item's
explicit discrete rubric values. The final checklist item is the clarity item; all preceding
items are knowledge items. Use the released weights exactly as written.
First explain the evidence, then assign the discrete item score. Return one JSON object
and no Markdown using exactly this shape:
{"reason":"overall rationale","items":[{"item_index":0,"score":0,"reason":"..."}],
"hallucination":false}
Include exactly one item object for every checklist item, in checklist order. Do not
report or calculate totals; the harness validates the item scores and calculates them.

QUESTION:
{question}

REFERENCE ANSWER:
{reference_answer}

CHECKLIST:
{checklist}

CANDIDATE ANSWER:
{candidate}
```

## Token 成本口径

`run_local_cannbot.py:54-73` 从每个 `step_finish` 事件累加 `input`、`output`、`reasoning`、`cache.read`；事件中的 `tokens.total` 等于这四项之和。逐题回答总量是该题所有已记录回答尝试、所有步骤的四项之和。评分器是单独调用，其所有评分尝试的 Token 单列。组均值是 122 道题逐题总量之和再除以 122，不是把一次重试当作新题。`repoprobe-six-arm-122-per-question.csv` 对每题列出了分项、回答总量、评分总量及二者合计；`repoprobe-six-arm-122-summary.tsv` 可直接粘贴到 Excel。

基线组只有 62/122 题保存了 `invocation_attempts`；其余 60 题只保留最终回答尝试。因此该组“含重试”列是**可核验下界**，不是证明全部耗费；其余五组回答尝试明细完整。评分器重试可从 `scores.jsonl` 和各评分 `-attempt-N.jsonl` trace 恢复。缓存读取是 CANNBot 报告的 cached-input token 用量，不是 Wiki 阅读次数；它参与 `tokens.total`，但不能据此推算货币账单（缺少对应价格/折扣）。

OpenWiki 生成和 `/init` 是按仓库付费、各题复用的前置成本：分别见 `repoprobe-six-arm-122-generation.csv`。这些费用不能被“精确归属”到某一题；如需全链路摊销，必须先指定复用量及四个 Wiki 组之间的分摊规则。当前单题“回答 + 评分”不含生成费用。
