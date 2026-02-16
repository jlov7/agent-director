# World-Class UX Program ExecPlan

## Purpose / Big Picture

Ship a full frontend leap that feels materially more premium, faster, and more collaborative while preserving existing production behaviors.

## Scope

- In scope: implement all eight requested "super hard" frontend tracks as shippable v1 slices with exhaustive task tracking.
- Out of scope: backend architecture rewrites, unrelated refactors, and speculative post-v1 variants.

## Progress

- [x] Initialize exhaustive execution tracker files
- [x] Track 1: Cinematic Timeline Studio (bookmarks + clip controls + exports)
- [x] Track 2: Causality Graph Lab (visual causal map in Matrix mode)
- [x] Track 3: Scenario Workbench v2 (duplicate/reorder scenario authoring UX)
- [x] Track 4: Collaboration Layer v2 (session presence + shareable live link)
- [x] Track 5: AI Director Layer (recommendation cards from investigation/matrix)
- [x] Track 6: Adaptive Onboarding (persona selection + persona-aware tour copy)
- [x] Track 7: Visual System Upgrade (theme controls + tokenized style variants)
- [x] Track 8: Performance Lift (deferred filtering + reduced interaction cost)
- [x] Verification + release sync + push to main

## Surprises & Discoveries

- Existing app already contains strong primitives (story mode, matrix, investigation, comments), enabling high-value upgrades without backend surgery.
- Main branch is checked out in an external worktree; this workspace is detached-head and requires push via `HEAD:main`.

## Decision Log

- Implement each track as additive slices on current architecture to preserve release stability.
- Prioritize stateful UX controls and discoverability upgrades over brand-new backend endpoints.
- Use targeted test additions around new behavior surfaces instead of broad suite refactors.

## Risks

- `ui` visual snapshots may shift due theme and timeline controls.
- New onboarding copy and controls may require snapshot and E2E updates.

## Validation Plan

- UI unit tests for updated components (`MiniTimeline`, `Matrix`, `IntroOverlay`, `DirectorBrief` as touched).
- `pnpm -C ui typecheck`
- `pnpm -C ui test`
- `make verify` before final completion claim.

## Outcomes & Retrospective

Done:
- Implemented timeline studio bookmarks, clip range controls, and clip export in `MiniTimeline`.
- Added scenario duplication/reordering and weighted causal bars in Matrix mode.
- Added live session presence + share-link controls in header.
- Added recommendation cards in Director Brief with actionable wiring.
- Added onboarding persona selection and persona-aware tour copy.
- Added persisted theme variants and CSS token overrides.
- Added deferred filtering path using `useDeferredValue` for large-trace query smoothness.
- Updated E2E selectors and refreshed visual snapshot baselines for upgraded UI.
- Ran `pnpm -C ui typecheck`, targeted tests, and `make verify` successfully.

Not done:
- None.

---

# Gameplay Overhaul Final Completion ExecPlan

## Purpose / Big Picture

Deliver full production-grade completion for all 12 gameplay systems, including backend authority, realtime multiplayer synchronization, persistent progression, and world-class UX surfaces.

## Progress

- [x] Initialize exhaustive tracking artifacts (`TASKS.md`, `.codex`, gameplay plan doc)
- [x] Track 1: Co-op Incident Raids (backend authoritative multiplayer + realtime sync)
- [x] Track 2: Roguelike Scenario Campaign (procedural runs + permadeath progression)
- [x] Track 3: Branching Narrative Director Mode (persistent branch outcomes)
- [x] Track 4: Skill Tree + Loadout (persistent profiles + modifiers)
- [x] Track 5: Asymmetric PvP (hidden-state role conflict loop)
- [x] Track 6: Time Manipulation Mechanics (deterministic fork/rewind/merge)
- [x] Track 7: Boss Encounter Runs (adaptive multi-phase encounters)
- [x] Track 8: Adaptive AI Dungeon Master (dynamic hazard/goal rewriting)
- [x] Track 9: Mission Economy + Crafting (ledger + balancing loop)
- [x] Track 10: Guild/Team Operations (persistent guilds + event calendar)
- [x] Track 11: Cinematic Event Engine (triggered choreography + safe fallbacks)
- [x] Track 12: Seasonal LiveOps Framework (weekly rotations + rewards + telemetry)
- [x] Verification + release sync + push

## Decision Log

- Keep prior Gameplay Mode v1 as compatibility layer while introducing backend-authoritative state.
- Use SSE for realtime synchronization to align with existing server transport model.
- Preserve existing debugger journeys (cinema/flow/compare/matrix) as non-regression requirement.

## Validation Plan

- Add backend gameplay unit tests and API coverage for multiplayer and progression endpoints.
- Add frontend gameplay integration tests for synchronized session flows.
- Run `python3 -m unittest discover -s server/tests`, `pnpm -C ui typecheck`, `pnpm -C ui test`, and `make verify`.

Lessons:
- Visual drift is expected with intentional UX elevation; snapshot refresh is part of planned completion, not incidental churn.
- Backend authority is required for honest “100% complete” claims on multiplayer and persistent progression features.

## Outcomes & Retrospective

Done:
- Added backend-authoritative gameplay platform in `server/gameplay/store.py` with session lifecycle, role abilities, conflict-safe actions, persistent profiles, guilds, and liveops state.
- Added gameplay API + stream endpoints in `server/main.py` and coverage in `server/tests/test_gameplay_api.py`.
- Added frontend gameplay API surface + stream subscriptions in `ui/src/store/api.ts` with extended tests in `ui/src/store/api.test.ts`.
- Upgraded gameplay UX in `ui/src/components/GameplayMode/index.tsx` to support multiplayer sessions, backend action dispatch, guild workflows, and richer progression controls.
- Integrated backend gameplay synchronization in `ui/src/App.tsx` via session subscriptions and authoritative state mapping.
- Added gameplay e2e coverage in `ui/tests/e2e/gameplay.spec.ts`.
- Updated launch docs and final checklist status in `README.md`, `TASKS.md`, `docs/plans/2026-02-15-gameplay-overhaul-plan.md`, `.codex/SCRATCHPAD.md`.
- Verified with `python3 -m unittest discover -s server/tests`, `pnpm -C ui typecheck`, `pnpm -C ui test`, and `make verify` (green).

Not done:
- None.

---

# Phase 2 Hard Features ExecPlan

## Purpose / Big Picture

Complete the full advanced feature depth across timeline studio, causal analysis, replay IDE workflows, collaboration, AI guidance, onboarding adaptivity, motion system quality, and large-trace architecture.

## Progress

- [x] Initialize Phase 2 exhaustive plan and checklist artifacts
- [x] Track 1: Advanced Timeline Studio
- [x] Track 2: Advanced Causality Graph Lab
- [x] Track 3: Scenario Workbench Replay IDE
- [x] Track 4: Realtime Collaborative Debugging
- [x] Track 5: Advanced AI Director Layer
- [x] Track 6: Advanced Adaptive Onboarding
- [x] Track 7: Visual System + Motion Engine polish
- [x] Track 8: Large-trace performance architecture
- [x] Verification + release sync + push to main

## Decision Log

- Implement each advanced track as additive slices with deterministic local behavior.
- Keep backend-impact minimal unless absolutely necessary for UI correctness.
- Refresh visual snapshots as first-class deliverables for intentional UI changes.

## Validation Plan

- Add focused unit tests for advanced timeline/matrix/onboarding logic.
- Update E2E where selectors/flows expand.
- Run `pnpm -C ui typecheck`, `pnpm -C ui test`, and `make verify`.

## Outcomes & Retrospective

Done:
- Added lane strategy regrouping, lane visibility, and lane reordering with persisted timeline studio config.
- Added scene segment labeling and segment-aware clip export metadata.
- Added causal simulations, projected impacts, heatmaps, and causal path explorer in Matrix mode.
- Added schema-aware scenario scalar editing, side-by-side diff previews, and batch profile execution.
- Added profile integrity checks for duplicate names/payloads and scalar type conflicts.
- Added multi-session cursor sync, remote playheads, shared annotation merge semantics, and activity feed persistence.
- Added AI narrative panel, deterministic ask-director responses, guided action plans, and markdown export.
- Added mission-driven progressive disclosure in Director Brief with mission reset controls.
- Added motion tokens/utilities and reduced-motion-safe transitions.
- Added progressive hydration/filter telemetry and large table incremental rendering guardrails.
- Added new utility/component tests and regenerated visual + UX snapshot baselines.
- Verified with `pnpm -C ui typecheck`, `pnpm -C ui test`, and `make verify` (green).

Not done:
- None.

---

# Overnight UX Transformation ExecPlan

## Purpose / Big Picture

Deliver a focused overnight frontend transformation that materially improves usability, user journeys, and perceived product quality without destabilizing existing production flows.

## Progress

- [x] Initialize exhaustive sprint tracking artifacts
- [x] Track 1: Mission Pulse Header
- [x] Track 2: Adaptive Intro Launch Paths
- [x] Track 3: Journey Priority Queue
- [x] Track 4: Command Palette Intelligence
- [x] Track 5: Director Brief Workspace Tabs
- [x] Track 6: Action Plan Completion UX
- [x] Track 7: Session Handoff Digest
- [x] Track 8: Motion Direction Controls
- [x] Track 9: Mobile Quick Rail
- [x] Track 10: Tests, verification, and docs sync

## Decision Log

- Prioritize additive UX layers over architecture rewrites to keep delivery risk low.
- Reuse existing gameplay/matrix/onboarding data to drive new journey and guidance experiences.
- Keep all new controls keyboard-accessible and persisted when behavior is preference-driven.

## Validation Plan

- Update component tests for Header, IntroOverlay, JourneyPanel, DirectorBrief, and CommandPalette.
- Run `pnpm -C ui typecheck`.
- Run `pnpm -C ui test`.

## Outcomes & Retrospective

Done:
- Added mission health pulse, mission completion status, hotkey hints, motion profile selector, and handoff digest controls in the header.
- Added adaptive launch-path onboarding cards (rapid triage, deep diagnosis, team sync) with persisted preference and app-level execution wiring.
- Added a severity-ranked Journey priority queue with action wiring and resolved-state indicators.
- Added command palette recents, pinned commands, and macro surfaces.
- Added Director Brief tabbed workspaces plus recommendation completion tracking.
- Added global handoff digest generation and command palette macro/action entries.
- Added motion profile persistence and global motion dataset binding.
- Added mobile sticky quick-action rail for story/tour/command/handoff.
- Updated component tests and added JourneyPanel coverage.
- Re-generated visual baseline snapshots for changed intentional UX layout.
- Verified with `pnpm -C ui typecheck`, `pnpm -C ui test`, and `make verify`.

Not done:
- None.
