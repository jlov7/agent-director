from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
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
            "startedAt": self.started_at,
            "endedAt": self.ended_at,
            "replayTraceId": self.replay_trace_id,
            "error": self.error,
        }


@dataclass
class ReplayJob:
    id: str
    trace_id: str
    step_id: str
    scenarios: List[ReplayScenario] = field(default_factory=list)
    status: str = "queued"
    created_at: str = field(default_factory=_now_iso)
    started_at: Optional[str] = None
    ended_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        completed = sum(1 for scenario in self.scenarios if scenario.status == "completed")
        failed = sum(1 for scenario in self.scenarios if scenario.status == "failed")
        canceled = sum(1 for scenario in self.scenarios if scenario.status == "canceled")
        return {
            "id": self.id,
            "traceId": self.trace_id,
            "stepId": self.step_id,
            "status": self.status,
            "createdAt": self.created_at,
            "startedAt": self.started_at,
            "endedAt": self.ended_at,
            "scenarioCount": len(self.scenarios),
            "completedCount": completed,
            "failedCount": failed,
            "canceledCount": canceled,
            "scenarios": [scenario.to_dict() for scenario in self.scenarios],
        }


class ReplayJobStore:
    def __init__(self) -> None:
        self._jobs: Dict[str, ReplayJob] = {}
        self._matrix_cache: Dict[str, Dict[str, Any]] = {}

    def create_job(
        self, trace_id: str, step_id: str, scenarios: List[Dict[str, Any]]
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
            scenarios=replay_scenarios,
        )
        self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> Optional[ReplayJob]:
        return self._jobs.get(job_id)

    def list(self) -> List[ReplayJob]:
        return list(self._jobs.values())

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
            return scenario

        self._refresh_job_status(job)
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

    def fail_scenario(self, job_id: str, scenario_id: str, error: str) -> None:
        job = self._jobs.get(job_id)
        if not job or job.status in FINAL_JOB_STATES:
            return
        scenario = self._find_scenario(job, scenario_id)
        if not scenario:
            return
        scenario.status = "failed"
        scenario.error = error
        scenario.ended_at = _now_iso()
        self._refresh_job_status(job)
        self._matrix_cache.pop(job_id, None)

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
        return job

    def execute_job(
        self,
        job_id: str,
        store: TraceStore,
        replay_fn=replay_from_step,
    ) -> Optional[ReplayJob]:
        job = self._jobs.get(job_id)
        if not job or job.status in FINAL_JOB_STATES:
            return job

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
            return job

        while True:
            scenario = self.start_next_scenario(job_id)
            if scenario is None:
                break

            # Job may have been canceled while queued.
            if job.status == "canceled" or scenario.status == "canceled":
                break

            last_error = None
            for _ in range(MAX_REPLAY_ATTEMPTS):
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
                self.fail_scenario(job_id, scenario.id, str(last_error))
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
