#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / "artifacts" / "reliability_drills.json"

DRILLS: list[tuple[str, list[str]]] = [
    (
        "api_rate_limit_guardrail",
        ["python3", "-m", "unittest", "server.tests.test_api.TestApi.test_rate_limit_returns_429"],
    ),
    (
        "api_content_length_validation",
        ["python3", "-m", "unittest", "server.tests.test_api.TestApi.test_invalid_content_length_returns_400"],
    ),
    (
        "replay_cancel_resilience",
        ["python3", "-m", "unittest", "server.tests.test_api.TestApi.test_cancel_replay_job"],
    ),
    (
        "multiplayer_reconnect_flow",
        [
            "python3",
            "-m",
            "unittest",
            "server.tests.test_gameplay_api.TestGameplayApi.test_reconnect_and_friends_invite_flow",
        ],
    ),
    (
        "frontend_backend_authority_path",
        [
            "pnpm",
            "-C",
            "ui",
            "exec",
            "playwright",
            "test",
            "tests/e2e/gameplay.spec.ts",
            "--grep",
            "backend-authoritative gameplay actions",
        ],
    ),
]


def tail(text: str, line_limit: int = 80) -> str:
    lines = text.strip().splitlines()
    if len(lines) <= line_limit:
        return "\n".join(lines)
    return "\n".join(lines[-line_limit:])


def run_drill(name: str, command: list[str]) -> dict:
    env = os.environ.copy()
    env.pop("NO_COLOR", None)
    started = time.time()
    proc = subprocess.run(
        command,
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    duration = round(time.time() - started, 3)
    return {
        "name": name,
        "command": " ".join(command),
        "returncode": proc.returncode,
        "status": "pass" if proc.returncode == 0 else "fail",
        "duration_s": duration,
        "stdout_tail": tail(proc.stdout),
        "stderr_tail": tail(proc.stderr),
    }


def main() -> int:
    runs = [run_drill(name, command) for name, command in DRILLS]
    status = "pass" if all(run["status"] == "pass" for run in runs) else "fail"
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "workspace": str(ROOT),
        "status": status,
        "runs": runs,
    }
    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {ARTIFACT}")
    print(f"Reliability drills status: {status}")
    return 0 if status == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
