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
from server.trace.schema import StepDetails, StepSummary, TraceMetadata, TraceSummary
from server.trace.store import TraceStore


class TestEvalApi(unittest.TestCase):
    def setUp(self) -> None:
        server_main.ApiHandler.rate_limit_window_s = 60
        server_main.ApiHandler.rate_limit_max_requests = 500
        server_main.ApiHandler.clear_rate_limit_state()
        self.temp_dir = TemporaryDirectory()
        self.store = TraceStore(Path(self.temp_dir.name))
        plan_step = StepSummary(
            id="s1",
            index=0,
            type="llm_call",
            name="Plan",
            startedAt="2026-05-07T10:00:00.000Z",
            endedAt="2026-05-07T10:00:01.000Z",
            durationMs=1000,
            status="completed",
            childStepIds=["s2"],
        )
        failed_step = StepSummary(
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
        )
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
                steps=[plan_step, failed_step],
            ),
            {
                "s1": StepDetails.from_summary(plan_step, {"analysis": "plan mentions downstream search"}),
                "s2": StepDetails.from_summary(
                    failed_step,
                    {"analysis": "search timeout caused retry collapse in the retrieval branch"},
                ),
            },
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

    def test_runs_semantic_eval_adapters(self) -> None:
        _, created = self._request(
            "POST",
            "/api/eval-cases/from-trace",
            {
                "trace_id": "trace-eval-1",
                "step_id": "s2",
                "evaluators": [
                    {
                        "type": "text_contains",
                        "name": "Error mentions timeout",
                        "step_id": "s2",
                        "field": "error",
                        "expected": "timeout",
                    },
                    {
                        "type": "semantic_similarity",
                        "name": "Analysis matches root cause",
                        "step_id": "s2",
                        "field": "data.analysis",
                        "expected": "timeout caused retrieval retry collapse",
                        "minScore": 0.4,
                    },
                    {
                        "type": "semantic_similarity",
                        "name": "Zero threshold is honored",
                        "step_id": "s2",
                        "field": "data.analysis",
                        "expected": "unrelated",
                        "minScore": 0,
                    },
                ],
            },
        )

        status, data = self._request("POST", "/api/eval-runs", {"case_ids": [created["evalCase"]["id"]]})
        checks = data["evalRun"]["scores"][0]["checks"]
        zero_threshold_check = next(check for check in checks if check["name"] == "Zero threshold is honored")

        self.assertEqual(status, 201)
        self.assertEqual(data["evalRun"]["status"], "passed")
        self.assertIn("Error mentions timeout", [check["name"] for check in checks])
        self.assertIn("Analysis matches root cause", [check["name"] for check in checks])
        self.assertTrue(zero_threshold_check["passed"])
        self.assertEqual(zero_threshold_check["score"], 0.0)

    def test_rejects_invalid_evaluator_payloads(self) -> None:
        list_status, list_data = self._request(
            "POST",
            "/api/eval-cases/from-trace",
            {"trace_id": "trace-eval-1", "evaluators": ["not-an-object"]},
        )
        missing_step_status, missing_step_data = self._request(
            "POST",
            "/api/eval-cases/from-trace",
            {
                "trace_id": "trace-eval-1",
                "evaluators": [
                    {
                        "type": "semantic_similarity",
                        "step_id": "missing-step",
                        "field": "error",
                        "expected": "timeout",
                    }
                ],
            },
        )

        self.assertEqual(list_status, 400)
        self.assertIn("evaluator entries must be objects", list_data["error"])
        self.assertEqual(missing_step_status, 400)
        self.assertIn("evaluator stepId not found in trace", missing_step_data["error"])

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
