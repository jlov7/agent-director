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


def api_auth_required() -> bool:
    return os.environ.get("AGENT_DIRECTOR_REQUIRE_API_KEY", "0") == "1"


def api_keys() -> set[str]:
    raw = os.environ.get("AGENT_DIRECTOR_API_KEYS", "")
    return {item.strip() for item in raw.split(",") if item.strip()}


def default_tenant_id() -> str:
    tenant = os.environ.get("AGENT_DIRECTOR_DEFAULT_TENANT", "public").strip().lower()
    return tenant or "public"
