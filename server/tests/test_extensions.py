import tempfile
import unittest
from pathlib import Path

from server.extensions.loader import ExtensionRegistry
from server.trace.schema import StepSummary, TraceMetadata, TraceSummary


def _trace() -> TraceSummary:
    return TraceSummary(
        id="trace-ext",
        name="Extension test",
        startedAt="2026-01-27T10:00:00.000Z",
        endedAt="2026-01-27T10:00:03.000Z",
        status="completed",
        metadata=TraceMetadata(
            source="manual",
            agentName="TestAgent",
            modelId="demo",
            wallTimeMs=3000,
            workTimeMs=3000,
        ),
        steps=[
            StepSummary(
                id="s1",
                index=0,
                type="llm_call",
                name="plan",
                startedAt="2026-01-27T10:00:00.000Z",
                endedAt="2026-01-27T10:00:01.000Z",
                durationMs=1000,
                status="completed",
                childStepIds=[],
            ),
            StepSummary(
                id="s2",
                index=1,
                type="tool_call",
                name="search",
                startedAt="2026-01-27T10:00:01.000Z",
                endedAt="2026-01-27T10:00:03.000Z",
                durationMs=2000,
                status="completed",
                childStepIds=[],
            ),
        ],
    )


class TestExtensions(unittest.TestCase):
    def test_registry_discovers_builtin_extensions(self) -> None:
        registry = ExtensionRegistry()
        extension_ids = [item["id"] for item in registry.list_extensions()]
        self.assertIn("latency_hotspots", extension_ids)

    def test_run_extension_returns_structured_result(self) -> None:
        registry = ExtensionRegistry()
        result = registry.run_extension("latency_hotspots", _trace())
        self.assertEqual(result["extensionId"], "latency_hotspots")
        self.assertEqual(result["traceId"], "trace-ext")
        self.assertGreaterEqual(len(result["topLatencySteps"]), 1)

    def test_registry_skips_invalid_plugins(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            plugin_dir = Path(tmp)
            (plugin_dir / "invalid.py").write_text("PLUGIN_ID='invalid'\n", encoding="utf-8")
            registry = ExtensionRegistry(plugin_dir=plugin_dir)
            self.assertEqual(registry.list_extensions(), [])


if __name__ == "__main__":
    unittest.main()
