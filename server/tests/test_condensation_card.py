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

    def test_structured_condense_includes_excerpt_for_large_input(self) -> None:
        from memos_server.condensation import structured_condense

        raw = ("[L1]\n" + ("x" * 900)).strip()
        out = structured_condense(raw)
        obj = json.loads(out)
        self.assertEqual(obj.get("schema"), "memos.memory_card.v2")
        self.assertIn("raw_excerpt", obj)
