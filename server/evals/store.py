from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from ..trace.store import TraceStore


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@dataclass
class EvalCase:
    id: str
    trace_id: str
    tenant_id: str
    name: str
    assertions: Dict[str, Any]
    created_at: str = field(default_factory=_now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "traceId": self.trace_id,
            "tenantId": self.tenant_id,
            "name": self.name,
            "assertions": self.assertions,
            "createdAt": self.created_at,
        }


@dataclass
class EvalRun:
    id: str
    tenant_id: str
    status: str
    scores: List[Dict[str, Any]]
    created_at: str = field(default_factory=_now_iso)

    def to_dict(self) -> Dict[str, Any]:
        passed = sum(1 for score in self.scores if score.get("passed") is True)
        failed = sum(1 for score in self.scores if score.get("passed") is False)
        return {
            "id": self.id,
            "tenantId": self.tenant_id,
            "status": self.status,
            "createdAt": self.created_at,
            "caseCount": len(self.scores),
            "passedCount": passed,
            "failedCount": failed,
            "scores": self.scores,
        }


class EvalStore:
    def __init__(self, persist_path: Optional[Path] = None) -> None:
        self._cases: Dict[str, EvalCase] = {}
        self._runs: Dict[str, EvalRun] = {}
        self._persist_path = persist_path
        if self._persist_path:
            self._persist_path.parent.mkdir(parents=True, exist_ok=True)
            self._load()

    def create_case_from_trace(
        self,
        trace_store: TraceStore,
        trace_id: str,
        tenant_id: str = "public",
        step_id: Optional[str] = None,
        name: Optional[str] = None,
    ) -> EvalCase:
        if not trace_id.strip():
            raise ValueError("trace_id must be non-empty")
        trace = trace_store.get_summary(trace_id)
        if step_id and not any(step.id == step_id for step in trace.steps):
            raise ValueError("step_id not found in trace")
        critical_step_ids = [step_id] if step_id else [step.id for step in trace.steps if step.status == "failed"]
        assertions = {
            "expectedStatus": trace.status,
            "expectedErrorCount": trace.metadata.errorCount or sum(1 for step in trace.steps if step.status == "failed"),
            "minStepCount": len(trace.steps),
            "criticalStepIds": critical_step_ids,
        }
        case = EvalCase(
            id=f"case-{uuid4().hex[:12]}",
            trace_id=trace.id,
            tenant_id=self._normalize_tenant(tenant_id),
            name=str(name or f"{trace.name} regression"),
            assertions=assertions,
        )
        self._cases[case.id] = case
        self._persist()
        return case

    def list_cases(self, tenant_id: str = "public") -> List[EvalCase]:
        normalized = self._normalize_tenant(tenant_id)
        return [case for case in self._cases.values() if case.tenant_id == normalized]

    def get_run(self, run_id: str, tenant_id: str = "public") -> Optional[EvalRun]:
        run = self._runs.get(run_id)
        if not run or run.tenant_id != self._normalize_tenant(tenant_id):
            return None
        return run

    def run_cases(
        self,
        trace_store: TraceStore,
        case_ids: Optional[List[str]] = None,
        tenant_id: str = "public",
    ) -> EvalRun:
        normalized = self._normalize_tenant(tenant_id)
        candidates = self.list_cases(normalized)
        if case_ids:
            requested = set(case_ids)
            candidates = [case for case in candidates if case.id in requested]
            missing = requested - {case.id for case in candidates}
            if missing:
                raise ValueError(f"eval case not found: {sorted(missing)[0]}")
        if not candidates:
            raise ValueError("no eval cases available")
        scores = [self._score_case(trace_store, case) for case in candidates]
        run = EvalRun(
            id=f"run-{uuid4().hex[:12]}",
            tenant_id=normalized,
            status="passed" if all(score["passed"] for score in scores) else "failed",
            scores=scores,
        )
        self._runs[run.id] = run
        self._persist()
        return run

    def _score_case(self, trace_store: TraceStore, case: EvalCase) -> Dict[str, Any]:
        trace = trace_store.get_summary(case.trace_id)
        assertions = case.assertions
        actual_error_count = trace.metadata.errorCount or sum(1 for step in trace.steps if step.status == "failed")
        critical_step_ids = set(assertions.get("criticalStepIds") or [])
        present_step_ids = {step.id for step in trace.steps}
        checks = [
            {
                "name": "status",
                "passed": trace.status == assertions.get("expectedStatus"),
                "expected": assertions.get("expectedStatus"),
                "actual": trace.status,
            },
            {
                "name": "error_count",
                "passed": actual_error_count == assertions.get("expectedErrorCount"),
                "expected": assertions.get("expectedErrorCount"),
                "actual": actual_error_count,
            },
            {
                "name": "step_count",
                "passed": len(trace.steps) >= int(assertions.get("minStepCount") or 0),
                "expected": assertions.get("minStepCount"),
                "actual": len(trace.steps),
            },
            {
                "name": "critical_steps",
                "passed": critical_step_ids.issubset(present_step_ids),
                "expected": sorted(critical_step_ids),
                "actual": sorted(present_step_ids.intersection(critical_step_ids)),
            },
        ]
        passed_count = sum(1 for check in checks if check["passed"])
        return {
            "caseId": case.id,
            "traceId": case.trace_id,
            "passed": passed_count == len(checks),
            "score": passed_count / len(checks),
            "checks": checks,
        }

    def _persist(self) -> None:
        if not self._persist_path:
            return
        payload = {
            "cases": [case.to_dict() for case in self._cases.values()],
            "runs": [run.to_dict() for run in self._runs.values()],
        }
        self._persist_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    def _load(self) -> None:
        if not self._persist_path or not self._persist_path.exists():
            return
        payload = json.loads(self._persist_path.read_text(encoding="utf-8"))
        for item in payload.get("cases", []):
            case = EvalCase(
                id=str(item.get("id")),
                trace_id=str(item.get("traceId")),
                tenant_id=self._normalize_tenant(str(item.get("tenantId") or "public")),
                name=str(item.get("name") or "Eval case"),
                assertions=dict(item.get("assertions") or {}),
                created_at=str(item.get("createdAt") or _now_iso()),
            )
            self._cases[case.id] = case
        for item in payload.get("runs", []):
            run = EvalRun(
                id=str(item.get("id")),
                tenant_id=self._normalize_tenant(str(item.get("tenantId") or "public")),
                status=str(item.get("status") or "failed"),
                scores=list(item.get("scores") or []),
                created_at=str(item.get("createdAt") or _now_iso()),
            )
            self._runs[run.id] = run

    def _normalize_tenant(self, tenant_id: str) -> str:
        normalized = str(tenant_id or "").strip().lower()
        return normalized or "public"
