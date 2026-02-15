from __future__ import annotations

import json
import math
import time
from collections import defaultdict, deque
from queue import Empty
from threading import Lock
from json import JSONDecodeError
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict
from urllib.parse import parse_qs, urlparse

from .config import DEFAULT_HOST, DEFAULT_PORT, data_dir, demo_dir, safe_export_enabled
from .extensions.loader import ExtensionRegistry
from .mcp.tools.compare_traces import execute as compare_execute
from .mcp.tools.get_step_details import execute as step_execute
from .mcp.tools.list_traces import execute as list_execute
from .mcp.tools.replay_from_step import execute as replay_execute
from .mcp.tools.show_trace import execute as show_execute
from .mcp.schema import validate_input
from .replay.merge import merge_replays
from .trace.investigator import investigate_trace
from .trace.live import LiveTraceBroker
from .trace.query import run_trace_query
from .trace.store import TraceStore

MAX_REQUEST_BYTES = 1_000_000
INTERNAL_ERROR_MESSAGE = "Internal server error"


class PayloadTooLargeError(Exception):
    pass


class InvalidContentTypeError(ValueError):
    pass


class ApiHandler(BaseHTTPRequestHandler):
    store: TraceStore
    live_broker: LiveTraceBroker
    extension_registry: ExtensionRegistry
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
        if parsed.path == "/api/stream/traces/latest":
            self._stream_latest_trace()
            return
        path_parts = [p for p in parsed.path.split("/") if p]
        query = parse_qs(parsed.query)

        try:
            if parsed.path == "/api/health":
                self._send_json(200, {"status": "ok"})
                return
            if parsed.path == "/api/extensions":
                self._send_json(200, {"extensions": self.extension_registry.list_extensions()})
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
                if len(path_parts) == 4 and path_parts[3] == "investigate":
                    trace_id = path_parts[2]
                    validate_input("show_trace", {"trace_id": trace_id})
                    trace = self.store.get_summary(trace_id)
                    self._send_json(200, {"investigation": investigate_trace(trace)})
                    return
                if len(path_parts) == 4 and path_parts[3] == "comments":
                    trace_id = path_parts[2]
                    validate_input("show_trace", {"trace_id": trace_id})
                    step_filter = query.get("step_id", [None])[0]
                    if step_filter:
                        validate_input(
                            "get_step_details",
                            {
                                "trace_id": trace_id,
                                "step_id": step_filter,
                                "redaction_mode": "redacted",
                                "reveal_paths": [],
                                "safe_export": False,
                            },
                        )
                    comments = self.store.list_comments(trace_id, step_filter)
                    self._send_json(200, {"comments": comments})
                    return
                if len(path_parts) == 5 and path_parts[3] == "steps":
                    trace_id = path_parts[2]
                    step_id = path_parts[4]
                    redaction_mode = query.get("redaction_mode", ["redacted"])[0]
                    safe_export = query.get("safe_export", ["0"])[0] == "1" or safe_export_enabled()
                    role = query.get("role", ["viewer"])[0]
                    reveal_paths = query.get("reveal_path", [])
                    if safe_export:
                        redaction_mode = "redacted"
                        reveal_paths = []
                    payload = step_execute(
                        self.store,
                        trace_id,
                        step_id,
                        redaction_mode,
                        reveal_paths,
                        role,
                        safe_export,
                    )
                    audit = payload["structuredContent"].get("audit")
                    if isinstance(audit, dict):
                        self.store.log_redaction_event(
                            trace_id=trace_id,
                            step_id=step_id,
                            role=str(audit.get("role", role)),
                            action=str(audit.get("action", "view_step")),
                            status=str(audit.get("status", "allowed")),
                            requested_paths=[str(path) for path in audit.get("requestedPaths", [])],
                            revealed_paths=[str(path) for path in audit.get("revealedPaths", [])],
                            denied_paths=[str(path) for path in audit.get("deniedPaths", [])],
                            safe_export=bool(audit.get("safeExport", safe_export)),
                        )
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
                    replay_trace = payload["structuredContent"].get("trace")
                    if replay_trace:
                        self.live_broker.publish_trace(self.store.get_summary(replay_trace["id"]))
                    self._send_json(200, payload["structuredContent"])
                    return
                if path_parts[3] == "query":
                    validate_input("show_trace", {"trace_id": trace_id})
                    query = body.get("query", "")
                    trace = self.store.get_summary(trace_id)
                    result = run_trace_query(trace, query)
                    self._send_json(200, result)
                    return
                if path_parts[3] == "comments":
                    step_id = body.get("step_id", "")
                    author = body.get("author", "anonymous")
                    text = body.get("body", "")
                    pinned = body.get("pinned", False)
                    validate_input(
                        "get_step_details",
                        {
                            "trace_id": trace_id,
                            "step_id": step_id,
                            "redaction_mode": "redacted",
                            "reveal_paths": [],
                            "safe_export": False,
                        },
                    )
                    if not isinstance(author, str):
                        raise ValueError("author must be str")
                    if not isinstance(text, str):
                        raise ValueError("body must be str")
                    if not isinstance(pinned, bool):
                        raise ValueError("pinned must be bool")
                    comment = self.store.add_comment(trace_id, step_id, author, text, pinned)
                    self._send_json(201, {"comment": comment})
                    return
            if path_parts == ["api", "replays", "merge"]:
                base_trace_id = body.get("base_trace_id", "")
                left_trace_id = body.get("left_trace_id", "")
                right_trace_id = body.get("right_trace_id", "")
                strategy = body.get("strategy", "prefer_right")
                validate_input(
                    "compare_traces",
                    {"left_trace_id": base_trace_id, "right_trace_id": left_trace_id},
                )
                validate_input(
                    "compare_traces",
                    {"left_trace_id": base_trace_id, "right_trace_id": right_trace_id},
                )
                if strategy not in {"prefer_left", "prefer_right"}:
                    raise ValueError("strategy must be prefer_left or prefer_right")
                base_trace = self.store.get_summary(base_trace_id)
                left_trace = self.store.get_summary(left_trace_id)
                right_trace = self.store.get_summary(right_trace_id)
                merged = merge_replays(base_trace, left_trace, right_trace, strategy)
                self.store.ingest_trace(merged)
                self.live_broker.publish_trace(merged)
                self._send_json(200, {"trace": merged.to_dict()})
                return
            if path_parts[:2] == ["api", "extensions"] and len(path_parts) == 4 and path_parts[3] == "run":
                extension_id = path_parts[2]
                validate_input("show_trace", {"trace_id": extension_id})
                trace_id = body.get("trace_id", "")
                validate_input("show_trace", {"trace_id": trace_id})
                trace = self.store.get_summary(trace_id)
                result = self.extension_registry.run_extension(extension_id, trace)
                self._send_json(200, {"extensionId": extension_id, "traceId": trace_id, "result": result})
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

    def _stream_latest_trace(self) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "keep-alive")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        token, queue = self.live_broker.subscribe()
        try:
            try:
                latest = self.store.get_summary()
                self._write_sse("trace", {"trace": latest.to_dict()})
            except FileNotFoundError:
                self._write_sse("heartbeat", {"status": "empty"})
            while True:
                try:
                    event = queue.get(timeout=10.0)
                    self._write_sse(event.get("type", "trace"), event)
                except Empty:
                    self._write_sse("heartbeat", {"ts": int(time.time())})
        except (BrokenPipeError, ConnectionResetError):
            return
        finally:
            self.live_broker.unsubscribe(token)

    def _write_sse(self, event_name: str, payload: Dict[str, Any]) -> None:
        body = f"event: {event_name}\ndata: {json.dumps(payload)}\n\n".encode("utf-8")
        self.wfile.write(body)
        self.wfile.flush()

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
    ApiHandler.live_broker = LiveTraceBroker()
    ApiHandler.extension_registry = ExtensionRegistry()
    server = ThreadingHTTPServer((DEFAULT_HOST, DEFAULT_PORT), ApiHandler)
    print(f"Agent Director server running on http://{DEFAULT_HOST}:{DEFAULT_PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
