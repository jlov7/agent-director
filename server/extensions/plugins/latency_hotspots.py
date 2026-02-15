from __future__ import annotations

from typing import Any, Dict

PLUGIN_ID = "latency_hotspots"
PLUGIN_NAME = "Latency Hotspots"
PLUGIN_DESCRIPTION = "Returns top runtime steps and aggregate bottleneck share."


def run(trace: Any) -> Dict[str, Any]:
    sorted_steps = sorted(trace.steps, key=lambda step: step.durationMs or 0, reverse=True)
    top = [
        {
            "stepId": step.id,
            "name": step.name,
            "durationMs": step.durationMs or 0,
            "status": step.status,
        }
        for step in sorted_steps[:3]
    ]
    wall = max(1, trace.metadata.wallTimeMs or 1)
    total_top = sum(item["durationMs"] for item in top)
    return {
        "extensionId": PLUGIN_ID,
        "traceId": trace.id,
        "topLatencySteps": top,
        "bottleneckShare": round(total_top / wall, 4),
    }
