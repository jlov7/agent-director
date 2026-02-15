## Current Task

Implement Overnight Gameplay Overhaul Program:
1) Co-op Incident Raids
2) Roguelike Scenario Campaign
3) Branching Narrative Director Mode
4) Skill Tree + Loadout
5) Asymmetric PvP
6) Time Manipulation Mechanics
7) Boss Encounter Runs
8) Adaptive AI Dungeon Master
9) Mission Economy + Crafting
10) Guild/Team Operations
11) Cinematic Event Engine
12) Seasonal LiveOps Framework

## Status

Completed

## Plan

1. [x] Create exhaustive tracking artifacts (`TASKS.md`, `.codex`, gameplay plan doc)
2. [x] Build deterministic gameplay engine with all 12 feature domains
3. [x] Build Gameplay Mode UI controls and progression views
4. [x] Integrate gameplay mode into App toolbar/palette/routing
5. [x] Add gameplay engine + UI tests
6. [x] Run verification gates and close tracking artifacts

## Decisions Made

- Implement gameplay systems as deterministic local state transitions first to achieve full feature breadth in one cycle.
- Keep new gameplay mechanics isolated in a dedicated mode to minimize regression risk in core debugger flows.

## Open Questions

- None blocking.

## Verification Gates

- `pnpm -C ui typecheck` (pass)
- `pnpm -C ui test` (pass)
- `make verify` (pass, after visual baseline refresh)
