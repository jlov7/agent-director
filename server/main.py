from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict
from urllib.parse import parse_qs, urlparse

from .config import DEFAULT_HOST, DEFAULT_PORT, data_dir, demo_dir, safe_export_enabled
from .mcp.tools.compare_traces import execute as compare_execute
from .mcp.tools.get_step_details import execute as step_execute
from .mcp.tools.list_traces import execute as list_execute
from .mcp.tools.replay_from_step import execute as replay_execute
from .mcp.tools.show_trace import execute as show_execute
from .trace.store import TraceStore


class ApiHandler(BaseHTTPRequestHandler):
    store: TraceStore

    def log_message(self, format: str, *args: Any) -> None:
        return

    def do_OPTIONS(self) -> None:
        self._send_json(204, {})

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path_parts = [p for p in parsed.path.split("/") if p]
        query = parse_qs(parsed.query)

        try:
            if parsed.path == "/api/health":
                self._send_json(200, {"status": "ok"})
                return
            if path_parts[:2] == ["api", "traces"]:
                if len(path_parts) == 2:
                    payload = list_execute(self.store)
                    if query.get("latest") == ["1"]:
                        traces = payload["structuredContent"]["traces"]
                        latest = traces[-1] if traces else None
                        self._send_json(200, {"trace": latest})
                    else:
                        self._send_json(200, payload["structuredContent"])
                    return
                if len(path_parts) == 3:
                    trace_id = path_parts[2]
                    payload = show_execute(self.store, trace_id)
                    self._send_json(200, payload["structuredContent"])
                    return
                if len(path_parts) == 5 and path_parts[3] == "steps":
                    trace_id = path_parts[2]
                    step_id = path_parts[4]
                    redaction_mode = query.get("redaction_mode", ["redacted"])[0]
                    safe_export = query.get("safe_export", ["0"])[0] == "1" or safe_export_enabled()
                    reveal_paths = query.get("reveal_path", [])
                    if safe_export:
                        redaction_mode = "redacted"
                        reveal_paths = []
                    payload = step_execute(self.store, trace_id, step_id, redaction_mode, reveal_paths)
                    self._send_json(200, payload["structuredContent"])
                    return
            self._send_json(404, {"error": "Not found"})
        except FileNotFoundError as exc:
            self._send_json(404, {"error": str(exc)})
        except Exception as exc:  # pragma: no cover - generic handler
            self._send_json(500, {"error": str(exc)})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path_parts = [p for p in parsed.path.split("/") if p]
        try:
            body = self._read_json()
            if path_parts[:2] == ["api", "traces"] and len(path_parts) == 4:
                trace_id = path_parts[2]
                if path_parts[3] == "replay":
                    payload = replay_execute(
                        self.store,
                        trace_id,
                        body.get("step_id", ""),
                        body.get("strategy", "hybrid"),
                        body.get("modifications", {}),
                    )
                    self._send_json(200, payload["structuredContent"])
                    return
            if path_parts == ["api", "compare"]:
                payload = compare_execute(
                    self.store, body.get("left_trace_id", ""), body.get("right_trace_id", "")
                )
                self._send_json(200, payload["structuredContent"])
                return
            self._send_json(404, {"error": "Not found"})
        except FileNotFoundError as exc:
            self._send_json(404, {"error": str(exc)})
        except Exception as exc:  # pragma: no cover
            self._send_json(500, {"error": str(exc)})

    def _read_json(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        body = self.rfile.read(length)
        return json.loads(body.decode("utf-8"))

    def _send_json(self, status: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if status != 204:
            self.wfile.write(body)


def main() -> None:
    store = TraceStore(data_dir(), demo_dir())
    ApiHandler.store = store
    server = ThreadingHTTPServer((DEFAULT_HOST, DEFAULT_PORT), ApiHandler)
    print(f"Agent Director server running on http://{DEFAULT_HOST}:{DEFAULT_PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
