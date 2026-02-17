from __future__ import annotations

import unittest

from scripts.content_authoring import (
    validate_liveops_challenge,
    validate_mission,
    validate_scenario_share,
)


class TestContentAuthoring(unittest.TestCase):
    def test_validate_mission_accepts_valid_payload(self) -> None:
        payload = {
            "id": "mission-1",
            "title": "Latency Containment",
            "depth": 3,
            "hazards": ["latency storm", "tool timeout chain"],
            "reward_tokens": 140,
            "reward_materials": 22,
            "blueprint": "seed=100;depth=3;mutators=none",
        }
        self.assertEqual(validate_mission(payload), [])

    def test_validate_mission_rejects_invalid_shape(self) -> None:
        payload = {
            "id": "",
            "title": "Bad Mission",
            "depth": 0,
            "hazards": [],
            "reward_tokens": 0,
            "reward_materials": -1,
            "blueprint": "",
        }
        errors = validate_mission(payload)
        self.assertGreaterEqual(len(errors), 4)

    def test_validate_liveops_challenge(self) -> None:
        self.assertEqual(
            validate_liveops_challenge({"id": "challenge-1", "title": "Win raid", "goal": 2, "reward": 120}),
            [],
        )

    def test_validate_share_warns_for_sensitive_keys(self) -> None:
        payload = {
            "name": "Ops Pack",
            "scenarios": [
                {
                    "name": "Prompt tweak",
                    "strategy": "hybrid",
                    "modifications": {"prompt": "short", "api_key": "should-not-share"},
                }
            ],
        }
        errors, warnings = validate_scenario_share(payload)
        self.assertEqual(errors, [])
        self.assertEqual(len(warnings), 1)


if __name__ == "__main__":
    unittest.main()
