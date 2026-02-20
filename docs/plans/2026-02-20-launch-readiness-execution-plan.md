# Launch Readiness Implementation Plan

> **For Codex/Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Execute a complete pre-launch hardening, verification, live UX test, and deployment validation pass so the product can launch with fresh evidence.

**Architecture:** Use a gate-first pipeline: refresh evidence, run exhaustive automated checks, run live browser journey checks, patch any failures, then re-run full gates and verify deployment readiness. Every failure loops through fix -> targeted verification -> full evidence refresh.

**Tech Stack:** Python + unittest, Node 20 + pnpm, Vite/React/TypeScript, Playwright, Rodney, Lighthouse CI, Vercel CLI, GitHub Actions evidence.

---

## Purpose / Big Picture

Launch tomorrow with current (not stale) quality evidence across UX, accessibility, reliability, performance, security, and deployment operations.

## Pass Criteria

- `make verify` passes.
- `make verify-strict` passes.
- `make verify-ux` passes.
- `make doctor` passes with all gates `G1..G8=true`.
- `make scorecard` passes with `totals.score=70` and `all_perfect=true`.
- Rodney live checks pass for core user journeys and mode transitions.
- `make vercel-check` passes with deployment status `Ready`.
- No open P0/P1 items in `GAPS.md`.

## Progress

- [x] Task 1: Baseline workspace and evidence freshness check.
- [x] Task 2: Hygiene cleanup for launch run artifacts.
- [x] Task 3: Run full automated verification (`make verify`).
- [x] Task 4: Run strict verification (`make verify-strict`).
- [x] Task 5: Run UX verification bundle (`make verify-ux`).
- [x] Task 6: Run doctor evidence refresh (`make doctor`).
- [x] Task 7: Run scorecard refresh (`make scorecard`).
- [x] Task 8: Run release safety preflight (`make release-safety`).
- [x] Task 9: Run Rodney live journey + visual checks.
- [x] Task 10: Run Rodney troubleshooting/help escalation checks.
- [x] Task 11: Run Rodney responsive + mobile/tablet sanity checks.
- [x] Task 12: Validate Vercel release state (`make vercel-check`).
- [x] Task 13: Reconcile artifacts and docs (`doctor`, `scorecard`, `GAPS`, gates).
- [x] Task 14: Commit and push launch-readiness updates.

## Surprises & Discoveries

- `make verify` initially failed with broad E2E timeouts because Playwright reused a running Vite server from another repository on port `4173`.
- `make verify-ux` initially failed for the same reason in LHCI (Lighthouse measured the wrong app at `4173`).
- Deterministic isolation fix:
  - `ui/playwright.config.ts`: moved to dedicated port `4273`, enabled `--strictPort`, set `reuseExistingServer=false`.
  - `ui/lighthouserc.json`: moved preview/LHCI target to `4274` with `--strictPort`.

## Decision Log

- Prefer deterministic failure over accidental pass/fail from cross-repo server reuse.
- Keep local launch checks reproducible with strict, isolated ports for both Playwright and Lighthouse.

## Execution Plan

### Phase A: Baseline and workspace hygiene

1. Confirm branch, untracked files, and upstream sync.
2. Remove transient local test artifacts that are not part of release evidence.
3. Confirm toolchain (`python3`, `node`, `pnpm`, `rodney`, `vercel`, `gh`).

### Phase B: Automated quality gates

1. `make verify`
2. `make verify-strict`
3. `make verify-ux`
4. `make doctor`
5. `make scorecard`
6. `make release-safety` (preflight)

If any step fails:
- Log issue in `GAPS.md` with severity and evidence.
- Apply minimal fix.
- Re-run failed step.
- Re-run `make doctor` and `make scorecard` before continuing.

### Phase C: Live browser validation (Rodney)

Run scripted checks for:

1. Intro overlay and onboarding controls.
2. Help page reachability from shell.
3. Support escalation ("Need help now") and diagnostics prefill.
4. Core mode transitions (`cinema`, `flow`, `matrix`, `compare` where available).
5. Inspector open/close and replay-to-compare path.
6. Keyboard critical shortcuts (`?`, `Escape`, `c`, palette toggle).
7. Responsive probes for mobile and tablet layouts.

Capture screenshots for critical moments in `docs/screenshots/`.

### Phase D: Deployment and release operations

1. `make vercel-check`
2. Verify `vercel inspect` status is `Ready`.
3. Validate rollback/kill-switch command availability (`scripts/release_safety_ops.sh`).

### Phase E: Final sign-off evidence

1. Confirm `artifacts/doctor.json` fresh timestamp is newer than latest commit in scope.
2. Confirm `artifacts/scorecards.json` reports `70/70`.
3. Confirm all release gates and no open P0/P1 gaps.
4. Commit/push any release evidence and tracker updates.

## Validation Commands

```bash
make verify
make verify-strict
make verify-ux
make doctor
make scorecard
make release-safety
make vercel-check
```

## Outcomes & Retrospective

- Completed.
- Release evidence refreshed and passing with fresh timestamps:
  - `artifacts/doctor.json` -> `overall_status=pass`, all gates `G1..G8=true`.
  - `artifacts/scorecards.json` -> `70/70`, `all_perfect=true`.
- Live Rodney UAT completed with captured screenshots:
  - `docs/screenshots/launch-qa-desktop-cinema.png`
  - `docs/screenshots/launch-qa-desktop-flow.png`
  - `docs/screenshots/launch-qa-desktop-matrix.png`
  - `docs/screenshots/launch-qa-desktop-inspector.png`
  - `docs/screenshots/launch-qa-help-page.png`
  - `docs/screenshots/launch-qa-help-escalation.png`
  - `docs/screenshots/launch-qa-mobile.png`
  - `docs/screenshots/launch-qa-tablet.png`
  - `docs/screenshots/launch-qa-desktop-wide.png`
