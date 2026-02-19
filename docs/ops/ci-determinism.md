# CI Determinism + Flake Elimination

Last updated: 2026-02-17

## Objective

Keep CI signal stable and reproducible so release gates fail only for real regressions.

## Determinism Controls in Place

- Unified verification entry points:
  - `make verify`
  - `make verify-ux`
  - `make doctor`
  - `make scorecard`
- Explicit quality gate artifacts under `artifacts/`.
- Environment normalization in verification runners to reduce warning noise.
- Explicit `axe-core` dependency for stable a11y probe resolution.

## Flake Reduction Practices

- Deterministic demo/fixture traces for UI and API tests.
- Stable replay scenario constraints and strategy allowlist checks.
- Focused regression tests for prior flaky areas (rate limits, redaction, onboarding focus flow).
- Small, isolated test suites for gameplay and replay contracts.
- Dedicated `ux-review` CI workflow on push/pull_request for UI paths (Playwright + Lighthouse + optional Percy).

## Operator Workflow

1. Run `make verify` locally before push.
2. Run `make doctor` after major batches.
3. If CI flakes, isolate test and add deterministic fixture/state setup before merging.

## Evidence

- `artifacts/doctor.json`
- `artifacts/scorecards.json`
- `ui/tests/e2e/*.spec.ts`
- `server/tests/*.py`
