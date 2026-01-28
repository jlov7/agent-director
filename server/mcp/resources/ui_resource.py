from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Any, Dict, Optional


@dataclass
class UiResource:
    """Metadata for MCP UI resource compatibility."""

    name: str = "agent-director"
    version: str = "0.1.0"
    manifestVersion: int = 1
    description: str = "Agent Director MCP UI"
    minHostVersion: str = "0.5.0"
    transportSupport: tuple[str, ...] = ("streamable-http", "stdio")


def build_ui_manifest(ui_url: Optional[str] = None) -> Dict[str, Any]:
    url = ui_url or os.environ.get("AGENT_DIRECTOR_UI_URL") or "http://127.0.0.1:5173"
    resource = UiResource()
    return {
        "name": "agent-director",
        "title": "Agent Director",
        "version": resource.version,
        "manifestVersion": resource.manifestVersion,
        "compatibility": {
            "minHostVersion": resource.minHostVersion,
            "transport": list(resource.transportSupport),
        },
        "entrypoint": url,
        "kind": "iframe",
    }
