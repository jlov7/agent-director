import importlib
import os
import sys
import types
import unittest


class DummyFastMCP:
    def __init__(self, name: str, json_response: bool = True) -> None:
        self.name = name
        self.json_response = json_response
        self.last_transport = None

    def tool(self):
        def decorator(fn):
            return fn

        return decorator

    def run(self, transport: str) -> None:
        self.last_transport = transport


def install_stub() -> None:
    mcp_module = types.ModuleType("mcp")
    server_module = types.ModuleType("mcp.server")
    fastmcp_module = types.ModuleType("mcp.server.fastmcp")
    fastmcp_module.FastMCP = DummyFastMCP
    sys.modules["mcp"] = mcp_module
    sys.modules["mcp.server"] = server_module
    sys.modules["mcp.server.fastmcp"] = fastmcp_module


class TestMcpTransport(unittest.TestCase):
    def setUp(self) -> None:
        install_stub()
        if "server.mcp_server" in sys.modules:
            del sys.modules["server.mcp_server"]

    def test_default_transport(self) -> None:
        os.environ.pop("AGENT_DIRECTOR_MCP_TRANSPORT", None)
        mcp_server = importlib.import_module("server.mcp_server")
        self.assertEqual(mcp_server.resolve_transport(), "streamable-http")

    def test_stdio_transport(self) -> None:
        os.environ["AGENT_DIRECTOR_MCP_TRANSPORT"] = "stdio"
        if "server.mcp_server" in sys.modules:
            del sys.modules["server.mcp_server"]
        mcp_server = importlib.import_module("server.mcp_server")
        mcp_server.run_server()
        self.assertEqual(mcp_server.mcp.last_transport, "stdio")


if __name__ == "__main__":
    unittest.main()
