import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

from server.trace.schema import StepSummary, TraceMetadata, TraceSummary
from server.trace.store import TraceStore


class TestLargeTrace(unittest.TestCase):
    def test_large_trace_ingest(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = TraceStore(Path(temp_dir))
            start = datetime(2026, 1, 27, 10, 0, 0)
            steps = []
            for idx in range(550):
                step_start = start + timedelta(milliseconds=idx * 10)
                step_end = step_start + timedelta(milliseconds=5)
                steps.append(
                    StepSummary(
                        id=f"s{idx}",
                        index=idx,
                        type="llm_call",
                        name=f"step-{idx}",
                        startedAt=step_start.isoformat(timespec="milliseconds") + "Z",
                        endedAt=step_end.isoformat(timespec="milliseconds") + "Z",
                        durationMs=5,
                        status="completed",
                        childStepIds=[],
                    )
                )

            summary = TraceSummary(
                id="large-trace",
                name="Large",
                startedAt=start.isoformat(timespec="milliseconds") + "Z",
                endedAt=(start + timedelta(milliseconds=5500)).isoformat(timespec="milliseconds") + "Z",
                status="completed",
                metadata=TraceMetadata(
                    source="manual",
                    agentName="LoadTest",
                    modelId="demo",
                    wallTimeMs=5500,
                    workTimeMs=2750,
                ),
                steps=steps,
            )
            store.ingest_trace(summary)
            fetched = store.get_summary("large-trace")
            self.assertEqual(len(fetched.steps), 550)


if __name__ == "__main__":
    unittest.main()
