# Gameplay Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement all 12 high-complexity gameplay features as a cohesive new Gameplay Mode with persistent state, rich user journeys, and verified behavior.

**Architecture:** Add a deterministic gameplay engine module for state transitions and a dedicated Gameplay Mode UI that orchestrates all gameplay systems. Integrate the mode into the existing app mode system, command palette, and toolbar while preserving current cinema/flow/compare/matrix behavior.

**Tech Stack:** React, TypeScript, existing persisted state hooks, Vitest, Playwright via existing `make verify` pipeline.

---

## Scope

- In scope: 12 gameplay feature tracks, exhaustive task tracking, tests, verification, docs/status sync.
- Out of scope: backend multiplayer networking and external service dependencies.

## Task Sequence

### Task 1: Add gameplay tracking artifacts
- Files:
  - Modify: `TASKS.md`
  - Modify: `.codex/PLANS.md`
  - Modify: `.codex/SCRATCHPAD.md`
  - Create: `docs/plans/2026-02-15-gameplay-overhaul-plan.md`
- Steps:
  - Add an “Overnight Gameplay Overhaul Program” with all 12 tracks and validation gates.
  - Mark active execution in `.codex` artifacts.

### Task 2: Build deterministic gameplay engine
- Files:
  - Create: `ui/src/utils/gameplayEngine.ts`
  - Create: `ui/src/utils/gameplayEngine.test.ts`
- Steps:
  - Implement typed gameplay state for raids, campaign, narrative, skills/loadout, PvP, time forks, boss encounters, adaptive DM, economy/crafting, guild ops, cinematic events, and liveops.
  - Implement deterministic state transition helpers for each subsystem.
  - Add unit tests for transitions and edge cases.

### Task 3: Build Gameplay Mode UI
- Files:
  - Create: `ui/src/components/GameplayMode/index.tsx`
  - Create: `ui/src/components/__tests__/GameplayMode.test.tsx`
  - Modify: `ui/src/styles/main.css`
- Steps:
  - Add a full gameplay control surface exposing all 12 subsystems.
  - Add controls and summaries for each track with clear progression feedback.
  - Add component tests for key user actions and rendering.

### Task 4: Integrate gameplay mode into app shell
- Files:
  - Modify: `ui/src/App.tsx`
  - Modify: `ui/src/components/common/JourneyPanel.tsx` (type widening only)
  - Modify: `ui/src/components/common/QuickActions.tsx` (type widening only)
- Steps:
  - Add `gameplay` app mode and persisted gameplay state.
  - Add toolbar + command palette support for Gameplay Mode.
  - Render Gameplay Mode and wire state transition callbacks.
  - Keep existing flows stable.

### Task 5: Verify and close
- Files:
  - Modify: `TASKS.md`
  - Modify: `.codex/PLANS.md`
  - Modify: `.codex/SCRATCHPAD.md`
- Steps:
  - Run:
    - `pnpm -C ui typecheck`
    - `pnpm -C ui test`
    - `make verify`
  - Fix regressions if present.
  - Mark all gameplay track tasks complete with evidence.

## Risks

- UI bloat/regression from adding a large gameplay surface.
- Snapshot changes due to new mode and controls.
- Type drift in `Mode` unions.

## Validation Gates

- Gameplay engine tests green.
- Gameplay mode component tests green.
- `pnpm -C ui typecheck` green.
- `pnpm -C ui test` green.
- `make verify` green.

---

## Execution Status (2026-02-15)

- [x] Task 1: Add gameplay tracking artifacts
- [x] Task 2: Build deterministic gameplay engine
- [x] Task 3: Build Gameplay Mode UI
- [x] Task 4: Integrate gameplay mode into app shell
- [x] Task 5: Verify and close

### Verification Evidence

- [x] `pnpm -C ui typecheck`
- [x] `pnpm -C ui test`
- [x] `make verify`
- [x] Playwright visual baseline refresh: `pnpm -C ui exec playwright test tests/e2e/visual.spec.ts --update-snapshots`

---

## Final Completion Pass (Complete)

Goal refinement: elevate gameplay from v1 local simulation to backend-authoritative, realtime, persistent systems to satisfy full world-class scope.

- [x] Add gameplay backend domain and APIs for sessions/progression/guild/liveops.
- [x] Add realtime gameplay SSE stream and conflict-safe action versioning.
- [x] Integrate Gameplay Mode with backend state and multiplayer lifecycle.
- [x] Add coverage for backend and frontend advanced gameplay journeys.
- [x] Re-run full verification and close final completion checklists.

### Final Completion Evidence

- [x] `python3 -m unittest discover -s server/tests`
- [x] `pnpm -C ui typecheck`
- [x] `pnpm -C ui test`
- [x] `pnpm -C ui exec playwright test tests/e2e/gameplay.spec.ts`
- [x] `make verify`
