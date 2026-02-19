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
- `make verify` did not run `pnpm -C ui build`, which left one release quality gate unenforced.
- Forcing Lighthouse to use Playwright Chromium (`CHROME_PATH`) caused repeated `NO_FCP` flake in this environment; system Chrome proved stable.

## Decision Log
- Prioritize high-signal, minimal-risk release fixes first: restore key test coverage and add explicit help surface before broader UX polish.
- Use milestone commits to keep review and rollback simple.
- Keep onboarding E2E focused and stable (critical-path assertions only) instead of reviving the previous oversized flaky suite.
- Convert previously skipped keyboard flow coverage into a compact always-on suite for accessibility confidence.
- Treat visual snapshot diffs as expected release-artifact updates when intentional UI changes land.
- Fold `pnpm -C ui build` into `scripts/verify.sh` so every standard verify run enforces the full lint/typecheck/build/test requirement.
- Stabilize async inspector unit tests by defaulting mocked detail fetches to unresolved promises unless a test explicitly expects loaded details.

## Risks
- Unskipping broad E2E suites may reveal flaky selectors and increase CI time.
- Help/onboarding changes can unintentionally regress initial user flow.

## Validation Gates
Per milestone, run:
- `pnpm -C ui lint`
- `pnpm -C ui typecheck`
- `pnpm -C ui build`
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
- Final hard-gap pass shipped: bundle-size warning removed via lazy loading, accessibility check runs without conditional skip, and previously skipped `flow-mode`/`inspector` suites are now active and passing.
- CI closure shipped: PR #1 created and GitHub `verify` check confirmed green.
- Final polish pass shipped: verification now enforces build by default, dependency audit reports no high vulnerabilities, and inspector unit tests no longer emit async `act` warning noise.
- Final 10/10 pass shipped: backend timestamp/validation regressions closed, executable scorecards added (`make scorecard`), and LHCI runtime stabilized with robust retry/fallback behavior.

---

# ExecPlan: Documentation Excellence Program

## Purpose / Big Picture
Upgrade repository documentation to world-class quality for both technical and non-technical audiences, with clear onboarding, architecture communication, and visual storytelling.

## Scope
- In scope: `README.md`, docs hub, role guides, and user journey docs.
- Out of scope: runtime feature implementation.

## Progress
- [x] Documentation gaps audited and tracked.
- [x] README refactored with role-based pathways, richer diagrams, and visual hierarchy.
- [x] Non-technical guide added.
- [x] Technical guide added.
- [x] User journey map added.
- [x] Docs hub upgraded for role/lifecycle navigation.
- [x] Full verification + evidence refresh.
- [ ] Commit/push closure.

## Decision Log
- Keep README as the front-door artifact while routing depth to focused docs.
- Preserve ASCII brand block and legal disclaimer at README footer.
- Reuse existing screenshots/GIF/illustrations and pair with stronger narrative structure.

## Validation Plan
- `make verify`
- `make doctor`
- `make scorecard`

## Outcomes & Retrospective
In progress.

---

# ExecPlan: UX100 World-Class Frontend Program

## Purpose / Big Picture
Execute an exhaustive 100-task program to raise the frontend from strong release quality to a defensible world-class standard across IA, hierarchy, design consistency, interaction quality, journeys, onboarding, accessibility, responsiveness, performance, reliability, polish, and trust/safety UX.

## Scope
- In scope: `UX100-001..UX100-100` tracked in `docs/plans/2026-02-19-ux100-execution-plan.md`.
- Out of scope: non-frontend platform rewrites not required for UX100 closure.

## Progress
- [x] Initialize exhaustive task ledger with statuses, DoD, verification commands, and evidence pointers.
- [x] Sync active tracker references in `TASKS.md`, `PLANS.md`, `.codex/PLANS.md`, and `.codex/SCRATCHPAD.md`.
- [x] First clarity pass shipped: split primary vs advanced controls and add contextual workspace headers.
- [x] Batch 1 execution completed, including responsive/navigation/density/accessibility/perf-prefetch closures (`UX100-057`, `UX100-061`, `UX100-062`, `UX100-065`, `UX100-066`, `UX100-071`, `UX100-073`, `UX100-074`), plus CI visual stability hardening.
- [x] Batch 2 execution completed and remaining UX100 items closed with evidence pack publication (`docs/ux100-closure-evidence.md`).

## Decision Log
- Use objective evidence artifacts (`doctor`, `scorecard`, Playwright, LHCI) for completion claims.
- Keep external-review-dependent items explicitly marked `BLOCKED` until real external evidence exists.
- Prioritize cognitive-load reduction and navigation clarity before deeper cosmetic polish.

## Validation Plan
- Per batch: targeted unit/E2E + snapshots for touched surfaces.
- Program gates: `make verify`, `make doctor`, `make scorecard`.

## Outcomes & Retrospective
Completed.
- Batch progress shipped: action-first workspace IA labels, explicit semantic headings/landmarks, collapsed workspace tools for lower above-fold density, typography/spacing token docs + adoption, and a dedicated CI performance regression workflow.
- Additional batch shipped: explicit 5-intent workspace navigation (including `Validate`), persistent orientation breadcrumbs, contextual next-best-action guidance, localization overflow guard tests, refreshed visual snapshots, and green `verify/doctor/scorecard` evidence.
- Latest batch shipped: tablet split-view optimization, mobile quick-rail orientation actions, adaptive density mode (auto/comfortable/compact), non-color status semantics, smart likely-next-action prefetch policy, auto-windowing for large traces, design-lint quality gate, and full UX100 closure evidence pack.
