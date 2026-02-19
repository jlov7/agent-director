#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / "artifacts" / "cold_start_budget.json"
LHCI_DIR = ROOT / "ui" / ".lighthouseci"

THRESHOLDS = {
    "performance_score_min": 0.90,
    "first_contentful_paint_ms_max": 1800.0,
    "largest_contentful_paint_ms_max": 2500.0,
    "interactive_ms_max": 2500.0,
}


def run_lhci() -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env.pop("NO_COLOR", None)
    return subprocess.run(
        ["pnpm", "-C", "ui", "lhci"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )


def latest_lhr_json() -> Path:
    candidates = sorted(LHCI_DIR.glob("lhr-*.json"), key=lambda path: path.stat().st_mtime, reverse=True)
    if not candidates:
        raise FileNotFoundError("No Lighthouse result files found in ui/.lighthouseci")
    return candidates[0]


def main() -> int:
    proc = run_lhci()
    status = "pass"
    errors: list[str] = []
    metrics: dict[str, float] = {}
    report_file = ""

    if proc.returncode != 0:
        status = "fail"
        errors.append("pnpm -C ui lhci failed")
    else:
        try:
            report = latest_lhr_json()
            report_file = str(report.relative_to(ROOT))
            payload = json.loads(report.read_text(encoding="utf-8"))
            metrics = {
                "performance_score": float(payload["categories"]["performance"]["score"] or 0.0),
                "first_contentful_paint_ms": float(payload["audits"]["first-contentful-paint"]["numericValue"] or 0.0),
                "largest_contentful_paint_ms": float(payload["audits"]["largest-contentful-paint"]["numericValue"] or 0.0),
                "interactive_ms": float(payload["audits"]["interactive"]["numericValue"] or 0.0),
            }
        except (OSError, KeyError, ValueError, TypeError, FileNotFoundError) as exc:
            status = "fail"
            errors.append(f"Unable to parse Lighthouse results: {exc}")

    if metrics:
        if metrics["performance_score"] < THRESHOLDS["performance_score_min"]:
            status = "fail"
            errors.append("Performance score below threshold")
        if metrics["first_contentful_paint_ms"] > THRESHOLDS["first_contentful_paint_ms_max"]:
            status = "fail"
            errors.append("FCP exceeds threshold")
        if metrics["largest_contentful_paint_ms"] > THRESHOLDS["largest_contentful_paint_ms_max"]:
            status = "fail"
            errors.append("LCP exceeds threshold")
        if metrics["interactive_ms"] > THRESHOLDS["interactive_ms_max"]:
            status = "fail"
            errors.append("TTI exceeds threshold")

    artifact = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "workspace": str(ROOT),
        "status": status,
        "command": "pnpm -C ui lhci",
        "returncode": proc.returncode,
        "thresholds": THRESHOLDS,
        "metrics": metrics,
        "report_file": report_file,
        "errors": errors,
        "stdout_tail": "\n".join(proc.stdout.strip().splitlines()[-80:]),
        "stderr_tail": "\n".join(proc.stderr.strip().splitlines()[-80:]),
    }
    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {ARTIFACT}")
    print(f"Cold-start budget status: {status}")
    return 0 if status == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
