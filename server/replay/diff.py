from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from ..trace.schema import StepSummary, TraceSummary


def compare_traces(left: TraceSummary, right: TraceSummary) -> Dict[str, Any]:
    left_steps = {step.id: step for step in left.steps}
    right_steps = {step.id: step for step in right.steps}

    aligned_pairs = _align_steps(left, right)
    aligned_left = {pair[0] for pair in aligned_pairs}
    aligned_right = {pair[1] for pair in aligned_pairs}

    added = [step_id for step_id in right_steps.keys() if step_id not in aligned_right]
    removed = [step_id for step_id in left_steps.keys() if step_id not in aligned_left]

    changed_pairs = _changed_pairs(left_steps, right_steps, aligned_pairs)
    changed_left = [pair["leftId"] for pair in changed_pairs]

    cost_delta = (right.metadata.totalCostUsd or 0) - (left.metadata.totalCostUsd or 0)
    wall_delta = right.metadata.wallTimeMs - left.metadata.wallTimeMs

    return {
        "addedSteps": added,
        "removedSteps": removed,
        "changedSteps": changed_left,
        "changedPairs": changed_pairs,
        "alignedSteps": [{"leftId": left_id, "rightId": right_id} for left_id, right_id in aligned_pairs],
        "costDeltaUsd": round(cost_delta, 6),
        "wallTimeDeltaMs": wall_delta,
    }


def _changed_pairs(
    left_steps: Dict[str, StepSummary],
    right_steps: Dict[str, StepSummary],
    aligned_pairs: List[Tuple[str, str]],
) -> List[Dict[str, str]]:
    changed: List[Dict[str, str]] = []
    for left_id, right_id in aligned_pairs:
        left = left_steps.get(left_id)
        right = right_steps.get(right_id)
        if not left or not right:
            continue
        if _summary_signature(left) != _summary_signature(right):
            changed.append({"leftId": left_id, "rightId": right_id})
    return changed


def _summary_signature(step: StepSummary) -> tuple:
    preview = step.preview.outputPreview if step.preview else None
    metrics = step.metrics.costUsd if step.metrics else None
    return (step.status, preview, metrics)


def _align_steps(left: TraceSummary, right: TraceSummary) -> List[Tuple[str, str]]:
    aligned: List[Tuple[str, str]] = []
    left_unmatched = {step.id for step in left.steps}
    right_unmatched = {step.id for step in right.steps}

    for step_id in sorted(left_unmatched.intersection(right_unmatched)):
        aligned.append((step_id, step_id))
        left_unmatched.discard(step_id)
        right_unmatched.discard(step_id)

    right_by_tool = {step.toolCallId: step.id for step in right.steps if step.toolCallId}

    for step in left.steps:
        if not step.toolCallId:
            continue
        right_id = right_by_tool.get(step.toolCallId)
        if right_id and right_id in right_unmatched:
            aligned.append((step.id, right_id))
            left_unmatched.discard(step.id)
            right_unmatched.discard(right_id)

    left_relative = _relative_start_map(left)
    right_relative = _relative_start_map(right)
    threshold_ms = _alignment_threshold(left, right)

    candidates: Dict[str, List[str]] = {}
    for step_id in right_unmatched:
        step = right_relative.get(step_id)
        signature = _signature(step.step) if step else None
        if not signature:
            continue
        candidates.setdefault(signature, []).append(step_id)

    for signature, step_ids in candidates.items():
        step_ids.sort(key=lambda step_id: right_relative[step_id].start_ms or 0)

    for step_id in list(left_unmatched):
        step_info = left_relative.get(step_id)
        signature = _signature(step_info.step) if step_info else None
        if not signature or signature not in candidates:
            continue
        best_id, best_delta = _find_best_match(step_info, candidates[signature], right_relative, threshold_ms)
        if best_id:
            aligned.append((step_id, best_id))
            left_unmatched.discard(step_id)
            right_unmatched.discard(best_id)
            candidates[signature].remove(best_id)

    return aligned


def _signature(step: StepSummary) -> Optional[str]:
    if not step.type:
        return None
    name = step.name or ""
    return f"{step.type}:{name}"


class _StepTime:
    def __init__(self, step: StepSummary, start_ms: Optional[int]) -> None:
        self.step = step
        self.start_ms = start_ms


def _relative_start_map(trace: TraceSummary) -> Dict[str, _StepTime]:
    trace_start = _parse_iso(trace.startedAt)
    relative: Dict[str, _StepTime] = {}
    for step in trace.steps:
        if not trace_start:
            relative[step.id] = _StepTime(step, None)
            continue
        start = _parse_iso(step.startedAt)
        if not start:
            relative[step.id] = _StepTime(step, None)
            continue
        start_ms = int((start - trace_start).total_seconds() * 1000)
        relative[step.id] = _StepTime(step, start_ms)
    return relative


def _parse_iso(value: Optional[str]):
    if not value:
        return None
    from datetime import datetime

    try:
        if value.endswith("Z"):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _alignment_threshold(left: TraceSummary, right: TraceSummary) -> int:
    base = max(left.metadata.wallTimeMs, right.metadata.wallTimeMs, 1)
    return max(1000, min(5000, int(base * 0.1)))


def _find_best_match(
    left_step: _StepTime,
    right_candidates: List[str],
    right_relative: Dict[str, _StepTime],
    threshold_ms: int,
) -> Tuple[Optional[str], int]:
    if left_step.start_ms is None:
        return None, threshold_ms
    best_id = None
    best_delta = threshold_ms + 1
    for candidate_id in right_candidates:
        candidate = right_relative.get(candidate_id)
        if not candidate or candidate.start_ms is None:
            continue
        delta = abs(candidate.start_ms - left_step.start_ms)
        if delta < best_delta:
            best_delta = delta
            best_id = candidate_id
    if best_delta <= threshold_ms:
        return best_id, best_delta
    return None, best_delta
