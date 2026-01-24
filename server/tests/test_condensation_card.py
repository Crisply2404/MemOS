from __future__ import annotations

import json
import sys
from pathlib import Path
import unittest


SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))


class TestCondensationCard(unittest.TestCase):
    def test_structured_condense_is_json_card(self) -> None:
        from memos_server.condensation import structured_condense

        raw = "[L1]\n[user] docker compose up\n[L2 score=0.9] postgres 5432"
        out = structured_condense(raw)
        obj = json.loads(out)
        self.assertEqual(obj.get("schema"), "memos.memory_card.v2")
        self.assertIn("actions", obj)
        self.assertIn("risks", obj)
        self.assertIn("facts", obj)
        self.assertIn("preferences", obj)
        self.assertIn("constraints", obj)
        self.assertIn("decisions", obj)

    def test_structured_condense_extracts_user_constraints(self) -> None:
        from memos_server.condensation import structured_condense

        raw = (
            "[L1]\n"
            "[user] 不要去掉 /v1\n"
            "[user] 我希望保留 v1 前缀\n"
            "[user] 决策：保留 /v1；不接入 LLM\n"
            "[user] 事实：后端 FastAPI；L2 是 Postgres+pgvector\n"
            "[agent] ok\n"
            "[L2 score=0.9] API: /v1/query"
        )
        out = structured_condense(raw)
        obj = json.loads(out)
        constraints = obj.get("constraints") or []
        preferences = obj.get("preferences") or []
        decisions = obj.get("decisions") or []
        facts = obj.get("facts") or []
        self.assertTrue(any("/v1" in str(x) for x in constraints))
        self.assertTrue(any("希望" in str(x) for x in preferences))
        self.assertTrue(any("/v1" in str(x) for x in decisions))
        self.assertTrue(any("LLM" in str(x) for x in decisions))
        self.assertTrue(any("/v1" in str(x) for x in facts))
        self.assertTrue(any("FastAPI" in str(x) for x in facts))

    def test_structured_condense_includes_excerpt_for_large_input(self) -> None:
        from memos_server.condensation import structured_condense

        raw = ("[L1]\n" + ("x" * 900)).strip()
        out = structured_condense(raw)
        obj = json.loads(out)
        self.assertEqual(obj.get("schema"), "memos.memory_card.v2")
        self.assertIn("raw_excerpt", obj)
