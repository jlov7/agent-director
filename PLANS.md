# ExecPlan: Release-ready v1

## Purpose / Big Picture
Prepare Agent Director for a v1 launch by closing release-critical gaps while minimizing risk: complete core journeys (including failure states), ensure onboarding/help quality, harden quality gates, and align docs/checklists to an auditable release standard.

## Scope
- UI/UX polish for key happy/failure states.
- Onboarding and help completion (including a minimal help page).
- Test and CI quality-gate hardening for critical flows.
- Accessibility and basic security/performance guardrails.
- Launch documentation completeness.

## Out of Scope
- Large architectural refactors.
- New major product features beyond v1 definition-of-done.

## Milestones
1. Baseline + release scaffolding + immediate blockers.
2. Core journey UX hardening (happy path + key failure states).
3. Onboarding/help completion and accessibility touch-ups.
4. Quality gate hardening (tests/lint/typecheck/build/CI alignment).
5. Launch docs polish and release readiness pass.

## Progress
- [x] Read repository structure, test/build scripts, and CI workflows.
- [x] Create release steering files (`AGENTS.md`, `PLANS.md`, `RELEASE_CHECKLIST.md`, `QUESTIONS.md`).
- [x] Milestone 1: Baseline + immediate blockers.
- [x] Milestone 2: Core journey UX hardening.
- [x] Milestone 3: Onboarding/help + accessibility completion.
- [x] Milestone 4: Quality gate hardening.
- [x] Milestone 5: Launch docs and final release pass.

## Surprises & Discoveries
- Several large key-flow Playwright suites exist but are globally skipped (`onboarding`, `keyboard`, `flow-mode`, `inspector`).
- Onboarding and contextual in-app help are implemented in UI, but no dedicated minimal help page is currently exposed from the app shell.
- Playwright had `VITE_SKIP_INTRO=1` globally configured, which prevented first-run onboarding coverage from running.

## Decision Log
- Prioritize high-signal, minimal-risk release fixes first: restore key test coverage and add explicit help surface before broader UX polish.
- Use milestone commits to keep review and rollback simple.
- Keep onboarding E2E focused and stable (critical-path assertions only) instead of reviving the previous oversized flaky suite.
- Convert previously skipped keyboard flow coverage into a compact always-on suite for accessibility confidence.
- Treat visual snapshot diffs as expected release-artifact updates when intentional UI changes land.

## Risks
- Unskipping broad E2E suites may reveal flaky selectors and increase CI time.
- Help/onboarding changes can unintentionally regress initial user flow.

## Validation Gates
Per milestone, run:
- `pnpm -C ui lint`
- `pnpm -C ui typecheck`
- `pnpm -C ui test`
- Targeted `pnpm -C ui test:e2e -- <specs>` for changed flows
- `python3 -m unittest discover -s server/tests` when server changes
- `make verify` at major checkpoints

## Outcomes & Retrospective
- Milestone 1 shipped: release steering files created, in-app Help link added, minimal help page added, onboarding E2E restored as a stable critical-path suite, and key UI checks passing (lint/typecheck/unit/e2e/build).
- Milestone 2 shipped: API validation failures now return `400` instead of opaque `500`; no-trace and error paths have clearer UX copy and recovery/help actions.
- Milestone 3 shipped: keyboard primary flows have active E2E coverage and onboarding/help flows are verified.
- Milestone 4 shipped: full `make verify` now passes locally after test/snapshot updates.
- Milestone 5 shipped: README now includes explicit environment variables and deployment notes.
