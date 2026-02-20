# SaaS UX Reboot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Agent Director from a high-capability but high-friction interface into a world-class SaaS experience with clear role-based journeys, low cognitive load, and fast time-to-value.

**Architecture:** Use a hybrid strangler strategy: introduce route-based workspace shells and progressively migrate journey flows out of the monolithic app surface. Keep backend/API contracts stable while front-end interaction architecture is simplified and decomposed.

**Tech Stack:** React 18, TypeScript, Vite, existing API layer in `ui/src/store/api.ts`, Vitest, Playwright, CSS tokens, existing release gates (`make verify`, `make doctor`, `make scorecard`).

---

## Program Rules

1. No net-new major feature scope until core UX simplification milestones are complete.
2. One primary intent + one dominant CTA per primary screen.
3. Advanced controls stay hidden by default and are reachable in <=2 interactions.
4. Every migration step must keep release gates green.
5. No legacy surface removal until replacement journey has test parity.

## Done Definition (Reboot)

Work is not complete unless all applicable items below are true:

1. Behavior shipped and covered by tests in changed areas.
2. Fresh verification evidence exists for the exact change set.
3. Journey metrics improve or hold target thresholds (no regression accepted).
4. UX complexity budget checks pass (primary CTA and above-fold interaction assertions).
5. Tracker artifacts are synchronized (`TASKS.md`, `.codex/PLANS.md`, `.codex/SCRATCHPAD.md`).

This definition overrides checklist-only completion and requires measured outcomes.

## Progress Tracker

- [x] Phase A complete (foundations + baseline instrumentation)
- [x] Phase B complete (information architecture + navigation simplification)
- [x] Phase C complete (onboarding and first-time value redesign)
- [x] Phase D complete (persona journey redesign across core workflows)
- [x] Phase E complete (visual hierarchy + interaction simplification)
- [x] Phase F complete (a11y/performance/trust hardening)
- [x] Phase G complete (rollout, adoption, cleanup)

## Phase A — Foundations and Baseline (UXR-001 to UXR-015)

**Files (initial):**
- Create: `ui/src/routes/index.tsx`
- Create: `ui/src/routes/routeConfig.ts`
- Create: `ui/src/ux/metrics.ts`
- Modify: `ui/src/main.tsx`
- Modify: `ui/src/App.tsx`
- Modify: `ui/tests/e2e/ux-audit-deep.spec.ts`
- Modify: `docs/ux100-debt-register.md`

**Tasks:**

1. `UXR-001` Create new UX reboot tracker section in `TASKS.md`.
2. `UXR-002` Add explicit “UX reboot” section to `.codex/PLANS.md`.
3. `UXR-003` Capture fresh baseline complexity metrics (controls, CTAs, first-run choices) into `artifacts/ux-baseline.json`.
4. `UXR-004` Add client-side metric event schema for journey checkpoints.
5. `UXR-005` Add event hooks for first meaningful interaction and first success.
6. `UXR-006` Add event hooks for onboarding exits (skip/complete/abandon).
7. `UXR-007` Define first-route architecture contract (no behavior changes yet).
8. `UXR-008` Add route-ready shell wrapper with feature-flag toggle.
9. `UXR-009` Add route-level smoke E2E for legacy + new-shell toggles.
10. `UXR-010` Record baseline journey durations for evaluator/operator/investigator paths.
11. `UXR-011` Add “done definition” update: measured outcomes required for closure.
12. `UXR-012` Document migration guardrails (no dual primary CTA, no overloaded header).
13. `UXR-013` Add lint/assertion to detect >1 `.primary-button` in key sections.
14. `UXR-014` Add lint/assertion to flag >N visible above-fold controls in app shell tests.
15. `UXR-015` Re-run and store Phase A baseline evidence.

**Phase A verification:**
- `pnpm -C ui typecheck`
- `pnpm -C ui test`
- `pnpm -C ui test:e2e tests/e2e/ux-audit-deep.spec.ts`

## Phase B — IA and Navigation Simplification (UXR-016 to UXR-030)

**Files (target):**
- Create: `ui/src/routes/WorkspaceRoute.tsx`
- Create: `ui/src/components/navigation/PrimaryNav.tsx`
- Create: `ui/src/components/navigation/ContextRail.tsx`
- Modify: `ui/src/components/Header/index.tsx`
- Modify: `ui/src/App.tsx`
- Modify: `ui/src/styles/main.css`
- Modify: `ui/tests/e2e/basic.spec.ts`
- Modify: `ui/tests/e2e/ux-checklist.spec.ts`

**Tasks:**

16. `UXR-016` Define canonical top-level routes: `overview`, `triage`, `diagnose`, `coordinate`, `settings`.
17. `UXR-017` Move global mode switching from always-visible strip to contextual “analysis tools” panel.
18. `UXR-018` Reduce header default controls to identity + status + one primary action + overflow.
19. `UXR-019` Move workspace/role/theme/motion/density controls into Settings route.
20. `UXR-020` Keep command palette entry global; remove duplicated quick-entry controls from header.
21. `UXR-021` Replace mixed intent labels with action-first route labels everywhere.
22. `UXR-022` Implement route-level breadcrumb and single “next best action” component.
23. `UXR-023` Enforce one visible primary CTA per route viewport.
24. `UXR-024` Move secondary actions to overflow menu in all route headers.
25. `UXR-025` Add route-level empty/loading/error shell with consistent copy patterns.
26. `UXR-026` Remove duplicate orientation modules (retain one canonical orientation surface).
27. `UXR-027` Move validation route entry out of global nav when prerequisites are not met.
28. `UXR-028` Add IA regression tests for nav label clarity and route transitions.
29. `UXR-029` Add mobile-first nav behavior with bottom-tab or compact rail per route.
30. `UXR-030` Publish IA v2 map (`docs/ux-ia-map.md`) with old->new mapping.

**Phase B verification:**
- `pnpm -C ui typecheck`
- `pnpm -C ui test`
- `pnpm -C ui test:e2e tests/e2e/basic.spec.ts tests/e2e/ux-checklist.spec.ts`

## Phase C — Onboarding and First-Time Value (UXR-031 to UXR-045)

**Files (target):**
- Create: `ui/src/components/onboarding/OnboardingOrchestrator.tsx`
- Create: `ui/src/components/onboarding/RolePathSelector.tsx`
- Create: `ui/src/components/onboarding/FirstWinChecklist.tsx`
- Modify: `ui/src/components/common/IntroOverlay.tsx`
- Modify: `ui/src/components/common/HeroRibbon.tsx`
- Modify: `ui/src/components/common/GuidedTour.tsx`
- Modify: `ui/src/components/common/ContextHelpOverlay.tsx`
- Modify: `ui/tests/e2e/onboarding.spec.ts`

**Tasks:**

31. `UXR-031` Replace multi-surface onboarding stack with one orchestrated onboarding controller.
32. `UXR-032` Keep only one initial decision on first load: “What are you here to do?”
33. `UXR-033` Define three role paths: `Evaluate`, `Operate`, `Investigate`.
34. `UXR-034` Build role-specific first-win checklist with 3 max steps.
35. `UXR-035` Convert guided tour to optional “help me around” flow, not auto-primary.
36. `UXR-036` Make explain overlay contextual on demand (not sticky default for new users).
37. `UXR-037` Retire duplicated onboarding triggers from header and quick actions.
38. `UXR-038` Add first-run progress indicator with completion confidence signal.
39. `UXR-039` Add fast restart/“start over” onboarding command.
40. `UXR-040` Add “skip safely” path that still recommends one first action.
41. `UXR-041` Add first-value telemetry for each role path.
42. `UXR-042` Add abandonment telemetry and friction reason tags.
43. `UXR-043` Add onboarding copy pass for plain language and confidence.
44. `UXR-044` Add onboarding E2E suites for all role paths.
45. `UXR-045` Capture before/after TTFV and drop-off deltas in `artifacts/ux-onboarding-delta.json`.

**Phase C verification:**
- `pnpm -C ui test -- src/components/__tests__/IntroOverlay.test.tsx src/components/__tests__/GuidedTour.test.tsx`
- `pnpm -C ui test:e2e tests/e2e/onboarding.spec.ts`

## Phase D — Core Persona Journeys (UXR-046 to UXR-070)

**Files (target):**
- Create: `ui/src/routes/OverviewRoute.tsx`
- Create: `ui/src/routes/TriageRoute.tsx`
- Create: `ui/src/routes/DiagnoseRoute.tsx`
- Create: `ui/src/routes/CoordinateRoute.tsx`
- Create: `ui/src/routes/SettingsRoute.tsx`
- Create: `ui/src/components/journeys/JourneyActionCard.tsx`
- Modify: `ui/src/components/Inspector/index.tsx`
- Modify: `ui/src/components/CinemaMode/index.tsx`
- Modify: `ui/src/components/FlowMode/index.tsx`
- Modify: `ui/src/components/Compare/index.tsx`
- Modify: `ui/src/components/Matrix/index.tsx`
- Modify: `ui/src/components/common/JourneyPanel.tsx`
- Modify: `ui/src/store/api.ts`
- Modify: `ui/tests/e2e/inspector.spec.ts`
- Modify: `ui/tests/e2e/flow-mode.spec.ts`
- Modify: `ui/tests/e2e/matrix.spec.ts`

**Tasks:**

46. `UXR-046` Define explicit outcome for each route and enforce in UI copy.
47. `UXR-047` Rebuild Overview route for executive/evaluator clarity (health, risk, next step).
48. `UXR-048` Rebuild Triage route for on-call workflow (problem-first ordering).
49. `UXR-049` Rebuild Diagnose route for deep analysis sequencing.
50. `UXR-050` Rebuild Coordinate route for ownership, activity, and handoff.
51. `UXR-051` Rebuild Settings route for setup/preferences/feature controls.
52. `UXR-052` Move workspace tools panel content into route-specific cards.
53. `UXR-053` Simplify JourneyPanel to route progress indicator only.
54. `UXR-054` Remove redundant checklist duplication between JourneyPanel and workspace cards.
55. `UXR-055` Standardize action card format: outcome, why it matters, one CTA.
56. `UXR-056` Add “last completed action” and “resume here” marker per route.
57. `UXR-057` Reorder diagnostics actions by task sequence (observe -> isolate -> validate -> share).
58. `UXR-058` Move support diagnostics panel entry into contextual recovery points only.
59. `UXR-059` Add route-specific empty states with one action and one alternate.
60. `UXR-060` Add route-specific success states with “what changed” confirmation.
61. `UXR-061` Add route-specific failure states with direct recovery controls.
62. `UXR-062` Unify export queue and async action status into one timeline component.
63. `UXR-063` Reduce cross-route modal usage by using inline side panels where possible.
64. `UXR-064` Add persistent action history strip for collaboration continuity.
65. `UXR-065` Add journey snapshots for “handoff-ready” state.
66. `UXR-066` Add route-based command palette scoping and ranking.
67. `UXR-067` Add keyboard task flows for triage and diagnose routes.
68. `UXR-068` Add route-level analytics checkpoint events.
69. `UXR-069` Add regression E2E for all five canonical journeys.
70. `UXR-070` Capture journey-time delta report in `artifacts/ux-journey-delta.json`.

**Phase D verification:**
- `pnpm -C ui typecheck`
- `pnpm -C ui test`
- `pnpm -C ui test:e2e tests/e2e/inspector.spec.ts tests/e2e/flow-mode.spec.ts tests/e2e/matrix.spec.ts`

## Phase E — Visual Hierarchy and Interaction Simplification (UXR-071 to UXR-085)

**Files (target):**
- Create: `ui/src/styles/tokens.css`
- Create: `ui/src/styles/layout.css`
- Create: `ui/src/styles/components.css`
- Modify: `ui/src/styles/main.css`
- Modify: `ui/src/components/Header/index.tsx`
- Modify: `ui/src/components/common/QuickActions.tsx`
- Modify: `ui/src/components/common/CommandPalette.tsx`
- Modify: `ui/scripts/design_lint.mjs`
- Modify: `ui/tests/e2e/visual.spec.ts`
- Modify: `ui/tests/e2e/ux-review.spec.ts`

**Tasks:**

71. `UXR-071` Split monolithic stylesheet into token/layout/component layers.
72. `UXR-072` Define strict typography hierarchy with max 4 visual text tiers per route.
73. `UXR-073` Define spacing rhythm by breakpoint and enforce with lint checks.
74. `UXR-074` Reduce decorative noise in dashboard chrome and background overlays.
75. `UXR-075` Normalize card densities and remove mixed density in same viewport.
76. `UXR-076` Standardize status chips and state indicators with minimal variants.
77. `UXR-077` Rebuild quick actions as contextual task actions (max 4 shown).
78. `UXR-078` Remove duplicated “Guide/Command/Explain” entries from multiple surfaces.
79. `UXR-079` Simplify command palette groups to task-oriented categories.
80. `UXR-080` Add hard rule: no more than one heavy visual treatment per section.
81. `UXR-081` Refresh microcopy to short, outcome-first labels.
82. `UXR-082` Add visual snapshots for each route and each breakpoint.
83. `UXR-083` Add 3-second scan test script (internal proxy) for comprehension.
84. `UXR-084` Store updated style governance docs in `docs/visual-system.md`.
85. `UXR-085` Publish new visual QA checklist and failure criteria.

**Phase E verification:**
- `pnpm -C ui design:lint`
- `pnpm -C ui test:e2e tests/e2e/visual.spec.ts tests/e2e/ux-review.spec.ts`

## Phase F — Accessibility, Performance, and Trust UX (UXR-086 to UXR-095)

**Files (target):**
- Modify: `ui/src/App.tsx`
- Modify: `ui/src/components/common/AppShellState.tsx`
- Modify: `ui/src/components/common/NotificationCenter.tsx`
- Modify: `ui/src/utils/perf.ts`
- Modify: `ui/src/utils/usabilitySignals.ts`
- Modify: `ui/tests/e2e/a11y.spec.ts`
- Modify: `ui/tests/e2e/keyboard.spec.ts`
- Modify: `ui/tests/e2e/localization-layout.spec.ts`

**Tasks:**

86. `UXR-086` Complete landmark/heading hierarchy per route.
87. `UXR-087` Ensure screen-reader announcement quality for async and navigation changes.
88. `UXR-088` Validate keyboard-only completion for all five core journeys.
89. `UXR-089` Enforce touch target and focus visibility on all action controls.
90. `UXR-090` Re-profile interaction-heavy routes and reduce unnecessary rerenders.
91. `UXR-091` Add route-level performance budgets and regression thresholds.
92. `UXR-092` Clarify trust states (safe export, raw data exposure, role constraints) inline.
93. `UXR-093` Add explicit confirmation and reversible flow for high-risk actions.
94. `UXR-094` Expand localization overflow checks across primary routes.
95. `UXR-095` Publish trust/a11y/perf evidence pack (`docs/ux-reboot-hardening-evidence.md`).

**Phase F verification:**
- `pnpm -C ui test:e2e tests/e2e/a11y.spec.ts tests/e2e/keyboard.spec.ts tests/e2e/localization-layout.spec.ts`
- `make verify-ux`

## Phase G — Rollout, Adoption, and Cleanup (UXR-096 to UXR-100)

**Files (target):**
- Modify: `ui/src/App.tsx`
- Modify: `ui/src/main.tsx`
- Modify: `README.md`
- Modify: `docs/user-journeys.md`
- Modify: `docs/ux.md`
- Modify: `RELEASE_GATES.md`
- Modify: `GAPS.md`

**Tasks:**

96. `UXR-096` Launch UX reboot behind staged feature flag with internal cohort rollout.
97. `UXR-097` Collect telemetry for 7 days and compare to baseline metrics.
98. `UXR-098` Remove deprecated onboarding and duplicated legacy surfaces.
99. `UXR-099` Update docs/runbooks/screenshots for new IA and journey model.
100. `UXR-100` Lock new UX release gate criteria and close reboot tracker.

**Phase G verification:**
- `make verify`
- `make verify-strict`
- `make doctor`
- `make scorecard`

---

## Required Evidence to Declare Completion

1. `artifacts/ux-baseline.json` and `artifacts/ux-journey-delta.json` show measurable simplification and faster completion.
2. Core journey E2E suites pass for evaluator/operator/investigator/team/admin flows.
3. A11y and keyboard suites pass with no open critical issues.
4. Route-level complexity targets are met:
   - Desktop above-fold controls reduced from `27` to <= `14`.
   - Mobile above-fold controls reduced from `18` to <= `10`.
   - Header visible controls reduced from `16` to <= `7`.
5. Legacy duplicated guidance surfaces are removed or consolidated.

## Execution Notes

- Execute this in batches of 5-10 tasks, each ending with targeted verification.
- Do not attempt Phase D+ before Phase B route architecture and Phase C onboarding contracts are stable.
- Keep all tracker artifacts in sync: `TASKS.md`, `.codex/PLANS.md`, `.codex/SCRATCHPAD.md`, `GAPS.md`, `RELEASE_GATES.md`.

Plan complete and saved to `docs/plans/2026-02-20-saas-ux-reboot-implementation-plan.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
