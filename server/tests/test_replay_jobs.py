import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from server.replay.jobs import MAX_SCENARIOS, ReplayJobStore
from server.trace.schema import StepSummary, TraceMetadata, TraceSummary
from server.trace.store import TraceStore


class TestReplayJobs(unittest.TestCase):
    def setUp(self) -> None:
        self.store = ReplayJobStore()
        self.scenarios = [
            {"name": "Prompt tweak", "strategy": "hybrid", "modifications": {"prompt": "shorter"}},
            {"name": "Timeout increase", "strategy": "live", "modifications": {"timeout_ms": 8000}},
        ]

    def test_create_job_initializes_queued_state(self) -> None:
        job = self.store.create_job("trace-1", "s1", self.scenarios)

        self.assertEqual(job.status, "queued")
        self.assertEqual(job.trace_id, "trace-1")
        self.assertEqual(job.step_id, "s1")
        self.assertEqual(len(job.scenarios), 2)
        self.assertTrue(all(s.status == "queued" for s in job.scenarios))

    def test_start_next_scenario_moves_job_to_running(self) -> None:
        job = self.store.create_job("trace-1", "s1", self.scenarios)

        scenario = self.store.start_next_scenario(job.id)
        job = self.store.get(job.id)

        self.assertIsNotNone(scenario)
        assert scenario is not None
        self.assertEqual(scenario.status, "running")
        self.assertIsNotNone(scenario.started_at)
        assert job is not None
        self.assertEqual(job.status, "running")
        self.assertIsNotNone(job.started_at)

    def test_complete_scenario_marks_job_completed_when_all_done(self) -> None:
        job = self.store.create_job("trace-1", "s1", [self.scenarios[0]])
        scenario = self.store.start_next_scenario(job.id)
        assert scenario is not None

        self.store.complete_scenario(job.id, scenario.id, "replay-1")
        job = self.store.get(job.id)

        assert job is not None
        self.assertEqual(job.status, "completed")
        self.assertIsNotNone(job.ended_at)
        self.assertEqual(job.scenarios[0].status, "completed")
        self.assertEqual(job.scenarios[0].replay_trace_id, "replay-1")

    def test_fail_scenario_marks_job_failed(self) -> None:
        job = self.store.create_job("trace-1", "s1", [self.scenarios[0]])
        scenario = self.store.start_next_scenario(job.id)
        assert scenario is not None

        self.store.fail_scenario(job.id, scenario.id, "boom")
        job = self.store.get(job.id)

        assert job is not None
        self.assertEqual(job.status, "failed")
        self.assertIsNotNone(job.ended_at)
        self.assertEqual(job.scenarios[0].status, "failed")
        self.assertEqual(job.scenarios[0].error, "boom")

    def test_cancel_marks_pending_and_running_scenarios(self) -> None:
        job = self.store.create_job("trace-1", "s1", self.scenarios)
        self.store.start_next_scenario(job.id)

        self.store.cancel_job(job.id)
        job = self.store.get(job.id)

        assert job is not None
        self.assertEqual(job.status, "canceled")
        self.assertIsNotNone(job.ended_at)
        self.assertTrue(all(s.status == "canceled" for s in job.scenarios))
        self.assertIsNone(self.store.start_next_scenario(job.id))

    def test_create_job_rejects_too_many_scenarios(self) -> None:
        scenarios = [{"name": f"Scenario {idx}", "strategy": "hybrid", "modifications": {}} for idx in range(MAX_SCENARIOS + 1)]
        with self.assertRaises(ValueError):
            self.store.create_job("trace-1", "s1", scenarios)

    def test_execute_job_stamps_job_and_scenario_ids(self) -> None:
        with TemporaryDirectory() as tmp:
            trace_store = TraceStore(Path(tmp))
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
            trace_store.ingest_trace(summary)

            job = self.store.create_job(
                "trace-1",
                "s1",
                [{"name": "Prompt tweak", "strategy": "hybrid", "modifications": {"prompt": "shorter"}}],
            )
            self.store.execute_job(job.id, trace_store)
            job = self.store.get(job.id)

            assert job is not None
            scenario = job.scenarios[0]
            replay_trace = trace_store.get_summary(scenario.replay_trace_id)
            system_meta = (replay_trace.replay.modifications.get("__system__", {}) if replay_trace.replay else {})
            self.assertEqual(system_meta.get("jobId"), job.id)
            self.assertEqual(system_meta.get("scenarioId"), scenario.id)


if __name__ == "__main__":
    unittest.main()
