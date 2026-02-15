from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from .insights import compute_insights
from .schema import TraceSummary


def investigate_trace(trace: TraceSummary) -> Dict[str, Any]:
    insights = compute_insights(trace)
    hypotheses: List[Dict[str, Any]] = []

    failed_steps = [step for step in trace.steps if step.status == "failed"]
    if failed_steps:
        hypotheses.append(
            {
                "id": "failure-cluster",
                "title": "Failure cluster detected",
                "summary": f"{len(failed_steps)} step(s) failed; inspect first failed operation and upstream context.",
                "severity": "high",
                "confidence": 0.88,
                "evidenceStepIds": [step.id for step in failed_steps[:5]],
            }
        )

    top_latency = insights.get("topLatencySteps", [])
    if top_latency:
        worst = top_latency[0]
        if worst.get("durationMs", 0) >= 1000:
            hypotheses.append(
                {
                    "id": "latency-bottleneck",
                    "title": "Primary latency bottleneck",
                    "summary": f"Step '{worst.get('name', worst.get('stepId'))}' dominates runtime and may throttle throughput.",
                    "severity": "medium",
                    "confidence": 0.75,
                    "evidenceStepIds": [worst.get("stepId")],
                }
            )

    io_warnings = insights.get("ioWarnings", [])
    if io_warnings:
        evidence_ids = [warning.get("stepId") for warning in io_warnings if warning.get("stepId")]
        hypotheses.append(
            {
                "id": "io-contract-drift",
                "title": "I/O contract drift",
                "summary": "Tool call emission/consumption patterns are inconsistent and may cause invalid downstream assumptions.",
                "severity": "medium",
                "confidence": 0.67,
                "evidenceStepIds": list(dict.fromkeys(evidence_ids))[:5],
            }
        )

    retry_patterns = insights.get("retryPatterns") or {}
    retry_count = int(retry_patterns.get("totalRetries", 0))
    if retry_count > 0:
        evidence_ids = [item.get("stepId") for item in retry_patterns.get("topRetries", []) if item.get("stepId")]
        hypotheses.append(
            {
                "id": "instability-retries",
                "title": "Execution instability",
                "summary": f"{retry_count} retry event(s) suggest flaky dependencies or timeout pressure.",
                "severity": "medium",
                "confidence": 0.64,
                "evidenceStepIds": evidence_ids[:5],
            }
        )

    if not hypotheses:
        hypotheses.append(
            {
                "id": "no-critical-anomalies",
                "title": "No critical anomalies detected",
                "summary": "No strong root-cause signal found from automated heuristics.",
                "severity": "low",
                "confidence": 0.55,
                "evidenceStepIds": [],
            }
        )

    hypotheses.sort(key=lambda item: (_severity_rank(item["severity"]), item["confidence"]), reverse=True)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "traceId": trace.id,
        "hypotheses": hypotheses,
    }


def _severity_rank(severity: str) -> int:
    return {"low": 1, "medium": 2, "high": 3}.get(severity, 0)
