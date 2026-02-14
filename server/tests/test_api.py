import json
import threading
import time
import unittest
from http.client import HTTPConnection
from pathlib import Path
from tempfile import TemporaryDirectory

from server.main import ApiHandler
from server.trace.schema import StepSummary, TraceMetadata, TraceSummary
from server.trace.store import TraceStore
from http.server import ThreadingHTTPServer


class TestApi(unittest.TestCase):
    def setUp(self) -> None:
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


if __name__ == "__main__":
    unittest.main()
