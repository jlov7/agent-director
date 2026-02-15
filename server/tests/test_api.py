import json
import socket
import threading
import time
import unittest
from http.client import HTTPConnection
from pathlib import Path
from tempfile import TemporaryDirectory

import server.main as server_main
from server.main import ApiHandler
from server.trace.schema import StepDetails, StepSummary, TraceMetadata, TraceSummary
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
        self.store.save_step_details(
            "trace-1",
            StepDetails.from_summary(summary.steps[0], {"data": {"secret": "sk-abc1234567890", "email": "a@b.com"}}),
        )

        ApiHandler.store = self.store
        ApiHandler.live_broker = server_main.LiveTraceBroker()
        ApiHandler.extension_registry = server_main.ExtensionRegistry()
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

    def test_replay_step_id_with_path_separators_returns_400(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        body = json.dumps({"step_id": "../s1", "strategy": "recorded", "modifications": {}})
        conn.request("POST", "/api/traces/trace-1/replay", body=body, headers={"Content-Type": "application/json"})
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 400)
        self.assertIn("step_id", payload.get("error", ""))
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

    def test_compare_trace_ids_with_dot_path_segments_returns_400(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        body = json.dumps({"left_trace_id": "..", "right_trace_id": "trace-1"})
        conn.request("POST", "/api/compare", body=body, headers={"Content-Type": "application/json"})
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 400)
        self.assertIn("left_trace_id", payload.get("error", ""))
        conn.close()

    def test_step_details_trace_id_with_dot_path_segment_returns_400(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        conn.request("GET", "/api/traces/../steps/s1")
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 400)
        self.assertIn("trace_id", payload.get("error", ""))
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

    def test_invalid_content_length_returns_400(self) -> None:
        raw_request = (
            "POST /api/compare HTTP/1.1\r\n"
            f"Host: 127.0.0.1:{self.port}\r\n"
            "Content-Type: application/json\r\n"
            "Content-Length: nope\r\n"
            "\r\n"
            "{}"
        ).encode("utf-8")

        with socket.create_connection(("127.0.0.1", self.port), timeout=2) as sock:
            sock.sendall(raw_request)
            sock.settimeout(0.2)
            chunks: list[bytes] = []
            while True:
                try:
                    chunk = sock.recv(4096)
                except TimeoutError:
                    break
                if not chunk:
                    break
                chunks.append(chunk)
            response = b"".join(chunks).decode("utf-8", errors="ignore")

        self.assertIn("400", response.splitlines()[0])
        self.assertIn("Invalid Content-Length", response)

    def test_merge_replays_returns_merged_trace(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        left_body = json.dumps({"step_id": "s1", "strategy": "recorded", "modifications": {"note": "left"}})
        conn.request(
            "POST",
            "/api/traces/trace-1/replay",
            body=left_body,
            headers={"Content-Type": "application/json"},
        )
        left_resp = conn.getresponse()
        left_payload = json.loads(left_resp.read().decode("utf-8"))
        self.assertEqual(left_resp.status, 200)
        left_trace_id = left_payload["trace"]["id"]
        conn.close()

        conn = HTTPConnection("127.0.0.1", self.port)
        right_body = json.dumps({"step_id": "s1", "strategy": "recorded", "modifications": {"note": "right"}})
        conn.request(
            "POST",
            "/api/traces/trace-1/replay",
            body=right_body,
            headers={"Content-Type": "application/json"},
        )
        right_resp = conn.getresponse()
        right_payload = json.loads(right_resp.read().decode("utf-8"))
        self.assertEqual(right_resp.status, 200)
        right_trace_id = right_payload["trace"]["id"]
        conn.close()

        conn = HTTPConnection("127.0.0.1", self.port)
        merge_body = json.dumps(
            {
                "base_trace_id": "trace-1",
                "left_trace_id": left_trace_id,
                "right_trace_id": right_trace_id,
                "strategy": "prefer_right",
            }
        )
        conn.request(
            "POST",
            "/api/replays/merge",
            body=merge_body,
            headers={"Content-Type": "application/json"},
        )
        merge_resp = conn.getresponse()
        merge_payload = json.loads(merge_resp.read().decode("utf-8"))
        self.assertEqual(merge_resp.status, 200)
        self.assertIn("trace", merge_payload)
        self.assertEqual(merge_payload["trace"]["replay"]["strategy"], "merge")
        self.assertEqual(
            sorted(merge_payload["trace"]["replay"]["mergedFromTraceIds"]),
            sorted([left_trace_id, right_trace_id]),
        )
        conn.close()

    def test_stream_latest_trace_emits_sse_event(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port, timeout=2)
        conn.request("GET", "/api/stream/traces/latest")
        resp = conn.getresponse()
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.getheader("Content-Type"), "text/event-stream")

        event_line = resp.fp.readline().decode("utf-8").strip()
        data_line = resp.fp.readline().decode("utf-8").strip()
        _ = resp.fp.readline().decode("utf-8").strip()

        self.assertEqual(event_line, "event: trace")
        self.assertTrue(data_line.startswith("data: "))
        payload = json.loads(data_line[len("data: ") :])
        self.assertIn("trace", payload)
        self.assertEqual(payload["trace"]["id"], "trace-1")
        conn.close()

    def test_trace_query_returns_matched_step_ids(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        body = json.dumps({"query": "type=llm_call and duration_ms>=1000"})
        conn.request(
            "POST",
            "/api/traces/trace-1/query",
            body=body,
            headers={"Content-Type": "application/json"},
        )
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 200)
        self.assertEqual(payload["matchedStepIds"], ["s1"])
        conn.close()

    def test_trace_query_invalid_clause_returns_400(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        body = json.dumps({"query": "duration_ms>>200"})
        conn.request(
            "POST",
            "/api/traces/trace-1/query",
            body=body,
            headers={"Content-Type": "application/json"},
        )
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 400)
        self.assertIn("error", payload)
        conn.close()

    def test_investigate_trace_returns_hypotheses(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        conn.request("GET", "/api/traces/trace-1/investigate")
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 200)
        self.assertIn("investigation", payload)
        self.assertIn("hypotheses", payload["investigation"])
        self.assertGreaterEqual(len(payload["investigation"]["hypotheses"]), 1)
        conn.close()

    def test_create_and_list_comments(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        create_body = json.dumps(
            {"step_id": "s1", "author": "jason", "body": "Pin this for follow-up", "pinned": True}
        )
        conn.request(
            "POST",
            "/api/traces/trace-1/comments",
            body=create_body,
            headers={"Content-Type": "application/json"},
        )
        create_resp = conn.getresponse()
        create_payload = json.loads(create_resp.read().decode("utf-8"))
        self.assertEqual(create_resp.status, 201)
        self.assertEqual(create_payload["comment"]["stepId"], "s1")
        conn.close()

        conn = HTTPConnection("127.0.0.1", self.port)
        conn.request("GET", "/api/traces/trace-1/comments?step_id=s1")
        list_resp = conn.getresponse()
        list_payload = json.loads(list_resp.read().decode("utf-8"))
        self.assertEqual(list_resp.status, 200)
        self.assertEqual(len(list_payload["comments"]), 1)
        self.assertEqual(list_payload["comments"][0]["author"], "jason")
        self.assertTrue(list_payload["comments"][0]["pinned"])
        conn.close()

    def test_step_details_raw_requires_admin_role(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        conn.request("GET", "/api/traces/trace-1/steps/s1?redaction_mode=raw")
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 400)
        self.assertIn("admin role", payload.get("error", ""))
        conn.close()

    def test_step_details_raw_allowed_for_admin_role(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        conn.request("GET", "/api/traces/trace-1/steps/s1?redaction_mode=raw&role=admin")
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 200)
        self.assertIn("step", payload)
        conn.close()

    def test_step_details_reveal_blocked_for_viewer(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        conn.request(
            "GET",
            "/api/traces/trace-1/steps/s1?redaction_mode=redacted&role=viewer&reveal_path=data.secret",
        )
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 200)
        self.assertIn("audit", payload)
        self.assertIn("data.secret", payload["audit"]["deniedPaths"])
        conn.close()

    def test_list_extensions_returns_registry_items(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        conn.request("GET", "/api/extensions")
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 200)
        self.assertIn("extensions", payload)
        self.assertTrue(any(item["id"] == "latency_hotspots" for item in payload["extensions"]))
        conn.close()

    def test_run_extension_returns_result(self) -> None:
        conn = HTTPConnection("127.0.0.1", self.port)
        body = json.dumps({"trace_id": "trace-1"})
        conn.request(
            "POST",
            "/api/extensions/latency_hotspots/run",
            body=body,
            headers={"Content-Type": "application/json"},
        )
        resp = conn.getresponse()
        payload = json.loads(resp.read().decode("utf-8"))
        self.assertEqual(resp.status, 200)
        self.assertEqual(payload["extensionId"], "latency_hotspots")
        self.assertEqual(payload["traceId"], "trace-1")
        self.assertIn("result", payload)
        conn.close()


if __name__ == "__main__":
    unittest.main()
