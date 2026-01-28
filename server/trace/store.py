from __future__ import annotations

import gzip
import json
import shutil
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from .schema import StepDetails, StepSummary, TraceSummary


SCHEMA_VERSION = 2


class TraceStore:
    def __init__(self, data_dir: Path, demo_dir: Optional[Path] = None) -> None:
        self.data_dir = data_dir
        self.traces_dir = data_dir / "traces"
        self.steps_dir = data_dir / "steps"
        self.db_path = data_dir / "traces.db"
        self.last_ingest_warnings: List[str] = []
        self._ensure_dirs()
        self._init_db()
        if demo_dir:
            self.bootstrap_demo_if_empty(demo_dir)

    def _ensure_dirs(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.traces_dir.mkdir(parents=True, exist_ok=True)
        self.steps_dir.mkdir(parents=True, exist_ok=True)

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
                CREATE TABLE IF NOT EXISTS traces (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    startedAt TEXT,
                    endedAt TEXT,
                    status TEXT,
                    wallTimeMs INTEGER,
                    workTimeMs INTEGER,
                    totalTokens INTEGER,
                    totalCostUsd REAL,
                    errorCount INTEGER,
                    retryCount INTEGER,
                    parentTraceId TEXT,
                    branchPointStepId TEXT,
                    createdAt TEXT
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS steps (
                    traceId TEXT,
                    stepId TEXT,
                    stepIndex INTEGER,
                    type TEXT,
                    name TEXT,
                    startedAt TEXT,
                    endedAt TEXT,
                    status TEXT,
                    durationMs INTEGER,
                    toolCallId TEXT,
                    metricsTokens INTEGER,
                    metricsCost REAL,
                    previewTitle TEXT,
                    previewSubtitle TEXT,
                    previewInput TEXT,
                    previewOutput TEXT,
                    parentStepId TEXT,
                    PRIMARY KEY (traceId, stepId)
                )
                """
            )
            conn.commit()
            cur.execute("PRAGMA user_version")
            version = cur.fetchone()[0] or 0
            if version < 1:
                version = 1
            if version < 2:
                cur.execute("CREATE INDEX IF NOT EXISTS idx_traces_started ON traces(startedAt)")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_steps_trace ON steps(traceId)")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_steps_toolcall ON steps(toolCallId)")
                version = 2
            cur.execute(f"PRAGMA user_version = {version}")
            conn.commit()

    def bootstrap_demo_if_empty(self, demo_dir: Path) -> None:
        if any(self.traces_dir.glob("*.summary.json")):
            return
        if not demo_dir.exists():
            return
        for summary_file in demo_dir.glob("*.summary.json"):
            shutil.copy2(summary_file, self.traces_dir / summary_file.name)
        demo_steps = demo_dir / "steps"
        if demo_steps.exists():
            for trace_dir in demo_steps.iterdir():
                if trace_dir.is_dir():
                    dest = self.steps_dir / trace_dir.name
                    if dest.exists():
                        continue
                    shutil.copytree(trace_dir, dest)
        for summary in self.list_traces():
            self._upsert_trace(summary)
            self._upsert_steps(summary.id, summary.steps)

    def list_traces(self) -> List[TraceSummary]:
        traces: List[TraceSummary] = []
        for summary_file in self.traces_dir.glob("*.summary.json"):
            traces.append(self._load_summary(summary_file))
        traces.sort(key=lambda t: t.startedAt)
        return traces

    def delete_trace(self, trace_id: str) -> None:
        summary_path = self.traces_dir / f"{trace_id}.summary.json"
        if summary_path.exists():
            summary_path.unlink()
        trace_steps = self.steps_dir / trace_id
        if trace_steps.exists():
            shutil.rmtree(trace_steps, ignore_errors=True)
        with self._db() as conn:
            conn.execute("DELETE FROM steps WHERE traceId = ?", (trace_id,))
            conn.execute("DELETE FROM traces WHERE id = ?", (trace_id,))
            conn.commit()

    def export_snapshot(self, output_path: Path) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        archive_base = output_path.with_suffix("")
        shutil.make_archive(str(archive_base), "zip", self.data_dir)
        return archive_base.with_suffix(".zip")

    def copy_step_details(
        self, source_trace_id: str, target_trace_id: str, step_ids: Iterable[str]
    ) -> None:
        source_dir = self.steps_dir / source_trace_id
        target_dir = self.steps_dir / target_trace_id
        target_dir.mkdir(parents=True, exist_ok=True)
        for step_id in step_ids:
            detail_path = source_dir / f"{step_id}.details.json"
            gzip_path = source_dir / f"{step_id}.details.json.gz"
            if detail_path.exists():
                shutil.copy2(detail_path, target_dir / detail_path.name)
            elif gzip_path.exists():
                shutil.copy2(gzip_path, target_dir / gzip_path.name)

    def save_step_details(self, trace_id: str, details: StepDetails) -> None:
        trace_dir = self.steps_dir / trace_id
        trace_dir.mkdir(parents=True, exist_ok=True)
        detail_path = trace_dir / f"{details.id}.details.json"
        self._write_json(detail_path, details.to_dict())

    def get_summary(self, trace_id: Optional[str] = None) -> TraceSummary:
        traces = self.list_traces()
        if not traces:
            raise FileNotFoundError("No traces available")
        if trace_id is None:
            return traces[-1]
        for trace in traces:
            if trace.id == trace_id:
                return trace
        raise FileNotFoundError(f"Trace not found: {trace_id}")

    def get_step_details(self, trace_id: str, step_id: str) -> StepDetails:
        step_path = self.steps_dir / trace_id / f"{step_id}.details.json"
        gzip_path = self.steps_dir / trace_id / f"{step_id}.details.json.gz"
        if step_path.exists():
            payload = self._read_json(step_path)
            return StepDetails.from_dict(payload)
        if gzip_path.exists():
            payload = self._read_json(gzip_path)
            return StepDetails.from_dict(payload)
        raise FileNotFoundError(f"Step details not found: {trace_id}/{step_id}")

    def ingest_trace(
        self, summary: TraceSummary, step_details: Optional[Dict[str, StepDetails]] = None
    ) -> None:
        self.last_ingest_warnings = []
        summary.steps = summary.steps or []
        sanitized_steps: List[StepSummary] = []
        for step in summary.steps:
            if not step.id:
                self.last_ingest_warnings.append("Skipped step with missing id.")
                continue
            sanitized_steps.append(step)
        summary.steps = sanitized_steps

        summary_path = self.traces_dir / f"{summary.id}.summary.json"
        try:
            self._write_json(summary_path, summary.to_dict())
        except OSError as exc:
            self.last_ingest_warnings.append(f"Failed to write summary JSON: {exc}")

        if step_details:
            trace_dir = self.steps_dir / summary.id
            trace_dir.mkdir(parents=True, exist_ok=True)
            for step_id, details in step_details.items():
                try:
                    detail_path = trace_dir / f"{step_id}.details.json"
                    self._write_json(detail_path, details.to_dict())
                except OSError as exc:
                    self.last_ingest_warnings.append(f"Failed to write step details {step_id}: {exc}")

        try:
            self._upsert_trace(summary)
        except sqlite3.DatabaseError as exc:
            self.last_ingest_warnings.append(f"Failed to upsert trace {summary.id}: {exc}")

        try:
            self._upsert_steps(summary.id, summary.steps)
        except sqlite3.DatabaseError as exc:
            self.last_ingest_warnings.append(f"Failed to upsert steps for {summary.id}: {exc}")

    def _write_json(self, path: Path, payload: Dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)

    def _read_json(self, path: Path) -> Dict:
        if path.suffix == ".gz":
            with gzip.open(path, "rt", encoding="utf-8") as handle:
                return json.load(handle)
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _load_summary(self, path: Path) -> TraceSummary:
        payload = self._read_json(path)
        return TraceSummary.from_dict(payload)

    def _upsert_trace(self, summary: TraceSummary) -> None:
        meta = summary.metadata
        created_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        with self._db() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO traces (
                    id, name, startedAt, endedAt, status, wallTimeMs, workTimeMs,
                    totalTokens, totalCostUsd, errorCount, retryCount,
                    parentTraceId, branchPointStepId, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    summary.id,
                    summary.name,
                    summary.startedAt,
                    summary.endedAt,
                    summary.status,
                    meta.wallTimeMs,
                    meta.workTimeMs,
                    meta.totalTokens,
                    meta.totalCostUsd,
                    meta.errorCount,
                    meta.retryCount,
                    summary.parentTraceId,
                    summary.branchPointStepId,
                    created_at,
                ),
            )
            conn.commit()

    def _upsert_steps(self, trace_id: str, steps: Iterable[StepSummary]) -> None:
        with self._db() as conn:
            for step in steps:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO steps (
                        traceId, stepId, stepIndex, type, name, startedAt, endedAt,
                        status, durationMs, toolCallId, metricsTokens, metricsCost,
                        previewTitle, previewSubtitle, previewInput, previewOutput,
                        parentStepId
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        trace_id,
                        step.id,
                        step.index,
                        step.type,
                        step.name,
                        step.startedAt,
                        step.endedAt,
                        step.status,
                        step.durationMs,
                        step.toolCallId,
                        step.metrics.tokensTotal if step.metrics else None,
                        step.metrics.costUsd if step.metrics else None,
                        step.preview.title if step.preview else None,
                        step.preview.subtitle if step.preview else None,
                        step.preview.inputPreview if step.preview else None,
                        step.preview.outputPreview if step.preview else None,
                        step.parentStepId,
                    ),
                )
            conn.commit()
