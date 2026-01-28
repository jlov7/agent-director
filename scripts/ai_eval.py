#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.replay.diff import compare_traces
from server.trace.redaction import apply_reveal_paths, redact_step
from server.trace.schema import StepDetails, StepSummary, TraceMetadata, TraceSummary


def eval_redaction() -> dict:
    summary = StepSummary(
        id="s1",
        index=0,
        type="tool_call",
        name="search",
        startedAt="2026-01-27T10:00:00.000Z",
        endedAt="2026-01-27T10:00:01.000Z",
        durationMs=1000,
        status="completed",
        childStepIds=[],
    )
    details = StepDetails.from_summary(summary, {"api_key": "sk-secret-12345"})
    redacted = redact_step(details)
    passed = redacted.data.get("api_key") == "[REDACTED]" and redacted.redaction is not None
    return {"name": "redaction_masks_secrets", "passed": passed}


def eval_diff() -> dict:
    base = TraceSummary(
        id="base",
        name="Base",
        startedAt="2026-01-27T10:00:00.000Z",
        endedAt="2026-01-27T10:00:02.000Z",
        status="completed",
        metadata=TraceMetadata(
            source="manual",
            agentName="Agent",
            modelId="demo",
            wallTimeMs=2000,
            totalCostUsd=0.01,
        ),
        steps=[],
    )
    replay = TraceSummary(
        id="replay",
        name="Replay",
        startedAt="2026-01-27T10:01:00.000Z",
        endedAt="2026-01-27T10:01:03.000Z",
        status="completed",
        metadata=TraceMetadata(
            source="manual",
            agentName="Agent",
            modelId="demo",
            wallTimeMs=3000,
            totalCostUsd=0.02,
        ),
        steps=[],
    )
    diff = compare_traces(base, replay)
    passed = diff["costDeltaUsd"] == 0.01 and diff["wallTimeDeltaMs"] == 1000
    return {"name": "diff_cost_and_wall_time", "passed": passed}


def eval_demo_summary() -> dict:
    summary_path = Path("demo/traces/demo-trace-overlap-001.summary.json")
    if not summary_path.exists():
        return {"name": "demo_trace_present", "passed": False}
    payload = json.loads(summary_path.read_text(encoding="utf-8"))
    has_data_field = any("data" in step for step in payload.get("steps", []))
    passed = not has_data_field
    return {"name": "summary_is_lightweight", "passed": passed}


def eval_reveal_paths() -> dict:
    summary = StepSummary(
        id="s2",
        index=1,
        type="tool_call",
        name="search",
        startedAt="2026-01-27T10:00:00.000Z",
        endedAt="2026-01-27T10:00:01.000Z",
        durationMs=1000,
        status="completed",
        childStepIds=[],
    )
    details = StepDetails.from_summary(summary, {"input": {"api_key": "sk-live-12345"}})
    redacted = redact_step(details)
    revealed = apply_reveal_paths(redacted, details, ["input.api_key"])
    passed = revealed.data["input"]["api_key"] == "sk-live-12345"
    return {"name": "reveal_paths_restore_values", "passed": passed}


def main() -> int:
    evals = [eval_redaction(), eval_diff(), eval_demo_summary(), eval_reveal_paths()]
    passed = all(item["passed"] for item in evals)
    output = {"passed": passed, "evals": evals}
    print(json.dumps(output, indent=2))
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
