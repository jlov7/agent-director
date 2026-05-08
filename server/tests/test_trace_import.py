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
from server.trace.store import TraceStore


class TestTraceImportApi(unittest.TestCase):
    def setUp(self) -> None:
        server_main.ApiHandler.rate_limit_window_s = 60
        server_main.ApiHandler.rate_limit_max_requests = 500
        server_main.ApiHandler.clear_rate_limit_state()
        self.temp_dir = TemporaryDirectory()
        ApiHandler.store = TraceStore(Path(self.temp_dir.name))
        ApiHandler.replay_jobs = ReplayJobStore()
        ApiHandler.live_broker = server_main.LiveTraceBroker()
        ApiHandler.extension_registry = server_main.ExtensionRegistry()
        ApiHandler.ops_store = OpsStore(Path(self.temp_dir.name))
        ApiHandler.require_auth = False
        ApiHandler.allowed_api_keys = set()
        ApiHandler.default_tenant = "public"
        ApiHandler.gameplay_enabled = False
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

    def test_imports_agent_director_payload_with_step_details(self) -> None:
        status, data = self._request(
            "POST",
            "/api/traces/import",
            {
                "source": "agent_director",
                "payload": {
                    "trace": {
                        "id": "import-native-1",
                        "name": "Imported Native",
                        "startedAt": "2026-05-07T10:00:00.000Z",
                        "endedAt": "2026-05-07T10:00:02.000Z",
                        "status": "completed",
                        "metadata": {
                            "source": "agent_director",
                            "agentName": "Importer",
                            "modelId": "gpt-test",
                            "wallTimeMs": 2000,
                        },
                        "steps": [
                            {
                                "id": "s1",
                                "index": 0,
                                "type": "llm_call",
                                "name": "Plan",
                                "startedAt": "2026-05-07T10:00:00.000Z",
                                "endedAt": "2026-05-07T10:00:01.000Z",
                                "durationMs": 1000,
                                "status": "completed",
                                "childStepIds": [],
                            }
                        ],
                    },
                    "stepDetails": {"s1": {"data": {"prompt": "Diagnose this run"}}},
                },
            },
        )

        self.assertEqual(status, 201)
        self.assertEqual(data["trace"]["id"], "import-native-1")
        self.assertEqual(data["warnings"], [])

        detail_status, detail_data = self._request("GET", "/api/traces/import-native-1/steps/s1")
        self.assertEqual(detail_status, 200)
        self.assertEqual(detail_data["step"]["data"]["prompt"], "Diagnose this run")

    def test_imports_otel_genai_spans_with_provenance(self) -> None:
        status, data = self._request(
            "POST",
            "/api/traces/import",
            {
                "source": "otel_genai",
                "payload": {
                    "traceId": "otel-trace-1",
                    "spans": [
                        {
                            "spanId": "span-root",
                            "name": "agent.run",
                            "startTime": "2026-05-07T10:00:00.000Z",
                            "endTime": "2026-05-07T10:00:03.000Z",
                            "attributes": {
                                "gen_ai.operation.name": "agent",
                                "gen_ai.system": "openai",
                                "gen_ai.request.model": "gpt-4.1",
                                "gen_ai.usage.cost_usd": 0.0032,
                            },
                        },
                        {
                            "spanId": "span-tool",
                            "parentSpanId": "span-root",
                            "name": "tool.search",
                            "startTime": "2026-05-07T10:00:01.000Z",
                            "endTime": "2026-05-07T10:00:02.000Z",
                            "attributes": {
                                "gen_ai.operation.name": "execute_tool",
                                "tool.name": "search",
                                "gen_ai.usage.input_tokens": 20,
                                "gen_ai.usage.output_tokens": 30,
                                "gen_ai.usage.cost_usd": 0.001,
                            },
                            "events": [{"name": "output", "attributes": {"value": "result"}}],
                        },
                    ],
                },
            },
        )

        self.assertEqual(status, 201)
        trace = data["trace"]
        self.assertEqual(trace["metadata"]["providerTraceId"], "otel-trace-1")
        self.assertEqual(trace["metadata"]["framework"], "otel_genai")
        self.assertEqual(trace["steps"][1]["providerSpanId"], "span-tool")
        self.assertEqual(trace["steps"][1]["providerParentSpanId"], "span-root")
        self.assertEqual(trace["steps"][1]["parentStepId"], "span-root")
        self.assertEqual(trace["steps"][1]["metrics"]["tokensTotal"], 50)
        self.assertEqual(trace["steps"][1]["metrics"]["costUsd"], 0.001)
        self.assertAlmostEqual(trace["metadata"]["totalCostUsd"], 0.0042)

    def test_import_warns_on_duplicate_missing_parent_and_impossible_timing(self) -> None:
        status, data = self._request(
            "POST",
            "/api/traces/import",
            {
                "source": "otel_genai",
                "payload": {
                    "traceId": "messy-trace-1",
                    "spans": [
                        {
                            "spanId": "dup",
                            "parentSpanId": "missing-parent",
                            "name": "tool.first",
                            "startTime": "2026-05-07T10:00:02.000Z",
                            "endTime": "2026-05-07T10:00:01.000Z",
                            "attributes": {"gen_ai.operation.name": "execute_tool"},
                        },
                        {
                            "spanId": "dup",
                            "name": "tool.second",
                            "startTime": "2026-05-07T10:00:03.000Z",
                            "endTime": "2026-05-07T10:00:04.000Z",
                            "attributes": {"gen_ai.operation.name": "execute_tool"},
                        },
                    ],
                },
            },
        )

        self.assertEqual(status, 201)
        self.assertEqual([step["id"] for step in data["trace"]["steps"]], ["dup", "dup-2"])
        self.assertTrue(any("Duplicate span id dup" in warning for warning in data["warnings"]))
        self.assertTrue(any("missing parent span missing-parent" in warning for warning in data["warnings"]))
        self.assertTrue(any("ended before it started" in warning for warning in data["warnings"]))

    def test_imports_nested_resource_spans(self) -> None:
        status, data = self._request(
            "POST",
            "/api/traces/import",
            {
                "source": "otel_genai",
                "payload": {
                    "traceId": "resource-trace-1",
                    "resourceSpans": [
                        {
                            "scopeSpans": [
                                {
                                    "spans": [
                                        {
                                            "spanId": "resource-span",
                                            "name": "agent.plan",
                                            "startTimeUnixNano": 1778241600000000000,
                                            "endTimeUnixNano": 1778241601000000000,
                                            "attributes": [
                                                {
                                                    "key": "gen_ai.operation.name",
                                                    "value": {"stringValue": "chat"},
                                                },
                                                {
                                                    "key": "gen_ai.usage.total_tokens",
                                                    "value": {"intValue": 42},
                                                },
                                            ],
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                },
            },
        )

        self.assertEqual(status, 201)
        self.assertEqual(data["trace"]["steps"][0]["id"], "resource-span")
        self.assertEqual(data["trace"]["metadata"]["totalTokens"], 42)

    def test_import_rejects_unknown_source(self) -> None:
        status, data = self._request(
            "POST",
            "/api/traces/import",
            {"source": "unknown", "payload": {}},
        )

        self.assertEqual(status, 400)
        self.assertIn("source must be one of", data["error"])

    def test_import_assigns_trace_to_request_tenant(self) -> None:
        ApiHandler.require_auth = True
        ApiHandler.allowed_api_keys = {"secret"}

        status, data = self._request(
            "POST",
            "/api/traces/import",
            {
                "source": "agent_director",
                "payload": {
                    "trace": {
                        "id": "tenant-import-1",
                        "name": "Tenant Import",
                        "startedAt": "2026-05-07T10:00:00.000Z",
                        "endedAt": None,
                        "status": "running",
                        "metadata": {
                            "source": "manual",
                            "agentName": "Tenant",
                            "modelId": "demo",
                            "wallTimeMs": 0,
                        },
                        "steps": [],
                    }
                },
            },
            headers={"X-API-Key": "secret", "X-Tenant-Id": "alpha"},
        )
        self.assertEqual(status, 201)

        allowed_status, _ = self._request(
            "GET",
            "/api/traces/tenant-import-1",
            headers={"X-API-Key": "secret", "X-Tenant-Id": "alpha"},
        )
        denied_status, _ = self._request(
            "GET",
            "/api/traces/tenant-import-1",
            headers={"X-API-Key": "secret", "X-Tenant-Id": "beta"},
        )

        self.assertEqual(allowed_status, 200)
        self.assertEqual(denied_status, 404)

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
