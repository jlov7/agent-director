#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_PATH = ROOT / "artifacts" / "doctor.json"

REQUIRED_SPECS = [
    "ui/tests/e2e/onboarding.spec.ts",
    "ui/tests/e2e/help.spec.ts",
    "ui/tests/e2e/inspector.spec.ts",
    "ui/tests/e2e/flow-mode.spec.ts",
    "ui/tests/e2e/keyboard.spec.ts",
    "ui/tests/e2e/a11y.spec.ts",
]

REQUIRED_DOC_FILES = [
    "AGENTS.md",
    "RELEASE_GATES.md",
    "GAPS.md",
    "QUESTIONS.md",
    "RELEASE_CHECKLIST.md",
    "README.md",
]

README_REQUIRED_SNIPPETS = [
    "## Quickstart",
    "## Environment variables",
    "## Testing",
    "## Deployment notes",
]

SECRET_PATTERN = re.compile(
    r"(BEGIN RSA PRIVATE KEY|BEGIN OPENSSH PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|sk-[A-Za-z0-9]{20,})"
)


def tail(text: str, line_limit: int = 80) -> str:
    lines = text.strip().splitlines()
    if len(lines) <= line_limit:
        return "\n".join(lines)
    return "\n".join(lines[-line_limit:])


def run_command(check_id: str, command: str, pass_codes: set[int] | None = None) -> dict:
    if pass_codes is None:
        pass_codes = {0}
    started = time.time()
    proc = subprocess.run(
        command,
        cwd=ROOT,
        shell=True,
        capture_output=True,
        text=True,
        check=False,
    )
    duration = round(time.time() - started, 3)
    return {
        "id": check_id,
        "type": "command",
        "command": command,
        "pass_codes": sorted(pass_codes),
        "returncode": proc.returncode,
        "status": "pass" if proc.returncode in pass_codes else "fail",
        "duration_s": duration,
        "stdout_tail": tail(proc.stdout),
        "stderr_tail": tail(proc.stderr),
    }


def check_critical_specs() -> dict:
    missing = []
    skipped = []
    for rel_path in REQUIRED_SPECS:
        path = ROOT / rel_path
        if not path.exists():
            missing.append(rel_path)
            continue
        content = path.read_text(encoding="utf-8")
        if ".skip(" in content:
            skipped.append(f"{rel_path} contains .skip(")
        if ".only(" in content:
            skipped.append(f"{rel_path} contains .only(")

    problems = missing + skipped
    return {
        "id": "critical_specs",
        "type": "static",
        "status": "pass" if not problems else "fail",
        "details": {
            "required_specs": REQUIRED_SPECS,
            "missing": missing,
            "disallowed_patterns": skipped,
        },
    }


def check_docs_presence() -> dict:
    missing_files = [path for path in REQUIRED_DOC_FILES if not (ROOT / path).exists()]
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    missing_snippets = [snippet for snippet in README_REQUIRED_SNIPPETS if snippet not in readme]
    problems = []
    if missing_files:
        problems.append("missing required files")
    if missing_snippets:
        problems.append("README missing required sections")
    return {
        "id": "docs_presence",
        "type": "static",
        "status": "pass" if not problems else "fail",
        "details": {
            "missing_files": missing_files,
            "missing_readme_sections": missing_snippets,
        },
    }


def check_secret_scan() -> dict:
    findings: list[str] = []
    skipped_dirs = {".git", ".venv", "node_modules", "dist", "artifacts", ".specstory"}
    allowed_paths = {"server/tests/test_redaction.py", "scripts/doctor.py"}

    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in skipped_dirs for part in path.parts):
            continue
        if path.suffix == ".pyc":
            continue
        rel = str(path.relative_to(ROOT))
        if rel in allowed_paths:
            continue
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if SECRET_PATTERN.search(content):
            findings.append(rel)

    return {
        "id": "secret_scan",
        "type": "static",
        "status": "pass" if not findings else "fail",
        "details": {
            "pattern": SECRET_PATTERN.pattern,
            "findings": findings,
        },
    }


def check_bundle_budget() -> dict:
    assets_dir = ROOT / "ui" / "dist" / "assets"
    if not assets_dir.exists():
        return {
            "id": "bundle_budget",
            "type": "static",
            "status": "fail",
            "details": {"error": "ui/dist/assets not found (run build first)"},
        }

    js_files = sorted(assets_dir.glob("*.js"))
    if not js_files:
        return {
            "id": "bundle_budget",
            "type": "static",
            "status": "fail",
            "details": {"error": "No JS bundles found in ui/dist/assets"},
        }

    size_budget_bytes = 500_000
    largest_file = max(js_files, key=lambda p: p.stat().st_size)
    largest_size = largest_file.stat().st_size
    return {
        "id": "bundle_budget",
        "type": "static",
        "status": "pass" if largest_size <= size_budget_bytes else "fail",
        "details": {
            "size_budget_bytes": size_budget_bytes,
            "largest_bundle": str(largest_file.relative_to(ROOT)),
            "largest_bundle_bytes": largest_size,
        },
    }


def check_ci_status() -> dict:
    command = "gh pr view --json number,state,url,statusCheckRollup"
    started = time.time()
    proc = subprocess.run(
        command,
        cwd=ROOT,
        shell=True,
        capture_output=True,
        text=True,
        check=False,
    )
    duration = round(time.time() - started, 3)
    if proc.returncode != 0:
        return {
            "id": "ci_status",
            "type": "command",
            "command": command,
            "returncode": proc.returncode,
            "status": "fail",
            "duration_s": duration,
            "stdout_tail": tail(proc.stdout),
            "stderr_tail": tail(proc.stderr),
            "details": {"error": "Unable to read PR status via gh CLI."},
        }

    payload = json.loads(proc.stdout)
    failures = []
    pending = []
    for entry in payload.get("statusCheckRollup", []):
        kind = entry.get("__typename")
        if kind == "CheckRun":
            name = entry.get("name", "unknown-check")
            status = entry.get("status")
            conclusion = entry.get("conclusion")
            if status != "COMPLETED":
                pending.append(name)
            elif conclusion != "SUCCESS":
                failures.append(f"{name}:{conclusion}")
        elif kind == "StatusContext":
            name = entry.get("context", "unknown-context")
            state = entry.get("state")
            if state == "PENDING":
                pending.append(name)
            elif state != "SUCCESS":
                failures.append(f"{name}:{state}")

    status = "pass" if not failures and not pending and payload.get("state") == "OPEN" else "fail"
    return {
        "id": "ci_status",
        "type": "command",
        "command": command,
        "returncode": proc.returncode,
        "status": status,
        "duration_s": duration,
        "stdout_tail": tail(proc.stdout),
        "stderr_tail": tail(proc.stderr),
        "details": {
            "pr_number": payload.get("number"),
            "pr_state": payload.get("state"),
            "pr_url": payload.get("url"),
            "pending_checks": pending,
            "failed_checks": failures,
        },
    }


def gate_summary(index: dict[str, dict]) -> dict:
    verify = index["verify_strict"]["status"] == "pass"
    critical_specs = index["critical_specs"]["status"] == "pass"
    bundle_budget = index["bundle_budget"]["status"] == "pass"
    secrets = index["secret_scan"]["status"] == "pass"
    deps = index["dependency_audit"]["status"] == "pass"
    docs = index["docs_presence"]["status"] == "pass"
    ci = index["ci_status"]["status"] == "pass"

    return {
        "G1-core-journeys": verify and critical_specs,
        "G2-onboarding-help": critical_specs,
        "G3-quality": verify,
        "G4-accessibility": critical_specs and verify,
        "G5-performance": verify and bundle_budget,
        "G6-security": verify and secrets and deps,
        "G7-docs": docs,
        "G8-ci": ci,
    }


def main() -> int:
    checks = [
        run_command("verify_strict", "./scripts/verify.sh --strict"),
        run_command("dependency_audit", "pnpm -C ui audit --prod --audit-level high"),
        check_critical_specs(),
        check_secret_scan(),
        check_docs_presence(),
        check_bundle_budget(),
        check_ci_status(),
    ]

    check_index = {check["id"]: check for check in checks}
    gates = gate_summary(check_index)
    overall_status = "pass" if all(gates.values()) else "fail"

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "workspace": str(ROOT),
        "checks": checks,
        "gates": gates,
        "overall_status": overall_status,
    }

    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {ARTIFACT_PATH}")
    print(f"Overall status: {overall_status}")
    return 0 if overall_status == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
