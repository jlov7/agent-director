import json
import threading
import time
import unittest
from http.client import HTTPConnection
from pathlib import Path
from tempfile import TemporaryDirectory

import server.main as server_main
from http.server import ThreadingHTTPServer
from server.main import ApiHandler
from server.ops.store import OpsStore
from server.replay.jobs import ReplayJobStore
from server.trace.schema import StepSummary, TraceMetadata, TraceSummary
from server.trace.store import TraceStore


class TestEvalApi(unittest.TestCase):
    def setUp(self) -> None:
        server_main.ApiHandler.rate_limit_window_s = 60
        server_main.ApiHandler.rate_limit_max_requests = 500
        server_main.ApiHandler.clear_rate_limit_state()
        self.temp_dir = TemporaryDirectory()
        self.store = TraceStore(Path(self.temp_dir.name))
        self.store.ingest_trace(
            TraceSummary(
                id="trace-eval-1",
                name="Eval Trace",
                startedAt="2026-05-07T10:00:00.000Z",
                endedAt="2026-05-07T10:00:02.000Z",
                status="failed",
                metadata=TraceMetadata(
                    source="manual",
                    agentName="EvalAgent",
                    modelId="demo",
                    wallTimeMs=2000,
                    errorCount=1,
                ),
                steps=[
                    StepSummary(
                        id="s1",
                        index=0,
                        type="llm_call",
                        name="Plan",
                        startedAt="2026-05-07T10:00:00.000Z",
                        endedAt="2026-05-07T10:00:01.000Z",
                        durationMs=1000,
                        status="completed",
                        childStepIds=["s2"],
                    ),
                    StepSummary(
                        id="s2",
                        index=1,
                        type="tool_call",
                        name="Search",
                        startedAt="2026-05-07T10:00:01.000Z",
                        endedAt="2026-05-07T10:00:02.000Z",
                        durationMs=1000,
                        status="failed",
                        error="timeout",
                        parentStepId="s1",
                        childStepIds=[],
                    ),
                ],
            )
        )
        ApiHandler.store = self.store
        ApiHandler.replay_jobs = ReplayJobStore()
        ApiHandler.live_broker = server_main.LiveTraceBroker()
        ApiHandler.extension_registry = server_main.ExtensionRegistry()
        ApiHandler.ops_store = OpsStore(Path(self.temp_dir.name))
        ApiHandler.ops_store.bootstrap_trace_tenants(["trace-eval-1"], "public")
        ApiHandler.require_auth = False
        ApiHandler.allowed_api_keys = set()
        ApiHandler.default_tenant = "public"
        ApiHandler.gameplay_enabled = False
        ApiHandler.eval_store = server_main.EvalStore(Path(self.temp_dir.name) / "evals.json")
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

    def test_creates_eval_case_from_trace(self) -> None:
        status, data = self._request(
            "POST",
            "/api/eval-cases/from-trace",
            {"trace_id": "trace-eval-1", "step_id": "s2", "name": "Timeout regression"},
        )

        self.assertEqual(status, 201)
        case = data["evalCase"]
        self.assertEqual(case["traceId"], "trace-eval-1")
        self.assertEqual(case["name"], "Timeout regression")
        self.assertEqual(case["assertions"]["expectedStatus"], "failed")
        self.assertEqual(case["assertions"]["expectedErrorCount"], 1)
        self.assertEqual(case["assertions"]["criticalStepIds"], ["s2"])

    def test_runs_eval_cases_deterministically(self) -> None:
        _, created = self._request(
            "POST",
            "/api/eval-cases/from-trace",
            {"trace_id": "trace-eval-1", "step_id": "s2"},
        )

        status, data = self._request("POST", "/api/eval-runs", {"case_ids": [created["evalCase"]["id"]]})
        run_id = data["evalRun"]["id"]
        fetch_status, fetched = self._request("GET", f"/api/eval-runs/{run_id}")

        self.assertEqual(status, 201)
        self.assertEqual(fetch_status, 200)
        self.assertEqual(data["evalRun"], fetched["evalRun"])
        self.assertEqual(data["evalRun"]["status"], "passed")
        self.assertEqual(data["evalRun"]["scores"][0]["score"], 1.0)

    def test_lists_eval_cases(self) -> None:
        self._request("POST", "/api/eval-cases/from-trace", {"trace_id": "trace-eval-1"})

        status, data = self._request("GET", "/api/eval-cases")

        self.assertEqual(status, 200)
        self.assertEqual(len(data["evalCases"]), 1)
        self.assertEqual(data["evalCases"][0]["traceId"], "trace-eval-1")

    def _request(self, method: str, path: str, body=None, headers=None):
        conn = HTTPConnection("127.0.0.1", self.port, timeout=5)
        payload = json.dumps(body).encode("utf-8") if body is not None else None
        request_headers = {"Content-Type": "application/json"}
        if headers:
            request_headers.update(headers)
        conn.request(method, path, body=payload, headers=request_headers)
        response = conn.getresponse()
        raw = response.read().decode("utf-8")
        conn.close()
        return response.status, json.loads(raw) if raw else {}


if __name__ == "__main__":
    unittest.main()
