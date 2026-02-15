import json
import threading
import time
import unittest
from http.client import HTTPConnection
from pathlib import Path
from tempfile import TemporaryDirectory

from server.main import ApiHandler
from server.replay.jobs import ReplayJobStore
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
        ApiHandler.replay_jobs = ReplayJobStore()
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
        status, data = self._request("GET", "/api/traces")
        self.assertEqual(status, 200)
        self.assertEqual(len(data["traces"]), 1)

    def test_create_replay_job_and_get_status(self) -> None:
        status, data = self._request(
            "POST",
            "/api/replay-jobs",
            {
                "trace_id": "trace-1",
                "step_id": "s1",
                "scenarios": [
                    {"name": "Prompt tweak", "strategy": "hybrid", "modifications": {"prompt": "shorter"}}
                ],
            },
        )
        self.assertEqual(status, 202)
        job = data["job"]
        self.assertEqual(job["traceId"], "trace-1")
        self.assertEqual(job["stepId"], "s1")
        self.assertEqual(len(job["scenarios"]), 1)
        self.assertIn(job["status"], {"queued", "running", "completed"})

        status, data = self._request("GET", f"/api/replay-jobs/{job['id']}")
        self.assertEqual(status, 200)
        self.assertEqual(data["job"]["id"], job["id"])
        self.assertEqual(data["job"]["traceId"], "trace-1")

    def test_create_replay_job_validation_error(self) -> None:
        status, data = self._request(
            "POST",
            "/api/replay-jobs",
            {"trace_id": "trace-1", "step_id": "s1", "scenarios": []},
        )
        self.assertEqual(status, 400)
        self.assertIn("error", data)

    def test_create_replay_job_invalid_step(self) -> None:
        status, data = self._request(
            "POST",
            "/api/replay-jobs",
            {
                "trace_id": "trace-1",
                "step_id": "missing-step",
                "scenarios": [{"name": "Prompt tweak", "strategy": "hybrid", "modifications": {"prompt": "shorter"}}],
            },
        )
        self.assertEqual(status, 400)
        self.assertIn("step_id", data.get("error", ""))

    def test_create_replay_job_too_many_scenarios(self) -> None:
        scenarios = [
            {"name": f"Scenario {idx}", "strategy": "hybrid", "modifications": {"note": idx}}
            for idx in range(60)
        ]
        status, data = self._request(
            "POST",
            "/api/replay-jobs",
            {"trace_id": "trace-1", "step_id": "s1", "scenarios": scenarios},
        )
        self.assertEqual(status, 400)
        self.assertIn("scenarios", data.get("error", ""))

    def test_cancel_replay_job(self) -> None:
        status, data = self._request(
            "POST",
            "/api/replay-jobs",
            {
                "trace_id": "trace-1",
                "step_id": "s1",
                "execute": False,
                "scenarios": [
                    {"name": "Prompt tweak", "strategy": "hybrid", "modifications": {"prompt": "shorter"}}
                ],
            },
        )
        self.assertEqual(status, 202)
        job_id = data["job"]["id"]
        self.assertEqual(data["job"]["status"], "queued")

        status, data = self._request("POST", f"/api/replay-jobs/{job_id}/cancel", {})
        self.assertEqual(status, 200)
        self.assertEqual(data["job"]["status"], "canceled")

    def test_replay_job_matrix_summary(self) -> None:
        status, data = self._request(
            "POST",
            "/api/replay-jobs",
            {
                "trace_id": "trace-1",
                "step_id": "s1",
                "scenarios": [
                    {"name": "Prompt tweak", "strategy": "recorded", "modifications": {"prompt": "shorter"}},
                    {"name": "Live strategy", "strategy": "live", "modifications": {"max_tokens": 120}},
                ],
            },
        )
        self.assertEqual(status, 202)
        job_id = data["job"]["id"]

        status, data = self._request("GET", f"/api/replay-jobs/{job_id}/matrix")
        self.assertEqual(status, 200)
        self.assertIn("rows", data["matrix"])
        self.assertEqual(len(data["matrix"]["rows"]), 2)
        self.assertIn("causalRanking", data["matrix"])

    def _request(self, method: str, path: str, payload: dict | None = None) -> tuple[int, dict]:
        conn = HTTPConnection("127.0.0.1", self.port)
        body = None
        headers = {}
        if payload is not None:
            body = json.dumps(payload)
            headers["Content-Type"] = "application/json"
        conn.request(method, path, body=body, headers=headers)
        resp = conn.getresponse()
        raw = resp.read().decode("utf-8")
        data = json.loads(raw) if raw else {}
        status = resp.status
        conn.close()
        return status, data


if __name__ == "__main__":
    unittest.main()
