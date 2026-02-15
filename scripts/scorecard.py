#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_PATH = ROOT / "artifacts" / "scorecards.json"
DOCTOR_PATH = ROOT / "artifacts" / "doctor.json"
LHCI_MANIFEST = ROOT / "ui" / ".lighthouseci" / "manifest.json"


def run(command: str) -> tuple[int, float, str, str]:
    started = time.time()
    env = os.environ.copy()
    env.pop("NO_COLOR", None)
    proc = subprocess.run(
        command,
        cwd=ROOT,
        shell=True,
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    duration = round(time.time() - started, 3)
    return proc.returncode, duration, proc.stdout, proc.stderr


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def evaluate_scorecards(doctor: dict, lhci_summary: dict, ux_probe_pass: bool, backend_probe_pass: bool) -> dict:
    checks = {item["id"]: item for item in doctor.get("checks", [])}
    gates = doctor.get("gates", {})

    rep_summary = lhci_summary["representative"]["summary"]
    rep_metrics = lhci_summary["representative"]["metrics"]

    journey_ok = (
        ux_probe_pass
        and checks.get("critical_specs", {}).get("status") == "pass"
        and gates.get("G1-core-journeys") is True
        and gates.get("G2-onboarding-help") is True
        and gates.get("G4-accessibility") is True
    )
    frontend_ok = gates.get("G3-quality") is True
    backend_ok = backend_probe_pass and checks.get("verify_strict", {}).get("status") == "pass"
    security_ok = gates.get("G6-security") is True
    performance_ok = (
        gates.get("G5-performance") is True
        and rep_summary.get("performance", 0) >= 0.85
        and rep_metrics.get("cls", 1.0) <= 0.1
    )
    docs_ok = gates.get("G7-docs") is True
    ci_ok = gates.get("G8-ci") is True

    scorecards = [
        {
            "id": "journey",
            "title": "Journey UX",
            "score": 10 if journey_ok else 0,
            "max_score": 10,
            "status": "pass" if journey_ok else "fail",
            "criteria": {
                "ux_probe_pass": ux_probe_pass,
                "critical_specs_pass": checks.get("critical_specs", {}).get("status") == "pass",
                "gate_core_journeys": gates.get("G1-core-journeys") is True,
                "gate_onboarding_help": gates.get("G2-onboarding-help") is True,
                "gate_accessibility": gates.get("G4-accessibility") is True,
            },
        },
        {
            "id": "frontend",
            "title": "Frontend Engineering",
            "score": 10 if frontend_ok else 0,
            "max_score": 10,
            "status": "pass" if frontend_ok else "fail",
            "criteria": {
                "verify_strict_pass": checks.get("verify_strict", {}).get("status") == "pass",
                "gate_quality": gates.get("G3-quality") is True,
            },
        },
        {
            "id": "backend",
            "title": "Backend Reliability",
            "score": 10 if backend_ok else 0,
            "max_score": 10,
            "status": "pass" if backend_ok else "fail",
            "criteria": {
                "backend_probe_pass": backend_probe_pass,
                "verify_strict_pass": checks.get("verify_strict", {}).get("status") == "pass",
            },
        },
        {
            "id": "security",
            "title": "Security Hygiene",
            "score": 10 if security_ok else 0,
            "max_score": 10,
            "status": "pass" if security_ok else "fail",
            "criteria": {
                "secret_scan_pass": checks.get("secret_scan", {}).get("status") == "pass",
                "dependency_audit_pass": checks.get("dependency_audit", {}).get("status") == "pass",
                "gate_security": gates.get("G6-security") is True,
            },
        },
        {
            "id": "performance",
            "title": "Performance",
            "score": 10 if performance_ok else 0,
            "max_score": 10,
            "status": "pass" if performance_ok else "fail",
            "criteria": {
                "gate_performance": gates.get("G5-performance") is True,
                "lhci_performance": rep_summary.get("performance"),
                "lhci_cls": rep_metrics.get("cls"),
            },
        },
        {
            "id": "docs",
            "title": "Docs & Enablement",
            "score": 10 if docs_ok else 0,
            "max_score": 10,
            "status": "pass" if docs_ok else "fail",
            "criteria": {
                "docs_presence_pass": checks.get("docs_presence", {}).get("status") == "pass",
                "gate_docs": gates.get("G7-docs") is True,
            },
        },
        {
            "id": "ci",
            "title": "CI & Release Signals",
            "score": 10 if ci_ok else 0,
            "max_score": 10,
            "status": "pass" if ci_ok else "fail",
            "criteria": {
                "ci_status_pass": checks.get("ci_status", {}).get("status") == "pass",
                "gate_ci": gates.get("G8-ci") is True,
            },
        },
    ]

    total = sum(card["score"] for card in scorecards)
    max_total = sum(card["max_score"] for card in scorecards)
    all_perfect = all(card["score"] == card["max_score"] for card in scorecards)
    return {
        "scorecards": scorecards,
        "totals": {"score": total, "max_score": max_total, "all_perfect": all_perfect},
        "lhci_representative": lhci_summary["representative"],
    }


def load_lhci_summary() -> dict:
    manifest = read_json(LHCI_MANIFEST)
    representative = next((item for item in manifest if item.get("isRepresentativeRun")), None)
    if representative is None:
        raise RuntimeError("No representative Lighthouse run found in manifest.")
    rep_report = read_json(Path(representative["jsonPath"]))
    metrics = {
        "lcp": rep_report["audits"]["largest-contentful-paint"]["numericValue"] / 1000.0,
        "cls": rep_report["audits"]["cumulative-layout-shift"]["numericValue"],
        "tbt": rep_report["audits"]["total-blocking-time"]["numericValue"],
        "fcp": rep_report["audits"]["first-contentful-paint"]["numericValue"] / 1000.0,
        "interactive": rep_report["audits"]["interactive"]["numericValue"] / 1000.0,
    }
    return {"representative": {"summary": representative["summary"], "metrics": metrics, "report": representative}}


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate v1 release scorecards.")
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Run doctor/lhci/probe suites before scoring.",
    )
    args = parser.parse_args()

    runs: list[dict] = []
    ux_probe_pass = True
    backend_probe_pass = True

    if args.refresh:
        for check_id, command in [
            ("doctor", "make doctor"),
            ("ux_probe", "pnpm -C ui exec playwright test tests/e2e/ux-audit-deep.spec.ts"),
            ("backend_probe", "python3 -m unittest server.tests.test_api server.tests.test_replay_engine"),
            ("lhci", "pnpm -C ui lhci"),
        ]:
            code, duration, stdout, stderr = run(command)
            runs.append(
                {
                    "id": check_id,
                    "command": command,
                    "returncode": code,
                    "duration_s": duration,
                    "status": "pass" if code == 0 else "fail",
                    "stdout_tail": "\n".join(stdout.strip().splitlines()[-40:]),
                    "stderr_tail": "\n".join(stderr.strip().splitlines()[-40:]),
                }
            )
            if check_id == "ux_probe":
                ux_probe_pass = code == 0
            if check_id == "backend_probe":
                backend_probe_pass = code == 0
            if code != 0:
                payload = {
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "workspace": str(ROOT),
                    "runs": runs,
                    "status": "fail",
                    "error": f"{check_id} failed",
                }
                ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
                ARTIFACT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
                print(f"Wrote {ARTIFACT_PATH}")
                print(f"Scorecard refresh failed at {check_id}")
                return 1

    doctor = read_json(DOCTOR_PATH)
    lhci_summary = load_lhci_summary()
    evaluated = evaluate_scorecards(doctor, lhci_summary, ux_probe_pass, backend_probe_pass)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "workspace": str(ROOT),
        "runs": runs,
        "doctor_source": str(DOCTOR_PATH),
        "scorecards": evaluated["scorecards"],
        "totals": evaluated["totals"],
        "lhci_representative": evaluated["lhci_representative"],
    }

    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {ARTIFACT_PATH}")
    print(
        f"Total score: {payload['totals']['score']}/{payload['totals']['max_score']} "
        f"(all perfect: {payload['totals']['all_perfect']})"
    )
    return 0 if payload["totals"]["all_perfect"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
