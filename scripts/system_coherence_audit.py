#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_PATH = ROOT / "artifacts" / "system-coherence-audit.json"

ACTIVE_DOCS = [
    "README.md",
    "SCORECARDS.md",
    "RELEASE_GATES.md",
    "GAPS.md",
    "BURNDOWN.md",
    "PRODUCT.md",
    "DESIGN.md",
    ".codex/SCRATCHPAD.md",
]


def read_text(rel_path: str) -> str:
    return (ROOT / rel_path).read_text(encoding="utf-8")


def check(name: str, passed: bool, details: dict) -> dict:
    return {"id": name, "status": "pass" if passed else "fail", "details": details}


def run_audit() -> dict:
    stale_scorecard_docs = []
    for rel_path in ACTIVE_DOCS:
        path = ROOT / rel_path
        if not path.exists():
            stale_scorecard_docs.append(f"{rel_path}:missing")
            continue
        if "70/70" in path.read_text(encoding="utf-8"):
            stale_scorecard_docs.append(rel_path)

    scorecards = read_text("SCORECARDS.md")
    release_gates = read_text("RELEASE_GATES.md")
    burndown = read_text("BURNDOWN.md") if (ROOT / "BURNDOWN.md").exists() else ""

    checks = [
        check(
            "active_docs_no_legacy_scorecard_total",
            not stale_scorecard_docs,
            {"active_docs": ACTIVE_DOCS, "offenders": stale_scorecard_docs},
        ),
        check(
            "scorecards_describe_current_domains",
            all(snippet in scorecards for snippet in ["Frontier Evidence Loop", "System Coherence", "90/90"]),
            {"required_snippets": ["Frontier Evidence Loop", "System Coherence", "90/90"]},
        ),
        check(
            "release_gates_include_system_coherence",
            "G10-system-coherence" in release_gates,
            {"required_gate": "G10-system-coherence"},
        ),
        check(
            "legacy_gameplay_todo_archived",
            not (ROOT / "WORLD_CLASS_RELEASE_TODO.md").exists()
            and (ROOT / "docs/archive/legacy-notes/world-class-release-todo-gameplay.md").exists(),
            {
                "root_file": "WORLD_CLASS_RELEASE_TODO.md",
                "archive_file": "docs/archive/legacy-notes/world-class-release-todo-gameplay.md",
            },
        ),
        check(
            "carpathy_burndown_closed",
            "Carpathy System Audit Burndown" in burndown
            and "| P0 |" in burndown
            and "| P1 |" in burndown
            and "| Open |" not in burndown
            and "| In Progress |" not in burndown,
            {"required_state": "burndown exists with no open or in-progress rows"},
        ),
    ]

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "workspace": str(ROOT),
        "checks": checks,
        "status": "pass" if all(item["status"] == "pass" for item in checks) else "fail",
    }
    return payload


def main() -> int:
    payload = run_audit()
    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {ARTIFACT_PATH}")
    print(f"System coherence status: {payload['status']}")
    return 0 if payload["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
