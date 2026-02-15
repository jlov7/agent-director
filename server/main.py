from __future__ import annotations

import json
import math
import time
from collections import defaultdict, deque
from threading import Lock
from json import JSONDecodeError
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

MAX_REQUEST_BYTES = 1_000_000
INTERNAL_ERROR_MESSAGE = "Internal server error"


class PayloadTooLargeError(Exception):
    pass


class InvalidContentTypeError(ValueError):
    pass


class ApiHandler(BaseHTTPRequestHandler):
    store: TraceStore
    rate_limit_window_s = 60
    rate_limit_max_requests = 240
    _rate_limit_hits: Dict[str, deque[float]] = defaultdict(deque)
    _rate_limit_lock = Lock()

    def log_message(self, format: str, *args: Any) -> None:
        return

    @classmethod
    def clear_rate_limit_state(cls) -> None:
        with cls._rate_limit_lock:
            cls._rate_limit_hits.clear()

    def _check_rate_limit(self) -> tuple[bool, int]:
        ip = self.client_address[0] if self.client_address else "unknown"
        now = time.time()
        with self._rate_limit_lock:
            hits = self._rate_limit_hits[ip]
            cutoff = now - self.rate_limit_window_s
            while hits and hits[0] < cutoff:
                hits.popleft()
            if len(hits) >= self.rate_limit_max_requests:
                retry_after = max(1, math.ceil(self.rate_limit_window_s - (now - hits[0])))
                return False, retry_after
            hits.append(now)
        return True, 0

    def do_OPTIONS(self) -> None:
        self._send_json(204, {})

    def do_GET(self) -> None:
        allowed, retry_after = self._check_rate_limit()
        if not allowed:
            self._send_json(429, {"error": "Too many requests"}, {"Retry-After": str(retry_after)})
            return
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
        except ValueError as exc:
            self._send_json(400, {"error": str(exc)})
        except Exception:  # pragma: no cover - generic handler
            self._send_json(500, {"error": INTERNAL_ERROR_MESSAGE})

    def do_POST(self) -> None:
        allowed, retry_after = self._check_rate_limit()
        if not allowed:
            self._send_json(429, {"error": "Too many requests"}, {"Retry-After": str(retry_after)})
            return
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
        except PayloadTooLargeError:
            self._send_json(413, {"error": "Payload too large"})
        except InvalidContentTypeError as exc:
            self._send_json(415, {"error": str(exc)})
        except FileNotFoundError as exc:
            self._send_json(404, {"error": str(exc)})
        except ValueError as exc:
            self._send_json(400, {"error": str(exc)})
        except Exception:  # pragma: no cover
            self._send_json(500, {"error": INTERNAL_ERROR_MESSAGE})

    def _read_json(self) -> Dict[str, Any]:
        raw_length = self.headers.get("Content-Length", "0")
        try:
            length = int(raw_length)
        except ValueError as exc:
            raise ValueError("Invalid Content-Length") from exc
        if length < 0:
            raise ValueError("Invalid Content-Length")
        if length > MAX_REQUEST_BYTES:
            self._discard_request_body(length)
            raise PayloadTooLargeError
        content_type = self.headers.get("Content-Type", "")
        media_type = content_type.split(";", 1)[0].strip().lower()
        if length > 0 and media_type != "application/json":
            raise InvalidContentTypeError("Content-Type must be application/json")
        if length == 0:
            return {}
        body = self.rfile.read(length)
        try:
            return json.loads(body.decode("utf-8"))
        except JSONDecodeError as exc:
            raise ValueError("Malformed JSON payload") from exc

    def _discard_request_body(self, length: int) -> None:
        remaining = length
        chunk_size = 64 * 1024
        while remaining > 0:
            chunk = self.rfile.read(min(chunk_size, remaining))
            if not chunk:
                break
            remaining -= len(chunk)

    def _send_json(self, status: int, payload: Dict[str, Any], extra_headers: Dict[str, str] | None = None) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        if extra_headers:
            for header, value in extra_headers.items():
                self.send_header(header, value)
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
