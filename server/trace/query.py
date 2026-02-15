from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Dict, List

from .schema import StepSummary, TraceSummary

_OP_PATTERN = re.compile(r"(>=|<=|!=|=|>|<|~|:)")
_VALID_FIELDS = {"type", "status", "duration_ms", "name", "id"}


@dataclass
class _Clause:
    field: str
    op: str
    value: str


def run_trace_query(trace: TraceSummary, query: str) -> Dict[str, Any]:
    clauses = _parse_query(query)
    matched_steps = [step for step in trace.steps if _matches_all(step, clauses)]
    return {
        "query": query,
        "matchedStepIds": [step.id for step in matched_steps],
        "matchCount": len(matched_steps),
        "clauses": [{"field": c.field, "op": c.op, "value": c.value} for c in clauses],
        "explain": "Clauses use AND semantics in evaluation order.",
    }


def _parse_query(query: str) -> List[_Clause]:
    if not isinstance(query, str) or not query.strip():
        raise ValueError("query must be non-empty")
    parts = [part.strip() for part in re.split(r"\s+and\s+", query.strip(), flags=re.IGNORECASE)]
    clauses: List[_Clause] = []
    for part in parts:
        if not part:
            continue
        match = _OP_PATTERN.search(part)
        if not match:
            raise ValueError(f"Invalid clause: {part}")
        op = match.group(1)
        idx = match.start(1)
        field = part[:idx].strip().lower()
        value = part[idx + len(op) :].strip()
        if field not in _VALID_FIELDS:
            raise ValueError(f"Unsupported field: {field}")
        if not value:
            raise ValueError(f"Missing value in clause: {part}")
        clauses.append(_Clause(field=field, op=op, value=_strip_quotes(value)))
    if not clauses:
        raise ValueError("query must include at least one clause")
    return clauses


def _strip_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def _matches_all(step: StepSummary, clauses: List[_Clause]) -> bool:
    return all(_matches_clause(step, clause) for clause in clauses)


def _matches_clause(step: StepSummary, clause: _Clause) -> bool:
    if clause.field == "type":
        return _compare_string(step.type, clause.op, clause.value)
    if clause.field == "status":
        return _compare_string(step.status, clause.op, clause.value)
    if clause.field == "name":
        return _compare_string(step.name, clause.op, clause.value)
    if clause.field == "id":
        return _compare_string(step.id, clause.op, clause.value)
    if clause.field == "duration_ms":
        duration = step.durationMs or 0
        return _compare_number(duration, clause.op, clause.value)
    return False


def _compare_string(actual: str, op: str, expected: str) -> bool:
    left = (actual or "").lower()
    right = expected.lower()
    if op in {"=", ":"}:
        return left == right
    if op == "!=":
        return left != right
    if op == "~":
        return right in left
    raise ValueError(f"Operator {op} is not supported for string fields")


def _compare_number(actual: int, op: str, expected: str) -> bool:
    try:
        right = int(expected)
    except ValueError as exc:
        raise ValueError("duration_ms comparisons require integer values") from exc
    if op == "=" or op == ":":
        return actual == right
    if op == "!=":
        return actual != right
    if op == ">":
        return actual > right
    if op == ">=":
        return actual >= right
    if op == "<":
        return actual < right
    if op == "<=":
        return actual <= right
    raise ValueError(f"Operator {op} is not supported for numeric fields")
