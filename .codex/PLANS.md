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

# Gameplay Overhaul ExecPlan

## Purpose / Big Picture

Add a world-class gameplay layer on top of Agent Director by implementing 12 high-effort gameplay systems in a single cohesive mode with deterministic local behavior and strong UX.

## Progress

- [x] Initialize exhaustive tracking artifacts (`TASKS.md`, `.codex`, gameplay plan doc)
- [x] Track 1: Co-op Incident Raids
- [x] Track 2: Roguelike Scenario Campaign
- [x] Track 3: Branching Narrative Director Mode
- [x] Track 4: Skill Tree + Loadout
- [x] Track 5: Asymmetric PvP
- [x] Track 6: Time Manipulation Mechanics
- [x] Track 7: Boss Encounter Runs
- [x] Track 8: Adaptive AI Dungeon Master
- [x] Track 9: Mission Economy + Crafting
- [x] Track 10: Guild/Team Operations
- [x] Track 11: Cinematic Event Engine
- [x] Track 12: Seasonal LiveOps Framework
- [x] Verification + release sync + push

## Decision Log

- Implement all gameplay systems as deterministic front-end state transitions for fast iteration.
- Ship one cohesive Gameplay Mode UI rather than scattering controls across existing modes.
- Keep existing core debugger modes behavior-stable while adding gameplay as an additive mode.

## Validation Plan

- Add focused unit tests for gameplay engine transitions.
- Add component tests for gameplay mode controls.
- Run `pnpm -C ui typecheck`, `pnpm -C ui test`, and `make verify` before completion claims.

Lessons:
- UI control additions can invalidate role-based E2E selectors; use `exact: true` where collisions are possible.
- Broad visual changes require explicit snapshot regeneration as part of the verification gate.

## Outcomes & Retrospective

Done:
- Implemented deterministic gameplay engine primitives in `ui/src/utils/gameplayEngine.ts` spanning all 12 gameplay tracks.
- Added gameplay engine coverage in `ui/src/utils/gameplayEngine.test.ts`.
- Added gameplay command center UI in `ui/src/components/GameplayMode/index.tsx` with interactive controls for all tracks.
- Added gameplay component coverage in `ui/src/components/__tests__/GameplayMode.test.tsx`.
- Integrated `gameplay` mode into app state, command palette, keyboard shortcuts, and top-level rendering in `ui/src/App.tsx`.
- Added gameplay styling system in `ui/src/styles/main.css`.
- Regenerated visual baselines in `ui/tests/e2e/visual.spec.ts-snapshots/*.png` after intentional UI changes.
- Verified with `pnpm -C ui typecheck`, `pnpm -C ui test`, and `make verify` (green).

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
