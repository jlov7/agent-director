from __future__ import annotations

import json
import math
import random
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from queue import Queue
from threading import Lock
from typing import Any, Dict, Tuple
from uuid import uuid4


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _clamp(value: int, minimum: int, maximum: int) -> int:
    return min(maximum, max(minimum, value))


def _clamp_float(value: float, minimum: float, maximum: float) -> float:
    return min(maximum, max(minimum, value))


def _hash_seed(source: str) -> int:
    digest = 0
    for char in source:
        digest = (digest * 31 + ord(char)) % 100_000
    return digest


def _parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


HAZARDS = [
    "latency storm",
    "cache divergence",
    "tool timeout chain",
    "schema mismatch surge",
    "context drift",
    "dependency deadlock",
]

ROLE_ABILITIES: Dict[str, Dict[str, int]] = {
    "strategist": {"focus_mark": 3},
    "operator": {"stability_shield": 2},
    "analyst": {"scan_pulse": 2},
    "saboteur": {"chaos_spike": 3},
}

SKILL_TREE: Dict[str, Dict[str, Any]] = {
    "skill-focus": {
        "cost": 1,
        "requires": [],
        "min_level": 1,
        "milestones": [],
        "slot": "core",
        "modifier": {"raidBoost": 6},
    },
    "skill-resilience": {
        "cost": 1,
        "requires": [],
        "min_level": 1,
        "milestones": [],
        "slot": "utility",
        "modifier": {"stabilityBoost": 6},
    },
    "skill-surge": {
        "cost": 2,
        "requires": ["skill-focus"],
        "min_level": 2,
        "milestones": [],
        "slot": "power",
        "modifier": {"bossDamageBoost": 10},
    },
    "skill-echo": {
        "cost": 2,
        "requires": ["skill-resilience"],
        "min_level": 2,
        "milestones": [],
        "slot": "utility",
        "modifier": {"forkEfficiency": 1},
    },
    "skill-ward": {
        "cost": 2,
        "requires": ["skill-resilience"],
        "min_level": 3,
        "milestones": ["milestone-level-3"],
        "slot": "power",
        "modifier": {"stabilityBoost": 12},
    },
    "skill-overclock": {
        "cost": 3,
        "requires": ["skill-surge", "skill-echo"],
        "min_level": 4,
        "milestones": ["milestone-level-3"],
        "slot": "power",
        "modifier": {"raidBoost": 8, "bossDamageBoost": 14},
    },
}

LOADOUT_SLOT_CAPS = {"core": 1, "utility": 1, "power": 1}

RECIPES: Dict[str, Dict[str, int]] = {
    "stability_patch": {"tokens": 20, "materials": 10, "stability_gain": 8},
    "precision_lens": {"tokens": 30, "materials": 14, "raid_gain": 12},
    "overclock_core": {"tokens": 42, "materials": 20, "boss_damage": 18},
}

ECONOMY_POLICY_DEFAULT = {
    "target_reserve": 320,
    "sink_threshold": 540,
    "sink_rate": 0.22,
    "reward_floor": 0.45,
    "reward_ceiling": 1.12,
}

LIVEOPS_CATALOG = [
    {"id": "challenge-raid", "title": "Complete 3 raid objectives", "goal": 3, "reward": 120},
    {"id": "challenge-boss", "title": "Defeat a boss phase", "goal": 1, "reward": 180},
    {"id": "challenge-guild", "title": "Complete 2 guild ops", "goal": 2, "reward": 150},
    {"id": "challenge-fork", "title": "Merge 2 forks", "goal": 2, "reward": 140},
]

NARRATIVE_NODES = {
    "node-alpha": {
        "title": "Signal Fracture",
        "choices": [
            {"id": "alpha-risk", "next": "node-beta", "tension": 10, "modifier": "risk-surge"},
            {"id": "alpha-safe", "next": "node-beta", "tension": -6, "modifier": "stability-first"},
        ],
    },
    "node-beta": {
        "title": "Protocol Fork",
        "choices": [
            {"id": "beta-speed", "next": "node-gamma", "tension": 7, "modifier": "throughput-boost"},
            {"id": "beta-clarity", "next": "node-gamma", "tension": -4, "modifier": "clarity-path"},
        ],
    },
    "node-gamma": {
        "title": "Final Directive",
        "choices": [
            {"id": "gamma-strike", "next": "node-alpha", "tension": 8, "modifier": "strike-loop"},
            {"id": "gamma-reset", "next": "node-alpha", "tension": -7, "modifier": "tempo-reset"},
        ],
    },
}


class ConflictError(ValueError):
    pass


@dataclass
class Subscription:
    token: str
    queue: Queue[dict]


class GameplayStore:
    def __init__(self, data_dir: Path) -> None:
        self._path = data_dir / "gameplay_state.json"
        self._lock = Lock()
        self._subscribers: Dict[str, Dict[str, Queue[dict]]] = {}
        self._state = self._load()

    def _load(self) -> Dict[str, Any]:
        if not self._path.exists():
            return {
                "sessions": {},
                "profiles": {},
                "guilds": {},
                "liveops": self._default_liveops(seed=2026, week=1),
            }
        with self._path.open("r", encoding="utf-8") as handle:
            loaded = json.load(handle)
        loaded.setdefault("sessions", {})
        loaded.setdefault("profiles", {})
        loaded.setdefault("guilds", {})
        loaded.setdefault("liveops", self._default_liveops(seed=2026, week=1))
        self._normalize_liveops(loaded["liveops"])
        for session in loaded["sessions"].values():
            self._normalize_session(session, loaded["liveops"])
        return loaded

    def _save(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self._path.open("w", encoding="utf-8") as handle:
            json.dump(self._state, handle, indent=2, sort_keys=True)

    def _default_liveops(self, seed: int, week: int) -> Dict[str, Any]:
        challenge = deepcopy(LIVEOPS_CATALOG[(seed + week) % len(LIVEOPS_CATALOG)])
        challenge["progress"] = 0
        challenge["completed"] = False
        return {
            "season": f"Season-{2026 + (seed % 2)}",
            "seed": seed,
            "week": week,
            "challenge": challenge,
            "tuning_history": [],
            "telemetry": {
                "sessionsStarted": 0,
                "sessionsCompleted": 0,
                "actionsApplied": 0,
                "challengeCompletions": 0,
                "difficultyFactor": 1.0,
                "rewardMultiplier": 1.0,
            },
        }

    def _normalize_liveops(self, liveops: Dict[str, Any]) -> None:
        default = self._default_liveops(seed=int(liveops.get("seed", 2026) or 2026), week=int(liveops.get("week", 1) or 1))
        liveops.setdefault("season", default["season"])
        liveops.setdefault("seed", default["seed"])
        liveops.setdefault("week", default["week"])
        liveops.setdefault("challenge", deepcopy(default["challenge"]))
        liveops.setdefault("tuning_history", [])
        telemetry = liveops.setdefault("telemetry", {})
        telemetry.setdefault("sessionsStarted", 0)
        telemetry.setdefault("sessionsCompleted", 0)
        telemetry.setdefault("actionsApplied", 0)
        telemetry.setdefault("challengeCompletions", 0)
        telemetry.setdefault("difficultyFactor", 1.0)
        telemetry.setdefault("rewardMultiplier", 1.0)

    def _normalize_session(self, session: Dict[str, Any], fallback_liveops: Dict[str, Any] | None = None) -> None:
        default_liveops = fallback_liveops or self._default_liveops(seed=int(session.get("seed", 2026) or 2026), week=1)
        liveops = session.setdefault("liveops", deepcopy(default_liveops))
        self._normalize_liveops(liveops)
        session.setdefault("sandbox", {"enabled": False})
        session.setdefault(
            "safety",
            {
                "muted_player_ids": [],
                "blocked_player_ids": [],
                "reports": [],
            },
        )
        economy = session.setdefault(
            "economy",
            {
                "tokens": 0,
                "materials": 0,
                "crafted": [],
                "ledger": [],
                "policy": deepcopy(ECONOMY_POLICY_DEFAULT),
                "inflation_index": 1.0,
            },
        )
        self._normalize_economy(economy)

    def _normalize_economy(self, economy: Dict[str, Any]) -> None:
        economy.setdefault("tokens", 0)
        economy.setdefault("materials", 0)
        economy.setdefault("crafted", [])
        economy.setdefault("ledger", [])
        policy = economy.setdefault("policy", {})
        for key, value in ECONOMY_POLICY_DEFAULT.items():
            policy.setdefault(key, value)
        economy.setdefault("inflation_index", 1.0)

    def _mission(self, seed: int, depth: int, modifiers: list[str]) -> Dict[str, Any]:
        hazard_a = HAZARDS[(seed + depth) % len(HAZARDS)]
        hazard_b = HAZARDS[(seed + depth + 2) % len(HAZARDS)]
        return {
            "id": f"mission-{depth}-{(seed + depth) % 997}",
            "title": f"Scenario Depth {depth}",
            "difficulty": _clamp(1 + depth // 2, 1, 10),
            "hazards": [hazard_a, hazard_b] + modifiers[-2:],
            "reward_tokens": 60 + depth * 15,
            "reward_materials": 10 + depth * 4,
        }

    def _ensure_profile(self, player_id: str) -> Dict[str, Any]:
        profile = self._state["profiles"].get(player_id)
        if profile is not None:
            profile.setdefault("milestones", [])
            return profile
        profile = {
            "player_id": player_id,
            "xp": 0,
            "level": 1,
            "skill_points": 4,
            "milestones": [],
            "unlocked_skills": [],
            "loadout": [],
            "loadout_capacity": 3,
            "stats": {"raids": 0, "bosses": 0, "campaigns": 0, "pvp_wins": 0},
            "modifiers": {},
        }
        self._state["profiles"][player_id] = profile
        return profile

    def _session_profile(self, session: Dict[str, Any], player_id: str) -> Dict[str, Any]:
        profiles = session.setdefault("profiles", {})
        if player_id not in profiles:
            profiles[player_id] = deepcopy(self._ensure_profile(player_id))
        return profiles[player_id]

    def _serialize_session(self, session: Dict[str, Any]) -> Dict[str, Any]:
        payload = deepcopy(session)
        self._normalize_session(payload, self._state["liveops"])
        payload["economy"]["ledger_count"] = len(payload["economy"].get("ledger", []))
        return payload

    def _refresh_economy_index(self, economy: Dict[str, Any]) -> None:
        self._normalize_economy(economy)
        target = max(1, int(economy["policy"].get("target_reserve", 1)))
        economy["inflation_index"] = round(float(economy.get("tokens", 0)) / float(target), 3)

    def _append_economy_ledger(self, economy: Dict[str, Any], entry: Dict[str, Any]) -> None:
        self._normalize_economy(economy)
        economy["ledger"].append(entry)
        economy["ledger"] = economy["ledger"][-200:]

    def _apply_anti_inflation_sink(self, session: Dict[str, Any], trigger: str) -> int:
        economy = session["economy"]
        self._normalize_economy(economy)
        policy = economy["policy"]
        threshold = int(policy.get("sink_threshold", ECONOMY_POLICY_DEFAULT["sink_threshold"]))
        tokens = int(economy.get("tokens", 0))
        if tokens <= threshold:
            self._refresh_economy_index(economy)
            return 0
        overflow = tokens - threshold
        sink_rate = float(policy.get("sink_rate", ECONOMY_POLICY_DEFAULT["sink_rate"]))
        sink_amount = max(1, int(round(overflow * sink_rate)))
        economy["tokens"] = max(0, tokens - sink_amount)
        self._append_economy_ledger(
            economy,
            {
                "id": uuid4().hex[:8],
                "type": "sink",
                "reason": f"anti_inflation:{trigger}",
                "tokens": -sink_amount,
                "materials": 0,
                "at": _utc_now(),
            },
        )
        self._refresh_economy_index(economy)
        return sink_amount

    def _apply_token_reward(
        self, session: Dict[str, Any], base_tokens: int, reason: str, metadata: Dict[str, Any] | None = None
    ) -> int:
        if base_tokens <= 0:
            return 0
        economy = session["economy"]
        self._normalize_economy(economy)
        policy = economy["policy"]
        target = max(1, int(policy.get("target_reserve", ECONOMY_POLICY_DEFAULT["target_reserve"])))
        tokens = int(economy.get("tokens", 0))
        floor = float(policy.get("reward_floor", ECONOMY_POLICY_DEFAULT["reward_floor"]))
        ceiling = float(policy.get("reward_ceiling", ECONOMY_POLICY_DEFAULT["reward_ceiling"]))
        if tokens <= target:
            lift = min(0.12, ((target - tokens) / target) * 0.12)
            multiplier = min(ceiling, 1.0 + lift)
        else:
            pressure = (tokens - target) / target
            multiplier = max(floor, 1.0 - pressure * 0.35)
        awarded = max(1, int(round(base_tokens * multiplier)))
        economy["tokens"] = tokens + awarded
        ledger_entry = {
            "id": uuid4().hex[:8],
            "type": "reward",
            "reason": reason,
            "base_tokens": int(base_tokens),
            "tokens": awarded,
            "materials": 0,
            "multiplier": round(multiplier, 3),
            "at": _utc_now(),
        }
        if metadata:
            ledger_entry["meta"] = metadata
        self._append_economy_ledger(economy, ledger_entry)
        self._apply_anti_inflation_sink(session, trigger=reason)
        self._refresh_economy_index(economy)
        return awarded

    def _spend_resources(
        self,
        session: Dict[str, Any],
        *,
        tokens: int,
        materials: int,
        reason: str,
        metadata: Dict[str, Any] | None = None,
    ) -> None:
        economy = session["economy"]
        self._normalize_economy(economy)
        if tokens > 0:
            economy["tokens"] = max(0, int(economy["tokens"]) - tokens)
        if materials > 0:
            economy["materials"] = max(0, int(economy["materials"]) - materials)
        ledger_entry = {
            "id": uuid4().hex[:8],
            "type": "spend",
            "reason": reason,
            "tokens": -int(tokens),
            "materials": -int(materials),
            "at": _utc_now(),
        }
        if metadata:
            ledger_entry["meta"] = metadata
        self._append_economy_ledger(economy, ledger_entry)
        self._refresh_economy_index(economy)

    def _apply_weekly_upkeep_sink(self, session: Dict[str, Any]) -> int:
        economy = session["economy"]
        self._normalize_economy(economy)
        policy = economy["policy"]
        target = int(policy.get("target_reserve", ECONOMY_POLICY_DEFAULT["target_reserve"]))
        tokens = int(economy.get("tokens", 0))
        if tokens <= target:
            self._refresh_economy_index(economy)
            return 0
        upkeep = max(6, int(round((tokens - target) * 0.08)))
        economy["tokens"] = max(0, tokens - upkeep)
        self._append_economy_ledger(
            economy,
            {
                "id": uuid4().hex[:8],
                "type": "sink",
                "reason": "weekly_upkeep",
                "tokens": -upkeep,
                "materials": 0,
                "at": _utc_now(),
            },
        )
        self._refresh_economy_index(economy)
        return upkeep

    def _publish(self, session_id: str, event_type: str, payload: Dict[str, Any]) -> None:
        event = {"type": event_type, "publishedAt": _utc_now(), **payload}
        subscribers = self._subscribers.get(session_id, {})
        for queue in subscribers.values():
            queue.put_nowait(event)

    def subscribe(self, session_id: str) -> Subscription:
        token = uuid4().hex
        queue: Queue[dict] = Queue()
        with self._lock:
            self._subscribers.setdefault(session_id, {})[token] = queue
        return Subscription(token=token, queue=queue)

    def unsubscribe(self, session_id: str, token: str) -> None:
        with self._lock:
            session_subscribers = self._subscribers.get(session_id, {})
            session_subscribers.pop(token, None)
            if not session_subscribers and session_id in self._subscribers:
                self._subscribers.pop(session_id, None)

    def list_sessions(self) -> list[Dict[str, Any]]:
        with self._lock:
            sessions = list(self._state["sessions"].values())
            return [self._serialize_session(session) for session in sessions]

    def get_session(self, session_id: str) -> Dict[str, Any] | None:
        with self._lock:
            session = self._state["sessions"].get(session_id)
            if session is None:
                return None
            return self._serialize_session(session)

    def create_session(self, trace_id: str, host_player_id: str, name: str | None = None) -> Dict[str, Any]:
        if not trace_id.strip():
            raise ValueError("trace_id must be non-empty")
        if not host_player_id.strip():
            raise ValueError("host_player_id must be non-empty")
        with self._lock:
            session_id = f"session-{uuid4().hex[:8]}"
            seed = _hash_seed(f"{trace_id}:{session_id}")
            now = _utc_now()
            profile = self._ensure_profile(host_player_id)
            session = {
                "id": session_id,
                "name": (name or "Incident Session").strip() or "Incident Session",
                "trace_id": trace_id,
                "status": "lobby",
                "seed": seed,
                "version": 1,
                "created_at": now,
                "updated_at": now,
                "players": [
                    {
                        "player_id": host_player_id,
                        "role": "strategist",
                        "joined_at": now,
                        "cooldowns": {},
                        "presence": "active",
                    }
                ],
                "raid": {
                    "objectives": [
                        {"id": "obj-root-cause", "label": "Identify root-cause chain", "progress": 0, "target": 100, "completed": False},
                        {"id": "obj-recover", "label": "Recover operational stability", "progress": 0, "target": 100, "completed": False},
                        {"id": "obj-harden", "label": "Harden replay strategy", "progress": 0, "target": 100, "completed": False},
                    ],
                    "completed": False,
                },
                "campaign": {
                    "depth": 1,
                    "lives": 3,
                    "permadeath": False,
                    "modifiers": ["baseline"],
                    "unlocked_modifiers": [],
                    "completed_missions": [],
                    "current_mission": self._mission(seed, 1, ["baseline"]),
                },
                "narrative": {
                    "current_node_id": "node-alpha",
                    "history": [],
                    "tension": 35,
                    "nodes": deepcopy(NARRATIVE_NODES),
                },
                "profiles": {host_player_id: deepcopy(profile)},
                "pvp": {
                    "round": 0,
                    "operator_stability": 72,
                    "sabotage_pressure": 28,
                    "fog": 40,
                    "winner": None,
                },
                "time": {
                    "active_fork_id": "primary",
                    "forks": [{"id": "primary", "label": "Primary timeline", "playhead_ms": 0, "history": [0], "parent_fork_id": None}],
                    "audits": [],
                },
                "boss": {
                    "name": "Causality Hydra",
                    "phase": 1,
                    "hp": 360,
                    "max_hp": 360,
                    "enraged": False,
                    "adaptive_pattern": "observe",
                },
                "director": {
                    "risk": 30,
                    "skill_tier": "mid",
                    "hazard_bias": "balanced",
                    "goal": "Stabilize flow and isolate fault chain.",
                    "hint": "Start with latency hotspot and protect critical path.",
                },
                "economy": {
                    "tokens": 160,
                    "materials": 100,
                    "crafted": [],
                    "ledger": [],
                    "policy": deepcopy(ECONOMY_POLICY_DEFAULT),
                    "inflation_index": 0.5,
                },
                "guild": {
                    "guild_id": None,
                    "operations_score": 0,
                    "events_completed": 0,
                },
                "cinematic": {
                    "events": [],
                    "camera_state": "wide",
                },
                "liveops": deepcopy(self._state["liveops"]),
                "sandbox": {"enabled": False},
                "safety": {
                    "muted_player_ids": [],
                    "blocked_player_ids": [],
                    "reports": [],
                },
                "telemetry": {
                    "actions": 0,
                    "successes": 0,
                    "failures": 0,
                    "avg_latency_ms": 0,
                    "boss_damage_total": 0,
                },
            }
            self._state["liveops"]["telemetry"]["sessionsStarted"] += 1
            self._state["sessions"][session_id] = session
            self._save()
            public = self._serialize_session(session)
        self._publish(session_id, "gameplay", {"session": public, "event": {"type": "session.created"}})
        return public

    def join_session(self, session_id: str, player_id: str, role: str) -> Dict[str, Any]:
        if role not in ROLE_ABILITIES:
            raise ValueError(f"role must be one of {', '.join(sorted(ROLE_ABILITIES))}")
        if not player_id.strip():
            raise ValueError("player_id must be non-empty")
        with self._lock:
            session = self._state["sessions"].get(session_id)
            if session is None:
                raise FileNotFoundError(f"Gameplay session not found: {session_id}")
            players = session["players"]
            existing = next((entry for entry in players if entry["player_id"] == player_id), None)
            if existing is None and len(players) >= 5:
                raise ValueError("Session supports 2-5 players only")
            if existing is None:
                now = _utc_now()
                players.append(
                    {"player_id": player_id, "role": role, "joined_at": now, "cooldowns": {}, "presence": "active"}
                )
            else:
                existing["role"] = role
                existing["presence"] = "active"
            self._session_profile(session, player_id)
            session["version"] += 1
            session["updated_at"] = _utc_now()
            if len(players) >= 2 and session["status"] == "lobby":
                session["status"] = "running"
            self._save()
            public = self._serialize_session(session)
        self._publish(session_id, "gameplay", {"session": public, "event": {"type": "session.join", "player_id": player_id}})
        return public

    def leave_session(self, session_id: str, player_id: str) -> Dict[str, Any]:
        with self._lock:
            session = self._state["sessions"].get(session_id)
            if session is None:
                raise FileNotFoundError(f"Gameplay session not found: {session_id}")
            players = [entry for entry in session["players"] if entry["player_id"] != player_id]
            session["players"] = players
            session["version"] += 1
            session["updated_at"] = _utc_now()
            if len(players) < 2:
                session["status"] = "lobby"
            self._save()
            public = self._serialize_session(session)
        self._publish(session_id, "gameplay", {"session": public, "event": {"type": "session.leave", "player_id": player_id}})
        return public

    def _mutate_profile_skill_unlock(self, profile: Dict[str, Any], skill_id: str) -> None:
        if skill_id not in SKILL_TREE:
            raise ValueError(f"Unknown skill_id: {skill_id}")
        if skill_id in profile["unlocked_skills"]:
            return
        descriptor = SKILL_TREE[skill_id]
        required_level = int(descriptor.get("min_level", 1))
        if int(profile["level"]) < required_level:
            raise ValueError(f"Requires level {required_level}")
        milestones = profile.get("milestones", [])
        for milestone in descriptor.get("milestones", []):
            if milestone not in milestones:
                raise ValueError(f"Missing required milestone: {milestone}")
        for required in descriptor["requires"]:
            if required not in profile["unlocked_skills"]:
                raise ValueError(f"Missing prerequisite skill: {required}")
        if profile["skill_points"] < descriptor["cost"]:
            raise ValueError("Not enough skill points")
        profile["skill_points"] -= descriptor["cost"]
        profile["unlocked_skills"].append(skill_id)
        profile["modifiers"][skill_id] = descriptor["modifier"]

    def _grant_profile_xp(self, profile: Dict[str, Any], amount: int) -> None:
        if amount <= 0:
            return
        profile["xp"] = int(profile.get("xp", 0)) + amount
        profile.setdefault("milestones", [])
        while profile["xp"] >= int(profile["level"]) * 200:
            profile["xp"] -= int(profile["level"]) * 200
            profile["level"] += 1
            profile["skill_points"] += 1
        for milestone_level in (3, 5, 10):
            milestone_id = f"milestone-level-{milestone_level}"
            if profile["level"] >= milestone_level and milestone_id not in profile["milestones"]:
                profile["milestones"].append(milestone_id)

    def _mutate_profile_skill_equip(self, profile: Dict[str, Any], skill_id: str) -> None:
        if skill_id not in profile["unlocked_skills"]:
            raise ValueError("Skill must be unlocked before equip")
        if skill_id in profile["loadout"]:
            return
        descriptor = SKILL_TREE.get(skill_id)
        if descriptor is None:
            raise ValueError(f"Unknown skill_id: {skill_id}")
        if len(profile["loadout"]) >= profile["loadout_capacity"]:
            raise ValueError("Loadout capacity reached")
        slot = str(descriptor.get("slot", "utility"))
        slot_limit = int(LOADOUT_SLOT_CAPS.get(slot, profile["loadout_capacity"]))
        equipped_in_slot = 0
        for equipped_skill_id in profile["loadout"]:
            equipped_slot = str(SKILL_TREE.get(equipped_skill_id, {}).get("slot", "utility"))
            if equipped_slot == slot:
                equipped_in_slot += 1
        if equipped_in_slot >= slot_limit:
            raise ValueError(f"Loadout slot limit reached for {slot}")
        profile["loadout"].append(skill_id)

    def apply_action(
        self,
        session_id: str,
        player_id: str,
        action_type: str,
        payload: Dict[str, Any] | None,
        expected_version: int | None,
    ) -> Dict[str, Any]:
        payload = payload or {}
        with self._lock:
            session = self._state["sessions"].get(session_id)
            if session is None:
                raise FileNotFoundError(f"Gameplay session not found: {session_id}")
            self._normalize_session(session, self._state["liveops"])
            if expected_version is not None and expected_version != session["version"]:
                raise ConflictError("Session version mismatch")
            players = {entry["player_id"]: entry for entry in session["players"]}
            if player_id not in players:
                raise ValueError("player_id is not part of the session")
            actor_profile = self._session_profile(session, player_id)

            session["telemetry"]["actions"] += 1
            session["liveops"]["telemetry"]["actionsApplied"] += 1

            if action_type == "session.toggle_sandbox":
                session.setdefault("sandbox", {"enabled": False})
                session["sandbox"]["enabled"] = bool(payload.get("enabled", False))
            elif action_type == "raid.objective_progress":
                objective_id = str(payload.get("objective_id") or "")
                delta = int(payload.get("delta") or 0)
                objectives = session["raid"]["objectives"]
                matched = False
                for objective in objectives:
                    if objective["id"] != objective_id:
                        continue
                    matched = True
                    objective["progress"] = _clamp(objective["progress"] + delta, 0, objective["target"])
                    objective["completed"] = objective["progress"] >= objective["target"]
                if not matched:
                    raise ValueError("objective_id not found")
                session["raid"]["completed"] = all(item["completed"] for item in objectives)
                if session["raid"]["completed"]:
                    self._apply_token_reward(
                        session,
                        140,
                        "raid_completion",
                        {"objective_id": objective_id},
                    )
                    session["liveops"]["telemetry"]["sessionsCompleted"] += 1
                    self._grant_profile_xp(actor_profile, 60)
            elif action_type == "raid.use_ability":
                ability = str(payload.get("ability") or "")
                player = players[player_id]
                role = player["role"]
                abilities = ROLE_ABILITIES.get(role, {})
                if ability not in abilities:
                    raise ValueError("Ability not available for role")
                round_count = session["pvp"]["round"]
                next_allowed = int(player["cooldowns"].get(ability, 0))
                if round_count < next_allowed:
                    raise ValueError("Ability on cooldown")
                player["cooldowns"][ability] = round_count + abilities[ability]
                if ability == "focus_mark":
                    session["raid"]["objectives"][0]["progress"] = _clamp(
                        session["raid"]["objectives"][0]["progress"] + 12, 0, 100
                    )
                if ability == "stability_shield":
                    session["pvp"]["operator_stability"] = _clamp(
                        session["pvp"]["operator_stability"] + 8, 0, 100
                    )
                if ability == "scan_pulse":
                    session["pvp"]["fog"] = _clamp(session["pvp"]["fog"] - 15, 0, 100)
                if ability == "chaos_spike":
                    session["pvp"]["sabotage_pressure"] = _clamp(
                        session["pvp"]["sabotage_pressure"] + 10, 0, 100
                    )
            elif action_type == "campaign.resolve_mission":
                success = bool(payload.get("success", False))
                campaign = session["campaign"]
                mission = campaign["current_mission"]
                if success:
                    campaign["depth"] += 1
                    campaign["completed_missions"].append(mission["id"])
                    self._apply_token_reward(
                        session,
                        int(mission["reward_tokens"]),
                        "campaign_success",
                        {"mission_id": mission["id"], "depth": campaign["depth"]},
                    )
                    session["economy"]["materials"] += mission["reward_materials"]
                    if campaign["depth"] % 2 == 0:
                        campaign["unlocked_modifiers"].append(f"modifier-depth-{campaign['depth']}")
                    session["telemetry"]["successes"] += 1
                    self._grant_profile_xp(actor_profile, 120)
                else:
                    sandbox_enabled = bool(session.get("sandbox", {}).get("enabled", False))
                    campaign["lives"] = campaign["lives"] if sandbox_enabled else _clamp(campaign["lives"] - 1, 0, 3)
                    session["telemetry"]["failures"] += 1
                    self._grant_profile_xp(actor_profile, 40)
                    if campaign["lives"] == 0 and not sandbox_enabled:
                        campaign["permadeath"] = True
                        campaign["depth"] = 1
                        campaign["lives"] = 3
                        campaign["completed_missions"] = []
                        campaign["modifiers"] = ["baseline", "rebirth-tax"]
                campaign["current_mission"] = self._mission(
                    session["seed"], campaign["depth"], campaign["modifiers"] + campaign["unlocked_modifiers"]
                )
            elif action_type == "narrative.choose":
                choice_id = str(payload.get("choice_id") or "")
                narrative = session["narrative"]
                node_id = narrative["current_node_id"]
                node = narrative["nodes"].get(node_id, {})
                choices = node.get("choices", [])
                choice = next((item for item in choices if item["id"] == choice_id), None)
                if choice is None:
                    raise ValueError("choice_id not found")
                narrative["history"].append({"node_id": node_id, "choice_id": choice_id, "at": _utc_now()})
                narrative["current_node_id"] = choice["next"]
                narrative["tension"] = _clamp(narrative["tension"] + int(choice["tension"]), 0, 100)
                session["campaign"]["modifiers"] = list(
                    dict.fromkeys(session["campaign"]["modifiers"] + [choice["modifier"]])
                )[-8:]
            elif action_type == "skills.unlock":
                target = str(payload.get("player_id") or player_id)
                skill_id = str(payload.get("skill_id") or "")
                profile = self._session_profile(session, target)
                self._mutate_profile_skill_unlock(profile, skill_id)
                self._state["profiles"][target] = deepcopy(profile)
            elif action_type == "skills.equip":
                target = str(payload.get("player_id") or player_id)
                skill_id = str(payload.get("skill_id") or "")
                profile = self._session_profile(session, target)
                self._mutate_profile_skill_equip(profile, skill_id)
                self._state["profiles"][target] = deepcopy(profile)
            elif action_type == "pvp.act":
                action = str(payload.get("action") or "")
                pvp = session["pvp"]
                if action == "sabotage":
                    pvp["sabotage_pressure"] = _clamp(pvp["sabotage_pressure"] + 13, 0, 100)
                    pvp["operator_stability"] = _clamp(pvp["operator_stability"] - 11, 0, 100)
                    pvp["fog"] = _clamp(pvp["fog"] + 9, 0, 100)
                elif action == "stabilize":
                    pvp["operator_stability"] = _clamp(pvp["operator_stability"] + 14, 0, 100)
                    pvp["sabotage_pressure"] = _clamp(pvp["sabotage_pressure"] - 8, 0, 100)
                    pvp["fog"] = _clamp(pvp["fog"] - 6, 0, 100)
                elif action == "scan":
                    pvp["fog"] = _clamp(pvp["fog"] - 16, 0, 100)
                    pvp["operator_stability"] = _clamp(pvp["operator_stability"] + 3, 0, 100)
                    pvp["sabotage_pressure"] = _clamp(pvp["sabotage_pressure"] - 4, 0, 100)
                else:
                    raise ValueError("Unknown pvp action")
                pvp["round"] += 1
                if pvp["operator_stability"] <= 0:
                    pvp["winner"] = "saboteur"
                elif pvp["sabotage_pressure"] <= 0:
                    pvp["winner"] = "operator"
                elif pvp["round"] >= 10:
                    pvp["winner"] = (
                        "operator"
                        if pvp["operator_stability"] >= pvp["sabotage_pressure"]
                        else "saboteur"
                    )
                self._grant_profile_xp(actor_profile, 12)
                if pvp["winner"] == "operator":
                    self._grant_profile_xp(actor_profile, 72)
            elif action_type == "time.create_fork":
                label = str(payload.get("label") or "").strip() or f"fork-{len(session['time']['forks']) + 1}"
                playhead_ms = _clamp(int(payload.get("playhead_ms") or 0), 0, 3_600_000)
                fork_id = f"fork-{len(session['time']['forks']) + 1}"
                session["time"]["forks"].append(
                    {
                        "id": fork_id,
                        "label": label,
                        "playhead_ms": playhead_ms,
                        "history": [playhead_ms],
                        "parent_fork_id": session["time"]["active_fork_id"],
                    }
                )
                session["time"]["active_fork_id"] = fork_id
                session["time"]["audits"].append({"type": "fork", "fork_id": fork_id, "at": _utc_now()})
            elif action_type == "time.rewind":
                amount_ms = abs(int(payload.get("amount_ms") or 0))
                active_id = session["time"]["active_fork_id"]
                for fork in session["time"]["forks"]:
                    if fork["id"] != active_id:
                        continue
                    fork["playhead_ms"] = _clamp(fork["playhead_ms"] - amount_ms, 0, 3_600_000)
                    fork["history"].append(fork["playhead_ms"])
                    session["time"]["audits"].append(
                        {"type": "rewind", "fork_id": active_id, "amount_ms": amount_ms, "at": _utc_now()}
                    )
                    break
            elif action_type == "time.merge":
                merge_id = str(payload.get("fork_id") or session["time"]["active_fork_id"])
                if merge_id == "primary":
                    raise ValueError("Cannot merge primary into itself")
                source = next((fork for fork in session["time"]["forks"] if fork["id"] == merge_id), None)
                primary = next((fork for fork in session["time"]["forks"] if fork["id"] == "primary"), None)
                if source is None or primary is None:
                    raise ValueError("fork_id not found")
                primary["playhead_ms"] = source["playhead_ms"]
                primary["history"].append(source["playhead_ms"])
                session["time"]["forks"] = [
                    fork
                    for fork in session["time"]["forks"]
                    if fork["id"] not in {"primary", merge_id}
                ]
                session["time"]["forks"].insert(0, primary)
                session["time"]["active_fork_id"] = "primary"
                session["time"]["audits"].append(
                    {"type": "merge", "from_fork_id": merge_id, "to": "primary", "at": _utc_now()}
                )
            elif action_type == "boss.act":
                action = str(payload.get("action") or "")
                damage = 42 if action == "exploit" else 24 if action == "strike" else 8 if action == "shield" else None
                if damage is None:
                    raise ValueError("Unknown boss action")
                boss = session["boss"]
                boss["hp"] = _clamp(boss["hp"] - damage, 0, boss["max_hp"])
                ratio = boss["hp"] / boss["max_hp"]
                boss["phase"] = 3 if ratio <= 0.33 else 2 if ratio <= 0.66 else 1
                boss["enraged"] = boss["phase"] == 3 or boss["hp"] <= int(boss["max_hp"] * 0.2)
                boss["adaptive_pattern"] = (
                    "counter-focus" if action == "exploit" else "aoe-pressure" if action == "strike" else "shield-break"
                )
                session["telemetry"]["boss_damage_total"] += damage
                self._grant_profile_xp(actor_profile, 10)
                if boss["hp"] <= 0:
                    self._grant_profile_xp(actor_profile, 180)
            elif action_type == "director.evaluate":
                failures = int(payload.get("failures") or 0)
                retries = int(payload.get("retries") or 0)
                latency_ms = int(payload.get("latency_ms") or 0)
                risk = _clamp(20 + failures * 12 + retries * 4 + (8 if latency_ms > 1400 else 0), 0, 100)
                hint = (
                    "Run a stabilizing branch and constrain fan-out."
                    if failures > 0
                    else "Team momentum stable. Execute high-confidence branch."
                )
                skill_tier = "high" if risk < 35 else "mid" if risk < 65 else "critical"
                hazard_bias = "stability" if failures > 0 else "aggressive"
                session["director"] = {
                    **session["director"],
                    "risk": risk,
                    "hint": hint,
                    "skill_tier": skill_tier,
                    "hazard_bias": hazard_bias,
                    "goal": "Neutralize sabotage pressure before next phase."
                    if failures > 0
                    else "Compress mission time while preserving trace integrity.",
                }
                current_latency = int(session["telemetry"]["avg_latency_ms"])
                if current_latency <= 0:
                    session["telemetry"]["avg_latency_ms"] = latency_ms
                else:
                    session["telemetry"]["avg_latency_ms"] = (current_latency + latency_ms) // 2
            elif action_type == "economy.craft":
                recipe_id = str(payload.get("recipe_id") or "")
                recipe = RECIPES.get(recipe_id)
                if recipe is None:
                    raise ValueError("Unknown recipe_id")
                economy = session["economy"]
                if economy["tokens"] < recipe["tokens"] or economy["materials"] < recipe["materials"]:
                    raise ValueError("Insufficient resources")
                self._spend_resources(
                    session,
                    tokens=recipe["tokens"],
                    materials=recipe["materials"],
                    reason="craft",
                    metadata={"recipe_id": recipe_id},
                )
                if recipe_id not in economy["crafted"]:
                    economy["crafted"].append(recipe_id)
                if recipe_id == "stability_patch":
                    session["pvp"]["operator_stability"] = _clamp(
                        session["pvp"]["operator_stability"] + recipe["stability_gain"], 0, 100
                    )
                elif recipe_id == "precision_lens":
                    session["raid"]["objectives"][0]["progress"] = _clamp(
                        session["raid"]["objectives"][0]["progress"] + recipe["raid_gain"], 0, 100
                    )
                elif recipe_id == "overclock_core":
                    session["boss"]["hp"] = _clamp(
                        session["boss"]["hp"] - recipe["boss_damage"], 0, session["boss"]["max_hp"]
                    )
            elif action_type == "guild.op":
                impact = int(payload.get("impact") or 0)
                session["guild"]["operations_score"] += impact
                if impact > 0:
                    session["guild"]["events_completed"] += 1
                    self._apply_token_reward(session, impact * 3, "guild_op", {"impact": impact})
                    self._grant_profile_xp(actor_profile, impact * 6)
                guild_id = session["guild"]["guild_id"]
                if guild_id:
                    guild = self._state["guilds"].get(guild_id)
                    if guild:
                        guild["operations_score"] += impact
                        if impact > 0:
                            guild["events_completed"] += 1
            elif action_type == "guild.bind":
                guild_id = str(payload.get("guild_id") or "")
                if not guild_id:
                    raise ValueError("guild_id is required")
                guild = self._state["guilds"].get(guild_id)
                if guild is None:
                    raise FileNotFoundError(f"Guild not found: {guild_id}")
                session["guild"]["guild_id"] = guild_id
                session["guild"]["operations_score"] = guild["operations_score"]
                session["guild"]["events_completed"] = guild["events_completed"]
            elif action_type == "cinematic.emit":
                event_type = str(payload.get("event_type") or "info")
                message = str(payload.get("message") or "Event update")
                intensity = _clamp(int(payload.get("intensity") or 1), 1, 3)
                camera_state = "tight" if intensity == 3 else "medium" if intensity == 2 else "wide"
                session["cinematic"]["camera_state"] = camera_state
                session["cinematic"]["events"].append(
                    {
                        "id": f"evt-{uuid4().hex[:8]}",
                        "type": event_type,
                        "message": message,
                        "intensity": intensity,
                        "camera_state": camera_state,
                        "at": _utc_now(),
                    }
                )
            elif action_type == "liveops.progress":
                delta = _clamp(int(payload.get("delta") or 1), 0, 20)
                challenge = session["liveops"]["challenge"]
                was_completed = bool(challenge["completed"])
                challenge["progress"] = _clamp(challenge["progress"] + delta, 0, challenge["goal"])
                challenge["completed"] = challenge["progress"] >= challenge["goal"]
                if challenge["completed"] and not was_completed:
                    self._apply_token_reward(
                        session,
                        int(challenge["reward"]),
                        "liveops_challenge",
                        {"challenge_id": challenge["id"]},
                    )
                    session["liveops"]["telemetry"]["challengeCompletions"] += 1
                    self._grant_profile_xp(actor_profile, 80)
            elif action_type == "liveops.balance":
                liveops = session["liveops"]
                telemetry = liveops["telemetry"]
                current_difficulty = float(telemetry.get("difficultyFactor") or 1.0)
                current_reward = float(telemetry.get("rewardMultiplier") or 1.0)
                next_difficulty = _clamp_float(float(payload.get("difficulty_factor") or current_difficulty), 0.6, 1.6)
                next_reward = _clamp_float(float(payload.get("reward_multiplier") or current_reward), 0.5, 2.0)
                note = str(payload.get("note") or "").strip() or "Operator tuning update"
                challenge = liveops["challenge"]
                base_goal = challenge["goal"] / (current_difficulty or 1.0)
                base_reward = challenge["reward"] / (current_reward or 1.0)
                challenge["goal"] = max(1, int(round(base_goal * next_difficulty)))
                challenge["reward"] = max(1, int(round(base_reward * next_reward)))
                challenge["progress"] = _clamp(challenge["progress"], 0, challenge["goal"])
                challenge["completed"] = challenge["progress"] >= challenge["goal"]
                telemetry["difficultyFactor"] = round(next_difficulty, 2)
                telemetry["rewardMultiplier"] = round(next_reward, 2)
                tuning_entry = {
                    "id": f"tuning-{uuid4().hex[:8]}",
                    "changed_at": _utc_now(),
                    "difficultyFactor": telemetry["difficultyFactor"],
                    "rewardMultiplier": telemetry["rewardMultiplier"],
                    "note": note,
                    "actor_player_id": player_id,
                }
                liveops["tuning_history"] = [tuning_entry, *liveops.get("tuning_history", [])][:20]
            elif action_type == "liveops.advance_week":
                self._advance_liveops_week_locked(session["liveops"])
                self._apply_weekly_upkeep_sink(session)
            elif action_type == "safety.mute":
                target_player_id = str(payload.get("target_player_id") or "").strip().lower()
                if not target_player_id:
                    raise ValueError("target_player_id is required")
                muted = session["safety"]["muted_player_ids"]
                if target_player_id not in muted:
                    muted.append(target_player_id)
            elif action_type == "safety.block":
                target_player_id = str(payload.get("target_player_id") or "").strip().lower()
                if not target_player_id:
                    raise ValueError("target_player_id is required")
                blocked = session["safety"]["blocked_player_ids"]
                muted = session["safety"]["muted_player_ids"]
                if target_player_id not in blocked:
                    blocked.append(target_player_id)
                if target_player_id not in muted:
                    muted.append(target_player_id)
            elif action_type == "safety.report":
                target_player_id = str(payload.get("target_player_id") or "").strip().lower()
                reason = str(payload.get("reason") or "").strip()
                if not target_player_id:
                    raise ValueError("target_player_id is required")
                if not reason:
                    raise ValueError("reason is required")
                report = {
                    "id": f"report-{uuid4().hex[:8]}",
                    "target_player_id": target_player_id,
                    "reason": reason,
                    "created_at": _utc_now(),
                    "reporter_player_id": player_id,
                }
                session["safety"]["reports"] = [report, *session["safety"]["reports"]][:100]
            else:
                raise ValueError(f"Unknown action type: {action_type}")

            session["version"] += 1
            session["updated_at"] = _utc_now()
            self._state["profiles"][player_id] = deepcopy(actor_profile)
            self._save()
            public = self._serialize_session(session)

        self._publish(
            session_id,
            "gameplay",
            {"session": public, "event": {"type": action_type, "player_id": player_id, "payload": payload}},
        )
        return public

    def _advance_liveops_week_locked(self, liveops: Dict[str, Any]) -> None:
        self._normalize_liveops(liveops)
        telemetry = liveops["telemetry"]
        sessions_started = max(1, int(telemetry.get("sessionsStarted", 0)))
        completions = int(telemetry.get("challengeCompletions", 0))
        completion_rate = completions / sessions_started
        telemetry["difficultyFactor"] = round(_clamp(int((1.0 + (0.5 - completion_rate)) * 100), 60, 140) / 100, 2)
        reward_multiplier = _clamp_float(float(telemetry.get("rewardMultiplier") or 1.0), 0.5, 2.0)
        telemetry["rewardMultiplier"] = round(reward_multiplier, 2)
        liveops["week"] = int(liveops["week"]) + 1
        challenge = deepcopy(
            LIVEOPS_CATALOG[(int(liveops["seed"]) + int(liveops["week"])) % len(LIVEOPS_CATALOG)]
        )
        challenge["goal"] = max(1, int(round(challenge["goal"] * telemetry["difficultyFactor"])))
        challenge["reward"] = max(1, int(round(challenge["reward"] * telemetry["rewardMultiplier"])))
        challenge["progress"] = 0
        challenge["completed"] = False
        liveops["challenge"] = challenge

    def current_liveops(self) -> Dict[str, Any]:
        with self._lock:
            return deepcopy(self._state["liveops"])

    def advance_liveops_week(self) -> Dict[str, Any]:
        with self._lock:
            self._advance_liveops_week_locked(self._state["liveops"])
            self._save()
            return deepcopy(self._state["liveops"])

    def observability_snapshot(self) -> Dict[str, Any]:
        with self._lock:
            sessions = list(self._state["sessions"].values())
            latencies = sorted(
                int(session.get("telemetry", {}).get("avg_latency_ms") or 0)
                for session in sessions
                if int(session.get("telemetry", {}).get("avg_latency_ms") or 0) > 0
            )
            p95_latency = 0
            if latencies:
                p95_index = max(0, math.ceil(len(latencies) * 0.95) - 1)
                p95_latency = latencies[p95_index]
            actions = sum(int(session.get("telemetry", {}).get("actions") or 0) for session in sessions)
            failures = sum(int(session.get("telemetry", {}).get("failures") or 0) for session in sessions)
            failure_rate = round((failures / max(1, actions)) * 100, 2)
            running_sessions = sum(1 for session in sessions if session.get("status") == "running")
            liveops = deepcopy(self._state["liveops"])
            self._normalize_liveops(liveops)
            sessions_started = max(1, int(liveops["telemetry"].get("sessionsStarted") or 0))
            completions = int(liveops["telemetry"].get("challengeCompletions") or 0)
            challenge_completion_rate = round((completions / sessions_started) * 100, 2)

            alerts: list[Dict[str, Any]] = []
            if failure_rate >= 8:
                alerts.append(
                    {
                        "id": "alert-failure-rate",
                        "severity": "high",
                        "message": "Failure rate exceeded threshold.",
                        "metric": "failure_rate_pct",
                        "threshold": 8,
                        "value": failure_rate,
                    }
                )
            if p95_latency >= 1500:
                alerts.append(
                    {
                        "id": "alert-p95-latency",
                        "severity": "medium",
                        "message": "P95 latency is above target.",
                        "metric": "p95_latency_ms",
                        "threshold": 1500,
                        "value": p95_latency,
                    }
                )
            if challenge_completion_rate < 20 and sessions_started >= 5:
                alerts.append(
                    {
                        "id": "alert-challenge-completion",
                        "severity": "medium",
                        "message": "LiveOps challenge completion rate is below expected range.",
                        "metric": "challenge_completion_rate_pct",
                        "threshold": 20,
                        "value": challenge_completion_rate,
                    }
                )

            return {
                "generated_at": _utc_now(),
                "metrics": {
                    "total_sessions": len(sessions),
                    "running_sessions": running_sessions,
                    "avg_latency_ms": round(sum(latencies) / len(latencies), 2) if latencies else 0,
                    "p95_latency_ms": p95_latency,
                    "failure_rate_pct": failure_rate,
                    "challenge_completion_rate_pct": challenge_completion_rate,
                },
                "alerts": alerts,
            }

    def analytics_funnel_snapshot(self) -> Dict[str, Any]:
        with self._lock:
            sessions = list(self._state["sessions"].values())
            session_start = len(sessions)
            first_objective = sum(
                1
                for session in sessions
                if any(int(item.get("progress") or 0) > 0 for item in session.get("raid", {}).get("objectives", []))
            )
            first_outcome = sum(
                1
                for session in sessions
                if int(session.get("telemetry", {}).get("successes") or 0)
                + int(session.get("telemetry", {}).get("failures") or 0)
                > 0
                or bool(session.get("pvp", {}).get("winner"))
            )
            run_outcome = sum(
                1
                for session in sessions
                if session.get("status") == "completed" or int(session.get("campaign", {}).get("depth") or 1) >= 5
            )
            win_outcome = sum(
                1
                for session in sessions
                if int(session.get("campaign", {}).get("depth") or 1) >= 5
                or session.get("pvp", {}).get("winner") == "operator"
            )

            player_sessions: Dict[str, list[datetime]] = {}
            for session in sessions:
                created_at = _parse_timestamp(str(session.get("created_at") or ""))
                if created_at is None:
                    continue
                for player in session.get("players", []):
                    player_id = str(player.get("player_id") or "").strip()
                    if not player_id:
                        continue
                    player_sessions.setdefault(player_id, []).append(created_at)

            retention_counts = {"d1": 0, "d7": 0, "d30": 0}
            for timestamps in player_sessions.values():
                sorted_times = sorted(timestamps)
                first_seen = sorted_times[0]
                for key, days in (("d1", 1), ("d7", 7), ("d30", 30)):
                    if any(stamp >= first_seen + timedelta(days=days) for stamp in sorted_times[1:]):
                        retention_counts[key] += 1

            cohort_size = max(1, len(player_sessions))
            retention_pct = {
                "d1": round((retention_counts["d1"] / cohort_size) * 100, 2),
                "d7": round((retention_counts["d7"] / cohort_size) * 100, 2),
                "d30": round((retention_counts["d30"] / cohort_size) * 100, 2),
            }

            return {
                "generated_at": _utc_now(),
                "funnels": {
                    "session_start": session_start,
                    "first_objective_progress": first_objective,
                    "first_mission_outcome": first_outcome,
                    "run_outcome": run_outcome,
                    "win_outcome": win_outcome,
                },
                "dropoff": {
                    "objective_dropoff": max(0, session_start - first_objective),
                    "outcome_dropoff": max(0, first_objective - first_outcome),
                    "resolution_dropoff": max(0, first_outcome - run_outcome),
                },
                "retention": {
                    "cohort_size": len(player_sessions),
                    "d1_pct": retention_pct["d1"],
                    "d7_pct": retention_pct["d7"],
                    "d30_pct": retention_pct["d30"],
                },
            }

    def get_profile(self, player_id: str) -> Dict[str, Any]:
        with self._lock:
            profile = self._ensure_profile(player_id)
            self._save()
            return deepcopy(profile)

    def unlock_profile_skill(self, player_id: str, skill_id: str) -> Dict[str, Any]:
        with self._lock:
            profile = self._ensure_profile(player_id)
            self._mutate_profile_skill_unlock(profile, skill_id)
            self._save()
            return deepcopy(profile)

    def equip_profile_skill(self, player_id: str, skill_id: str) -> Dict[str, Any]:
        with self._lock:
            profile = self._ensure_profile(player_id)
            self._mutate_profile_skill_equip(profile, skill_id)
            self._save()
            return deepcopy(profile)

    def create_guild(self, guild_id: str, name: str, owner_player_id: str) -> Dict[str, Any]:
        if not guild_id.strip():
            raise ValueError("guild_id must be non-empty")
        if not name.strip():
            raise ValueError("name must be non-empty")
        with self._lock:
            if guild_id in self._state["guilds"]:
                raise ValueError(f"Guild already exists: {guild_id}")
            guild = {
                "id": guild_id,
                "name": name.strip(),
                "owner_player_id": owner_player_id,
                "members": [owner_player_id],
                "member_count": 1,
                "operations_score": 0,
                "events": [],
                "events_completed": 0,
                "scoreboard": [{"player_id": owner_player_id, "score": 0}],
                "created_at": _utc_now(),
            }
            self._state["guilds"][guild_id] = guild
            self._save()
            return deepcopy(guild)

    def get_guild(self, guild_id: str) -> Dict[str, Any] | None:
        with self._lock:
            guild = self._state["guilds"].get(guild_id)
            return deepcopy(guild) if guild else None

    def join_guild(self, guild_id: str, player_id: str) -> Dict[str, Any]:
        with self._lock:
            guild = self._state["guilds"].get(guild_id)
            if guild is None:
                raise FileNotFoundError(f"Guild not found: {guild_id}")
            if player_id not in guild["members"]:
                guild["members"].append(player_id)
                guild["member_count"] = len(guild["members"])
                guild["scoreboard"].append({"player_id": player_id, "score": 0})
            self._save()
            return deepcopy(guild)

    def schedule_guild_event(self, guild_id: str, title: str, scheduled_at: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        if not title.strip():
            raise ValueError("title must be non-empty")
        with self._lock:
            guild = self._state["guilds"].get(guild_id)
            if guild is None:
                raise FileNotFoundError(f"Guild not found: {guild_id}")
            event = {
                "id": f"gevt-{uuid4().hex[:8]}",
                "title": title.strip(),
                "scheduled_at": scheduled_at,
                "status": "scheduled",
                "created_at": _utc_now(),
            }
            guild["events"].append(event)
            self._save()
            return deepcopy(guild), deepcopy(event)

    def complete_guild_event(self, guild_id: str, event_id: str, impact: int) -> Dict[str, Any]:
        with self._lock:
            guild = self._state["guilds"].get(guild_id)
            if guild is None:
                raise FileNotFoundError(f"Guild not found: {guild_id}")
            event = next((entry for entry in guild["events"] if entry["id"] == event_id), None)
            if event is None:
                raise FileNotFoundError(f"Guild event not found: {event_id}")
            event["status"] = "completed"
            event["completed_at"] = _utc_now()
            guild["operations_score"] += impact
            guild["events_completed"] += 1
            member_count = max(1, len(guild["members"]))
            per_member = max(1, impact // member_count)
            for row in guild["scoreboard"]:
                row["score"] += per_member
            guild["scoreboard"] = sorted(guild["scoreboard"], key=lambda item: item["score"], reverse=True)
            self._save()
            return deepcopy(guild)
