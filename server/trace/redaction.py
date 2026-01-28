from __future__ import annotations

import re
from copy import deepcopy
from typing import Any, Dict, List, Tuple

from .schema import RedactionField, RedactionInfo, StepDetails

SENSITIVE_KEYWORDS = {
    "authorization",
    "api_key",
    "apikey",
    "token",
    "password",
    "cookie",
    "secret",
    "access_token",
    "refresh_token",
}

TOKEN_PATTERNS = [
    re.compile(r"Bearer\s+\S+", re.IGNORECASE),
    re.compile(r"sk-[A-Za-z0-9]{20,}"),
    re.compile(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"),
]

EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_PATTERN = re.compile(r"\+?\d[\d\s().-]{7,}\d")


def redact_step(step: StepDetails) -> StepDetails:
    cloned = deepcopy(step)
    redacted_data, fields = redact_data(cloned.data)
    cloned.data = redacted_data
    cloned.redaction = RedactionInfo(mode="redacted", fieldsRedacted=fields)
    return cloned


def apply_reveal_paths(
    redacted_step: StepDetails, raw_step: StepDetails, reveal_paths: list[str]
) -> StepDetails:
    if not reveal_paths:
        return redacted_step
    redacted_data, remaining, revealed = _apply_reveals(
        redacted_step.data, raw_step.data, redacted_step.redaction.fieldsRedacted, reveal_paths
    )
    redacted_step.data = redacted_data
    redacted_step.redaction.fieldsRedacted = remaining
    redacted_step.redaction.revealedFields = revealed
    return redacted_step


def redact_data(data: Any, path: str = "") -> Tuple[Any, List[RedactionField]]:
    if isinstance(data, dict):
        redacted: Dict[str, Any] = {}
        fields: List[RedactionField] = []
        for key, value in data.items():
            key_path = f"{path}.{key}" if path else key
            if _is_sensitive_key(key):
                redacted[key] = "[REDACTED]"
                fields.append(RedactionField(path=key_path, kind="secret"))
                if isinstance(value, str):
                    _, token_fields = _redact_string(value, key_path)
                    fields.extend([field for field in token_fields if field.kind == "token"])
                continue
            redacted_value, redacted_fields = redact_data(value, key_path)
            redacted[key] = redacted_value
            fields.extend(redacted_fields)
        return redacted, fields
    if isinstance(data, list):
        redacted_list: List[Any] = []
        fields: List[RedactionField] = []
        for idx, item in enumerate(data):
            item_path = f"{path}[{idx}]"
            redacted_item, redacted_fields = redact_data(item, item_path)
            redacted_list.append(redacted_item)
            fields.extend(redacted_fields)
        return redacted_list, fields
    if isinstance(data, str):
        return _redact_string(data, path)
    return data, []


def _redact_string(value: str, path: str) -> Tuple[str, List[RedactionField]]:
    fields: List[RedactionField] = []
    redacted = value

    for pattern in TOKEN_PATTERNS:
        if pattern.search(redacted):
            redacted = pattern.sub("[REDACTED]", redacted)
            fields.append(RedactionField(path=path, kind="token"))

    if EMAIL_PATTERN.search(redacted):
        redacted = EMAIL_PATTERN.sub("[REDACTED_EMAIL]", redacted)
        fields.append(RedactionField(path=path, kind="pii"))

    if PHONE_PATTERN.search(redacted):
        redacted = PHONE_PATTERN.sub("[REDACTED_PHONE]", redacted)
        fields.append(RedactionField(path=path, kind="pii"))

    return redacted, fields


def _is_sensitive_key(key: str) -> bool:
    key_lower = key.lower()
    return any(keyword in key_lower for keyword in SENSITIVE_KEYWORDS)


def _apply_reveals(
    redacted_data: Any,
    raw_data: Any,
    fields: List[RedactionField],
    reveal_paths: List[str],
) -> Tuple[Any, List[RedactionField], List[RedactionField]]:
    revealed: List[RedactionField] = []
    reveal_set = set(reveal_paths)
    field_by_path = {field.path: field for field in fields}

    for path in reveal_paths:
        tokens = _parse_path(path)
        value = _get_by_tokens(raw_data, tokens)
        if value is None:
            continue
        if _set_by_tokens(redacted_data, tokens, value):
            field = field_by_path.get(path)
            if field:
                revealed.append(field)

    revealed_paths = {field.path for field in revealed}
    remaining = [field for field in fields if field.path not in revealed_paths]
    return redacted_data, remaining, revealed


def _parse_path(path: str) -> List[object]:
    tokens: List[object] = []
    for match in re.finditer(r"([^\.\[\]]+)|\[(\d+)\]", path):
        name = match.group(1)
        index = match.group(2)
        if name is not None:
            tokens.append(name)
        elif index is not None:
            tokens.append(int(index))
    return tokens


def _get_by_tokens(data: Any, tokens: List[object]) -> Any:
    current = data
    for token in tokens:
        if isinstance(token, int):
            if not isinstance(current, list) or token >= len(current):
                return None
            current = current[token]
        else:
            if not isinstance(current, dict) or token not in current:
                return None
            current = current[token]
    return current


def _set_by_tokens(data: Any, tokens: List[object], value: Any) -> bool:
    if not tokens:
        return False
    current = data
    for token in tokens[:-1]:
        if isinstance(token, int):
            if not isinstance(current, list) or token >= len(current):
                return False
            current = current[token]
        else:
            if not isinstance(current, dict) or token not in current:
                return False
            current = current[token]
    last = tokens[-1]
    if isinstance(last, int):
        if not isinstance(current, list) or last >= len(current):
            return False
        current[last] = value
    else:
        if not isinstance(current, dict) or last not in current:
            return False
        current[last] = value
    return True
