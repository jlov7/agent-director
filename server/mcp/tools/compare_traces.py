from __future__ import annotations

from typing import Any, Dict

from ...replay.diff import compare_traces
from ...trace.store import TraceStore
from ..schema import validate_input, validate_output


def execute(store: TraceStore, left_trace_id: str, right_trace_id: str) -> Dict[str, Any]:
    validate_input(
        "compare_traces", {"left_trace_id": left_trace_id, "right_trace_id": right_trace_id}
    )
    left = store.get_summary(left_trace_id)
    right = store.get_summary(right_trace_id)
    diff = compare_traces(left, right)
    payload = {
        "content": [{"type": "text", "text": "Compared traces"}],
        "structuredContent": {"diff": diff},
    }
    validate_output("compare_traces", payload["structuredContent"])
    return payload
