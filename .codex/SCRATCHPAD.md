## Current Task

Implement the full world-class frontend upgrade program and track every task exhaustively:
1) Timeline Studio
2) Causality Lab
3) Scenario Workbench v2
4) Collaboration Layer v2
5) AI Director Layer
6) Adaptive Onboarding
7) Visual System Upgrade
8) Performance Lift

## Status

Complete (local verification green)

## Plan

1. [x] Write exhaustive tracking artifacts (`.codex`, `TASKS.md`, docs plan)
2. [x] Implement timeline studio controls and clip export
3. [x] Implement matrix causality map and scenario-workbench controls
4. [x] Implement collaboration presence/share and AI recommendations panel
5. [x] Implement persona-aware onboarding and theme controls
6. [x] Implement deferred filtering/performance improvements
7. [x] Add/adjust tests for upgraded UX behavior
8. [x] Run verification gates and prepare final state for push to `main`

## Decisions Made

- Treat user request as explicit approval for multi-file full-program execution.
- Use additive upgrades in existing components for fastest path to complete delivery tonight.

## Open Questions

- None blocking. Execute all tracks in current sprint.

## Verification Gates

- `pnpm -C ui test -- src/components/__tests__/MiniTimeline.test.tsx src/components/__tests__/IntroOverlay.test.tsx src/components/__tests__/Matrix.test.tsx` passed.
- `pnpm -C ui typecheck` passed.
- `make verify` passed.
