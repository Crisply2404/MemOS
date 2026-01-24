# tasks

## P0（必须）
- [ ] 把 demo seed 语料集中到 `server/memos_server/demo_seed.py`（中文、可解释）
- [ ] 将 buckets 抽取从子串匹配升级为“显式标注优先”的 extractor（`server/memos_server/extractor.py`）
- [ ] 更新 `server/tests/test_condensation_card.py`：覆盖 `事实/决策/约束/偏好` 的标注抽取与 `；` 分隔
- [ ] 验证：UI 的 decisions/constraints/preferences 不再依赖“碰运气”

## P1（建议）
- [ ] 将 facts 的“技术锚点”抽取规则外置成配置（便于演示不同项目的适配）
- [ ] 增加一条 ops/debug 指南：如何用 seed 快速触发 buckets（写入知识库）

## P2（规划/对齐业界）
- [ ] 定义 LLM extractor 接口（输入：raw context；输出：memory_card schema）+ 结构化校验
- [ ] 增加离线评测脚本：抽取准确率/稳定性（小样本即可）

