import json
import threading
import time
import unittest
from http.client import HTTPConnection
from pathlib import Path
from tempfile import TemporaryDirectory

import server.main as server_main
from server.main import ApiHandler
from server.replay.jobs import ReplayJobStore
from server.trace.schema import StepDetails, StepSummary, TraceMetadata, TraceSummary
from server.trace.store import TraceStore
from server.gameplay.store import GameplayStore
from http.server import ThreadingHTTPServer


class TestGameplayApi(unittest.TestCase):
    def setUp(self) -> None:
        server_main.ApiHandler.rate_limit_window_s = 60
        server_main.ApiHandler.rate_limit_max_requests = 500
        server_main.ApiHandler.clear_rate_limit_state()
        self.temp_dir = TemporaryDirectory()
        self.store = TraceStore(Path(self.temp_dir.name))
        summary = TraceSummary(
            id="trace-1",
            name="Gameplay Seed Trace",
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
        self.store.ingest_trace(summary)
        self.store.save_step_details(
            "trace-1",
            StepDetails.from_summary(summary.steps[0], {"data": {"secret": "sk-abc1234567890"}}),
        )

        ApiHandler.store = self.store
        ApiHandler.replay_jobs = ReplayJobStore()
        ApiHandler.live_broker = server_main.LiveTraceBroker()
        ApiHandler.extension_registry = server_main.ExtensionRegistry()
        ApiHandler.gameplay_store = GameplayStore(Path(self.temp_dir.name))
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), ApiHandler)
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        time.sleep(0.05)

    def tearDown(self) -> None:
        self.server.shutdown()
        self.thread.join(timeout=2)
        self.server.server_close()
        self.temp_dir.cleanup()

    def test_create_and_join_multiplayer_session(self) -> None:
        status, data = self._request(
            "POST",
            "/api/gameplay/sessions",
            {"trace_id": "trace-1", "host_player_id": "host", "name": "Raid Alpha"},
        )
        self.assertEqual(status, 201)
        session_id = data["session"]["id"]
        self.assertEqual(data["session"]["status"], "lobby")
        self.assertEqual(len(data["session"]["players"]), 1)

        for index in range(2, 6):
            status, data = self._request(
                "POST",
                f"/api/gameplay/sessions/{session_id}/join",
                {"player_id": f"p{index}", "role": "operator" if index % 2 == 0 else "analyst"},
            )
            self.assertEqual(status, 200)

        status, data = self._request(
            "POST",
            f"/api/gameplay/sessions/{session_id}/join",
            {"player_id": "p6", "role": "operator"},
        )
        self.assertEqual(status, 400)
        self.assertIn("2-5 players", data.get("error", ""))

        status, data = self._request("GET", f"/api/gameplay/sessions/{session_id}")
        self.assertEqual(status, 200)
        self.assertEqual(len(data["session"]["players"]), 5)
        self.assertIn("obj-root-cause", [o["id"] for o in data["session"]["raid"]["objectives"]])

    def test_conflict_safe_actions_require_matching_version(self) -> None:
        status, data = self._request(
            "POST",
            "/api/gameplay/sessions",
            {"trace_id": "trace-1", "host_player_id": "host", "name": "Raid Versioned"},
        )
        self.assertEqual(status, 201)
        session = data["session"]
        session_id = session["id"]

        status, data = self._request(
            "POST",
            f"/api/gameplay/sessions/{session_id}/action",
            {
                "player_id": "host",
                "type": "raid.objective_progress",
                "payload": {"objective_id": "obj-root-cause", "delta": 25},
                "expected_version": session["version"],
            },
        )
        self.assertEqual(status, 200)

        status, data = self._request(
            "POST",
            f"/api/gameplay/sessions/{session_id}/action",
            {
                "player_id": "host",
                "type": "raid.objective_progress",
                "payload": {"objective_id": "obj-root-cause", "delta": 25},
                "expected_version": session["version"],
            },
        )
        self.assertEqual(status, 409)
        self.assertIn("version", data.get("error", ""))

    def test_actions_cover_all_gameplay_tracks(self) -> None:
        status, data = self._request(
            "POST",
            "/api/gameplay/sessions",
            {"trace_id": "trace-1", "host_player_id": "host", "name": "Full Run"},
        )
        self.assertEqual(status, 201)
        session_id = data["session"]["id"]

        join_status, join_data = self._request(
            "POST",
            f"/api/gameplay/sessions/{session_id}/join",
            {"player_id": "ally", "role": "operator"},
        )
        self.assertEqual(join_status, 200)

        guild_status, _ = self._request(
            "POST",
            "/api/gameplay/guilds",
            {"guild_id": "guild-ops", "name": "Ops Guild", "owner_player_id": "host"},
        )
        self.assertEqual(guild_status, 201)

        actions = [
            ("session.toggle_sandbox", {"enabled": True}),
            ("raid.objective_progress", {"objective_id": "obj-root-cause", "delta": 30}),
            ("campaign.resolve_mission", {"success": True}),
            ("campaign.resolve_mission", {"success": False}),
            ("narrative.choose", {"choice_id": "alpha-risk"}),
            ("skills.unlock", {"player_id": "host", "skill_id": "skill-focus"}),
            ("skills.equip", {"player_id": "host", "skill_id": "skill-focus"}),
            ("pvp.act", {"action": "sabotage"}),
            ("time.create_fork", {"label": "alt-path", "playhead_ms": 12000}),
            ("time.rewind", {"amount_ms": 1000}),
            ("boss.act", {"action": "exploit"}),
            ("director.evaluate", {"failures": 1, "retries": 2, "latency_ms": 1700}),
            ("economy.craft", {"recipe_id": "stability_patch"}),
            ("guild.bind", {"guild_id": "guild-ops"}),
            ("guild.op", {"impact": 6}),
            ("cinematic.emit", {"event_type": "critical", "message": "Boss phase shift", "intensity": 3}),
            ("liveops.progress", {"delta": 1}),
            ("liveops.balance", {"difficulty_factor": 1.2, "reward_multiplier": 1.35, "note": "ops tune"}),
            ("liveops.advance_week", {}),
            ("rewards.claim", {"kind": "session"}),
            ("safety.mute", {"target_player_id": "griefer-1"}),
            ("safety.block", {"target_player_id": "griefer-2"}),
            ("safety.report", {"target_player_id": "griefer-2", "reason": "abusive behavior"}),
        ]

        current_version = join_data["session"]["version"]
        for action_type, payload in actions:
            status, response = self._request(
                "POST",
                f"/api/gameplay/sessions/{session_id}/action",
                {
                    "player_id": "host",
                    "type": action_type,
                    "payload": payload,
                    "expected_version": current_version,
                },
            )
            self.assertEqual(status, 200, action_type)
            current_version = response["session"]["version"]

        status, data = self._request("GET", f"/api/gameplay/sessions/{session_id}")
        self.assertEqual(status, 200)
        session = data["session"]

        self.assertGreater(session["campaign"]["depth"], 1)
        self.assertEqual(session["campaign"]["lives"], 3)
        self.assertGreater(len(session["narrative"]["history"]), 0)
        self.assertIn("skill-focus", session["profiles"]["host"]["unlocked_skills"])
        self.assertIn("skill-focus", session["profiles"]["host"]["loadout"])
        self.assertGreater(session["profiles"]["host"]["xp"], 0)
        self.assertGreaterEqual(session["profiles"]["host"]["level"], 1)
        self.assertGreater(session["pvp"]["round"], 0)
        self.assertGreaterEqual(len(session["time"]["forks"]), 2)
        self.assertLess(session["boss"]["hp"], session["boss"]["max_hp"])
        self.assertIn("hint", session["director"])
        self.assertGreater(session["economy"]["ledger_count"], 0)
        self.assertGreater(session["guild"]["operations_score"], 0)
        self.assertGreater(len(session["cinematic"]["events"]), 0)
        self.assertGreaterEqual(session["liveops"]["week"], 2)
        self.assertGreaterEqual(len(session["liveops"]["tuning_history"]), 1)
        self.assertTrue(session["rewards"]["session_claimed"])
        self.assertGreater(len(session["rewards"]["history"]), 0)
        self.assertIn("griefer-1", session["safety"]["muted_player_ids"])
        self.assertIn("griefer-2", session["safety"]["blocked_player_ids"])
        self.assertEqual(session["safety"]["reports"][0]["target_player_id"], "griefer-2")

    def test_skill_tree_unlock_paths_and_slot_constraints(self) -> None:
        status, data = self._request(
            "POST",
            "/api/gameplay/sessions",
            {"trace_id": "trace-1", "host_player_id": "host", "name": "Skill Constraints"},
        )
        self.assertEqual(status, 201)
        session_id = data["session"]["id"]
        version = data["session"]["version"]

        def apply(action_type: str, payload: dict, expected_status: int = 200) -> dict:
            nonlocal version
            action_status, action_data = self._request(
                "POST",
                f"/api/gameplay/sessions/{session_id}/action",
                {
                    "player_id": "host",
                    "type": action_type,
                    "payload": payload,
                    "expected_version": version,
                },
            )
            self.assertEqual(action_status, expected_status, action_data.get("error", action_type))
            if action_status == 200:
                version = action_data["session"]["version"]
            return action_data

        apply("skills.unlock", {"player_id": "host", "skill_id": "skill-focus"})
        blocked = apply("skills.unlock", {"player_id": "host", "skill_id": "skill-surge"}, expected_status=400)
        self.assertIn("Requires level", blocked.get("error", ""))

        for _ in range(2):
            apply("campaign.resolve_mission", {"success": True})

        apply("skills.unlock", {"player_id": "host", "skill_id": "skill-surge"})
        apply("skills.unlock", {"player_id": "host", "skill_id": "skill-resilience"})

        for _ in range(3):
            apply("campaign.resolve_mission", {"success": True})

        apply("skills.unlock", {"player_id": "host", "skill_id": "skill-ward"})
        apply("skills.equip", {"player_id": "host", "skill_id": "skill-surge"})
        slot_blocked = apply("skills.equip", {"player_id": "host", "skill_id": "skill-ward"}, expected_status=400)
        self.assertIn("slot limit", slot_blocked.get("error", ""))

    def test_economy_rewards_apply_anti_inflation_controls(self) -> None:
        status, data = self._request(
            "POST",
            "/api/gameplay/sessions",
            {"trace_id": "trace-1", "host_player_id": "host", "name": "Economy Balance"},
        )
        self.assertEqual(status, 201)
        session_id = data["session"]["id"]
        version = data["session"]["version"]

        for _ in range(14):
            action_status, action_data = self._request(
                "POST",
                f"/api/gameplay/sessions/{session_id}/action",
                {
                    "player_id": "host",
                    "type": "campaign.resolve_mission",
                    "payload": {"success": True},
                    "expected_version": version,
                },
            )
            self.assertEqual(action_status, 200)
            version = action_data["session"]["version"]

        status, data = self._request("GET", f"/api/gameplay/sessions/{session_id}")
        self.assertEqual(status, 200)
        session = data["session"]
        ledger = session["economy"]["ledger"]
        self.assertTrue(any(entry.get("type") == "reward" for entry in ledger))
        self.assertTrue(any(entry.get("type") == "sink" for entry in ledger))
        self.assertLess(session["economy"]["tokens"], 1200)
        self.assertLess(session["economy"]["inflation_index"], 4.0)

    def test_reward_cadence_claims_validate_and_persist(self) -> None:
        status, data = self._request(
            "POST",
            "/api/gameplay/sessions",
            {"trace_id": "trace-1", "host_player_id": "host", "name": "Reward Cadence"},
        )
        self.assertEqual(status, 201)
        session_id = data["session"]["id"]
        version = data["session"]["version"]

        def apply(action_type: str, payload: dict, expected_status: int = 200) -> dict:
            nonlocal version
            action_status, action_data = self._request(
                "POST",
                f"/api/gameplay/sessions/{session_id}/action",
                {
                    "player_id": "host",
                    "type": action_type,
                    "payload": payload,
                    "expected_version": version,
                },
            )
            self.assertEqual(action_status, expected_status, action_data.get("error", action_type))
            if action_status == 200:
                version = action_data["session"]["version"]
            return action_data

        for objective_id in ("obj-root-cause", "obj-recover", "obj-harden"):
            apply("raid.objective_progress", {"objective_id": objective_id, "delta": 100})

        apply("rewards.claim", {"kind": "daily"})
        second_daily = apply("rewards.claim", {"kind": "daily"}, expected_status=400)
        self.assertIn("already claimed", second_daily.get("error", ""))

        apply("rewards.claim", {"kind": "mastery", "mastery_id": "raid_mastery"})

        for _ in range(2):
            apply("raid.objective_progress", {"objective_id": "obj-root-cause", "delta": 1})
        apply("rewards.claim", {"kind": "session"})

        status, data = self._request("GET", f"/api/gameplay/sessions/{session_id}")
        self.assertEqual(status, 200)
        rewards = data["session"]["rewards"]
        self.assertTrue(rewards["session_claimed"])
        self.assertIn("raid_mastery", rewards["mastery_claims"])
        self.assertGreaterEqual(rewards["streak_days"], 1)
        self.assertGreaterEqual(len(rewards["history"]), 3)

    def test_guild_and_liveops_endpoints(self) -> None:
        status, data = self._request(
            "POST",
            "/api/gameplay/guilds",
            {"guild_id": "guild-1", "name": "Trace Guild", "owner_player_id": "host"},
        )
        self.assertEqual(status, 201)
        self.assertEqual(data["guild"]["name"], "Trace Guild")

        status, data = self._request("POST", "/api/gameplay/guilds/guild-1/join", {"player_id": "ally"})
        self.assertEqual(status, 200)
        self.assertEqual(data["guild"]["member_count"], 2)

        status, data = self._request(
            "POST",
            "/api/gameplay/guilds/guild-1/events",
            {"title": "Weekly Raid", "scheduled_at": "2026-02-16T19:00:00Z"},
        )
        self.assertEqual(status, 201)
        event_id = data["event"]["id"]

        status, data = self._request(
            "POST",
            f"/api/gameplay/guilds/guild-1/events/{event_id}/complete",
            {"impact": 12},
        )
        self.assertEqual(status, 200)
        self.assertGreater(data["guild"]["operations_score"], 0)

        status, data = self._request("GET", "/api/gameplay/liveops/current")
        self.assertEqual(status, 200)
        self.assertIn("season", data["liveops"])
        self.assertIn("rewardMultiplier", data["liveops"]["telemetry"])

        status, data = self._request("POST", "/api/gameplay/liveops/advance-week", {})
        self.assertEqual(status, 200)
        self.assertGreaterEqual(data["liveops"]["week"], 2)

        status, data = self._request("GET", "/api/gameplay/observability/summary")
        self.assertEqual(status, 200)
        self.assertIn("metrics", data["observability"])

        status, data = self._request("GET", "/api/gameplay/analytics/funnels")
        self.assertEqual(status, 200)
        self.assertIn("funnels", data["analytics"])
        self.assertIn("retention", data["analytics"])

    def test_gameplay_stream_emits_session_snapshot(self) -> None:
        status, data = self._request(
            "POST",
            "/api/gameplay/sessions",
            {"trace_id": "trace-1", "host_player_id": "host", "name": "Stream Test"},
        )
        self.assertEqual(status, 201)
        session_id = data["session"]["id"]

        conn = HTTPConnection("127.0.0.1", self.port, timeout=2)
        conn.request("GET", f"/api/stream/gameplay/{session_id}")
        resp = conn.getresponse()
        self.assertEqual(resp.status, 200)
        self.assertEqual(resp.getheader("Content-Type"), "text/event-stream")

        event_line = resp.fp.readline().decode("utf-8").strip()
        data_line = resp.fp.readline().decode("utf-8").strip()
        _ = resp.fp.readline().decode("utf-8").strip()

        self.assertEqual(event_line, "event: gameplay")
        self.assertTrue(data_line.startswith("data: "))
        payload = json.loads(data_line[len("data: ") :])
        self.assertEqual(payload["session"]["id"], session_id)
        conn.close()

    def _request(self, method: str, path: str, payload: dict | None = None) -> tuple[int, dict]:
        conn = HTTPConnection("127.0.0.1", self.port)
        body = None
        headers = {}
        if payload is not None:
            body = json.dumps(payload)
            headers["Content-Type"] = "application/json"
        conn.request(method, path, body=body, headers=headers)
        resp = conn.getresponse()
        raw = resp.read().decode("utf-8")
        data = json.loads(raw) if raw else {}
        status = resp.status
        conn.close()
        return status, data


if __name__ == "__main__":
    unittest.main()
