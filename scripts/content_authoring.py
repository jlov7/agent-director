#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

SENSITIVE_KEY_HINTS = {
    "api_key",
    "apikey",
    "auth",
    "authorization",
    "cookie",
    "password",
    "secret",
    "token",
}


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _expect_str(payload: dict[str, Any], key: str, errors: list[str]) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value.strip():
        errors.append(f"{key} must be a non-empty string")
        return ""
    return value.strip()


def _expect_int(payload: dict[str, Any], key: str, minimum: int, errors: list[str]) -> int:
    value = payload.get(key)
    if not isinstance(value, int):
        errors.append(f"{key} must be an integer")
        return 0
    if value < minimum:
        errors.append(f"{key} must be >= {minimum}")
    return value


def validate_mission(payload: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return ["mission payload must be an object"]

    _expect_str(payload, "id", errors)
    _expect_str(payload, "title", errors)
    _expect_str(payload, "blueprint", errors)
    depth = _expect_int(payload, "depth", 1, errors)
    if depth > 10:
        errors.append("depth must be <= 10")

    hazards = payload.get("hazards")
    if not isinstance(hazards, list) or not hazards:
        errors.append("hazards must be a non-empty array")
    else:
        if len(hazards) > 6:
            errors.append("hazards must contain at most 6 entries")
        for hazard in hazards:
            if not isinstance(hazard, str) or not hazard.strip():
                errors.append("hazards entries must be non-empty strings")
                break

    _expect_int(payload, "reward_tokens", 1, errors)
    _expect_int(payload, "reward_materials", 0, errors)
    return errors


def validate_liveops_challenge(payload: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return ["liveops challenge payload must be an object"]

    _expect_str(payload, "id", errors)
    _expect_str(payload, "title", errors)
    _expect_int(payload, "goal", 1, errors)
    _expect_int(payload, "reward", 1, errors)
    return errors


def validate_scenario_share(payload: Any) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    if not isinstance(payload, dict):
        return ["scenario share payload must be an object"], warnings

    _expect_str(payload, "name", errors)
    scenarios = payload.get("scenarios")
    if not isinstance(scenarios, list) or not scenarios:
        errors.append("scenarios must be a non-empty array")
        return errors, warnings

    for idx, scenario in enumerate(scenarios):
        if not isinstance(scenario, dict):
            errors.append(f"scenarios[{idx}] must be an object")
            continue
        _expect_str(scenario, "name", errors)
        strategy = scenario.get("strategy")
        if strategy not in {"recorded", "live", "hybrid"}:
            errors.append(f"scenarios[{idx}].strategy must be recorded/live/hybrid")
        modifications = scenario.get("modifications")
        if modifications is None:
            continue
        if not isinstance(modifications, dict):
            errors.append(f"scenarios[{idx}].modifications must be an object")
            continue
        lowered_keys = {str(key).strip().lower() for key in modifications.keys()}
        if any(hint in key for key in lowered_keys for hint in SENSITIVE_KEY_HINTS):
            warnings.append(
                f"scenarios[{idx}] includes potentially sensitive keys; use safe export and redaction before sharing"
            )
    return errors, warnings


def _print_errors(errors: list[str]) -> int:
    for err in errors:
        print(f"- {err}")
    return 1


def _usage() -> int:
    print(
        "Usage:\n"
        "  python3 scripts/content_authoring.py validate-mission <file.json>\n"
        "  python3 scripts/content_authoring.py validate-liveops <file.json>\n"
        "  python3 scripts/content_authoring.py validate-share <file.json>"
    )
    return 2


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        return _usage()

    command = argv[1].strip().lower()
    path = Path(argv[2])
    if not path.exists():
        print(f"File not found: {path}")
        return 1

    payload = _load_json(path)
    if command == "validate-mission":
        errors = validate_mission(payload)
        if errors:
            return _print_errors(errors)
        print("Mission payload is valid.")
        return 0

    if command == "validate-liveops":
        errors = validate_liveops_challenge(payload)
        if errors:
            return _print_errors(errors)
        print("LiveOps challenge payload is valid.")
        return 0

    if command == "validate-share":
        errors, warnings = validate_scenario_share(payload)
        if errors:
            return _print_errors(errors)
        for warning in warnings:
            print(f"! {warning}")
        print("Scenario share payload is valid.")
        return 0

    return _usage()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
