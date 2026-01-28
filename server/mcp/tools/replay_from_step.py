from __future__ import annotations

from typing import Any, Dict

from ...replay.engine import replay_from_step
from ...trace.store import TraceStore
from ..schema import validate_input, validate_output


def execute(
    store: TraceStore,
    trace_id: str,
    step_id: str,
    strategy: str,
    modifications: Dict[str, Any],
) -> Dict[str, Any]:
    validate_input(
        "replay_from_step",
        {"trace_id": trace_id, "step_id": step_id, "strategy": strategy, "modifications": modifications},
    )
    trace = store.get_summary(trace_id)
    new_trace = replay_from_step(trace, step_id, strategy, modifications)
    store.ingest_trace(new_trace)
    invalidated = set(
        (new_trace.replay.modifications.get("__system__", {}) if new_trace.replay else {}).get(
            "invalidatedStepIds", []
        )
    )
    for step in new_trace.steps:
        if step.id in invalidated:
            continue
        try:
            details = store.get_step_details(trace_id, step.id)
        except FileNotFoundError:
            continue
        if step.id == step_id and modifications:
            details.data["modifications"] = modifications
        store.save_step_details(new_trace.id, details)
    payload = {
        "content": [
            {"type": "text", "text": f"Replayed trace {trace_id} from step {step_id}"}
        ],
        "structuredContent": {"trace": new_trace.to_dict()},
    }
    validate_output("replay_from_step", payload["structuredContent"])
    return payload
