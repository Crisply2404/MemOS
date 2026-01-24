# 提案：Memory Card buckets 最小实装（rules-based）

## 背景

当前 `memos.memory_card.v2` 的结构中 `facts/preferences/constraints/decisions` 作为核心 buckets 已存在，但内容长期为空，导致：
- 面试/讲解时难以说明“结构化记忆具体结构化了什么”
- Working memory（context pack）展示的信息量偏少（只剩 risks/actions 更像 debug 标签）

同时我们希望保持：
- 可复现（不依赖 LLM/key）
- 可解释（规则抽取，能讲出为什么）
- 可验证（单元测试覆盖）

## 目标

- 让 `facts/preferences/constraints/decisions` 在常见对话输入下能产出非空条目
- 继续保持 `risks/actions` 的可用性
- 保持输出紧凑（避免 summary 反而变长）

## 非目标

- 不引入真实 LLM 抽取（后续可作为增强）
- 不做复杂的冲突合并/去重治理（仅做最小稳定抽取）

## 方案概述

在 `structured_condense()` 中基于输入文本做 deterministic 规则抽取：
- `facts`：提取稳定技术锚点（API `/v1/*`、pgvector、RQ、端口等）
- `preferences`：提取用户偏好表达（“我希望/我倾向于/更喜欢…”）
- `constraints`：提取约束/禁止（“必须/不能/不要/保留/禁止…”）
- `decisions`：提取明确决策或选项（“决定/选择/我选/keep…”）

并对结果做去重与上限截断（避免输出膨胀）。

## 验证

- 单元测试：`server/tests/test_condensation_card.py` 覆盖 buckets 抽取
- UI：RAG Debugger 的 working memory（context pack）中可看到 buckets 有内容

