from __future__ import annotations

from typing import Any, Dict

from ...trace.store import TraceStore
from ..schema import validate_output


def execute(store: TraceStore) -> Dict[str, Any]:
    traces = [trace.to_dict() for trace in store.list_traces()]
    payload = {
        "content": [{"type": "text", "text": f"Found {len(traces)} traces"}],
        "structuredContent": {"traces": traces},
    }
    validate_output("list_traces", payload["structuredContent"])
    return payload
