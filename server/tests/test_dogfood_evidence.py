import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from scripts.dogfood_trace_evidence import DEFAULT_CORPUS, run_corpus


class TestDogfoodTraceEvidence(unittest.TestCase):
    def test_corpus_generates_deterministic_release_evidence(self) -> None:
        with TemporaryDirectory() as temp_dir:
            artifact_path = Path(temp_dir) / "dogfood.json"

            payload = run_corpus(DEFAULT_CORPUS, artifact_path)
            written = json.loads(artifact_path.read_text(encoding="utf-8"))

        self.assertEqual(payload["status"], "pass")
        self.assertEqual(written["fixtureCount"], 8)
        self.assertEqual(
            written["sourceCoverage"],
            ["agent_director", "openai_agents", "openinference", "otel_genai"],
        )
        self.assertGreaterEqual(written["warningFixtureCount"], 3)
        self.assertTrue(written["deterministicEval"])
        self.assertEqual(written["evalRun"]["status"], "passed")
        self.assertEqual(written["evalRun"]["passedCount"], written["evalRun"]["caseCount"])
        self.assertEqual(written["replayTruth"]["executionMode"], "counterfactual_simulation")
        self.assertIn("not executed against a live agent runtime", written["replayTruth"]["truthLabel"])
        self.assertEqual(written["replayTruth"]["providerTraceId"], "research-drift-1640")


if __name__ == "__main__":
    unittest.main()
