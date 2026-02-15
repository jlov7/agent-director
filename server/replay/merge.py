from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from datetime import datetime, timezone
from typing import Dict, Literal

from ..trace.schema import ReplayInfo, StepSummary, TraceMetadata, TraceSummary

MergeStrategy = Literal["prefer_left", "prefer_right"]


def merge_replays(
    base: TraceSummary,
    left: TraceSummary,
    right: TraceSummary,
    strategy: MergeStrategy = "prefer_right",
) -> TraceSummary:
    if strategy not in {"prefer_left", "prefer_right"}:
        raise ValueError("strategy must be prefer_left or prefer_right")

    merged = deepcopy(base)
    merged.id = _deterministic_merge_id(base.id, left.id, right.id, strategy)
    merged.parentTraceId = base.id
    merged.branchPointStepId = base.branchPointStepId

    base_by_id = {step.id: step for step in base.steps}
    left_by_id = {step.id: step for step in left.steps}
    right_by_id = {step.id: step for step in right.steps}

    merged_steps = []
    for base_step in base.steps:
        chosen = _pick_step(
            base_step,
            left_by_id.get(base_step.id),
            right_by_id.get(base_step.id),
            strategy,
        )
        merged_steps.append(deepcopy(chosen))
    merged.steps = merged_steps

    merged.metadata = TraceMetadata(
        source=base.metadata.source,
        agentName=base.metadata.agentName,
        modelId=base.metadata.modelId,
        wallTimeMs=max(left.metadata.wallTimeMs, right.metadata.wallTimeMs, base.metadata.wallTimeMs),
        workTimeMs=max(left.metadata.workTimeMs or 0, right.metadata.workTimeMs or 0, base.metadata.workTimeMs or 0),
        totalTokens=max(left.metadata.totalTokens or 0, right.metadata.totalTokens or 0, base.metadata.totalTokens or 0),
        totalCostUsd=max(
            left.metadata.totalCostUsd or 0.0,
            right.metadata.totalCostUsd or 0.0,
            base.metadata.totalCostUsd or 0.0,
        ),
        errorCount=max(left.metadata.errorCount or 0, right.metadata.errorCount or 0, base.metadata.errorCount or 0),
        retryCount=max(left.metadata.retryCount or 0, right.metadata.retryCount or 0, base.metadata.retryCount or 0),
    )
    merged.status = _merged_status(merged.steps)
    merged.startedAt = min(
        filter(None, [base.startedAt, left.startedAt, right.startedAt]),
        default=base.startedAt,
    )
    merged.endedAt = max(
        filter(None, [base.endedAt, left.endedAt, right.endedAt]),
        default=base.endedAt,
    )
    merged.replay = ReplayInfo(
        strategy="merge",
        modifiedStepId="",
        modifications={"mergeStrategy": strategy},
        createdAt=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        checkpoints=_checkpoint_signatures(merged.steps),
        mergedFromTraceIds=sorted({left.id, right.id}),
    )
    return merged


def _deterministic_merge_id(base_id: str, left_id: str, right_id: str, strategy: str) -> str:
    payload = f"{base_id}|{left_id}|{right_id}|{strategy}"
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return f"merge-{digest[:24]}"


def _pick_step(
    base_step: StepSummary,
    left_step: StepSummary | None,
    right_step: StepSummary | None,
    strategy: MergeStrategy,
) -> StepSummary:
    left = left_step or base_step
    right = right_step or base_step

    left_changed = _signature(left) != _signature(base_step)
    right_changed = _signature(right) != _signature(base_step)

    if strategy == "prefer_left":
        if left_changed:
            return left
        if right_changed:
            return right
        return left

    if right_changed:
        return right
    if left_changed:
        return left
    return right


def _signature(step: StepSummary) -> str:
    payload = {
        "status": step.status,
        "startedAt": step.startedAt,
        "endedAt": step.endedAt,
        "durationMs": step.durationMs,
        "error": step.error,
        "preview": step.preview.to_dict() if step.preview else None,
        "metrics": step.metrics.to_dict() if step.metrics else None,
    }
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def _merged_status(steps: list[StepSummary]) -> str:
    statuses = {step.status for step in steps}
    if "failed" in statuses:
        return "failed"
    if "running" in statuses or "pending" in statuses:
        return "running"
    return "completed"


def _checkpoint_signatures(steps: list[StepSummary]) -> Dict[str, str]:
    checkpoints: Dict[str, str] = {}
    for step in steps:
        payload = json.dumps(step.to_dict(), sort_keys=True, separators=(",", ":"), ensure_ascii=True)
        checkpoints[step.id] = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]
    return checkpoints
