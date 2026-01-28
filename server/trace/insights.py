from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from .schema import StepSummary, TraceSummary


def compute_insights(trace: TraceSummary) -> Dict[str, Any]:
    durations = _durations(trace.steps)
    top_latency = sorted(durations, key=lambda item: item["durationMs"], reverse=True)[:3]
    cost_by_type = _cost_by_type(trace.steps)
    cost_by_tool = _cost_by_tool(trace.steps)
    cost_by_model = _cost_by_model(trace)

    error_count = sum(1 for step in trace.steps if step.status == "failed")
    retry_count = sum(1 for step in trace.steps if step.retryOfStepId)

    wall_time_ms = trace.metadata.wallTimeMs
    work_time_ms = trace.metadata.workTimeMs or sum(item["durationMs"] for item in durations)
    timing = _timing_health(trace)
    io_warnings = _io_warnings(trace.steps)
    critical_path_ms = _critical_path_ms(trace.steps)
    concurrency = _concurrency_heatmap(trace, bucket_count=12)
    retry_patterns = _retry_patterns(trace.steps)

    return {
        "topLatencySteps": top_latency,
        "costByType": cost_by_type,
        "costByTool": cost_by_tool,
        "costByModel": cost_by_model,
        "errors": error_count,
        "retries": retry_count,
        "wallTimeMs": wall_time_ms,
        "workTimeMs": work_time_ms,
        "timing": timing,
        "ioWarnings": io_warnings,
        "criticalPathMs": critical_path_ms,
        "concurrency": concurrency,
        "retryPatterns": retry_patterns,
    }


def _durations(steps: List[StepSummary]) -> List[Dict[str, Any]]:
    result = []
    for step in steps:
        duration = step.durationMs
        if duration is None:
            duration = _fallback_duration(step.startedAt, step.endedAt)
        result.append({"stepId": step.id, "name": step.name, "durationMs": duration or 0})
    return result


def _cost_by_type(steps: List[StepSummary]) -> Dict[str, float]:
    totals: Dict[str, float] = {}
    for step in steps:
        if step.metrics and step.metrics.costUsd is not None:
            totals[step.type] = totals.get(step.type, 0.0) + float(step.metrics.costUsd)
    return totals


def _cost_by_tool(steps: List[StepSummary]) -> Dict[str, float]:
    totals: Dict[str, float] = {}
    for step in steps:
        if step.type != "tool_call":
            continue
        if step.metrics and step.metrics.costUsd is not None:
            totals[step.name] = totals.get(step.name, 0.0) + float(step.metrics.costUsd)
    return totals


def _cost_by_model(trace: TraceSummary) -> Dict[str, float]:
    total = trace.metadata.totalCostUsd or 0.0
    return {trace.metadata.modelId: float(total)}


def _fallback_duration(started_at: str, ended_at: str | None) -> int:
    if not started_at:
        return 0
    from datetime import datetime

    fmt = "%Y-%m-%dT%H:%M:%S.%fZ"
    try:
        start = datetime.strptime(started_at, fmt)
        end = datetime.strptime(ended_at or started_at, fmt)
    except ValueError:
        return 0
    return int((end - start).total_seconds() * 1000)


def _parse_iso(ts: Optional[str]) -> Optional["datetime"]:
    if not ts:
        return None
    from datetime import datetime

    try:
        if ts.endswith("Z"):
            return datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return datetime.fromisoformat(ts)
    except ValueError:
        return None


def _timing_health(trace: TraceSummary) -> Dict[str, Any]:
    trace_start = _parse_iso(trace.startedAt)
    trace_end = _parse_iso(trace.endedAt) if trace.endedAt else None

    missing_steps: List[str] = []
    skewed_steps: List[str] = []
    issues: List[str] = []

    if not trace_start:
        issues.append("Trace start time missing or invalid.")

    for step in trace.steps:
        start = _parse_iso(step.startedAt)
        end = _parse_iso(step.endedAt) if step.endedAt else start
        if not start:
            missing_steps.append(step.id)
            continue
        if not end:
            missing_steps.append(step.id)
            continue
        if end < start:
            skewed_steps.append(step.id)
            continue
        if trace_start and start < trace_start:
            skewed_steps.append(step.id)
        if trace_end and end > trace_end:
            skewed_steps.append(step.id)

    if missing_steps:
        issues.append(f"Missing timestamps on {len(missing_steps)} steps.")
    if skewed_steps:
        issues.append(f"Timestamp skew detected on {len(skewed_steps)} steps.")

    return {
        "degraded": bool(missing_steps or skewed_steps or (not trace_start)),
        "issues": issues,
        "missingStepIds": missing_steps,
        "skewedStepIds": skewed_steps,
    }


def _io_warnings(steps: List[StepSummary]) -> List[Dict[str, Any]]:
    tool_step_by_call_id = {step.toolCallId: step for step in steps if step.type == "tool_call" and step.toolCallId}
    emitted_ids = set()
    consumed_ids = set()

    warnings: List[Dict[str, Any]] = []

    for step in steps:
        if step.type != "llm_call" or not step.io:
            continue
        for call_id in step.io.emittedToolCallIds:
            emitted_ids.add(call_id)
            if call_id not in tool_step_by_call_id:
                warnings.append(
                    {
                        "kind": "missing_tool_step",
                        "message": f"Emitted toolCallId {call_id} has no tool step.",
                        "stepId": step.id,
                        "toolCallId": call_id,
                    }
                )
        for call_id in step.io.consumedToolCallIds:
            consumed_ids.add(call_id)
            if call_id not in tool_step_by_call_id:
                warnings.append(
                    {
                        "kind": "missing_tool_step",
                        "message": f"Consumed toolCallId {call_id} has no tool step.",
                        "stepId": step.id,
                        "toolCallId": call_id,
                    }
                )
            if call_id not in emitted_ids:
                warnings.append(
                    {
                        "kind": "consume_without_emit",
                        "message": f"Consumed toolCallId {call_id} without emission.",
                        "stepId": step.id,
                        "toolCallId": call_id,
                    }
                )

    for call_id, tool_step in tool_step_by_call_id.items():
        if call_id not in emitted_ids:
            warnings.append(
                {
                    "kind": "unemitted_tool",
                    "message": f"Tool step {tool_step.id} has toolCallId {call_id} never emitted.",
                    "stepId": tool_step.id,
                    "toolCallId": call_id,
                }
            )
        if call_id not in consumed_ids:
            warnings.append(
                {
                    "kind": "unconsumed_tool",
                    "message": f"Tool step {tool_step.id} has toolCallId {call_id} never consumed.",
                    "stepId": tool_step.id,
                    "toolCallId": call_id,
                }
            )
    return warnings


def _critical_path_ms(steps: List[StepSummary]) -> int:
    durations = {step.id: step.durationMs or 0 for step in steps}
    children: Dict[str, List[str]] = {}
    roots: List[str] = []
    for step in steps:
        if step.parentStepId:
            children.setdefault(step.parentStepId, []).append(step.id)
        else:
            roots.append(step.id)

    memo: Dict[str, int] = {}

    def visit(step_id: str) -> int:
        if step_id in memo:
            return memo[step_id]
        longest_child = 0
        for child_id in children.get(step_id, []):
            longest_child = max(longest_child, visit(child_id))
        memo[step_id] = durations.get(step_id, 0) + longest_child
        return memo[step_id]

    if not roots:
        return 0
    return max(visit(root) for root in roots)


def _concurrency_heatmap(trace: TraceSummary, bucket_count: int = 12) -> Dict[str, Any]:
    start = _parse_iso(trace.startedAt)
    end = _parse_iso(trace.endedAt) if trace.endedAt else None
    if not start:
        return {"buckets": [], "peak": 0}
    if not end:
        end = start
        for step in trace.steps:
            step_end = _parse_iso(step.endedAt) or _parse_iso(step.startedAt)
            if step_end and step_end > end:
                end = step_end

    wall_ms = max(1, int((end - start).total_seconds() * 1000))
    bucket_ms = max(1, wall_ms // bucket_count)

    buckets = []
    peak = 0
    for i in range(bucket_count):
        bucket_start = start.timestamp() * 1000 + i * bucket_ms
        bucket_end = bucket_start + bucket_ms
        active = 0
        for step in trace.steps:
            step_start = _parse_iso(step.startedAt)
            step_end = _parse_iso(step.endedAt) if step.endedAt else step_start
            if not step_start or not step_end:
                continue
            step_start_ms = step_start.timestamp() * 1000
            step_end_ms = step_end.timestamp() * 1000
            if step_end_ms >= bucket_start and step_start_ms <= bucket_end:
                active += 1
        peak = max(peak, active)
        buckets.append({"startMs": i * bucket_ms, "endMs": (i + 1) * bucket_ms, "active": active})

    return {"buckets": buckets, "peak": peak}


def _retry_patterns(steps: List[StepSummary]) -> Dict[str, Any]:
    total_steps = len(steps)
    retry_of: Dict[str, int] = {}
    for step in steps:
        if not step.retryOfStepId:
            continue
        retry_of[step.retryOfStepId] = retry_of.get(step.retryOfStepId, 0) + 1

    top_retries = sorted(retry_of.items(), key=lambda item: item[1], reverse=True)[:3]
    return {
        "totalRetries": sum(retry_of.values()),
        "retryRate": (sum(retry_of.values()) / total_steps) if total_steps else 0,
        "topRetries": [{"stepId": step_id, "count": count} for step_id, count in top_retries],
    }
