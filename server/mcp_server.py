from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from server.config import data_dir, demo_dir, safe_export_enabled
from server.mcp.resources.ui_resource import build_ui_manifest
from server.mcp.tools.compare_traces import execute as compare_execute
from server.mcp.tools.get_step_details import execute as step_execute
from server.mcp.tools.list_traces import execute as list_execute
from server.mcp.tools.replay_from_step import execute as replay_execute
from server.mcp.tools.show_trace import execute as show_execute
from server.trace.store import TraceStore

try:
    from mcp.server.fastmcp import FastMCP
except Exception as exc:  # pragma: no cover - runtime dependency
    raise SystemExit(
        "mcp package not installed. Install with: pip install \"mcp[cli]\""
    ) from exc

STORE = TraceStore(data_dir(), demo_dir())

mcp = FastMCP("Agent Director", json_response=True)


@mcp.tool()
def list_traces() -> Dict[str, Any]:
    return list_execute(STORE)["structuredContent"]


@mcp.tool()
def show_trace(trace_id: Optional[str] = None) -> Dict[str, Any]:
    return show_execute(STORE, trace_id)["structuredContent"]


@mcp.tool()
def get_step_details(
    trace_id: str,
    step_id: str,
    redaction_mode: str = "redacted",
    reveal_paths: Optional[List[str]] = None,
    safe_export: bool = False,
) -> Dict[str, Any]:
    if safe_export or safe_export_enabled():
        redaction_mode = "redacted"
        reveal_paths = []
    return step_execute(STORE, trace_id, step_id, redaction_mode, reveal_paths or [])["structuredContent"]


@mcp.tool()
def replay_from_step(
    trace_id: str,
    step_id: str,
    strategy: str = "hybrid",
    modifications: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    return replay_execute(STORE, trace_id, step_id, strategy, modifications or {})["structuredContent"]


@mcp.tool()
def compare_traces(left_trace_id: str, right_trace_id: str) -> Dict[str, Any]:
    return compare_execute(STORE, left_trace_id, right_trace_id)["structuredContent"]


@mcp.tool()
def ui_manifest(ui_url: Optional[str] = None) -> Dict[str, Any]:
    return build_ui_manifest(ui_url)


def resolve_transport() -> str:
    return os.environ.get("AGENT_DIRECTOR_MCP_TRANSPORT", "streamable-http")


def run_server(transport: Optional[str] = None) -> None:
    mcp.run(transport=transport or resolve_transport())


if __name__ == "__main__":
    run_server()
