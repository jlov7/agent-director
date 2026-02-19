from __future__ import annotations

import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from server.gameplay.store import (
    LAUNCH_MISSION_PACK,
    GameplayStore,
    PROFILE_SCHEMA_VERSION,
    STATE_SCHEMA_VERSION,
)


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

    def test_launch_content_pack_has_depth_and_archetype_coverage(self) -> None:
        self.assertGreaterEqual(len(LAUNCH_MISSION_PACK), 18)
        archetypes = {str(entry.get("archetype") or "") for entry in LAUNCH_MISSION_PACK}
        self.assertGreaterEqual(len(archetypes), 8)
        self.assertTrue(all(int(entry.get("depth_min", 0)) >= 1 for entry in LAUNCH_MISSION_PACK))
        self.assertTrue(all(int(entry.get("depth_max", 0)) >= int(entry.get("depth_min", 0)) for entry in LAUNCH_MISSION_PACK))

    def test_campaign_mission_history_tracks_quality_and_variety(self) -> None:
        with TemporaryDirectory() as tmp:
            store = GameplayStore(Path(tmp))
            session = store.create_session("trace-seed-1", "host", "Mission Quality")
            session_id = session["id"]
            version = session["version"]

            seen_templates: set[str] = set()
            for _ in range(8):
                current = session["campaign"]["current_mission"]
                seen_templates.add(str(current.get("template_id") or ""))
                session = store.apply_action(
                    session_id,
                    "host",
                    "campaign.resolve_mission",
                    {"success": True},
                    version,
                )
                version = session["version"]

            history = session["campaign"]["mission_history"]
            self.assertGreaterEqual(len(history), 8)
            self.assertGreaterEqual(len(seen_templates), 4)
            for entry in history:
                self.assertIn("quality_score", entry)
                self.assertIn("novelty_score", entry)
                self.assertIn("repetition_penalty", entry)

            mission = session["campaign"]["current_mission"]
            self.assertIn("template_id", mission)
            self.assertIn("archetype", mission)
            self.assertIn("launch_pack_size", mission)
            self.assertEqual(mission["launch_pack_size"], len(LAUNCH_MISSION_PACK))
            self.assertGreaterEqual(int(mission["quality_score"]), 25)
            self.assertLessEqual(int(mission["repetition_penalty"]), 72)


if __name__ == "__main__":
    unittest.main()
