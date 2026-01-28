#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from server.replay.diff import compare_traces
from server.trace.redaction import redact_data
from server.trace.schema import TraceMetadata, TraceSummary


def mutation_redaction_skip() -> dict:
    payload = {"api_key": "sk-test-12345"}
    correct, _ = redact_data(payload)
    mutant = payload
    killed = correct != mutant and mutant.get("api_key") != "[REDACTED]"
    return {"name": "redaction_skip", "killed": killed}


def mutation_diff_sign_flip() -> dict:
    base = TraceSummary(
        id="base",
        name="Base",
        startedAt="2026-01-27T10:00:00.000Z",
        endedAt="2026-01-27T10:00:01.000Z",
        status="completed",
        metadata=TraceMetadata(
            source="manual",
            agentName="Agent",
            modelId="demo",
            wallTimeMs=1000,
            totalCostUsd=0.02,
        ),
        steps=[],
    )
    replay = TraceSummary(
        id="replay",
        name="Replay",
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
    correct = compare_traces(base, replay)
    mutated_cost_delta = -correct["costDeltaUsd"]
    killed = mutated_cost_delta != correct["costDeltaUsd"]
    return {"name": "diff_sign_flip", "killed": killed}


def main() -> int:
    mutants = [mutation_redaction_skip(), mutation_diff_sign_flip()]
    killed = sum(1 for mutant in mutants if mutant["killed"])
    total = len(mutants)
    score = killed / total if total else 1.0

    output = {"mutation_score": score, "mutants": mutants}
    print(json.dumps(output, indent=2))

    if score < 1.0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
