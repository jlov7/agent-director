from __future__ import annotations

from dataclasses import dataclass

from ..trace.store import TraceStore


@dataclass
class McpServer:
    """Minimal placeholder for MCP server wiring."""

    store: TraceStore
