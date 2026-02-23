from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, Optional
from uuid import uuid4


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class OpsStore:
    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir
        self.db_path = data_dir / "ops.db"
        self._ensure_dirs()
        self._init_db()

    def _ensure_dirs(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def _db(self):
        conn = sqlite3.connect(self.db_path)
        try:
            yield conn
        finally:
            conn.close()

    def _init_db(self) -> None:
        with self._db() as conn:
            cur = conn.cursor()
            cur.execute("PRAGMA journal_mode=WAL")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS trace_tenants (
                    traceId TEXT PRIMARY KEY,
                    tenantId TEXT NOT NULL,
                    createdAt TEXT NOT NULL
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS idempotency_records (
                    tenantId TEXT NOT NULL,
                    key TEXT NOT NULL,
                    method TEXT NOT NULL,
                    path TEXT NOT NULL,
                    requestHash TEXT NOT NULL,
                    status INTEGER NOT NULL,
                    responseJson TEXT NOT NULL,
                    createdAt TEXT NOT NULL,
                    PRIMARY KEY (tenantId, key, method, path)
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS replay_dead_letters (
                    id TEXT PRIMARY KEY,
                    jobId TEXT NOT NULL,
                    scenarioId TEXT NOT NULL,
                    tenantId TEXT NOT NULL,
                    error TEXT NOT NULL,
                    attemptCount INTEGER NOT NULL,
                    createdAt TEXT NOT NULL
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS telemetry_events (
                    id TEXT PRIMARY KEY,
                    tenantId TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    name TEXT NOT NULL,
                    payloadJson TEXT NOT NULL,
                    createdAt TEXT NOT NULL
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS governance_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS audit_events (
                    id TEXT PRIMARY KEY,
                    tenantId TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    eventType TEXT NOT NULL,
                    detailsJson TEXT NOT NULL,
                    createdAt TEXT NOT NULL
                )
                """
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_created ON audit_events(tenantId, createdAt DESC)"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_dead_letters_tenant_created ON replay_dead_letters(tenantId, createdAt DESC)"
            )
            conn.commit()

    def bootstrap_trace_tenants(self, trace_ids: Iterable[str], tenant_id: str = "public") -> None:
        normalized_tenant = self._normalize_tenant(tenant_id)
        now = _utc_now_iso()
        with self._db() as conn:
            for trace_id in trace_ids:
                if not trace_id:
                    continue
                conn.execute(
                    """
                    INSERT OR IGNORE INTO trace_tenants (traceId, tenantId, createdAt)
                    VALUES (?, ?, ?)
                    """,
                    (trace_id, normalized_tenant, now),
                )
            conn.commit()

    def assign_trace_tenant(self, trace_id: str, tenant_id: str) -> None:
        normalized_trace_id = str(trace_id or "").strip()
        normalized_tenant = self._normalize_tenant(tenant_id)
        if not normalized_trace_id:
            return
        with self._db() as conn:
            conn.execute(
                """
                INSERT INTO trace_tenants (traceId, tenantId, createdAt)
                VALUES (?, ?, ?)
                ON CONFLICT(traceId) DO UPDATE SET tenantId=excluded.tenantId
                """,
                (normalized_trace_id, normalized_tenant, _utc_now_iso()),
            )
            conn.commit()

    def can_access_trace(self, trace_id: str, tenant_id: str) -> bool:
        normalized_trace_id = str(trace_id or "").strip()
        normalized_tenant = self._normalize_tenant(tenant_id)
        if not normalized_trace_id:
            return False
        with self._db() as conn:
            row = conn.execute(
                "SELECT tenantId FROM trace_tenants WHERE traceId = ?",
                (normalized_trace_id,),
            ).fetchone()
        if not row:
            return False
        return str(row[0]) == normalized_tenant

    def remove_trace(self, trace_id: str) -> None:
        normalized_trace_id = str(trace_id or "").strip()
        if not normalized_trace_id:
            return
        with self._db() as conn:
            conn.execute("DELETE FROM trace_tenants WHERE traceId = ?", (normalized_trace_id,))
            conn.commit()

    def list_trace_ids_for_tenant(self, tenant_id: str) -> set[str]:
        normalized_tenant = self._normalize_tenant(tenant_id)
        with self._db() as conn:
            rows = conn.execute(
                "SELECT traceId FROM trace_tenants WHERE tenantId = ?",
                (normalized_tenant,),
            ).fetchall()
        return {str(row[0]) for row in rows}

    def lookup_idempotency(
        self,
        tenant_id: str,
        key: str,
        method: str,
        path: str,
        request_hash: str,
    ) -> Dict[str, Any]:
        normalized_tenant = self._normalize_tenant(tenant_id)
        normalized_key = str(key or "").strip()
        if not normalized_key:
            return {"status": "miss"}
        with self._db() as conn:
            row = conn.execute(
                """
                SELECT requestHash, status, responseJson
                FROM idempotency_records
                WHERE tenantId = ? AND key = ? AND method = ? AND path = ?
                """,
                (normalized_tenant, normalized_key, method, path),
            ).fetchone()
        if not row:
            return {"status": "miss"}
        if str(row[0]) != request_hash:
            return {"status": "conflict"}
        try:
            payload = json.loads(str(row[2]))
        except json.JSONDecodeError:
            payload = {"error": "Invalid idempotency payload"}
        return {"status": "hit", "code": int(row[1]), "payload": payload}

    def save_idempotency(
        self,
        tenant_id: str,
        key: str,
        method: str,
        path: str,
        request_hash: str,
        status_code: int,
        payload: Dict[str, Any],
    ) -> None:
        normalized_tenant = self._normalize_tenant(tenant_id)
        normalized_key = str(key or "").strip()
        if not normalized_key:
            return
        with self._db() as conn:
            conn.execute(
                """
                INSERT INTO idempotency_records (
                    tenantId, key, method, path, requestHash, status, responseJson, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(tenantId, key, method, path) DO UPDATE SET
                    requestHash=excluded.requestHash,
                    status=excluded.status,
                    responseJson=excluded.responseJson,
                    createdAt=excluded.createdAt
                """,
                (
                    normalized_tenant,
                    normalized_key,
                    method,
                    path,
                    request_hash,
                    int(status_code),
                    json.dumps(payload),
                    _utc_now_iso(),
                ),
            )
            conn.commit()

    def log_dead_letter(
        self,
        tenant_id: str,
        job_id: str,
        scenario_id: str,
        error: str,
        attempt_count: int,
    ) -> Dict[str, Any]:
        record = {
            "id": f"dead-{uuid4().hex[:12]}",
            "jobId": str(job_id),
            "scenarioId": str(scenario_id),
            "tenantId": self._normalize_tenant(tenant_id),
            "error": str(error),
            "attemptCount": int(attempt_count),
            "createdAt": _utc_now_iso(),
        }
        with self._db() as conn:
            conn.execute(
                """
                INSERT INTO replay_dead_letters (id, jobId, scenarioId, tenantId, error, attemptCount, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["id"],
                    record["jobId"],
                    record["scenarioId"],
                    record["tenantId"],
                    record["error"],
                    record["attemptCount"],
                    record["createdAt"],
                ),
            )
            conn.commit()
        return record

    def list_dead_letters(self, tenant_id: str, job_id: Optional[str] = None, limit: int = 50) -> list[Dict[str, Any]]:
        normalized_tenant = self._normalize_tenant(tenant_id)
        bounded_limit = max(1, min(500, int(limit)))
        with self._db() as conn:
            if job_id:
                rows = conn.execute(
                    """
                    SELECT id, jobId, scenarioId, tenantId, error, attemptCount, createdAt
                    FROM replay_dead_letters
                    WHERE tenantId = ? AND jobId = ?
                    ORDER BY createdAt DESC
                    LIMIT ?
                    """,
                    (normalized_tenant, job_id, bounded_limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT id, jobId, scenarioId, tenantId, error, attemptCount, createdAt
                    FROM replay_dead_letters
                    WHERE tenantId = ?
                    ORDER BY createdAt DESC
                    LIMIT ?
                    """,
                    (normalized_tenant, bounded_limit),
                ).fetchall()
        return [
            {
                "id": row[0],
                "jobId": row[1],
                "scenarioId": row[2],
                "tenantId": row[3],
                "error": row[4],
                "attemptCount": int(row[5]),
                "createdAt": row[6],
            }
            for row in rows
        ]

    def ingest_telemetry_events(self, tenant_id: str, actor: str, events: list[Dict[str, Any]]) -> int:
        normalized_tenant = self._normalize_tenant(tenant_id)
        normalized_actor = str(actor or "").strip() or "unknown"
        valid_events: list[Dict[str, Any]] = []
        for raw in events:
            kind = str(raw.get("kind") or "").strip()
            name = str(raw.get("name") or "").strip()
            if not kind or not name:
                continue
            valid_events.append(
                {
                    "id": f"evt-{uuid4().hex[:12]}",
                    "tenantId": normalized_tenant,
                    "actor": normalized_actor,
                    "kind": kind,
                    "name": name,
                    "payloadJson": json.dumps(raw.get("payload") if isinstance(raw.get("payload"), dict) else {}),
                    "createdAt": str(raw.get("at") or _utc_now_iso()),
                }
            )
        if not valid_events:
            return 0
        with self._db() as conn:
            for event in valid_events:
                conn.execute(
                    """
                    INSERT INTO telemetry_events (id, tenantId, actor, kind, name, payloadJson, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event["id"],
                        event["tenantId"],
                        event["actor"],
                        event["kind"],
                        event["name"],
                        event["payloadJson"],
                        event["createdAt"],
                    ),
                )
            conn.commit()
        return len(valid_events)

    def get_retention_days(self, default_days: int = 30) -> int:
        with self._db() as conn:
            row = conn.execute("SELECT value FROM governance_settings WHERE key = 'retention_days'").fetchone()
        if not row:
            return default_days
        try:
            days = int(str(row[0]))
        except ValueError:
            return default_days
        return max(1, min(365, days))

    def set_retention_days(self, days: int) -> int:
        bounded_days = max(1, min(365, int(days)))
        with self._db() as conn:
            conn.execute(
                """
                INSERT INTO governance_settings (key, value, updatedAt)
                VALUES ('retention_days', ?, ?)
                ON CONFLICT(key) DO UPDATE SET value=excluded.value, updatedAt=excluded.updatedAt
                """,
                (str(bounded_days), _utc_now_iso()),
            )
            conn.commit()
        return bounded_days

    def log_audit_event(
        self,
        tenant_id: str,
        actor: str,
        event_type: str,
        details: Dict[str, Any],
    ) -> Dict[str, Any]:
        record = {
            "id": f"audit-{uuid4().hex[:12]}",
            "tenantId": self._normalize_tenant(tenant_id),
            "actor": str(actor or "").strip() or "unknown",
            "eventType": str(event_type or "").strip() or "unknown",
            "details": details,
            "createdAt": _utc_now_iso(),
        }
        with self._db() as conn:
            conn.execute(
                """
                INSERT INTO audit_events (id, tenantId, actor, eventType, detailsJson, createdAt)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    record["id"],
                    record["tenantId"],
                    record["actor"],
                    record["eventType"],
                    json.dumps(record["details"]),
                    record["createdAt"],
                ),
            )
            conn.commit()
        return record

    def list_audit_events(self, tenant_id: str, limit: int = 50) -> list[Dict[str, Any]]:
        normalized_tenant = self._normalize_tenant(tenant_id)
        bounded_limit = max(1, min(500, int(limit)))
        with self._db() as conn:
            rows = conn.execute(
                """
                SELECT id, tenantId, actor, eventType, detailsJson, createdAt
                FROM audit_events
                WHERE tenantId = ?
                ORDER BY createdAt DESC
                LIMIT ?
                """,
                (normalized_tenant, bounded_limit),
            ).fetchall()
        records: list[Dict[str, Any]] = []
        for row in rows:
            try:
                details = json.loads(str(row[4]))
            except json.JSONDecodeError:
                details = {}
            records.append(
                {
                    "id": row[0],
                    "tenantId": row[1],
                    "actor": row[2],
                    "eventType": row[3],
                    "details": details,
                    "createdAt": row[5],
                }
            )
        return records

    def _normalize_tenant(self, tenant_id: str) -> str:
        normalized = str(tenant_id or "").strip().lower()
        return normalized or "public"
