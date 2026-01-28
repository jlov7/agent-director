from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict, List, Set
from uuid import uuid4

from ..trace.schema import ReplayInfo, StepSummary, TraceMetadata, TraceSummary


def replay_from_step(
    trace: TraceSummary,
    step_id: str,
    strategy: str,
    modifications: Dict[str, Any],
) -> TraceSummary:
    new_trace = deepcopy(trace)
    new_trace.id = uuid4().hex
    new_trace.parentTraceId = trace.id
    new_trace.branchPointStepId = step_id
    invalidated = _compute_invalidated_steps(new_trace.steps, step_id, strategy)
    system_meta = {"invalidatedStepIds": sorted(invalidated), "strategy": strategy}
    merged_modifications = {**modifications, "__system__": system_meta}
    new_trace.replay = ReplayInfo(
        strategy=strategy,
        modifiedStepId=step_id,
        modifications=merged_modifications,
        createdAt=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )

    _shift_times(new_trace, datetime.now(timezone.utc))
    _apply_modifications(new_trace.steps, step_id, modifications)
    if invalidated:
        _invalidate_steps(new_trace, invalidated)

    new_trace.metadata = TraceMetadata(
        source=trace.metadata.source,
        agentName=trace.metadata.agentName,
        modelId=trace.metadata.modelId,
        wallTimeMs=trace.metadata.wallTimeMs,
        workTimeMs=trace.metadata.workTimeMs,
        totalTokens=trace.metadata.totalTokens,
        totalCostUsd=trace.metadata.totalCostUsd,
        errorCount=trace.metadata.errorCount,
        retryCount=trace.metadata.retryCount,
    )

    return new_trace


def _shift_times(trace: TraceSummary, new_start: datetime) -> None:
    fmt = "%Y-%m-%dT%H:%M:%S.%fZ"
    try:
        old_start = datetime.strptime(trace.startedAt, fmt)
    except ValueError:
        return
    if old_start.tzinfo is None:
        old_start = old_start.replace(tzinfo=timezone.utc)
    delta = new_start - old_start

    trace.startedAt = (old_start + delta).isoformat(timespec="milliseconds") + "Z"
    if trace.endedAt:
        try:
            old_end = datetime.strptime(trace.endedAt, fmt)
        except ValueError:
            old_end = old_start
        if old_end.tzinfo is None:
            old_end = old_end.replace(tzinfo=timezone.utc)
        trace.endedAt = (old_end + delta).isoformat(timespec="milliseconds") + "Z"

    for step in trace.steps:
        try:
            step_start = datetime.strptime(step.startedAt, fmt)
        except ValueError:
            continue
        if step_start.tzinfo is None:
            step_start = step_start.replace(tzinfo=timezone.utc)
        step.startedAt = (step_start + delta).isoformat(timespec="milliseconds") + "Z"
        if step.endedAt:
            try:
                step_end = datetime.strptime(step.endedAt, fmt)
            except ValueError:
                step_end = step_start
            if step_end.tzinfo is None:
                step_end = step_end.replace(tzinfo=timezone.utc)
            step.endedAt = (step_end + delta).isoformat(timespec="milliseconds") + "Z"


def _apply_modifications(
    steps: list[StepSummary], step_id: str, modifications: Dict[str, Any]
) -> None:
    for step in steps:
        if step.id != step_id:
            continue
        if step.preview:
            suffix = f" (modified: {', '.join(modifications.keys())})" if modifications else " (modified)"
            if step.preview.outputPreview:
                step.preview.outputPreview += suffix
            else:
                step.preview.outputPreview = suffix.strip()
        break


def _compute_invalidated_steps(
    steps: List[StepSummary], step_id: str, strategy: str
) -> Set[str]:
    if strategy == "recorded":
        return set()
    if strategy == "live":
        cutoff = next((step.index for step in steps if step.id == step_id), -1)
        return {step.id for step in steps if step.index > cutoff}

    step_by_id = {step.id: step for step in steps}
    emitted_by_step: Dict[str, Set[str]] = {}
    consumers_by_call: Dict[str, Set[str]] = {}
    tool_step_by_call: Dict[str, str] = {}
    children: Dict[str, List[str]] = {}

    for step in steps:
        if step.parentStepId:
            children.setdefault(step.parentStepId, []).append(step.id)
        if step.type == "tool_call" and step.toolCallId:
            tool_step_by_call[step.toolCallId] = step.id
        if step.type == "llm_call" and step.io:
            emitted_by_step[step.id] = set(step.io.emittedToolCallIds)
            for call_id in step.io.consumedToolCallIds:
                consumers_by_call.setdefault(call_id, set()).add(step.id)

    invalidated: Set[str] = set()
    queue = [step_id]
    invalidated.add(step_id)

    while queue:
        current = queue.pop(0)
        current_step = step_by_id.get(current)
        if not current_step:
            continue
        for child_id in children.get(current, []):
            if child_id not in invalidated:
                invalidated.add(child_id)
                queue.append(child_id)
        if current_step.type == "llm_call":
            for call_id in emitted_by_step.get(current, set()):
                tool_step = tool_step_by_call.get(call_id)
                if tool_step and tool_step not in invalidated:
                    invalidated.add(tool_step)
                    queue.append(tool_step)
        if current_step.type == "tool_call" and current_step.toolCallId:
            for consumer_id in consumers_by_call.get(current_step.toolCallId, set()):
                if consumer_id not in invalidated:
                    invalidated.add(consumer_id)
                    queue.append(consumer_id)

    invalidated.discard(step_id)
    return invalidated


def _invalidate_steps(trace: TraceSummary, invalidated: Set[str]) -> None:
    for step in trace.steps:
        if step.id not in invalidated:
            continue
        step.status = "pending"
        step.endedAt = None
        step.durationMs = None
        step.metrics = None
        if step.preview:
            step.preview.outputPreview = "[invalidated for replay]"
    trace.status = "running"
    trace.endedAt = None
