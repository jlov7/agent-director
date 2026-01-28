from __future__ import annotations

import os
from pathlib import Path

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8787


def data_dir() -> Path:
    env = os.environ.get("AGENT_DIRECTOR_DATA_DIR")
    if env:
        return Path(env).expanduser().resolve()
    return Path.home() / ".agent-director"


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def demo_dir() -> Path:
    return repo_root() / "demo" / "traces"


def safe_export_enabled() -> bool:
    return os.environ.get("AGENT_DIRECTOR_SAFE_EXPORT", "0") == "1"
