from __future__ import annotations

import json
import math
import time
import hashlib
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from queue import Empty
from threading import Lock
from json import JSONDecodeError
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict
from urllib.parse import parse_qs, urlparse

from .config import (
    DEFAULT_HOST,
    DEFAULT_PORT,
    api_auth_required,
    api_keys,
    data_dir,
    default_tenant_id,
    demo_dir,
    safe_export_enabled,
)
from .extensions.loader import ExtensionRegistry
from .gameplay import ConflictError, GameplayStore
from .mcp.tools.compare_traces import execute as compare_execute
from .mcp.tools.get_step_details import execute as step_execute
from .mcp.tools.replay_from_step import execute as replay_execute
from .mcp.tools.show_trace import execute as show_execute
from .mcp.schema import validate_input
from .replay.jobs import ReplayJobStore
from .replay.merge import merge_replays
from .trace.investigator import investigate_trace
from .trace.live import LiveTraceBroker
from .trace.query import run_trace_query
from .trace.store import TraceStore
from .ops import OpsStore
from .openapi import build_openapi_spec

MAX_REQUEST_BYTES = 1_000_000
INTERNAL_ERROR_MESSAGE = "Internal server error"


class PayloadTooLargeError(Exception):
    pass


class InvalidContentTypeError(ValueError):
    pass


class ApiHandler(BaseHTTPRequestHandler):
    store: TraceStore
    replay_jobs: ReplayJobStore
    live_broker: LiveTraceBroker
    extension_registry: ExtensionRegistry
    gameplay_store: GameplayStore
    ops_store: OpsStore
    require_auth = False
    allowed_api_keys: set[str] = set()
    default_tenant = "public"
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

    def _normalize_tenant(self, tenant_id: str | None) -> str:
        normalized = str(tenant_id or "").strip().lower()
        return normalized or self.default_tenant

    def _resolve_request_context(self, path: str) -> Dict[str, str]:
        query = parse_qs(urlparse(self.path).query)
        tenant_id = self._normalize_tenant(self.headers.get("X-Tenant-Id") or query.get("tenant_id", [None])[0])
        actor_id = str(self.headers.get("X-Actor-Id", "anonymous") or "anonymous").strip() or "anonymous"
        api_key = str(self.headers.get("X-API-Key") or query.get("api_key", [""])[0] or "").strip()
        exempt_paths = {"/api/health", "/api/openapi.json"}
        if self.require_auth and path.startswith("/api") and path not in exempt_paths:
            if not api_key or api_key not in self.allowed_api_keys:
                raise PermissionError("Unauthorized")
        return {"tenant_id": tenant_id, "actor_id": actor_id}

    def _assert_trace_access(self, trace_id: str, tenant_id: str) -> None:
        if not self.require_auth:
            return
        if not self.ops_store.can_access_trace(trace_id, tenant_id):
            raise FileNotFoundError(f"Trace not found: {trace_id}")

    def _idempotency_precheck(
        self,
        tenant_id: str,
        path: str,
        body: Dict[str, Any],
    ) -> tuple[str | None, str | None, bool]:
        key = str(self.headers.get("Idempotency-Key", "") or "").strip()
        if not key:
            return None, None, False
        request_hash = hashlib.sha256(
            json.dumps(body, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        lookup = self.ops_store.lookup_idempotency(tenant_id, key, "POST", path, request_hash)
        if lookup["status"] == "hit":
            self._send_json(
                int(lookup["code"]),
                lookup["payload"],
                {"X-Idempotency-Replayed": "1"},
            )
            return key, request_hash, True
        if lookup["status"] == "conflict":
            self._send_json(409, {"error": "Idempotency key reused with different payload"})
            return key, request_hash, True
        return key, request_hash, False

    def _idempotency_commit(
        self,
        tenant_id: str,
        key: str | None,
        request_hash: str | None,
        path: str,
        status_code: int,
        payload: Dict[str, Any],
    ) -> None:
        if not key or not request_hash:
            return
        self.ops_store.save_idempotency(
            tenant_id=tenant_id,
            key=key,
            method="POST",
            path=path,
            request_hash=request_hash,
            status_code=status_code,
            payload=payload,
        )

    def _parse_iso(self, value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            normalized = value.replace("Z", "+00:00")
            return datetime.fromisoformat(normalized)
        except ValueError:
            return None

    def do_OPTIONS(self) -> None:
        self._send_json(204, {})

    def do_GET(self) -> None:
        allowed, retry_after = self._check_rate_limit()
        if not allowed:
            self._send_json(429, {"error": "Too many requests"}, {"Retry-After": str(retry_after)})
            return
        parsed = urlparse(self.path)
        try:
            context = self._resolve_request_context(parsed.path)
        except PermissionError as exc:
            self._send_json(401, {"error": str(exc)})
            return
        tenant_id = context["tenant_id"]
        if parsed.path == "/api/stream/traces/latest":
            self._stream_latest_trace(tenant_id)
            return
        if parsed.path.startswith("/api/stream/gameplay/"):
            path_parts = [p for p in parsed.path.split("/") if p]
            if len(path_parts) == 4:
                self._stream_gameplay_session(path_parts[3])
                return
        path_parts = [p for p in parsed.path.split("/") if p]
        query = parse_qs(parsed.query)

        try:
            if parsed.path == "/api/health":
                self._send_json(200, {"status": "ok"})
                return
            if parsed.path == "/api/openapi.json":
                self._send_json(200, build_openapi_spec())
                return
            if path_parts == ["api", "replay-dead-letters"]:
                job_filter = query.get("job_id", [None])[0]
                limit = int(query.get("limit", ["50"])[0])
                dead_letters = self.replay_jobs.list_dead_letters(tenant_id, job_filter, limit)
                self._send_json(200, {"deadLetters": dead_letters})
                return
            if path_parts == ["api", "admin", "governance", "retention"]:
                self._send_json(200, {"retentionDays": self.ops_store.get_retention_days()})
                return
            if path_parts == ["api", "admin", "audit-events"]:
                limit = int(query.get("limit", ["50"])[0])
                self._send_json(200, {"events": self.ops_store.list_audit_events(tenant_id, limit)})
                return
            if path_parts[:2] == ["api", "gameplay"]:
                if path_parts == ["api", "gameplay", "sessions"]:
                    self._send_json(200, {"sessions": self.gameplay_store.list_sessions()})
                    return
                if len(path_parts) == 4 and path_parts[2] == "sessions":
                    session = self.gameplay_store.get_session(path_parts[3])
                    if not session:
                        self._send_json(404, {"error": f"Gameplay session not found: {path_parts[3]}"})
                        return
                    self._send_json(200, {"session": session})
                    return
                if len(path_parts) == 4 and path_parts[2] == "profiles":
                    profile = self.gameplay_store.get_profile(path_parts[3])
                    self._send_json(200, {"profile": profile})
                    return
                if len(path_parts) == 4 and path_parts[2] == "friends":
                    social = self.gameplay_store.get_friend_graph(path_parts[3])
                    self._send_json(200, {"social": social})
                    return
                if len(path_parts) == 4 and path_parts[2] == "guilds":
                    guild = self.gameplay_store.get_guild(path_parts[3])
                    if not guild:
                        self._send_json(404, {"error": f"Guild not found: {path_parts[3]}"})
                        return
                    self._send_json(200, {"guild": guild})
                    return
                if path_parts == ["api", "gameplay", "liveops", "current"]:
                    self._send_json(200, {"liveops": self.gameplay_store.current_liveops()})
                    return
                if path_parts == ["api", "gameplay", "observability", "summary"]:
                    self._send_json(200, {"observability": self.gameplay_store.observability_snapshot()})
                    return
                if path_parts == ["api", "gameplay", "analytics", "funnels"]:
                    self._send_json(200, {"analytics": self.gameplay_store.analytics_funnel_snapshot()})
                    return
            if parsed.path == "/api/extensions":
                self._send_json(200, {"extensions": self.extension_registry.list_extensions()})
                return
            if path_parts[:2] == ["api", "replay-jobs"]:
                if len(path_parts) == 3:
                    job = self.replay_jobs.get_for_tenant(path_parts[2], tenant_id)
                    if not job:
                        self._send_json(404, {"error": f"Replay job not found: {path_parts[2]}"})
                        return
                    self._send_json(200, {"job": job.to_dict()})
                    return
                if len(path_parts) == 4 and path_parts[3] == "matrix":
                    job = self.replay_jobs.get_for_tenant(path_parts[2], tenant_id)
                    if not job:
                        self._send_json(404, {"error": f"Replay job not found: {path_parts[2]}"})
                        return
                    matrix = self.replay_jobs.get_matrix(job.id, self.store)
                    if matrix is None:
                        self._send_json(404, {"error": f"Replay job not found: {job.id}"})
                        return
                    self._send_json(200, {"matrix": matrix})
                    return
                if len(path_parts) == 4 and path_parts[3] == "dead-letters":
                    job = self.replay_jobs.get_for_tenant(path_parts[2], tenant_id)
                    if not job:
                        self._send_json(404, {"error": f"Replay job not found: {path_parts[2]}"})
                        return
                    self._send_json(200, {"deadLetters": self.replay_jobs.list_dead_letters(tenant_id, job.id)})
                    return
            if path_parts[:2] == ["api", "traces"]:
                if len(path_parts) == 2:
                    traces = self.store.list_traces()
                    if self.require_auth:
                        allowed_ids = self.ops_store.list_trace_ids_for_tenant(tenant_id)
                        traces = [trace for trace in traces if trace.id in allowed_ids]
                    payload = {"traces": [trace.to_dict() for trace in traces]}
                    if query.get("latest") == ["1"]:
                        latest = payload["traces"][-1] if payload["traces"] else None
                        self._send_json(200, {"trace": latest})
                    else:
                        self._send_json(200, payload)
                    return
                if len(path_parts) == 3:
                    trace_id = path_parts[2]
                    self._assert_trace_access(trace_id, tenant_id)
                    payload = show_execute(self.store, trace_id)
                    self._send_json(200, payload["structuredContent"])
                    return
                if len(path_parts) == 4 and path_parts[3] == "investigate":
                    trace_id = path_parts[2]
                    self._assert_trace_access(trace_id, tenant_id)
                    validate_input("show_trace", {"trace_id": trace_id})
                    trace = self.store.get_summary(trace_id)
                    self._send_json(200, {"investigation": investigate_trace(trace)})
                    return
                if len(path_parts) == 4 and path_parts[3] == "comments":
                    trace_id = path_parts[2]
                    self._assert_trace_access(trace_id, tenant_id)
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
                    self._assert_trace_access(trace_id, tenant_id)
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
        except PermissionError as exc:
            self._send_json(401, {"error": str(exc)})
        except ConflictError as exc:
            self._send_json(409, {"error": str(exc)})
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
            context = self._resolve_request_context(parsed.path)
            tenant_id = context["tenant_id"]
            actor_id = context["actor_id"]
            body = self._read_json()
            idempotency_key: str | None = None
            request_hash: str | None = None
            if path_parts in (["api", "replay-jobs"], ["api", "compare"], ["api", "replays", "merge"]):
                idempotency_key, request_hash, handled = self._idempotency_precheck(tenant_id, parsed.path, body)
                if handled:
                    return
            if path_parts == ["api", "telemetry", "events"]:
                events = body.get("events")
                if not isinstance(events, list):
                    raise ValueError("events must be a list")
                accepted = self.ops_store.ingest_telemetry_events(tenant_id, actor_id, events)
                self.ops_store.log_audit_event(
                    tenant_id=tenant_id,
                    actor=actor_id,
                    event_type="telemetry.ingest",
                    details={"accepted": accepted},
                )
                self._send_json(202, {"accepted": accepted})
                return
            if path_parts == ["api", "admin", "governance", "retention"]:
                days = int(body.get("days") or 0)
                if days <= 0:
                    raise ValueError("days must be a positive integer")
                saved_days = self.ops_store.set_retention_days(days)
                self.ops_store.log_audit_event(
                    tenant_id=tenant_id,
                    actor=actor_id,
                    event_type="governance.retention.updated",
                    details={"retentionDays": saved_days},
                )
                self._send_json(200, {"retentionDays": saved_days})
                return
            if path_parts == ["api", "admin", "governance", "retention", "apply"]:
                retention_days = self.ops_store.get_retention_days()
                cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
                traces = self.store.list_traces()
                if self.require_auth:
                    allowed_ids = self.ops_store.list_trace_ids_for_tenant(tenant_id)
                    traces = [trace for trace in traces if trace.id in allowed_ids]
                deleted_trace_ids: list[str] = []
                for trace in traces:
                    started_at = self._parse_iso(trace.startedAt)
                    if started_at is None or started_at >= cutoff:
                        continue
                    self.store.delete_trace(trace.id)
                    self.ops_store.remove_trace(trace.id)
                    deleted_trace_ids.append(trace.id)
                details = {"retentionDays": retention_days, "deletedTraceIds": deleted_trace_ids}
                self.ops_store.log_audit_event(
                    tenant_id=tenant_id,
                    actor=actor_id,
                    event_type="governance.retention.applied",
                    details=details,
                )
                self._send_json(200, details)
                return
            if len(path_parts) == 5 and path_parts[:3] == ["api", "admin", "traces"] and path_parts[4] == "delete":
                trace_id = path_parts[3]
                self._assert_trace_access(trace_id, tenant_id)
                self.store.delete_trace(trace_id)
                self.ops_store.remove_trace(trace_id)
                self.ops_store.log_audit_event(
                    tenant_id=tenant_id,
                    actor=actor_id,
                    event_type="trace.deleted",
                    details={"traceId": trace_id},
                )
                self._send_json(200, {"deleted": True, "traceId": trace_id})
                return
            if path_parts[:2] == ["api", "gameplay"]:
                if path_parts == ["api", "gameplay", "matchmaking"]:
                    preferred_roles = body.get("preferred_roles")
                    if preferred_roles is not None and not isinstance(preferred_roles, list):
                        raise ValueError("preferred_roles must be a list when provided")
                    session, match = self.gameplay_store.matchmake_session(
                        trace_id=str(body.get("trace_id") or ""),
                        player_id=str(body.get("player_id") or ""),
                        preferred_roles=[
                            str(role or "")
                            for role in preferred_roles
                        ] if isinstance(preferred_roles, list) else None,
                    )
                    self._send_json(200, {"session": session, "match": match})
                    return
                if path_parts == ["api", "gameplay", "sessions"]:
                    session = self.gameplay_store.create_session(
                        trace_id=str(body.get("trace_id") or ""),
                        host_player_id=str(body.get("host_player_id") or ""),
                        name=body.get("name"),
                    )
                    self._send_json(201, {"session": session})
                    return
                if len(path_parts) == 5 and path_parts[2] == "sessions" and path_parts[4] == "join":
                    session = self.gameplay_store.join_session(
                        session_id=path_parts[3],
                        player_id=str(body.get("player_id") or ""),
                        role=str(body.get("role") or ""),
                    )
                    self._send_json(200, {"session": session})
                    return
                if len(path_parts) == 5 and path_parts[2] == "sessions" and path_parts[4] == "leave":
                    session = self.gameplay_store.leave_session(
                        session_id=path_parts[3], player_id=str(body.get("player_id") or "")
                    )
                    self._send_json(200, {"session": session})
                    return
                if len(path_parts) == 5 and path_parts[2] == "sessions" and path_parts[4] == "reconnect":
                    session = self.gameplay_store.reconnect_session(
                        session_id=path_parts[3], player_id=str(body.get("player_id") or "")
                    )
                    self._send_json(200, {"session": session})
                    return
                if len(path_parts) == 5 and path_parts[2] == "sessions" and path_parts[4] == "action":
                    expected_version = body.get("expected_version")
                    if expected_version is not None and not isinstance(expected_version, int):
                        raise ValueError("expected_version must be int")
                    session = self.gameplay_store.apply_action(
                        session_id=path_parts[3],
                        player_id=str(body.get("player_id") or ""),
                        action_type=str(body.get("type") or ""),
                        payload=body.get("payload") if isinstance(body.get("payload"), dict) else {},
                        expected_version=expected_version,
                    )
                    self._send_json(200, {"session": session})
                    return
                if len(path_parts) == 6 and path_parts[2] == "profiles" and path_parts[4] == "skills" and path_parts[5] == "unlock":
                    profile = self.gameplay_store.unlock_profile_skill(
                        player_id=path_parts[3], skill_id=str(body.get("skill_id") or "")
                    )
                    self._send_json(200, {"profile": profile})
                    return
                if len(path_parts) == 6 and path_parts[2] == "profiles" and path_parts[4] == "loadout" and path_parts[5] == "equip":
                    profile = self.gameplay_store.equip_profile_skill(
                        player_id=path_parts[3], skill_id=str(body.get("skill_id") or "")
                    )
                    self._send_json(200, {"profile": profile})
                    return
                if path_parts == ["api", "gameplay", "guilds"]:
                    guild = self.gameplay_store.create_guild(
                        guild_id=str(body.get("guild_id") or ""),
                        name=str(body.get("name") or ""),
                        owner_player_id=str(body.get("owner_player_id") or ""),
                    )
                    self._send_json(201, {"guild": guild})
                    return
                if len(path_parts) == 5 and path_parts[2] == "guilds" and path_parts[4] == "join":
                    guild = self.gameplay_store.join_guild(path_parts[3], str(body.get("player_id") or ""))
                    self._send_json(200, {"guild": guild})
                    return
                if path_parts == ["api", "gameplay", "friends", "invite"]:
                    invite, social = self.gameplay_store.invite_friend(
                        from_player_id=str(body.get("from_player_id") or ""),
                        to_player_id=str(body.get("to_player_id") or ""),
                    )
                    self._send_json(201, {"invite": invite, "social": social})
                    return
                if path_parts == ["api", "gameplay", "friends", "accept"]:
                    social = self.gameplay_store.accept_friend_invite(
                        player_id=str(body.get("player_id") or ""),
                        invite_id=str(body.get("invite_id") or ""),
                    )
                    self._send_json(200, {"social": social})
                    return
                if len(path_parts) == 5 and path_parts[2] == "guilds" and path_parts[4] == "events":
                    guild, event = self.gameplay_store.schedule_guild_event(
                        guild_id=path_parts[3],
                        title=str(body.get("title") or ""),
                        scheduled_at=str(body.get("scheduled_at") or ""),
                    )
                    self._send_json(201, {"guild": guild, "event": event})
                    return
                if (
                    len(path_parts) == 7
                    and path_parts[2] == "guilds"
                    and path_parts[4] == "events"
                    and path_parts[6] == "complete"
                ):
                    guild = self.gameplay_store.complete_guild_event(
                        guild_id=path_parts[3],
                        event_id=path_parts[5],
                        impact=int(body.get("impact") or 0),
                    )
                    self._send_json(200, {"guild": guild})
                    return
                if path_parts == ["api", "gameplay", "liveops", "advance-week"]:
                    liveops = self.gameplay_store.advance_liveops_week()
                    self._send_json(200, {"liveops": liveops})
                    return
            if path_parts == ["api", "replay-jobs"]:
                trace_id = str(body.get("trace_id") or "")
                self._assert_trace_access(trace_id, tenant_id)
                step_id = str(body.get("step_id") or "")
                trace = self.store.get_summary(trace_id)
                if not any(step.id == step_id for step in trace.steps):
                    raise ValueError("step_id not found in trace")
                job = self.replay_jobs.create_job(
                    trace_id=trace_id,
                    step_id=step_id,
                    scenarios=body.get("scenarios") or [],
                    tenant_id=tenant_id,
                )
                execute = body.get("execute", True)
                if not isinstance(execute, bool):
                    raise ValueError("execute must be bool")
                if execute:
                    self.replay_jobs.execute_job(job.id, self.store, tenant_id=tenant_id)
                for scenario in job.scenarios:
                    if scenario.replay_trace_id:
                        self.ops_store.assign_trace_tenant(scenario.replay_trace_id, tenant_id)
                payload = {"job": job.to_dict()}
                self._idempotency_commit(tenant_id, idempotency_key, request_hash, parsed.path, 202, payload)
                self.ops_store.log_audit_event(
                    tenant_id=tenant_id,
                    actor=actor_id,
                    event_type="replay.job.created",
                    details={"jobId": job.id, "traceId": trace_id, "stepId": step_id},
                )
                self._send_json(202, payload)
                return
            if path_parts[:2] == ["api", "replay-jobs"] and len(path_parts) == 4 and path_parts[3] == "cancel":
                job = self.replay_jobs.get_for_tenant(path_parts[2], tenant_id)
                if not job:
                    self._send_json(404, {"error": f"Replay job not found: {path_parts[2]}"})
                    return
                job = self.replay_jobs.cancel_job(path_parts[2])
                self._send_json(200, {"job": job.to_dict()})
                return
            if path_parts[:2] == ["api", "traces"] and len(path_parts) == 4:
                trace_id = path_parts[2]
                self._assert_trace_access(trace_id, tenant_id)
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
                        self.ops_store.assign_trace_tenant(str(replay_trace["id"]), tenant_id)
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
                self._assert_trace_access(str(base_trace_id), tenant_id)
                self._assert_trace_access(str(left_trace_id), tenant_id)
                self._assert_trace_access(str(right_trace_id), tenant_id)
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
                self.ops_store.assign_trace_tenant(merged.id, tenant_id)
                self.live_broker.publish_trace(merged)
                payload = {"trace": merged.to_dict()}
                self._idempotency_commit(tenant_id, idempotency_key, request_hash, parsed.path, 200, payload)
                self.ops_store.log_audit_event(
                    tenant_id=tenant_id,
                    actor=actor_id,
                    event_type="replay.merge.created",
                    details={"traceId": merged.id, "baseTraceId": base_trace_id},
                )
                self._send_json(200, payload)
                return
            if path_parts[:2] == ["api", "extensions"] and len(path_parts) == 4 and path_parts[3] == "run":
                extension_id = path_parts[2]
                validate_input("show_trace", {"trace_id": extension_id})
                trace_id = body.get("trace_id", "")
                validate_input("show_trace", {"trace_id": trace_id})
                self._assert_trace_access(trace_id, tenant_id)
                trace = self.store.get_summary(trace_id)
                result = self.extension_registry.run_extension(extension_id, trace)
                self._send_json(200, {"extensionId": extension_id, "traceId": trace_id, "result": result})
                return
            if path_parts == ["api", "compare"]:
                left_trace_id = str(body.get("left_trace_id", ""))
                right_trace_id = str(body.get("right_trace_id", ""))
                self._assert_trace_access(left_trace_id, tenant_id)
                self._assert_trace_access(right_trace_id, tenant_id)
                payload = compare_execute(
                    self.store, left_trace_id, right_trace_id
                )
                response_payload = payload["structuredContent"]
                self._idempotency_commit(tenant_id, idempotency_key, request_hash, parsed.path, 200, response_payload)
                self._send_json(200, response_payload)
                return
            self._send_json(404, {"error": "Not found"})
        except PayloadTooLargeError:
            self._send_json(413, {"error": "Payload too large"})
        except InvalidContentTypeError as exc:
            self._send_json(415, {"error": str(exc)})
        except PermissionError as exc:
            self._send_json(401, {"error": str(exc)})
        except FileNotFoundError as exc:
            self._send_json(404, {"error": str(exc)})
        except ConflictError as exc:
            self._send_json(409, {"error": str(exc)})
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

    def _stream_latest_trace(self, tenant_id: str | None = None) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "keep-alive")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        token, queue = self.live_broker.subscribe()
        try:
            try:
                if self.require_auth and tenant_id:
                    allowed_ids = self.ops_store.list_trace_ids_for_tenant(tenant_id)
                    traces = [trace for trace in self.store.list_traces() if trace.id in allowed_ids]
                    if traces:
                        self._write_sse("trace", {"trace": traces[-1].to_dict()})
                    else:
                        self._write_sse("heartbeat", {"status": "empty"})
                else:
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

    def _stream_gameplay_session(self, session_id: str) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "keep-alive")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        subscription = self.gameplay_store.subscribe(session_id)
        try:
            session = self.gameplay_store.get_session(session_id)
            if session:
                self._write_sse("gameplay", {"session": session, "event": {"type": "session.snapshot"}})
            else:
                self._write_sse("heartbeat", {"status": "missing"})
            while True:
                try:
                    event = subscription.queue.get(timeout=10.0)
                    self._write_sse(event.get("type", "gameplay"), event)
                except Empty:
                    self._write_sse("heartbeat", {"ts": int(time.time())})
        except (BrokenPipeError, ConnectionResetError):
            return
        finally:
            self.gameplay_store.unsubscribe(session_id, subscription.token)

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
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, X-API-Key, X-Tenant-Id, X-Actor-Id, Idempotency-Key",
        )
        if extra_headers:
            for header, value in extra_headers.items():
                self.send_header(header, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if status != 204:
            self.wfile.write(body)


def main() -> None:
    base_data_dir = data_dir()
    store = TraceStore(base_data_dir, demo_dir())
    ops_store = OpsStore(base_data_dir)
    ops_store.bootstrap_trace_tenants((trace.id for trace in store.list_traces()), default_tenant_id())
    ApiHandler.store = store
    ApiHandler.ops_store = ops_store
    ApiHandler.replay_jobs = ReplayJobStore(base_data_dir / "replay_jobs.json")
    ApiHandler.live_broker = LiveTraceBroker()
    ApiHandler.extension_registry = ExtensionRegistry()
    ApiHandler.gameplay_store = GameplayStore(base_data_dir)
    ApiHandler.require_auth = api_auth_required()
    ApiHandler.allowed_api_keys = api_keys()
    ApiHandler.default_tenant = default_tenant_id()
    server = ThreadingHTTPServer((DEFAULT_HOST, DEFAULT_PORT), ApiHandler)
    print(f"Agent Director server running on http://{DEFAULT_HOST}:{DEFAULT_PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
