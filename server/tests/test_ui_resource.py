import os
import unittest

from server.mcp.resources.ui_resource import build_ui_manifest


class TestUiResource(unittest.TestCase):
    def test_manifest_default(self) -> None:
        manifest = build_ui_manifest("http://localhost:1234")
        self.assertEqual(manifest["entrypoint"], "http://localhost:1234")
        self.assertEqual(manifest["kind"], "iframe")

    def test_manifest_env_fallback(self) -> None:
        os.environ["AGENT_DIRECTOR_UI_URL"] = "http://localhost:5678"
        try:
            manifest = build_ui_manifest(None)
            self.assertEqual(manifest["entrypoint"], "http://localhost:5678")
        finally:
            os.environ.pop("AGENT_DIRECTOR_UI_URL", None)


if __name__ == "__main__":
    unittest.main()
