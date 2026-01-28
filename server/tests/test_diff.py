import unittest

from server.replay.diff import compare_traces
from server.trace.schema import StepSummary, TraceMetadata, TraceSummary


class TestDiff(unittest.TestCase):
    def test_compare_traces(self) -> None:
        base = TraceSummary(
            id="base",
            name="Base",
            startedAt="2026-01-27T10:00:00.000Z",
            endedAt="2026-01-27T10:00:02.000Z",
            status="completed",
            metadata=TraceMetadata(
                source="manual",
                agentName="Agent",
                modelId="demo",
                wallTimeMs=2000,
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
                    preview=None,
                )
            ],
        )
        replay = TraceSummary(
            id="replay",
            name="Replay",
            startedAt="2026-01-27T10:01:00.000Z",
            endedAt="2026-01-27T10:01:03.000Z",
            status="completed",
            metadata=TraceMetadata(
                source="manual",
                agentName="Agent",
                modelId="demo",
                wallTimeMs=3000,
                totalCostUsd=0.015,
            ),
            steps=base.steps,
        )

        diff = compare_traces(base, replay)
        self.assertEqual(diff["addedSteps"], [])
        self.assertEqual(diff["removedSteps"], [])
        self.assertEqual(diff["costDeltaUsd"], 0.005)
        self.assertEqual(diff["wallTimeDeltaMs"], 1000)

    def test_align_by_toolcall(self) -> None:
        base = TraceSummary(
            id="base",
            name="Base",
            startedAt="2026-01-27T10:00:00.000Z",
            endedAt="2026-01-27T10:00:02.000Z",
            status="completed",
            metadata=TraceMetadata(
                source="manual",
                agentName="Agent",
                modelId="demo",
                wallTimeMs=2000,
                totalCostUsd=0.01,
            ),
            steps=[
                StepSummary(
                    id="s-base",
                    index=0,
                    type="tool_call",
                    name="search",
                    startedAt="2026-01-27T10:00:00.000Z",
                    endedAt="2026-01-27T10:00:01.000Z",
                    durationMs=1000,
                    status="completed",
                    childStepIds=[],
                    preview=None,
                    toolCallId="tool-1",
                )
            ],
        )
        replay = TraceSummary(
            id="replay",
            name="Replay",
            startedAt="2026-01-27T10:01:00.000Z",
            endedAt="2026-01-27T10:01:03.000Z",
            status="completed",
            metadata=TraceMetadata(
                source="manual",
                agentName="Agent",
                modelId="demo",
                wallTimeMs=3000,
                totalCostUsd=0.02,
            ),
            steps=[
                StepSummary(
                    id="s-replay",
                    index=0,
                    type="tool_call",
                    name="search",
                    startedAt="2026-01-27T10:01:00.000Z",
                    endedAt="2026-01-27T10:01:01.000Z",
                    durationMs=1000,
                    status="completed",
                    childStepIds=[],
                    preview=None,
                    toolCallId="tool-1",
                )
            ],
        )
        diff = compare_traces(base, replay)
        self.assertEqual(diff["addedSteps"], [])
        self.assertEqual(diff["removedSteps"], [])
        self.assertEqual(diff["changedSteps"], [])
        self.assertEqual(len(diff["alignedSteps"]), 1)


if __name__ == "__main__":
    unittest.main()
