import unittest

from scripts import doctor


class TestDoctorCiFallback(unittest.TestCase):
    def test_selects_strict_verify_when_verify_run_is_absent(self) -> None:
        runs = [
            {
                "databaseId": 11,
                "headBranch": "main",
                "workflowName": "verify-strict",
                "status": "completed",
                "conclusion": "success",
                "url": "https://example.test/strict",
            },
            {
                "databaseId": 10,
                "headBranch": "main",
                "workflowName": "visual-verify",
                "status": "completed",
                "conclusion": "success",
                "url": "https://example.test/visual",
            },
        ]

        selected = doctor.select_release_ci_run(runs)

        self.assertIsNotNone(selected)
        self.assertEqual(selected["workflowName"], "verify-strict")
        self.assertEqual(selected["databaseId"], 11)

    def test_prefers_verify_over_strict_verify(self) -> None:
        runs = [
            {
                "databaseId": 12,
                "headBranch": "main",
                "workflowName": "verify-strict",
                "status": "completed",
                "conclusion": "success",
                "url": "https://example.test/strict",
            },
            {
                "databaseId": 9,
                "headBranch": "main",
                "workflowName": "verify",
                "status": "completed",
                "conclusion": "success",
                "url": "https://example.test/verify",
            },
        ]

        selected = doctor.select_release_ci_run(runs)

        self.assertIsNotNone(selected)
        self.assertEqual(selected["workflowName"], "verify")
        self.assertEqual(selected["databaseId"], 9)


if __name__ == "__main__":
    unittest.main()
