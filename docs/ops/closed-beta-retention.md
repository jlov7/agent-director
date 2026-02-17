# Closed Beta -> Retention Iteration Plan

Last updated: 2026-02-17

## Objective

Run a controlled beta with explicit gate criteria, then iterate using measured retention and funnel drop-off signals.

## Beta Entry Criteria

All required before invite rollout:

- `make verify` passes.
- `make doctor` passes with fresh `artifacts/doctor.json`.
- `make scorecard` reports all domains `10/10`.
- Core gameplay and matrix E2E paths green.

## Beta Cohort Plan

- Wave 1: trusted internal/power users.
- Wave 2: mixed persona external testers.
- Wave 3: broader closed beta invite set.

## Instrumentation Contract

Primary endpoints:

- `GET /api/gameplay/observability/summary`
- `GET /api/gameplay/analytics/funnels`

Core metrics:

- funnel drop-off (`session_start` -> `first_objective_progress` -> `run_outcome`)
- `challenge_completion_rate_pct`
- retention (`d1_pct`, `d7_pct`, `d30_pct`)

## Iteration Loop

1. Collect weekly metrics snapshot.
2. Identify top two drop-off/failure contributors.
3. Ship focused tuning changes (difficulty, rewards, onboarding copy, UX friction removal).
4. Re-measure in next weekly slice.

## Exit Criteria to Public Launch

- Retention and funnel metrics stable or improving for two consecutive beta cycles.
- No open P0/P1 release gaps.
- Launch security checklist complete.
- Support + rollback runbooks validated by drill.
