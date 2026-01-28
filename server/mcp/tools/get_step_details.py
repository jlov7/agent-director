from __future__ import annotations

from typing import Any, Dict

from ...trace.redaction import apply_reveal_paths, redact_step
from ...trace.store import TraceStore
from ..schema import validate_input, validate_output


def execute(
    store: TraceStore,
    trace_id: str,
    step_id: str,
    redaction_mode: str = "redacted",
    reveal_paths: list[str] | None = None,
) -> Dict[str, Any]:
    validate_input(
        "get_step_details",
        {
            "trace_id": trace_id,
            "step_id": step_id,
            "redaction_mode": redaction_mode,
            "reveal_paths": reveal_paths or [],
        },
    )
    step = store.get_step_details(trace_id, step_id)
    if redaction_mode == "redacted":
        step_out = redact_step(step)
        if reveal_paths:
            step_out = apply_reveal_paths(step_out, step, reveal_paths)
    else:
        step_out = step
        step_out.redaction = None
    payload = {
        "content": [{"type": "text", "text": f"Loaded step details: {step_id}"}],
        "structuredContent": {"step": step_out.to_dict()},
    }
    validate_output("get_step_details", payload["structuredContent"])
    return payload
