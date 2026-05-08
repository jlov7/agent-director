import re
import unittest

from server.replay.engine import replay_from_step
from server.trace.schema import StepSummary, TraceMetadata, TraceSummary


ISO_Z_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")


class TestReplayEngine(unittest.TestCase):
    def test_replay_timestamps_are_valid_utc_z(self) -> None:
        trace = TraceSummary(
            id="trace-1",
            name="Replay source",
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
                    childStepIds=["s2"],
                ),
                StepSummary(
                    id="s2",
                    index=1,
                    type="tool_call",
                    name="search",
                    startedAt="2026-01-27T10:00:01.000Z",
                    endedAt="2026-01-27T10:00:02.000Z",
                    durationMs=1000,
                    status="completed",
                    childStepIds=[],
                    parentStepId="s1",
                    toolCallId="tc-1",
                ),
            ],
        )

        replay = replay_from_step(trace, "s1", "recorded", {"note": "timestamp format check"})

        self.assertRegex(replay.startedAt, ISO_Z_PATTERN)
        self.assertRegex(replay.endedAt or "", ISO_Z_PATTERN)
        for step in replay.steps:
            self.assertRegex(step.startedAt, ISO_Z_PATTERN)
            if step.endedAt:
                self.assertRegex(step.endedAt, ISO_Z_PATTERN)

    def test_replay_id_and_checkpoints_are_deterministic(self) -> None:
        trace = TraceSummary(
            id="trace-1",
            name="Replay source",
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
                    childStepIds=["s2"],
                ),
                StepSummary(
                    id="s2",
                    index=1,
                    type="tool_call",
                    name="search",
                    startedAt="2026-01-27T10:00:01.000Z",
                    endedAt="2026-01-27T10:00:02.000Z",
                    durationMs=1000,
                    status="completed",
                    childStepIds=["s3"],
                    parentStepId="s1",
                    toolCallId="tc-1",
                ),
                StepSummary(
                    id="s3",
                    index=2,
                    type="llm_call",
                    name="summarize",
                    startedAt="2026-01-27T10:00:02.000Z",
                    endedAt="2026-01-27T10:00:03.000Z",
                    durationMs=1000,
                    status="completed",
                    childStepIds=[],
                    parentStepId="s2",
                ),
            ],
        )
        modifications = {"note": "deterministic"}
        replay_a = replay_from_step(trace, "s2", "hybrid", modifications)
        replay_b = replay_from_step(trace, "s2", "hybrid", modifications)

        self.assertEqual(replay_a.id, replay_b.id)
        self.assertIsNotNone(replay_a.replay)
        self.assertIsNotNone(replay_a.replay.checkpoints if replay_a.replay else None)
        self.assertEqual(set(replay_a.replay.checkpoints.keys()), {"s1", "s2", "s3"})  # type: ignore[union-attr]
        self.assertEqual(replay_a.replay.checkpoints, replay_b.replay.checkpoints)  # type: ignore[union-attr]

    def test_replay_metadata_labels_simulation_truthfully(self) -> None:
        trace = TraceSummary(
            id="trace-1",
            name="Replay source",
            startedAt="2026-01-27T10:00:00.000Z",
            endedAt="2026-01-27T10:00:02.000Z",
            status="completed",
            metadata=TraceMetadata(
                source="manual",
                agentName="TestAgent",
                modelId="demo",
                wallTimeMs=2000,
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
                    childStepIds=["s2"],
                ),
                StepSummary(
                    id="s2",
                    index=1,
                    type="tool_call",
                    name="search",
                    startedAt="2026-01-27T10:00:01.000Z",
                    endedAt="2026-01-27T10:00:02.000Z",
                    durationMs=1000,
                    status="completed",
                    childStepIds=[],
                    parentStepId="s1",
                ),
            ],
        )

        recorded = replay_from_step(trace, "s1", "recorded", {})
        hybrid = replay_from_step(trace, "s1", "hybrid", {"prompt": "shorter"})
        live = replay_from_step(trace, "s1", "live", {"prompt": "shorter"})

        self.assertEqual(recorded.replay.executionMode, "recorded_replay")  # type: ignore[union-attr]
        self.assertEqual(hybrid.replay.executionMode, "counterfactual_simulation")  # type: ignore[union-attr]
        self.assertEqual(live.replay.executionMode, "counterfactual_simulation")  # type: ignore[union-attr]
        self.assertIn("not executed", hybrid.replay.truthLabel.lower())  # type: ignore[union-attr]

    def test_replay_preserves_imported_trace_provenance(self) -> None:
        trace = TraceSummary(
            id="trace-1",
            name="Imported replay source",
            startedAt="2026-01-27T10:00:00.000Z",
            endedAt="2026-01-27T10:00:01.000Z",
            status="completed",
            metadata=TraceMetadata(
                source="otel_genai",
                agentName="ImportedAgent",
                modelId="gpt-4.1",
                wallTimeMs=1000,
                providerTraceId="provider-trace-123",
                framework="otel_genai",
                provider="openai",
                importerWarnings=["missing parent was normalized"],
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

        replay = replay_from_step(trace, "s1", "hybrid", {"note": "preserve provenance"})

        self.assertEqual(replay.metadata.providerTraceId, "provider-trace-123")
        self.assertEqual(replay.metadata.framework, "otel_genai")
        self.assertEqual(replay.metadata.provider, "openai")
        self.assertEqual(replay.metadata.importerWarnings, ["missing parent was normalized"])


if __name__ == "__main__":
    unittest.main()
