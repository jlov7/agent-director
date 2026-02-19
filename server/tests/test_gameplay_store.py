from __future__ import annotations

import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from server.gameplay.store import GameplayStore, PROFILE_SCHEMA_VERSION, STATE_SCHEMA_VERSION


class TestGameplayStore(unittest.TestCase):
    def test_migrates_legacy_state_to_current_schema(self) -> None:
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "gameplay_state.json"
            path.write_text(
                json.dumps(
                    {
                        "sessions": {},
                        "profiles": {
                            "player-a": {
                                "player_id": "player-a",
                                "xp": 42,
                                "level": 2,
                                "skill_points": 1,
                                "milestones": [],
                                "unlocked_skills": [],
                                "loadout": [],
                                "stats": {"raids": 0, "bosses": 0, "campaigns": 0, "pvp_wins": 0},
                                "modifiers": {},
                                "rewards": {},
                            }
                        },
                        "guilds": {},
                        "liveops": {"seed": 2026, "week": 1},
                        "social": {"friends": {}, "invites": []},
                    }
                ),
                encoding="utf-8",
            )
            store = GameplayStore(Path(tmp))
            profile = store.get_profile("player-a")

            self.assertEqual(store._state["schema_version"], STATE_SCHEMA_VERSION)
            self.assertEqual(profile["profile_version"], PROFILE_SCHEMA_VERSION)
            self.assertEqual(profile["cloud_sync"]["provider"], "local-json")
            self.assertEqual(profile["loadout_capacity"], 3)


if __name__ == "__main__":
    unittest.main()
