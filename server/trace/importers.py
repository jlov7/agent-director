from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List

from .schema import (
    StepDetails,
    StepMetrics,
    StepPreview,
    StepSummary,
    TraceMetadata,
    TraceSummary,
)


SUPPORTED_IMPORT_SOURCES = {"agent_director", "openai_agents", "otel_genai", "openinference"}


@dataclass
class ImportedTrace:
    trace: TraceSummary
    step_details: Dict[str, StepDetails] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)


def import_trace(source: str, payload: Dict[str, Any], options: Dict[str, Any] | None = None) -> ImportedTrace:
    normalized_source = str(source or "").strip()
    if normalized_source not in SUPPORTED_IMPORT_SOURCES:
        allowed = ", ".join(sorted(SUPPORTED_IMPORT_SOURCES))
        raise ValueError(f"source must be one of: {allowed}")
    if not isinstance(payload, dict):
        raise ValueError("payload must be an object")
    if options is not None and not isinstance(options, dict):
        raise ValueError("options must be an object")

    if normalized_source == "agent_director":
        return _import_agent_director(payload)
    return _import_span_payload(normalized_source, payload)


def _import_agent_director(payload: Dict[str, Any]) -> ImportedTrace:
    trace_payload = payload.get("trace", payload)
    if not isinstance(trace_payload, dict):
        raise ValueError("payload.trace must be an object")
    trace = TraceSummary.from_dict(trace_payload)
    trace.metadata.framework = trace.metadata.framework or "agent_director"
    trace.metadata.providerTraceId = trace.metadata.providerTraceId or trace.id

    details_payload = payload.get("stepDetails", {})
    if details_payload is not None and not isinstance(details_payload, dict):
        raise ValueError("payload.stepDetails must be an object when provided")

    details_by_id: Dict[str, StepDetails] = {}
    steps_by_id = {step.id: step for step in trace.steps}
    for step_id, raw_detail in (details_payload or {}).items():
        if not isinstance(raw_detail, dict):
            continue
        if "id" in raw_detail:
            details_by_id[str(step_id)] = StepDetails.from_dict(raw_detail)
            continue
        step = steps_by_id.get(str(step_id))
        if step:
            details_by_id[str(step_id)] = StepDetails.from_summary(step, raw_detail.get("data", raw_detail))

    return ImportedTrace(trace=trace, step_details=details_by_id, warnings=list(trace.metadata.importerWarnings or []))


def _import_span_payload(source: str, payload: Dict[str, Any]) -> ImportedTrace:
    spans = payload.get("spans", payload.get("resourceSpans", payload.get("data", [])))
    spans = _flatten_spans(spans)
    if not spans:
        raise ValueError("payload must include at least one span")

    warnings: List[str] = []
    provider_trace_id = str(
        payload.get("traceId")
        or payload.get("trace_id")
        or _first_attr(spans[0], "traceId", "trace_id", "trace.id")
        or "imported-trace"
    )
    trace_id = _safe_identifier(f"import-{provider_trace_id}", prefix="trace")
    started = min((_span_start(span) for span in spans), default=_now_iso())
    ended_values = [_span_end(span) for span in spans if _span_end(span)]
    ended = max(ended_values) if ended_values else None
    wall_time = _duration_ms(started, ended) if ended else 0

    steps: List[StepSummary] = []
    details_by_id: Dict[str, StepDetails] = {}
    span_to_step: Dict[str, str] = {}
    provider = _span_attr(spans[0], "gen_ai.system", "llm.provider", "provider")
    model_id = _span_attr(spans[0], "gen_ai.request.model", "llm.model_name", "model") or "unknown"
    total_tokens = 0
    total_cost = 0.0

    for index, span in enumerate(sorted(spans, key=lambda item: _span_start(item))):
        provider_span_id = str(_span_field(span, "spanId", "span_id", "context.span_id") or f"span-{index}")
        step_id = _safe_identifier(provider_span_id, prefix=f"s{index}")
        span_to_step[provider_span_id] = step_id

    for index, span in enumerate(sorted(spans, key=lambda item: _span_start(item))):
        attrs = _span_attributes(span)
        provider_span_id = str(_span_field(span, "spanId", "span_id", "context.span_id") or f"span-{index}")
        provider_parent_id = _span_field(span, "parentSpanId", "parent_span_id", "parent_id")
        step_id = span_to_step[provider_span_id]
        started_at = _span_start(span)
        ended_at = _span_end(span)
        step_type = _map_step_type(source, attrs)
        tokens = _token_count(attrs)
        cost = _cost_usd(attrs)
        total_tokens += tokens or 0
        total_cost += cost or 0
        parent_step_id = span_to_step.get(str(provider_parent_id)) if provider_parent_id else None
        step = StepSummary(
            id=step_id,
            index=index,
            type=step_type,
            name=str(span.get("name") or attrs.get("tool.name") or attrs.get("gen_ai.operation.name") or step_type),
            startedAt=started_at,
            endedAt=ended_at,
            durationMs=_duration_ms(started_at, ended_at) if ended_at else None,
            status="failed" if _span_status(span) == "error" else "completed",
            error=_span_error(span),
            parentStepId=parent_step_id,
            childStepIds=[],
            metrics=StepMetrics(tokensTotal=tokens, costUsd=cost) if tokens or cost else None,
            preview=StepPreview(
                title=str(span.get("name") or step_type),
                subtitle=str(attrs.get("gen_ai.request.model") or attrs.get("llm.model_name") or ""),
            ),
            toolCallId=str(attrs.get("tool.call.id") or attrs.get("tool_call_id"))
            if attrs.get("tool.call.id") or attrs.get("tool_call_id")
            else None,
            providerSpanId=provider_span_id,
            providerParentSpanId=str(provider_parent_id) if provider_parent_id else None,
            framework=source,
            modelProvider=str(attrs.get("gen_ai.system") or attrs.get("llm.provider") or provider)
            if attrs.get("gen_ai.system") or attrs.get("llm.provider") or provider
            else None,
        )
        steps.append(step)
        details_by_id[step.id] = StepDetails.from_summary(
            step,
            {
                "attributes": attrs,
                "events": span.get("events", []),
                "raw": span,
            },
        )

    for step in steps:
        if step.parentStepId:
            parent = next((candidate for candidate in steps if candidate.id == step.parentStepId), None)
            if parent and step.id not in parent.childStepIds:
                parent.childStepIds.append(step.id)

    if any(step.startedAt == "" for step in steps):
        warnings.append("One or more spans were missing start times and used import time.")

    metadata = TraceMetadata(
        source=source,
        agentName=str(payload.get("agentName") or payload.get("serviceName") or source),
        modelId=str(model_id),
        wallTimeMs=wall_time,
        totalTokens=total_tokens or None,
        totalCostUsd=total_cost or None,
        errorCount=sum(1 for step in steps if step.status == "failed"),
        providerTraceId=provider_trace_id,
        framework=source,
        provider=str(provider) if provider else None,
        importerWarnings=warnings,
    )
    trace = TraceSummary(
        id=trace_id,
        name=str(payload.get("name") or payload.get("traceName") or f"Imported {source} trace"),
        startedAt=started,
        endedAt=ended,
        status="failed" if metadata.errorCount else ("running" if ended is None else "completed"),
        metadata=metadata,
        steps=steps,
    )
    return ImportedTrace(trace=trace, step_details=details_by_id, warnings=warnings)


def _flatten_spans(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    spans: List[Dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        if "scopeSpans" in item:
            for scope in item.get("scopeSpans") or []:
                if isinstance(scope, dict):
                    spans.extend(span for span in scope.get("spans", []) if isinstance(span, dict))
        elif "spans" in item and isinstance(item.get("spans"), list):
            spans.extend(span for span in item.get("spans", []) if isinstance(span, dict))
        else:
            spans.append(item)
    return spans


def _span_attributes(span: Dict[str, Any]) -> Dict[str, Any]:
    attrs = span.get("attributes", {})
    if isinstance(attrs, dict):
        return attrs
    if isinstance(attrs, list):
        parsed = {}
        for item in attrs:
            if not isinstance(item, dict):
                continue
            key = item.get("key")
            if not key:
                continue
            parsed[str(key)] = _otel_value(item.get("value"))
        return parsed
    return {}


def _otel_value(value: Any) -> Any:
    if not isinstance(value, dict):
        return value
    for key in ("stringValue", "intValue", "doubleValue", "boolValue"):
        if key in value:
            return value[key]
    return value


def _span_field(span: Dict[str, Any], *names: str) -> Any:
    for name in names:
        current: Any = span
        for part in name.split("."):
            if not isinstance(current, dict) or part not in current:
                current = None
                break
            current = current[part]
        if current is not None:
            return current
    return None


def _span_attr(span: Dict[str, Any], *names: str) -> Any:
    attrs = _span_attributes(span)
    for name in names:
        if name in attrs:
            return attrs[name]
    return None


def _first_attr(span: Dict[str, Any], *names: str) -> Any:
    return _span_field(span, *names) or _span_attr(span, *names)


def _span_start(span: Dict[str, Any]) -> str:
    value = _span_field(span, "startTime", "start_time", "startTimeUnixNano", "start_time_unix_nano")
    return _normalize_time(value)


def _span_end(span: Dict[str, Any]) -> str | None:
    value = _span_field(span, "endTime", "end_time", "endTimeUnixNano", "end_time_unix_nano")
    if value in (None, ""):
        return None
    return _normalize_time(value)


def _normalize_time(value: Any) -> str:
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value) / 1_000_000_000, tz=timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%S.%f"
        )[:-3] + "Z"
    if isinstance(value, str) and value:
        if value.endswith("Z"):
            return value
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc).strftime(
                "%Y-%m-%dT%H:%M:%S.%f"
            )[:-3] + "Z"
        except ValueError:
            return value
    return _now_iso()


def _duration_ms(started_at: str, ended_at: str | None) -> int:
    if not ended_at:
        return 0
    try:
        start = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
        end = datetime.fromisoformat(ended_at.replace("Z", "+00:00"))
    except ValueError:
        return 0
    return max(0, int((end - start).total_seconds() * 1000))


def _map_step_type(source: str, attrs: Dict[str, Any]) -> str:
    kind = str(
        attrs.get("openinference.span.kind")
        or attrs.get("gen_ai.operation.name")
        or attrs.get("span.kind")
        or ""
    ).lower()
    if "tool" in kind or "function" in kind:
        return "tool_call"
    if "guardrail" in kind:
        return "guardrail"
    if "handoff" in kind:
        return "handoff"
    if "llm" in kind or "chat" in kind or "completion" in kind or "generate" in kind:
        return "llm_call"
    if source == "openinference" and kind == "chain":
        return "decision"
    return "decision"


def _token_count(attrs: Dict[str, Any]) -> int | None:
    total = _as_int(
        attrs.get("gen_ai.usage.total_tokens")
        or attrs.get("llm.token_count.total")
        or attrs.get("usage.total_tokens")
    )
    if total is not None:
        return total
    input_tokens = _as_int(
        attrs.get("gen_ai.usage.input_tokens")
        or attrs.get("llm.token_count.prompt")
        or attrs.get("usage.prompt_tokens")
    )
    output_tokens = _as_int(
        attrs.get("gen_ai.usage.output_tokens")
        or attrs.get("llm.token_count.completion")
        or attrs.get("usage.completion_tokens")
    )
    if input_tokens is None and output_tokens is None:
        return None
    return (input_tokens or 0) + (output_tokens or 0)


def _cost_usd(attrs: Dict[str, Any]) -> float | None:
    value = (
        attrs.get("gen_ai.usage.cost_usd")
        or attrs.get("gen_ai.cost.usd")
        or attrs.get("llm.usage.cost")
        or attrs.get("usage.cost_usd")
    )
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _span_status(span: Dict[str, Any]) -> str:
    status = span.get("status", {})
    if isinstance(status, dict):
        return str(status.get("code") or status.get("statusCode") or "").lower()
    return str(status or "").lower()


def _span_error(span: Dict[str, Any]) -> str | None:
    status = span.get("status", {})
    if isinstance(status, dict):
        description = status.get("message") or status.get("description")
        return str(description) if description else None
    return None


def _safe_identifier(value: str, prefix: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._:-]", "-", value.strip())
    cleaned = cleaned.strip(".:-_")
    if not cleaned:
        digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]
        cleaned = f"{prefix}-{digest}"
    if not re.match(r"^[A-Za-z0-9]", cleaned):
        cleaned = f"{prefix}-{cleaned}"
    return cleaned[:128]


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
