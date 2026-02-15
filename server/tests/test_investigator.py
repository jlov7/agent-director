import unittest

from server.trace.investigator import investigate_trace
from server.trace.schema import StepSummary, TraceMetadata, TraceSummary


def _trace_with_failure() -> TraceSummary:
    return TraceSummary(
        id="trace-investigate",
        name="Investigate test",
        startedAt="2026-01-27T10:00:00.000Z",
        endedAt="2026-01-27T10:00:04.000Z",
        status="failed",
        metadata=TraceMetadata(
            source="manual",
            agentName="TestAgent",
            modelId="demo",
            wallTimeMs=4000,
            workTimeMs=5000,
            errorCount=1,
            retryCount=1,
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
                io=None,
            ),
            StepSummary(
                id="s2",
                index=1,
                type="tool_call",
                name="db_query",
                startedAt="2026-01-27T10:00:01.000Z",
                endedAt="2026-01-27T10:00:04.000Z",
                durationMs=3000,
                status="failed",
                childStepIds=[],
                parentStepId="s1",
                toolCallId="tc-1",
            ),
        ],
    )


class TestInvestigator(unittest.TestCase):
    def test_investigation_returns_ranked_hypotheses(self) -> None:
        report = investigate_trace(_trace_with_failure())
        self.assertEqual(report["traceId"], "trace-investigate")
        self.assertGreaterEqual(len(report["hypotheses"]), 1)
        self.assertEqual(report["hypotheses"][0]["severity"], "high")
        self.assertIn("s2", report["hypotheses"][0]["evidenceStepIds"])

    def test_investigation_always_returns_hypothesis(self) -> None:
        healthy = _trace_with_failure()
        for step in healthy.steps:
            step.status = "completed"
            step.durationMs = 100
        healthy.status = "completed"
        report = investigate_trace(healthy)
        self.assertGreaterEqual(len(report["hypotheses"]), 1)


if __name__ == "__main__":
    unittest.main()
