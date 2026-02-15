import json
import threading
import time
import unittest
from http.client import HTTPConnection
from pathlib import Path
from tempfile import TemporaryDirectory

import server.main as server_main
from server.main import ApiHandler
from server.trace.schema import StepSummary, TraceMetadata, TraceSummary
from server.trace.store import TraceStore
from http.server import ThreadingHTTPServer


class TestApi(unittest.TestCase):
    def setUp(self) -> None:
        server_main.ApiHandler.rate_limit_window_s = 60
        server_main.ApiHandler.rate_limit_max_requests = 500
        server_main.ApiHandler.clear_rate_limit_state()
        self.temp_dir = TemporaryDirectory()
        self.store = TraceStore(Path(self.temp_dir.name))
        summary = TraceSummary(
            id="trace-1",
            name="Test",
            startedAt="2026-01-27T10:00:00.000Z",
            endedAt="2026-01-27T10:00:02.000Z",
            status="completed",
            metadata=TraceMetadata(
                source="manual",
                agentName="TestAgent",
                modelId="demo",
                wallTimeMs=2000,
                workTimeMs=2000,
            ),
            steps=[
                StepSummary(
                    id="s1",
                    index=0,
                    type="llm_call",
                    name="plan",
                    startedAt="2026-01-27T10:00:00.000Z",
                    endedAt="2026-01-27T10:00:01.000Z",
                    durationMs=1000,
                    status="completed",
                    childStepIds=[],
                )
            ],
        )
        self.store.ingest_trace(summary)

        ApiHandler.store = self.store
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), ApiHandler)
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        time.sleep(0.05)

    def tearDown(self) -> None:
        self.server.shutdown()
        self.thread.join(timeout=2)
        self.server.server_close()
        self.temp_dir.cleanup()

    def test_list_traces(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        conn.request("GET", "/api/traces")
        resp = conn.getresponse()
        data = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 200)
        self.assertEqual(len(data["traces"]), 1)
        conn.close()

    def test_replay_invalid_strategy_returns_400(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        body = json.dumps({"step_id": "s1", "strategy": "invalid", "modifications": {}})
        conn.request("POST", "/api/traces/trace-1/replay", body=body, headers={"Content-Type": "application/json"})
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 400)
        self.assertIn("error", payload)
        conn.close()

    def test_replay_malformed_json_returns_400(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        conn.request(
            "POST",
            "/api/traces/trace-1/replay",
            body="{not json}",
            headers={"Content-Type": "application/json"},
        )
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 400)
        self.assertIn("error", payload)
        conn.close()

    def test_replay_missing_step_id_returns_400(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        body = json.dumps({"strategy": "recorded", "modifications": {}})
        conn.request("POST", "/api/traces/trace-1/replay", body=body, headers={"Content-Type": "application/json"})
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 400)
        self.assertIn("error", payload)
        conn.close()

    def test_compare_missing_trace_ids_returns_400(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        body = json.dumps({})
        conn.request("POST", "/api/compare", body=body, headers={"Content-Type": "application/json"})
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 400)
        self.assertIn("error", payload)
        conn.close()

    def test_payload_too_large_returns_413(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        oversized_note = "x" * 1_100_000
        body = json.dumps({"step_id": "s1", "strategy": "recorded", "modifications": {"note": oversized_note}})
        conn.request("POST", "/api/traces/trace-1/replay", body=body, headers={"Content-Type": "application/json"})
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 413)
        self.assertEqual(payload.get("error"), "Payload too large")
        conn.close()

    def test_internal_error_is_sanitized(self) -> None:
        original_compare_execute = server_main.compare_execute

        def raise_internal_error(*_args: object, **_kwargs: object) -> dict:
            raise RuntimeError("db path leaked: /tmp/secret.db")

        server_main.compare_execute = raise_internal_error
        try:
            conn = HTTPConnection("127.0.0.1", self.port)
            body = json.dumps({"left_trace_id": "trace-1", "right_trace_id": "trace-1"})
            conn.request("POST", "/api/compare", body=body, headers={"Content-Type": "application/json"})
            resp = conn.getresponse()
            payload = json.loads(resp.read().decode("utf-8"))
            self.assertEqual(resp.status, 500)
            self.assertEqual(payload.get("error"), "Internal server error")
            self.assertNotIn("secret.db", payload.get("error", ""))
            conn.close()
        finally:
            server_main.compare_execute = original_compare_execute

    def test_health_response_includes_security_headers(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        conn.request("GET", "/api/health")
        resp = conn.getresponse()
        _ = resp.read()
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.getheader("X-Content-Type-Options"), "nosniff")
        self.assertEqual(resp.getheader("X-Frame-Options"), "DENY")
        self.assertEqual(resp.getheader("Referrer-Policy"), "no-referrer")
        self.assertEqual(resp.getheader("Cache-Control"), "no-store")
        conn.close()

    def test_post_requires_json_content_type(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        body = json.dumps({"left_trace_id": "trace-1", "right_trace_id": "trace-1"})
        conn.request("POST", "/api/compare", body=body, headers={"Content-Type": "text/plain"})
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 415)
        self.assertEqual(payload.get("error"), "Content-Type must be application/json")
        conn.close()

    def test_rate_limit_returns_429(self) -> None:
        server_main.ApiHandler.rate_limit_window_s = 60
        server_main.ApiHandler.rate_limit_max_requests = 1
        server_main.ApiHandler.clear_rate_limit_state()

        conn1 = HTTPConnection("127.0.0.1", self.port)
        conn1.request("GET", "/api/health")
        resp1 = conn1.getresponse()
        _ = resp1.read()
        self.assertEqual(resp1.status, 200)
        conn1.close()

        conn2 = HTTPConnection("127.0.0.1", self.port)
        conn2.request("GET", "/api/health")
        resp2 = conn2.getresponse()
        payload2 = json.loads(resp2.read().decode("utf-8"))
        self.assertEqual(resp2.status, 429)
        self.assertEqual(payload2.get("error"), "Too many requests")
        self.assertIsNotNone(resp2.getheader("Retry-After"))
        conn2.close()


if __name__ == "__main__":
    unittest.main()
