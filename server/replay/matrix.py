from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List

from .diff import compare_traces
from .jobs import ReplayJob
from ..trace.store import TraceStore


def build_matrix_summary(store: TraceStore, job: ReplayJob) -> Dict[str, Any]:
    base_trace = store.get_summary(job.trace_id)
    base_cost = float(base_trace.metadata.totalCostUsd or 0.0)
    base_errors = int(base_trace.metadata.errorCount or 0)
    base_retries = int(base_trace.metadata.retryCount or 0)
    base_wall = int(base_trace.metadata.wallTimeMs or 0)

    rows: List[Dict[str, Any]] = []
    for scenario in job.scenarios:
        row: Dict[str, Any] = {
            "scenarioId": scenario.id,
            "name": scenario.name,
            "strategy": scenario.strategy,
            "status": scenario.status,
            "replayTraceId": scenario.replay_trace_id,
            "modifications": scenario.modifications,
            "error": scenario.error,
            "changedStepIds": [],
            "addedStepIds": [],
            "removedStepIds": [],
            "metrics": {
                "costDeltaUsd": None,
                "wallTimeDeltaMs": None,
                "errorDelta": None,
                "retryDelta": None,
                "changedSteps": 0,
                "addedSteps": 0,
                "removedSteps": 0,
                "invalidatedStepCount": 0,
            },
        }

        if scenario.replay_trace_id and scenario.status == "completed":
            replay_trace = store.get_summary(scenario.replay_trace_id)
            diff = compare_traces(base_trace, replay_trace)
            replay_cost = float(replay_trace.metadata.totalCostUsd or 0.0)
            replay_errors = int(replay_trace.metadata.errorCount or 0)
            replay_retries = int(replay_trace.metadata.retryCount or 0)
            replay_wall = int(replay_trace.metadata.wallTimeMs or 0)
            invalidated = (
                replay_trace.replay.modifications.get("__system__", {}).get("invalidatedStepIds", [])
                if replay_trace.replay
                else []
            )
            row["metrics"] = {
                "costDeltaUsd": round(replay_cost - base_cost, 6),
                "wallTimeDeltaMs": replay_wall - base_wall,
                "errorDelta": replay_errors - base_errors,
                "retryDelta": replay_retries - base_retries,
                "changedSteps": len(diff.get("changedSteps", [])),
                "addedSteps": len(diff.get("addedSteps", [])),
                "removedSteps": len(diff.get("removedSteps", [])),
                "invalidatedStepCount": len(invalidated),
            }
            row["changedStepIds"] = diff.get("changedSteps", [])
            row["addedStepIds"] = diff.get("addedSteps", [])
            row["removedStepIds"] = diff.get("removedSteps", [])
        rows.append(row)

    return {
        "jobId": job.id,
        "traceId": job.trace_id,
        "stepId": job.step_id,
        "rows": rows,
        "causalRanking": rank_causal_factors(rows),
    }


def rank_causal_factors(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    factor_scores: Dict[str, List[float]] = defaultdict(list)
    factor_examples: Dict[str, List[str]] = defaultdict(list)
    completed_rows = [row for row in rows if row.get("status") == "completed"]
    denominator = max(1, len(completed_rows))

    for row in completed_rows:
        metrics = row.get("metrics", {})
        score = _impact_score(metrics)
        modifications = row.get("modifications", {}) or {}
        if not isinstance(modifications, dict):
            continue
        for factor, value in modifications.items():
            factor_scores[str(factor)].append(score)
            if len(factor_examples[str(factor)]) < 3:
                factor_examples[str(factor)].append(_compact_example(factor, value))

    ranked: List[Dict[str, Any]] = []
    for factor, scores in factor_scores.items():
        avg_score = sum(scores) / len(scores)
        confidence = min(1.0, len(scores) / denominator)
        weighted_score = avg_score * confidence
        ranked.append(
            {
                "factor": factor,
                "score": round(weighted_score, 4),
                "confidence": round(confidence, 3),
                "evidence": {
                    "samples": len(scores),
                    "examples": factor_examples.get(factor, []),
                    "positive": sum(1 for item in scores if item > 0),
                    "negative": sum(1 for item in scores if item < 0),
                },
            }
        )

    ranked.sort(key=lambda item: (-item["score"], -item["confidence"], item["factor"]))
    return ranked


def _impact_score(metrics: Dict[str, Any]) -> float:
    wall = float(metrics.get("wallTimeDeltaMs") or 0.0)
    cost = float(metrics.get("costDeltaUsd") or 0.0)
    error = float(metrics.get("errorDelta") or 0.0)
    retry = float(metrics.get("retryDelta") or 0.0)
    changed_steps = float(metrics.get("changedSteps") or 0.0)

    wall_component = -wall / 1000.0
    cost_component = -cost * 100.0
    error_component = -error * 2.0
    retry_component = -retry * 0.5
    churn_penalty = max(0.0, changed_steps - 5.0) * -0.05
    return wall_component + cost_component + error_component + retry_component + churn_penalty


def _compact_example(factor: str, value: Any) -> str:
    text = f"{factor}={value}"
    return text if len(text) <= 80 else f"{text[:77]}..."
