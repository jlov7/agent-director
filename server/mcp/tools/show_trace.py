from __future__ import annotations

from typing import Any, Dict, Optional

from ...trace.insights import compute_insights
from ...trace.store import TraceStore
from ..schema import validate_input, validate_output


def execute(store: TraceStore, trace_id: Optional[str] = None) -> Dict[str, Any]:
    validate_input("show_trace", {"trace_id": trace_id} if trace_id is not None else {})
    trace = store.get_summary(trace_id)
    insights = compute_insights(trace)
    payload = {
        "content": [{"type": "text", "text": f"Showing trace: {trace.name}"}],
        "structuredContent": {"trace": trace.to_dict(), "insights": insights},
    }
    validate_output("show_trace", payload["structuredContent"])
    return payload
