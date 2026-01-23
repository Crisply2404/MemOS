from __future__ import annotations

import sys
from pathlib import Path
import unittest


SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))


class TestRerankScoring(unittest.TestCase):
    def test_overlap_score_range(self) -> None:
        from memos_server.app import _score_overlap  # type: ignore

        self.assertEqual(_score_overlap("", "anything"), 0.0)
        self.assertEqual(_score_overlap("a", ""), 0.0)
        self.assertGreaterEqual(_score_overlap("redis postgres", "redis"), 0.0)
        self.assertLessEqual(_score_overlap("redis postgres", "redis"), 1.0)

    def test_overlap_basic(self) -> None:
        from memos_server.app import _score_overlap  # type: ignore

        self.assertAlmostEqual(_score_overlap("redis", "redis"), 1.0)
        self.assertAlmostEqual(_score_overlap("redis", "postgres"), 0.0)
        # tokenization is alnum/underscore, case-insensitive
        self.assertAlmostEqual(_score_overlap("REDIS", "redis://127.0.0.1"), 1.0)

