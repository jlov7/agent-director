from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4


FINAL_SCENARIO_STATES = {"completed", "failed", "canceled"}
FINAL_JOB_STATES = {"completed", "failed", "canceled"}


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


class ReplayJobStore:
    def __init__(self) -> None:
        self._jobs: Dict[str, ReplayJob] = {}

    def create_job(
        self, trace_id: str, step_id: str, scenarios: List[Dict[str, Any]]
    ) -> ReplayJob:
        if not scenarios:
            raise ValueError("scenarios must not be empty")
        replay_scenarios = [
            ReplayScenario(
                id=f"scn-{uuid4().hex[:12]}",
                name=str(scenario.get("name") or f"Scenario {index + 1}"),
                strategy=str(scenario.get("strategy") or "hybrid"),
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
        return job

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
