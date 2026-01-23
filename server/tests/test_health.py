from __future__ import annotations

import sys
from pathlib import Path
import unittest


SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))


class TestHealth(unittest.TestCase):
    def test_health_ok(self) -> None:
        from fastapi.testclient import TestClient

        from memos_server.app import create_app

        app = create_app()
        client = TestClient(app)
        res = client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"status": "ok"})

    def test_openapi_has_ops_condensations(self) -> None:
        from fastapi.testclient import TestClient

        from memos_server.app import create_app

        app = create_app()
        client = TestClient(app)
        res = client.get("/openapi.json")
        self.assertEqual(res.status_code, 200)
        spec = res.json()
        self.assertIn("/v1/ops/condensations", (spec.get("paths") or {}))
