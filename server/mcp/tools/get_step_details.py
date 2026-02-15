from __future__ import annotations

from typing import Any, Dict

from ...trace.redaction import apply_reveal_paths_with_policy, redact_step
from ...trace.store import TraceStore
from ..schema import validate_input, validate_output


def execute(
    store: TraceStore,
    trace_id: str,
    step_id: str,
    redaction_mode: str = "redacted",
    reveal_paths: list[str] | None = None,
    role: str = "viewer",
    safe_export: bool = False,
) -> Dict[str, Any]:
    validate_input(
        "get_step_details",
        {
            "trace_id": trace_id,
            "step_id": step_id,
            "redaction_mode": redaction_mode,
            "reveal_paths": reveal_paths or [],
            "role": role,
            "safe_export": safe_export,
        },
    )
    step = store.get_step_details(trace_id, step_id)
    audit: Dict[str, Any] = {
        "role": role,
        "action": "view_step",
        "status": "allowed",
        "requestedPaths": [],
        "revealedPaths": [],
        "deniedPaths": [],
        "safeExport": safe_export,
    }
    if redaction_mode == "redacted":
        step_out = redact_step(step)
        if reveal_paths:
            policy_role = role if role in {"viewer", "analyst", "admin"} else "viewer"
            step_out, audit = apply_reveal_paths_with_policy(
                step_out,
                step,
                reveal_paths,
                role=policy_role,
                safe_export=safe_export,
            )
    else:
        if safe_export or role != "admin":
            raise ValueError("raw mode requires admin role with safe_export disabled")
        step_out = step
        step_out.redaction = None
        audit = {
            "role": role,
            "action": "view_raw",
            "status": "allowed",
            "requestedPaths": [],
            "revealedPaths": [],
            "deniedPaths": [],
            "safeExport": safe_export,
        }
    payload = {
        "content": [{"type": "text", "text": f"Loaded step details: {step_id}"}],
        "structuredContent": {"step": step_out.to_dict(), "audit": audit},
    }
    validate_output("get_step_details", payload["structuredContent"])
    return payload
