# SaaS UX Simplification V2 — World-Class Execution Plan

Date: 2026-02-21  
Status: Completed  
Owner: Codex + Jason

## Purpose

Transform Agent Director from a feature-dense single-page control room into a world-class SaaS experience with clear role-based journeys, progressive disclosure, low cognitive load, and consistent confidence-building onboarding.

## Research Principles (Applied)

1. Progressive disclosure for complexity-heavy workflows.  
Source: Nielsen Norman Group (Progressive Disclosure)
2. Visibility of system status and recognition-over-recall for dense interfaces.  
Source: Nielsen Norman Group (10 Usability Heuristics)
3. Clear IA/navigation patterns and reduced navigation clutter.  
Source: Shopify Polaris (Information Architecture), Atlassian Navigation guidance
4. Explicit onboarding scaffolds with role/persona branching.  
Source: Microsoft Fluent 2 (Onboarding)
5. Readability and hierarchy consistency across surfaces.  
Source: Stripe Design Principles
6. Accessibility and trust requirements as non-negotiable quality bars.  
Source: WCAG 2.2 Recommendation
7. Performance guardrails tied to user-perceived speed.  
Source: web.dev Core Web Vitals

## UX Outcomes (Definition of Done)

- First-time users can identify one primary next step within 5 seconds on each route.
- First-value path completion (role-selected) is possible without opening any advanced panel.
- Advanced controls are discoverable but never crowd primary decision surfaces.
- Route completion confidence is visible (progress + what changed + safe next action).
- Docs/demo flow mirrors in-product IA and onboarding language.

## Execution Method

- Work in batches of 4-8 tasks.
- After each batch run targeted checks, then `make verify`.
- Every 2-3 batches run `make doctor` and sync `GAPS.md` if new gaps appear.
- Do not start a new phase with unresolved regressions from the previous phase.

## Full Task Ledger (UXR2-001..UXR2-120)

### Phase 0 — Reality Baseline and Journey Mapping (UXR2-001..UXR2-016)

- [x] UXR2-001 Capture current above-the-fold element inventory by route and breakpoint.
- [x] UXR2-002 Capture current primary CTA count by route and breakpoint.
- [x] UXR2-003 Capture current first-click path map for evaluate persona.
- [x] UXR2-004 Capture current first-click path map for operate persona.
- [x] UXR2-005 Capture current first-click path map for investigate persona.
- [x] UXR2-006 Measure current route switch comprehension via 3-second scan script.
- [x] UXR2-007 Measure current time-to-first-action for first-run users.
- [x] UXR2-008 Measure current time-to-first-value for each onboarding path.
- [x] UXR2-009 Identify duplicate controls and duplicate content blocks.
- [x] UXR2-010 Identify dead-end actions with no clear follow-up.
- [x] UXR2-011 Identify controls requiring hidden context to understand.
- [x] UXR2-012 Identify highest-friction copy strings (ambiguous language).
- [x] UXR2-013 Build route-level cognitive-load scorecard artifact.
- [x] UXR2-014 Build route-level guidance gap matrix artifact.
- [x] UXR2-015 Build route-level trust-state clarity audit artifact.
- [x] UXR2-016 Publish baseline findings in `/artifacts/uxr2-baseline.json`.

### Phase 1 — Information Architecture Decomposition (UXR2-017..UXR2-036)

- [x] UXR2-017 Define strict route purpose statement (one sentence each).
- [x] UXR2-018 Define strict route success criteria (one measurable outcome each).
- [x] UXR2-019 Define strict route “not for this screen” exclusions.
- [x] UXR2-020 Move non-essential route controls into secondary disclosure zones.
- [x] UXR2-021 Enforce one dominant primary CTA per route viewport.
- [x] UXR2-022 Enforce maximum of four secondary actions visible by default.
- [x] UXR2-023 Introduce route-level “advanced mode” progressive disclosure gate.
- [x] UXR2-024 Collapse heavy timeline/stage chrome during first-run guided mode.
- [x] UXR2-025 Add explicit “show full workspace” opt-in for experienced users.
- [x] UXR2-026 Ensure route breadcrumb uses user-language intent labels.
- [x] UXR2-027 Align command palette groups to route intents only.
- [x] UXR2-028 Remove ambiguous action labels (noun-heavy -> verb-first labels).
- [x] UXR2-029 Reorder route nav by user frequency from telemetry.
- [x] UXR2-030 Add route transition microcopy (“what changed” on route switch).
- [x] UXR2-031 Add route-level empty/loading/error templates with one clear next step.
- [x] UXR2-032 Add route-level “why this matters” context block.
- [x] UXR2-033 Add route-level keyboard path hints only where relevant.
- [x] UXR2-034 Remove cross-route duplicated summary cards.
- [x] UXR2-035 Add IA regression tests for route purpose and CTA budget.
- [x] UXR2-036 Publish IA v3 map and migration note.

### Phase 2 — Onboarding, First Value, and Progressive Disclosure (UXR2-037..UXR2-056)

- [x] UXR2-037 Redesign first-run entry to single choice + one-line value statements.
- [x] UXR2-038 Add role-specific first-value checklist (max 3 steps each).
- [x] UXR2-039 Add dynamic recommended action based on current friction signals.
- [x] UXR2-040 Add contextual education cards only at point-of-use.
- [x] UXR2-041 Add just-in-time helper text for advanced toggles.
- [x] UXR2-042 Hide advanced data panels until prerequisite action is complete.
- [x] UXR2-043 Add inline confidence meter for first-value progress.
- [x] UXR2-044 Add progress persistence across refreshes and session restore.
- [x] UXR2-045 Add explicit skip behavior with safe resume marker.
- [x] UXR2-046 Add explicit “start over onboarding” path with no data loss.
- [x] UXR2-047 Add onboarding completion confirmation with next best route.
- [x] UXR2-048 Add onboarding analytics: dropoff step + reason tags.
- [x] UXR2-049 Add onboarding analytics: first-value completion by persona.
- [x] UXR2-050 Add onboarding analytics: time-to-first-confident-action.
- [x] UXR2-051 Add microcopy pass for path labels and action verbs.
- [x] UXR2-052 Add E2E tests for all onboarding branches and skip/resume.
- [x] UXR2-053 Add E2E tests for guided mode vs full mode disclosure.
- [x] UXR2-054 Add docs screenshots for first-run route progression.
- [x] UXR2-055 Add first-run support fallback link with contextual payload.
- [x] UXR2-056 Publish onboarding v2 evidence artifact.

### Phase 3 — Persona Route Journeys (UXR2-057..UXR2-080)

- [x] UXR2-057 Rewrite Overview journey for executive/evaluator outcome framing.
- [x] UXR2-058 Rewrite Triage journey for incident-first workflow.
- [x] UXR2-059 Rewrite Diagnose journey for hypothesis loop workflow.
- [x] UXR2-060 Rewrite Coordinate journey for ownership and handoff workflow.
- [x] UXR2-061 Rewrite Settings journey for trust/preferences workflow.
- [x] UXR2-062 Add route-specific success summaries after key actions.
- [x] UXR2-063 Add route-specific failure recovery playbooks inline.
- [x] UXR2-064 Add route-specific “what changed since last visit” notice.
- [x] UXR2-065 Add route-specific continue/resume state after interruption.
- [x] UXR2-066 Add route-specific empty-state content with one next action.
- [x] UXR2-067 Add route-specific action ordering based on task sequence.
- [x] UXR2-068 Move support diagnostics entry to failure moments only.
- [x] UXR2-069 Add route-specific async timeline that reflects user intent.
- [x] UXR2-070 Add route-specific handoff summary snapshot templates.
- [x] UXR2-071 Add route-specific command ranking by active task context.
- [x] UXR2-072 Add keyboard completion flow for triage journey.
- [x] UXR2-073 Add keyboard completion flow for diagnose journey.
- [x] UXR2-074 Add keyboard completion flow for coordinate journey.
- [x] UXR2-075 Add route journey E2E: overview canonical flow.
- [x] UXR2-076 Add route journey E2E: triage canonical flow.
- [x] UXR2-077 Add route journey E2E: diagnose canonical flow.
- [x] UXR2-078 Add route journey E2E: coordinate canonical flow.
- [x] UXR2-079 Add route journey E2E: settings canonical flow.
- [x] UXR2-080 Publish persona journey evidence and deltas.

### Phase 4 — Visual Hierarchy and Cognitive Load Reduction (UXR2-081..UXR2-098)

- [x] UXR2-081 Reduce simultaneous card density on default route layouts.
- [x] UXR2-082 Enforce heading hierarchy consistency across all route cards.
- [x] UXR2-083 Enforce single visual focal point per viewport section.
- [x] UXR2-084 Normalize status chip semantics and contrast treatment.
- [x] UXR2-085 Normalize spacing rhythm for route cards and control groups.
- [x] UXR2-086 Normalize control sizes and hit areas for touch/desktop parity.
- [x] UXR2-087 Remove decorative motion where no task-value exists.
- [x] UXR2-088 Add intentional entry animation for route context changes only.
- [x] UXR2-089 Simplify toolbar language and remove low-signal labels.
- [x] UXR2-090 Collapse long raw metadata blocks behind explicit reveal.
- [x] UXR2-091 Add readability constraints for long technical payload text.
- [x] UXR2-092 Rebalance color usage to highlight action hierarchy, not chrome.
- [x] UXR2-093 Add visual lint checks for hierarchy/token violations.
- [x] UXR2-094 Add visual snapshots for every route x breakpoint x disclosure mode.
- [x] UXR2-095 Add 3-second scan test per route with pass/fail gates.
- [x] UXR2-096 Add route-level readability test for key copy blocks.
- [x] UXR2-097 Add localization overflow tests for primary route headers.
- [x] UXR2-098 Publish visual hierarchy evidence pack.

### Phase 5 — Trust, Accessibility, and Performance Perception (UXR2-099..UXR2-110)

- [x] UXR2-099 Audit all trust-state language (safe/raw/session/role) for clarity.
- [x] UXR2-100 Add trust-state inline explainer pattern where user risk is present.
- [x] UXR2-101 Add clear confirmation + undo to all high-impact actions.
- [x] UXR2-102 Add live-region announcements for critical async outcomes.
- [x] UXR2-103 Validate keyboard-only completion for all canonical journeys.
- [x] UXR2-104 Validate focus order in guided mode and advanced mode.
- [x] UXR2-105 Validate landmark/heading structure in all route states.
- [x] UXR2-106 Validate touch target sizes in mobile route templates.
- [x] UXR2-107 Enforce route-level performance budgets for interaction latency.
- [x] UXR2-108 Enforce route-level performance budgets for route transition time.
- [x] UXR2-109 Add perf regression reporting in CI for critical journey actions.
- [x] UXR2-110 Publish trust/a11y/perf evidence pack.

### Phase 6 — Documentation, Demo Readiness, and Rollout (UXR2-111..UXR2-120)

- [x] UXR2-111 Update README hero flow to match simplified IA.
- [x] UXR2-112 Update docs hub with new route and disclosure model.
- [x] UXR2-113 Add “first 5 minutes” operator quickstart doc.
- [x] UXR2-114 Add “first 5 minutes” executive/evaluator quickstart doc.
- [x] UXR2-115 Add support runbook for guided mode and session recovery states.
- [x] UXR2-116 Refresh screenshots/GIFs to reflect simplified UI.
- [x] UXR2-117 Add final UX checklist for demo/review day.
- [x] UXR2-118 Run full gate bundle (`verify`, `verify-ux`, `doctor`, `scorecard`).
- [x] UXR2-119 Sync trackers (`TASKS.md`, `.codex/PLANS.md`, `.codex/SCRATCHPAD.md`, `GAPS.md`).
- [x] UXR2-120 Final launch-ready UX report with before/after metrics.

## Batch Plan (Immediate)

Batch A (Now): UXR2-001..UXR2-008  
Batch B: UXR2-009..UXR2-016  
Batch C: UXR2-017..UXR2-024

## Sources

- Nielsen Norman Group — 10 Usability Heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
- Nielsen Norman Group — Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- Shopify Polaris — Information Architecture: https://shopify.dev/docs/apps/build/polaris
- Atlassian Navigation guidance: https://developer.atlassian.com/platform/forge/design-navigation-for-your-app/
- Microsoft Fluent 2 — Onboarding: https://fluent2.microsoft.design/patterns/onboarding
- Stripe Design Principles: https://stripe.com/guides/designing-for-growth
- WCAG 2.2 Recommendation: https://www.w3.org/TR/WCAG22/
- web.dev — Core Web Vitals: https://web.dev/articles/vitals
