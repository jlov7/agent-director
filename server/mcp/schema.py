from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..trace.schema import StepDetails, TraceSummary

VALID_REDACTION_MODES = {"redacted", "raw"}
VALID_REPLAY_STRATEGIES = {"recorded", "live", "hybrid"}


def _ensure(condition: bool, message: str, errors: List[str]) -> None:
    if not condition:
        errors.append(message)


def _ensure_non_empty_string(value: Any, field: str, errors: List[str]) -> None:
    _ensure(isinstance(value, str), f"{field} must be str", errors)
    if isinstance(value, str):
        _ensure(bool(value.strip()), f"{field} must be non-empty", errors)


def validate_input(tool: str, payload: Dict[str, Any]) -> None:
    errors: List[str] = []
    if tool == "show_trace":
        if "trace_id" in payload:
            _ensure_non_empty_string(payload["trace_id"], "trace_id", errors)
    elif tool == "get_step_details":
        _ensure_non_empty_string(payload.get("trace_id"), "trace_id", errors)
        _ensure_non_empty_string(payload.get("step_id"), "step_id", errors)
        redaction = payload.get("redaction_mode", "redacted")
        _ensure(redaction in VALID_REDACTION_MODES, "redaction_mode invalid", errors)
        reveal_paths = payload.get("reveal_paths", [])
        _ensure(isinstance(reveal_paths, list), "reveal_paths must be list", errors)
        if isinstance(reveal_paths, list):
            _ensure(all(isinstance(item, str) for item in reveal_paths), "reveal_paths items must be str", errors)
        safe_export = payload.get("safe_export", False)
        _ensure(isinstance(safe_export, bool), "safe_export must be bool", errors)
    elif tool == "replay_from_step":
        _ensure_non_empty_string(payload.get("trace_id"), "trace_id", errors)
        _ensure_non_empty_string(payload.get("step_id"), "step_id", errors)
        strategy = payload.get("strategy", "hybrid")
        _ensure(strategy in VALID_REPLAY_STRATEGIES, "strategy invalid", errors)
        modifications = payload.get("modifications", {})
        _ensure(isinstance(modifications, dict), "modifications must be dict", errors)
    elif tool == "compare_traces":
        _ensure_non_empty_string(payload.get("left_trace_id"), "left_trace_id", errors)
        _ensure_non_empty_string(payload.get("right_trace_id"), "right_trace_id", errors)

    if errors:
        raise ValueError(f"Invalid {tool} input: {', '.join(errors)}")


def validate_output(tool: str, payload: Dict[str, Any]) -> None:
    errors: List[str] = []
    if tool in {"list_traces"}:
        traces = payload.get("traces")
        _ensure(isinstance(traces, list), "traces must be list", errors)
        if isinstance(traces, list):
            for trace in traces:
                try:
                    TraceSummary.from_dict(trace)
                except Exception as exc:  # pragma: no cover - defensive
                    errors.append(f"trace invalid: {exc}")
    elif tool in {"show_trace"}:
        trace = payload.get("trace")
        _ensure(isinstance(trace, dict), "trace must be object", errors)
        if isinstance(trace, dict):
            try:
                TraceSummary.from_dict(trace)
            except Exception as exc:
                errors.append(f"trace invalid: {exc}")
        insights = payload.get("insights")
        _ensure(isinstance(insights, dict), "insights must be object", errors)
    elif tool in {"get_step_details"}:
        step = payload.get("step")
        _ensure(isinstance(step, dict), "step must be object", errors)
        if isinstance(step, dict):
            try:
                StepDetails.from_dict(step)
            except Exception as exc:
                errors.append(f"step invalid: {exc}")
    elif tool in {"replay_from_step"}:
        trace = payload.get("trace")
        _ensure(isinstance(trace, dict), "trace must be object", errors)
        if isinstance(trace, dict):
            try:
                TraceSummary.from_dict(trace)
            except Exception as exc:
                errors.append(f"trace invalid: {exc}")
    elif tool in {"compare_traces"}:
        diff = payload.get("diff")
        _ensure(isinstance(diff, dict), "diff must be object", errors)
        if isinstance(diff, dict):
            # Validate the structure by doing a dry call to compare_traces signature
            for field in ["addedSteps", "removedSteps", "changedSteps", "costDeltaUsd", "wallTimeDeltaMs"]:
                _ensure(field in diff, f"diff missing {field}", errors)
    if errors:
        raise ValueError(f"Invalid {tool} output: {', '.join(errors)}")
