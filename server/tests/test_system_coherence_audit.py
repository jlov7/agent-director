import unittest

from scripts.system_coherence_audit import run_audit


class TestSystemCoherenceAudit(unittest.TestCase):
    def test_active_release_docs_stay_product_coherent(self) -> None:
        payload = run_audit()

        failures = [item for item in payload["checks"] if item["status"] != "pass"]
        self.assertEqual(failures, [])
        self.assertEqual(payload["status"], "pass")


if __name__ == "__main__":
    unittest.main()
