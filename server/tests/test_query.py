import unittest

from server.trace.query import run_trace_query
from server.trace.schema import StepSummary, TraceMetadata, TraceSummary


def _trace() -> TraceSummary:
    return TraceSummary(
        id="trace-query",
        name="Query test",
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
                name="search_api",
                startedAt="2026-01-27T10:00:01.000Z",
                endedAt="2026-01-27T10:00:03.000Z",
                durationMs=2000,
                status="failed",
                childStepIds=[],
            ),
        ],
    )


class TestTraceQuery(unittest.TestCase):
    def test_query_matches_by_type_and_duration(self) -> None:
        result = run_trace_query(_trace(), "type=tool_call and duration_ms>=1500")
        self.assertEqual(result["matchCount"], 1)
        self.assertEqual(result["matchedStepIds"], ["s2"])

    def test_query_matches_by_name_contains(self) -> None:
        result = run_trace_query(_trace(), "name~search")
        self.assertEqual(result["matchedStepIds"], ["s2"])

    def test_invalid_query_raises(self) -> None:
        with self.assertRaises(ValueError):
            run_trace_query(_trace(), "duration_ms>>100")


if __name__ == "__main__":
    unittest.main()
