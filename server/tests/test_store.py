import tempfile
import unittest
from pathlib import Path

from server.trace.schema import StepDetails, StepSummary, TraceMetadata, TraceSummary
from server.trace.store import TraceStore


class TestTraceStore(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.store = TraceStore(Path(self.temp_dir.name))

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_ingest_and_fetch(self) -> None:
        summary = TraceSummary(
            id="trace-1",
            name="Test",
            startedAt="2026-01-27T10:00:00.000Z",
            endedAt="2026-01-27T10:00:02.000Z",
            status="completed",
            metadata=TraceMetadata(
                source="manual",
                agentName="TestAgent",
                modelId="demo",
                wallTimeMs=2000,
                workTimeMs=2000,
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
        details = StepDetails.from_summary(summary.steps[0], {"response": "ok"})
        self.store.ingest_trace(summary, {"s1": details})

        traces = self.store.list_traces()
        self.assertEqual(len(traces), 1)
        fetched = self.store.get_summary("trace-1")
        self.assertEqual(fetched.id, "trace-1")

        step_details = self.store.get_step_details("trace-1", "s1")
        self.assertEqual(step_details.data["response"], "ok")

    def test_ingest_partial_trace(self) -> None:
        summary = TraceSummary(
            id="trace-2",
            name="Partial",
            startedAt="2026-01-27T10:00:00.000Z",
            endedAt="2026-01-27T10:00:01.000Z",
            status="completed",
            metadata=TraceMetadata(
                source="manual",
                agentName="TestAgent",
                modelId="demo",
                wallTimeMs=1000,
                workTimeMs=1000,
            ),
            steps=[
                StepSummary(
                    id="",
                    index=0,
                    type="llm_call",
                    name="bad",
                    startedAt="2026-01-27T10:00:00.000Z",
                    endedAt="2026-01-27T10:00:01.000Z",
                    durationMs=1000,
                    status="completed",
                    childStepIds=[],
                ),
                StepSummary(
                    id="s-good",
                    index=1,
                    type="llm_call",
                    name="good",
                    startedAt="2026-01-27T10:00:00.000Z",
                    endedAt="2026-01-27T10:00:01.000Z",
                    durationMs=1000,
                    status="completed",
                    childStepIds=[],
                ),
            ],
        )
        self.store.ingest_trace(summary)
        self.assertTrue(any("missing id" in warning for warning in self.store.last_ingest_warnings))
        fetched = self.store.get_summary("trace-2")
        self.assertEqual(len(fetched.steps), 1)
        self.assertEqual(fetched.steps[0].id, "s-good")


if __name__ == "__main__":
    unittest.main()
