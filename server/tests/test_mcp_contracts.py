import tempfile
import unittest
from pathlib import Path

from server.mcp.tools.compare_traces import execute as compare_execute
from server.mcp.tools.get_step_details import execute as details_execute
from server.mcp.tools.list_traces import execute as list_execute
from server.mcp.tools.replay_from_step import execute as replay_execute
from server.mcp.tools.show_trace import execute as show_execute
from server.trace.schema import StepDetails, StepSummary, TraceMetadata, TraceSummary
from server.trace.store import TraceStore


class TestMcpContracts(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.store = TraceStore(Path(self.temp_dir.name))
        base = TraceSummary(
            id="trace-1",
            name="Base",
            startedAt="2026-01-27T10:00:00.000Z",
            endedAt="2026-01-27T10:00:02.000Z",
            status="completed",
            metadata=TraceMetadata(
                source="manual",
                agentName="TestAgent",
                modelId="demo",
                wallTimeMs=2000,
                workTimeMs=2000,
                totalCostUsd=0.01,
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
                )
            ],
        )
        details = StepDetails.from_summary(base.steps[0], {"response": "ok"})
        self.store.ingest_trace(base, {"s1": details})

        replay = TraceSummary(
            id="trace-2",
            name="Replay",
            startedAt="2026-01-27T10:00:00.000Z",
            endedAt="2026-01-27T10:00:03.000Z",
            status="completed",
            metadata=TraceMetadata(
                source="manual",
                agentName="TestAgent",
                modelId="demo",
                wallTimeMs=3000,
                workTimeMs=3000,
                totalCostUsd=0.02,
            ),
            steps=[
                StepSummary(
                    id="s2",
                    index=0,
                    type="llm_call",
                    name="plan",
                    startedAt="2026-01-27T10:00:00.000Z",
                    endedAt="2026-01-27T10:00:01.000Z",
                    durationMs=1000,
                    status="completed",
                    childStepIds=[],
                )
            ],
        )
        self.store.ingest_trace(replay)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_list_traces_contract(self) -> None:
        payload = list_execute(self.store)
        self.assertIn("traces", payload["structuredContent"])

    def test_show_trace_contract(self) -> None:
        payload = show_execute(self.store, "trace-1")
        self.assertIn("trace", payload["structuredContent"])
        self.assertIn("insights", payload["structuredContent"])

    def test_get_step_details_contract(self) -> None:
        payload = details_execute(self.store, "trace-1", "s1", "redacted", [])
        self.assertIn("step", payload["structuredContent"])

    def test_compare_contract(self) -> None:
        payload = compare_execute(self.store, "trace-1", "trace-2")
        self.assertIn("diff", payload["structuredContent"])

    def test_replay_contract(self) -> None:
        payload = replay_execute(self.store, "trace-1", "s1", "recorded", {"note": "test"})
        self.assertIn("trace", payload["structuredContent"])


if __name__ == "__main__":
    unittest.main()
