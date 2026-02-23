from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from .engine import replay_from_step
from ..trace.store import TraceStore


FINAL_SCENARIO_STATES = {"completed", "failed", "canceled"}
FINAL_JOB_STATES = {"completed", "failed", "canceled"}
VALID_REPLAY_STRATEGIES = {"recorded", "live", "hybrid"}
MAX_SCENARIOS = 25
MAX_REPLAY_ATTEMPTS = 2


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@dataclass
class ReplayScenario:
    id: str
    name: str
    strategy: str
    modifications: Dict[str, Any]
    status: str = "queued"
    attempts: int = 0
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    replay_trace_id: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "strategy": self.strategy,
            "modifications": self.modifications,
            "status": self.status,
            "attempts": self.attempts,
            "startedAt": self.started_at,
            "endedAt": self.ended_at,
            "replayTraceId": self.replay_trace_id,
            "error": self.error,
        }


@dataclass
class ReplayDeadLetter:
    id: str
    job_id: str
    scenario_id: str
    tenant_id: str
    error: str
    attempt_count: int
    created_at: str = field(default_factory=_now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "jobId": self.job_id,
            "scenarioId": self.scenario_id,
            "tenantId": self.tenant_id,
            "error": self.error,
            "attemptCount": self.attempt_count,
            "createdAt": self.created_at,
        }


@dataclass
class ReplayJob:
    id: str
    trace_id: str
    step_id: str
    tenant_id: str = "public"
    scenarios: List[ReplayScenario] = field(default_factory=list)
    status: str = "queued"
    created_at: str = field(default_factory=_now_iso)
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    dead_letter_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        completed = sum(1 for scenario in self.scenarios if scenario.status == "completed")
        failed = sum(1 for scenario in self.scenarios if scenario.status == "failed")
        canceled = sum(1 for scenario in self.scenarios if scenario.status == "canceled")
        return {
            "id": self.id,
            "traceId": self.trace_id,
            "stepId": self.step_id,
            "tenantId": self.tenant_id,
            "status": self.status,
            "createdAt": self.created_at,
            "startedAt": self.started_at,
            "endedAt": self.ended_at,
            "scenarioCount": len(self.scenarios),
            "completedCount": completed,
            "failedCount": failed,
            "canceledCount": canceled,
            "deadLetterCount": self.dead_letter_count,
            "scenarios": [scenario.to_dict() for scenario in self.scenarios],
        }


class ReplayJobStore:
    def __init__(self, persist_path: Optional[Path] = None) -> None:
        self._jobs: Dict[str, ReplayJob] = {}
        self._matrix_cache: Dict[str, Dict[str, Any]] = {}
        self._dead_letters: List[ReplayDeadLetter] = []
        self._persist_path = persist_path
        if self._persist_path:
            self._persist_path.parent.mkdir(parents=True, exist_ok=True)
            self._load()

    def create_job(
        self,
        trace_id: str,
        step_id: str,
        scenarios: List[Dict[str, Any]],
        tenant_id: str = "public",
    ) -> ReplayJob:
        if not isinstance(trace_id, str) or not trace_id:
            raise ValueError("trace_id must be a non-empty string")
        if not isinstance(step_id, str) or not step_id:
            raise ValueError("step_id must be a non-empty string")
        if not scenarios:
            raise ValueError("scenarios must not be empty")
        if len(scenarios) > MAX_SCENARIOS:
            raise ValueError(f"scenarios must not exceed {MAX_SCENARIOS}")
        replay_scenarios = [
            ReplayScenario(
                id=f"scn-{uuid4().hex[:12]}",
                name=str(scenario.get("name") or f"Scenario {index + 1}"),
                strategy=self._validate_strategy(str(scenario.get("strategy") or "hybrid")),
                modifications=dict(scenario.get("modifications") or {}),
            )
            for index, scenario in enumerate(scenarios)
        ]
        job = ReplayJob(
            id=f"job-{uuid4().hex[:12]}",
            trace_id=trace_id,
            step_id=step_id,
            tenant_id=self._normalize_tenant(tenant_id),
            scenarios=replay_scenarios,
        )
        self._jobs[job.id] = job
        self._persist()
        return job

    def get(self, job_id: str) -> Optional[ReplayJob]:
        return self._jobs.get(job_id)

    def get_for_tenant(self, job_id: str, tenant_id: str) -> Optional[ReplayJob]:
        job = self.get(job_id)
        if not job:
            return None
        return job if job.tenant_id == self._normalize_tenant(tenant_id) else None

    def list(self) -> List[ReplayJob]:
        return list(self._jobs.values())

    def list_for_tenant(self, tenant_id: str) -> List[ReplayJob]:
        normalized = self._normalize_tenant(tenant_id)
        return [job for job in self._jobs.values() if job.tenant_id == normalized]

    def list_dead_letters(self, tenant_id: str, job_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        normalized = self._normalize_tenant(tenant_id)
        bounded_limit = max(1, min(500, int(limit)))
        records = [item for item in self._dead_letters if item.tenant_id == normalized]
        if job_id:
            records = [item for item in records if item.job_id == job_id]
        records.sort(key=lambda item: item.created_at, reverse=True)
        return [item.to_dict() for item in records[:bounded_limit]]

    def start_next_scenario(self, job_id: str) -> Optional[ReplayScenario]:
        job = self._jobs.get(job_id)
        if not job or job.status in FINAL_JOB_STATES:
            return None

        for scenario in job.scenarios:
            if scenario.status != "queued":
                continue
            now = _now_iso()
            scenario.status = "running"
            scenario.started_at = now
            if job.status == "queued":
                job.status = "running"
                job.started_at = now
            self._persist()
            return scenario

        self._refresh_job_status(job)
        self._persist()
        return None

    def complete_scenario(self, job_id: str, scenario_id: str, replay_trace_id: str) -> None:
        job = self._jobs.get(job_id)
        if not job or job.status in FINAL_JOB_STATES:
            return
        scenario = self._find_scenario(job, scenario_id)
        if not scenario:
            return
        scenario.status = "completed"
        scenario.replay_trace_id = replay_trace_id
        scenario.ended_at = _now_iso()
        self._refresh_job_status(job)
        self._matrix_cache.pop(job_id, None)
        self._persist()

    def fail_scenario(self, job_id: str, scenario_id: str, error: str, attempt_count: int = 0) -> None:
        job = self._jobs.get(job_id)
        if not job or job.status in FINAL_JOB_STATES:
            return
        scenario = self._find_scenario(job, scenario_id)
        if not scenario:
            return
        scenario.status = "failed"
        scenario.error = error
        scenario.attempts = max(int(attempt_count or 0), scenario.attempts)
        scenario.ended_at = _now_iso()
        self._refresh_job_status(job)
        self._matrix_cache.pop(job_id, None)

        if scenario.attempts >= MAX_REPLAY_ATTEMPTS:
            dead_letter = ReplayDeadLetter(
                id=f"dead-{uuid4().hex[:12]}",
                job_id=job.id,
                scenario_id=scenario.id,
                tenant_id=job.tenant_id,
                error=error,
                attempt_count=scenario.attempts,
            )
            self._dead_letters.append(dead_letter)
            job.dead_letter_count += 1

        self._persist()

    def cancel_job(self, job_id: str) -> Optional[ReplayJob]:
        job = self._jobs.get(job_id)
        if not job or job.status in FINAL_JOB_STATES:
            return job
        now = _now_iso()
        for scenario in job.scenarios:
            if scenario.status in FINAL_SCENARIO_STATES:
                continue
            scenario.status = "canceled"
            scenario.ended_at = now
        if not job.started_at:
            job.started_at = now
        job.status = "canceled"
        job.ended_at = now
        self._matrix_cache.pop(job.id, None)
        self._persist()
        return job

    def execute_job(
        self,
        job_id: str,
        store: TraceStore,
        replay_fn=replay_from_step,
        tenant_id: Optional[str] = None,
    ) -> Optional[ReplayJob]:
        job = self._jobs.get(job_id)
        if not job or job.status in FINAL_JOB_STATES:
            return job

        if tenant_id:
            normalized_tenant = self._normalize_tenant(tenant_id)
            if job.tenant_id != normalized_tenant:
                return None

        try:
            base_trace = store.get_summary(job.trace_id)
        except FileNotFoundError as exc:
            job.status = "failed"
            job.ended_at = _now_iso()
            for scenario in job.scenarios:
                if scenario.status == "queued":
                    scenario.status = "failed"
                    scenario.error = str(exc)
                    scenario.ended_at = _now_iso()
            self._persist()
            return job

        while True:
            scenario = self.start_next_scenario(job_id)
            if scenario is None:
                break

            if job.status == "canceled" or scenario.status == "canceled":
                break

            last_error: Optional[Exception] = None
            attempt = 0
            for attempt in range(1, MAX_REPLAY_ATTEMPTS + 1):
                scenario.attempts = attempt
                self._persist()
                try:
                    replay_trace = replay_fn(
                        base_trace,
                        job.step_id,
                        scenario.strategy,
                        scenario.modifications,
                    )
                    replay_trace.name = f"{base_trace.name} ({scenario.name})"
                    if replay_trace.replay:
                        system_meta = replay_trace.replay.modifications.get("__system__", {})
                        system_meta["jobId"] = job.id
                        system_meta["scenarioId"] = scenario.id
                        system_meta["tenantId"] = job.tenant_id
                        replay_trace.replay.modifications["__system__"] = system_meta
                    store.ingest_trace(replay_trace)
                    if job.status == "canceled" or scenario.status == "canceled":
                        break
                    self.complete_scenario(job_id, scenario.id, replay_trace.id)
                    last_error = None
                    break
                except Exception as exc:  # pragma: no cover - defensive fallback
                    last_error = exc
            if last_error is not None:
                self.fail_scenario(job_id, scenario.id, str(last_error), attempt)
        return job

    def get_matrix(self, job_id: str, store: TraceStore) -> Optional[Dict[str, Any]]:
        if job_id in self._matrix_cache:
            return self._matrix_cache[job_id]
        job = self._jobs.get(job_id)
        if not job:
            return None
        from .matrix import build_matrix_summary

        matrix = build_matrix_summary(store, job)
        if job.status in FINAL_JOB_STATES:
            self._matrix_cache[job_id] = matrix
        return matrix

    def _find_scenario(self, job: ReplayJob, scenario_id: str) -> Optional[ReplayScenario]:
        return next((scenario for scenario in job.scenarios if scenario.id == scenario_id), None)

    def _refresh_job_status(self, job: ReplayJob) -> None:
        statuses = {scenario.status for scenario in job.scenarios}
        if statuses.issubset({"completed"}):
            job.status = "completed"
            if not job.ended_at:
                job.ended_at = _now_iso()
            return
        if "failed" in statuses:
            job.status = "failed"
            if not job.ended_at:
                job.ended_at = _now_iso()
            return
        if "running" in statuses:
            job.status = "running"
            if not job.started_at:
                job.started_at = _now_iso()
            return
        if statuses.issubset({"canceled"}):
            job.status = "canceled"
            if not job.ended_at:
                job.ended_at = _now_iso()
            return
        job.status = "queued"

    def _validate_strategy(self, strategy: str) -> str:
        if strategy not in VALID_REPLAY_STRATEGIES:
            raise ValueError(f"strategy must be one of {sorted(VALID_REPLAY_STRATEGIES)}")
        return strategy

    def _normalize_tenant(self, tenant_id: str) -> str:
        normalized = str(tenant_id or "").strip().lower()
        return normalized or "public"

    def _persist(self) -> None:
        if not self._persist_path:
            return
        payload = {
            "jobs": [self._serialize_job(job) for job in self._jobs.values()],
            "deadLetters": [item.to_dict() for item in self._dead_letters],
        }
        temp_path = self._persist_path.with_suffix(".tmp")
        temp_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        temp_path.replace(self._persist_path)

    def _load(self) -> None:
        if not self._persist_path or not self._persist_path.exists():
            return
        try:
            payload = json.loads(self._persist_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return
        jobs = payload.get("jobs") if isinstance(payload, dict) else []
        for item in jobs if isinstance(jobs, list) else []:
            job = self._deserialize_job(item)
            if job:
                self._jobs[job.id] = job
        dead_letters = payload.get("deadLetters") if isinstance(payload, dict) else []
        for item in dead_letters if isinstance(dead_letters, list) else []:
            if not isinstance(item, dict):
                continue
            self._dead_letters.append(
                ReplayDeadLetter(
                    id=str(item.get("id") or f"dead-{uuid4().hex[:12]}"),
                    job_id=str(item.get("jobId") or ""),
                    scenario_id=str(item.get("scenarioId") or ""),
                    tenant_id=self._normalize_tenant(str(item.get("tenantId") or "public")),
                    error=str(item.get("error") or "unknown"),
                    attempt_count=int(item.get("attemptCount") or 0),
                    created_at=str(item.get("createdAt") or _now_iso()),
                )
            )

    def _serialize_job(self, job: ReplayJob) -> Dict[str, Any]:
        return {
            "id": job.id,
            "traceId": job.trace_id,
            "stepId": job.step_id,
            "tenantId": job.tenant_id,
            "status": job.status,
            "createdAt": job.created_at,
            "startedAt": job.started_at,
            "endedAt": job.ended_at,
            "deadLetterCount": job.dead_letter_count,
            "scenarios": [
                {
                    "id": scenario.id,
                    "name": scenario.name,
                    "strategy": scenario.strategy,
                    "modifications": scenario.modifications,
                    "status": scenario.status,
                    "attempts": scenario.attempts,
                    "startedAt": scenario.started_at,
                    "endedAt": scenario.ended_at,
                    "replayTraceId": scenario.replay_trace_id,
                    "error": scenario.error,
                }
                for scenario in job.scenarios
            ],
        }

    def _deserialize_job(self, payload: Any) -> Optional[ReplayJob]:
        if not isinstance(payload, dict):
            return None
        job_id = str(payload.get("id") or "").strip()
        trace_id = str(payload.get("traceId") or "").strip()
        step_id = str(payload.get("stepId") or "").strip()
        if not job_id or not trace_id or not step_id:
            return None
        scenarios_payload = payload.get("scenarios") if isinstance(payload.get("scenarios"), list) else []
        scenarios: List[ReplayScenario] = []
        for item in scenarios_payload:
            if not isinstance(item, dict):
                continue
            scenarios.append(
                ReplayScenario(
                    id=str(item.get("id") or f"scn-{uuid4().hex[:12]}"),
                    name=str(item.get("name") or "Scenario"),
                    strategy=self._validate_strategy(str(item.get("strategy") or "hybrid")),
                    modifications=dict(item.get("modifications") or {}),
                    status=str(item.get("status") or "queued"),
                    attempts=int(item.get("attempts") or 0),
                    started_at=str(item.get("startedAt") or "") or None,
                    ended_at=str(item.get("endedAt") or "") or None,
                    replay_trace_id=str(item.get("replayTraceId") or "") or None,
                    error=str(item.get("error") or "") or None,
                )
            )
        return ReplayJob(
            id=job_id,
            trace_id=trace_id,
            step_id=step_id,
            tenant_id=self._normalize_tenant(str(payload.get("tenantId") or "public")),
            scenarios=scenarios,
            status=str(payload.get("status") or "queued"),
            created_at=str(payload.get("createdAt") or _now_iso()),
            started_at=str(payload.get("startedAt") or "") or None,
            ended_at=str(payload.get("endedAt") or "") or None,
            dead_letter_count=int(payload.get("deadLetterCount") or 0),
        )
