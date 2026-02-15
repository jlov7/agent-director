import unittest

from server.trace.redaction import (
    apply_reveal_paths,
    apply_reveal_paths_with_policy,
    redact_data,
    redact_step,
)
from server.trace.schema import StepDetails, StepSummary


class TestRedaction(unittest.TestCase):
    def test_redact_sensitive_keys_and_tokens(self) -> None:
        payload = {
            "api_key": "sk-1234567890abcdef1234567890",
            "authorization": "Bearer abc.def.ghi",
            "user": {"email": "person@example.com", "phone": "+1 415 555 0101"},
            "notes": "safe",
        }

        redacted, fields = redact_data(payload)
        self.assertEqual(redacted["api_key"], "[REDACTED]")
        self.assertEqual(redacted["authorization"], "[REDACTED]")
        self.assertEqual(redacted["user"]["email"], "[REDACTED_EMAIL]")
        self.assertEqual(redacted["user"]["phone"], "[REDACTED_PHONE]")
        self.assertTrue(any(field.path == "api_key" for field in fields))
        self.assertTrue(any(field.kind == "token" for field in fields))

    def test_redact_step_records_fields(self) -> None:
        summary = StepSummary(
            id="s1",
            index=0,
            type="tool_call",
            name="search",
            startedAt="2026-01-27T10:00:00.000Z",
            endedAt="2026-01-27T10:00:01.000Z",
            durationMs=1000,
            status="completed",
            childStepIds=[],
        )
        details = StepDetails.from_summary(summary, {"token": "sk-abcdef1234567890"})
        redacted = redact_step(details)
        self.assertEqual(redacted.data["token"], "[REDACTED]")
        self.assertIsNotNone(redacted.redaction)
        self.assertGreater(len(redacted.redaction.fieldsRedacted), 0)

    def test_reveal_path_restores_value(self) -> None:
        summary = StepSummary(
            id="s2",
            index=1,
            type="tool_call",
            name="search",
            startedAt="2026-01-27T10:00:00.000Z",
            endedAt="2026-01-27T10:00:01.000Z",
            durationMs=1000,
            status="completed",
            childStepIds=[],
        )
        details = StepDetails.from_summary(summary, {"input": {"api_key": "sk-live-12345"}})
        redacted = redact_step(details)
        revealed = apply_reveal_paths(redacted, details, ["input.api_key"])
        self.assertEqual(revealed.data["input"]["api_key"], "sk-live-12345")
        self.assertTrue(any(field.path == "input.api_key" for field in revealed.redaction.revealedFields))

    def test_policy_blocks_viewer_reveals(self) -> None:
        summary = StepSummary(
            id="s3",
            index=2,
            type="tool_call",
            name="search",
            startedAt="2026-01-27T10:00:00.000Z",
            endedAt="2026-01-27T10:00:01.000Z",
            durationMs=1000,
            status="completed",
            childStepIds=[],
        )
        details = StepDetails.from_summary(summary, {"contact": {"email": "person@example.com"}})
        redacted = redact_step(details)
        out, audit = apply_reveal_paths_with_policy(
            redacted_step=redacted,
            raw_step=details,
            reveal_paths=["contact.email"],
            role="viewer",
            safe_export=False,
        )
        self.assertIn("contact.email", audit["deniedPaths"])
        self.assertEqual(out.data["contact"]["email"], "[REDACTED_EMAIL]")

    def test_policy_allows_analyst_only_pii(self) -> None:
        summary = StepSummary(
            id="s4",
            index=3,
            type="tool_call",
            name="search",
            startedAt="2026-01-27T10:00:00.000Z",
            endedAt="2026-01-27T10:00:01.000Z",
            durationMs=1000,
            status="completed",
            childStepIds=[],
        )
        details = StepDetails.from_summary(
            summary, {"contact": {"email": "person@example.com"}, "token": "sk-abcdef1234567890"}
        )
        redacted = redact_step(details)
        out, audit = apply_reveal_paths_with_policy(
            redacted_step=redacted,
            raw_step=details,
            reveal_paths=["contact.email", "token"],
            role="analyst",
            safe_export=False,
        )
        self.assertEqual(out.data["contact"]["email"], "person@example.com")
        self.assertEqual(out.data["token"], "[REDACTED]")
        self.assertIn("token", audit["deniedPaths"])


if __name__ == "__main__":
    unittest.main()
