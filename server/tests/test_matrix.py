import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from server.replay.jobs import ReplayJob, ReplayScenario
from server.replay.matrix import build_matrix_summary, rank_causal_factors
from server.trace.schema import StepSummary, TraceMetadata, TraceSummary
from server.trace.store import TraceStore


def _build_trace(trace_id: str, wall_ms: int, cost: float, errors: int, retries: int, preview: str) -> TraceSummary:
    return TraceSummary(
        id=trace_id,
        name=trace_id,
        startedAt="2026-01-27T10:00:00.000Z",
        endedAt="2026-01-27T10:00:02.000Z",
        status="completed",
        metadata=TraceMetadata(
            source="manual",
            agentName="Agent",
            modelId="demo",
            wallTimeMs=wall_ms,
            totalCostUsd=cost,
            errorCount=errors,
            retryCount=retries,
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
                preview=None,
                toolCallId="tool-1",
            ),
            StepSummary(
                id="s3",
                index=2,
                type="llm_call",
                name="answer",
                startedAt="2026-01-27T10:00:02.000Z",
                endedAt="2026-01-27T10:00:03.000Z",
                durationMs=1000,
                status="completed",
                childStepIds=[],
                preview=None,
            ),
        ],
    )


class TestMatrix(unittest.TestCase):
    def test_build_matrix_summary_returns_row_metrics(self) -> None:
        with TemporaryDirectory() as tmp:
            store = TraceStore(Path(tmp))
            base = _build_trace("base", 3000, 0.02, 1, 1, "base")
            replay_a = _build_trace("replay-a", 2500, 0.015, 0, 1, "a")
            replay_b = _build_trace("replay-b", 3500, 0.03, 2, 3, "b")
            store.ingest_trace(base)
            store.ingest_trace(replay_a)
            store.ingest_trace(replay_b)

            job = ReplayJob(
                id="job-1",
                trace_id="base",
                step_id="s1",
                scenarios=[
                    ReplayScenario(
                        id="s-a",
                        name="A",
                        strategy="hybrid",
                        modifications={"prompt": "shorter"},
                        status="completed",
                        replay_trace_id="replay-a",
                    ),
                    ReplayScenario(
                        id="s-b",
                        name="B",
                        strategy="live",
                        modifications={"timeout_ms": 9000},
                        status="completed",
                        replay_trace_id="replay-b",
                    ),
                ],
            )

            matrix = build_matrix_summary(store, job)
            self.assertEqual(matrix["jobId"], "job-1")
            self.assertEqual(len(matrix["rows"]), 2)
            row_a = matrix["rows"][0]
            self.assertEqual(row_a["metrics"]["wallTimeDeltaMs"], -500)
            self.assertAlmostEqual(row_a["metrics"]["costDeltaUsd"], -0.005)
            self.assertEqual(row_a["metrics"]["errorDelta"], -1)
            self.assertIn("changedStepIds", row_a)
            self.assertIn("addedStepIds", row_a)
            self.assertIn("removedStepIds", row_a)

    def test_rank_causal_factors_orders_by_score(self) -> None:
        rows = [
            {
                "status": "completed",
                "modifications": {"prompt": "shorter", "temperature": 0.2},
                "metrics": {"wallTimeDeltaMs": -500, "costDeltaUsd": -0.005, "errorDelta": -1, "retryDelta": 0, "changedSteps": 2},
            },
            {
                "status": "completed",
                "modifications": {"prompt": "shorter"},
                "metrics": {"wallTimeDeltaMs": -300, "costDeltaUsd": -0.002, "errorDelta": 0, "retryDelta": 0, "changedSteps": 1},
            },
            {
                "status": "completed",
                "modifications": {"timeout_ms": 9000},
                "metrics": {"wallTimeDeltaMs": 200, "costDeltaUsd": 0.001, "errorDelta": 1, "retryDelta": 1, "changedSteps": 4},
            },
        ]
        ranked = rank_causal_factors(rows)
        self.assertGreaterEqual(len(ranked), 2)
        self.assertEqual(ranked[0]["factor"], "prompt")
        self.assertGreater(ranked[0]["score"], ranked[-1]["score"])

    def test_rank_causal_factors_tie_breaker(self) -> None:
        rows = [
            {
                "status": "completed",
                "modifications": {"alpha": 1},
                "metrics": {"wallTimeDeltaMs": -100, "costDeltaUsd": 0.0, "errorDelta": 0, "retryDelta": 0, "changedSteps": 1},
            },
            {
                "status": "completed",
                "modifications": {"beta": 1},
                "metrics": {"wallTimeDeltaMs": -100, "costDeltaUsd": 0.0, "errorDelta": 0, "retryDelta": 0, "changedSteps": 1},
            },
        ]
        ranked = rank_causal_factors(rows)
        self.assertEqual([item["factor"] for item in ranked], ["alpha", "beta"])

    def test_matrix_handles_many_scenarios(self) -> None:
        with TemporaryDirectory() as tmp:
            store = TraceStore(Path(tmp))
            base = _build_trace("base", 3000, 0.02, 1, 1, "base")
            store.ingest_trace(base)

            for count in (10, 25, 50):
                scenarios = []
                for idx in range(count):
                    replay = _build_trace(f"replay-{count}-{idx}", 3000, 0.02, 1, 1, "base")
                    store.ingest_trace(replay)
                    scenarios.append(
                        ReplayScenario(
                            id=f"s-{count}-{idx}",
                            name=f"Scenario {idx}",
                            strategy="recorded",
                            modifications={"note": idx},
                            status="completed",
                            replay_trace_id=replay.id,
                        )
                    )

                job = ReplayJob(id=f"job-{count}", trace_id="base", step_id="s1", scenarios=scenarios)
                matrix = build_matrix_summary(store, job)
                self.assertEqual(len(matrix["rows"]), count)


if __name__ == "__main__":
    unittest.main()
