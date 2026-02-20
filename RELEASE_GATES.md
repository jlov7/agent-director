# Release Gates (v1)

Release readiness requires all gates below to pass with current evidence.

Primary evidence command:

```bash
make doctor
```

This emits `artifacts/doctor.json` with per-check status, command outputs, and gate summaries.

Scorecard command:

```bash
make scorecard
```

This emits `artifacts/scorecards.json` and requires every domain score to be `10/10`.

## Gate Definitions

| Gate | Requirement | Evidence Requirement |
|------|-------------|----------------------|
| `G1-core-journeys` | Happy path + key failure journeys run end-to-end with no skipped critical specs. | `artifacts/doctor.json` shows `critical_specs=pass` and `verify_strict=pass`. |
| `G2-onboarding-help` | First-run onboarding + help surface are present and tested. | `artifacts/doctor.json` shows `critical_specs=pass` (includes onboarding/help specs). |
| `G3-quality` | Lint/typecheck/build/unit/E2E/server checks/evals/mutation and reliability drills all pass. | `artifacts/doctor.json` shows `verify_strict=pass` and `reliability_drills=pass`. |
| `G4-accessibility` | A11y + keyboard primary-flow checks are enforced. | `artifacts/doctor.json` shows `critical_specs=pass` and required specs include `a11y.spec.ts` + `keyboard.spec.ts`. |
| `G5-performance` | Build succeeds, bundle is within budget, and startup performance stays within Lighthouse cold-start thresholds. | `artifacts/doctor.json` shows `bundle_budget=pass`, `cold_start_budget=pass`, and `verify_strict=pass`. |
| `G6-security` | No obvious secret leakage and no high-severity dependency vulnerabilities. | `artifacts/doctor.json` shows `secret_scan=pass` and `dependency_audit=pass`. |
| `G7-docs` | Launch docs and steering docs are present and complete. | `artifacts/doctor.json` shows `docs_presence=pass`. |
| `G8-ci` | CI checks are green on active PR. | `artifacts/doctor.json` shows `ci_status=pass`. |
| `G9-route-shell-journeys` | Canonical route-shell journeys (`overview`, `triage`, `diagnose`, `coordinate`, `settings`) pass regression checks. | `tests/e2e/route-journeys.spec.ts` passing in UX verification bundle. |
| `G10-ux-hardening` | A11y/keyboard/localization/trust/perf hardening checks remain green. | `make verify-ux` passes, including `a11y.spec.ts`, `keyboard.spec.ts`, `localization-layout.spec.ts`, and scan/perf proxy checks. |

## Evidence Freshness
- Evidence is stale if `artifacts/doctor.json` predates the latest commit.
- Re-run `make doctor` after each change set.

## Latest Evidence Snapshot
- 2026-02-20: `make doctor` produced `artifacts/doctor.json` with `overall_status=pass`.
- 2026-02-20: Gate summary in `artifacts/doctor.json` reports `G1` through `G8` all passing.
- 2026-02-20: `make scorecard` produced `artifacts/scorecards.json` with `total_score=70/70` and `all_perfect=true`.
- 2026-02-20: `make verify-ux` passed with route-shell journey regressions and hardening suites.

## Failure Policy
- Any failed gate must create or update a gap in `GAPS.md` before starting the next fix.
- Blocked gates require an entry in `QUESTIONS.md` with the pending product decision.
