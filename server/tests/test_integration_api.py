from __future__ import annotations

import os
import unittest

import httpx


def _base_url() -> str:
    return os.getenv("MEMOS_INTEGRATION_BASE_URL", "http://127.0.0.1:8000")


@unittest.skipUnless(os.getenv("MEMOS_INTEGRATION_TESTS") == "1", "set MEMOS_INTEGRATION_TESTS=1 to run")
class TestIntegrationApi(unittest.TestCase):
    def test_seed_query_audit_pipeline(self) -> None:
        base = _base_url()
        ns = "it"
        sid = "it-session"

        with httpx.Client(base_url=base, timeout=10.0) as client:
            seed = client.post("/v1/dev/seed", params={"namespace": ns, "session_id": sid, "reset": "true"})
            self.assertEqual(seed.status_code, 200)

            ingest = client.post(
                "/v1/ingest",
                json={
                    "namespace": ns,
                    "session_id": sid,
                    "role": "user",
                    "text": "docker compose up --build",
                    "metadata": {"source": "integration"},
                },
            )
            self.assertEqual(ingest.status_code, 200)

            q = client.post("/v1/query", json={"namespace": ns, "session_id": sid, "query": "docker", "top_k": 6})
            self.assertEqual(q.status_code, 200)
            payload = q.json()
            self.assertIn("raw_chunks", payload)
            self.assertIn("rerank_debug", payload)

            audit = client.get("/v1/ops/audit", params={"namespace": ns, "session_id": sid, "limit": 50})
            self.assertEqual(audit.status_code, 200)

            pipe = client.get("/v1/ops/pipeline")
            self.assertEqual(pipe.status_code, 200)

