# World-Class SaaS UX Research And Implementation Plan (V3)

Date: 2026-02-21  
Status: Completed

## Goal

Transform route-shell UX from "all controls at once" into a calmer, progressive-disclosure experience that keeps first-value actions obvious while preserving access to deep analysis when needed.

## Research Synthesis (Best Practices -> Product Constraints)

1. Progressive disclosure should defer advanced detail until users explicitly request it.
   - Source: [NN/g Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
   - Source: [Atlassian Design System - Forms](https://atlassian.design/components/form/)
2. First-use experiences must guide users through a clear initial path instead of presenting full system complexity immediately.
   - Source: [NN/g First-Time Use](https://www.nngroup.com/articles/first-time-use/)
   - Source: [Fluent 2 Onboarding](https://fluent2.microsoft.design/patterns/onboarding)
3. Users need visible state, continuity, and "what happens next" cues to remain confident.
   - Source: [Fluent 2 Progress indicator and wizard](https://fluent2.microsoft.design/components/web/react/core/progressindicator/usage)
4. Empty/focused states should explain purpose and next action clearly.
   - Source: [Fluent 2 Empty states](https://fluent2.microsoft.design/patterns/empty-states)
5. Workflow design should start from user needs and context, not internal feature grouping.
   - Source: [GOV.UK Service Manual - User Needs](https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs)
6. Power-user speed paths (command/keyboard) should remain available but not dominate first-run screens.
   - Source: [Linear changelog reference](https://linear.app/changelog/2024-08-20-keyboard-shortcuts-for-project-milestones-and-updates-to-filters)

## Persona Matrix

- Evaluator / Executive: "Is this healthy, risky, and worth action right now?"
- Operator / On-call: "Resolve incident quickly with deterministic sequence."
- Investigator / Engineer: "Prove or falsify root-cause hypothesis with evidence."
- Coordinator: "Keep ownership, context, and handoff continuity aligned."
- Admin: "Set trust defaults and rollout controls safely."

## Journey Contracts

- `Review`: establish health/risk decision in under one minute.
- `Triage`: execute observe -> isolate -> validate -> share.
- `Diagnose`: execute baseline -> causal chain -> hypothesis validation -> findings share.
- `Coordinate`: confirm owners -> share/copy handoff -> capture snapshot.
- `Configure`: confirm trust defaults -> adjust controls -> preserve safe sharing state.

## Implementation Phases

### Phase 1 - Focused Mode Architecture

- [x] Add persisted route-shell canvas state (`focused` default behavior).
- [x] Keep route-shell sessions in focused mode after onboarding completion.
- [x] Preserve explicit user control to open/close full analysis canvas.
- [x] Add focused-mode orientation copy to reduce UI ambiguity.
- [x] Add route-specific "when to open full canvas" guidance.

### Phase 2 - Action-Driven Progressive Disclosure

- [x] Auto-open analysis canvas when route actions require deep timeline/flow/matrix context.
- [x] Keep non-analysis actions (handoff, ownership, trust toggles) workable without opening full canvas.
- [x] Ensure onboarding recommended actions open canvas only when necessary.
- [x] Add command-palette actions for `Open analysis canvas` and `Return to focused workspace`.
- [x] Add telemetry for focus/canvas transitions.

### Phase 3 - Header And Workspace Simplification

- [x] Hide orientation meta chips while in focused mode.
- [x] Keep workspace secondary menu hidden until full canvas is opened.
- [x] Keep quick-help access available in focused mode.
- [x] Add explicit header-level toggle (`Open analysis canvas` / `Return to focused view`).
- [x] Keep one dominant primary action in section actions.

### Phase 4 - Onboarding Continuity

- [x] Update guided disclosure CTA to open full canvas explicitly.
- [x] Update completion banner to support either focused continuation or full-canvas entry.
- [x] Keep start-over flow resetting both full-workspace and canvas states.
- [x] Keep stale-session auto-recovery reopening guided state (including focus reset).

### Phase 5 - Verification

- [x] Add failing-first unit test for completed sessions defaulting to focused mode.
- [x] Implement code changes to satisfy new unit behavior.
- [x] Add E2E regression for focused mode open/close cycle.
- [x] Update route-shell E2E initializers to control focused/full states deterministically.
- [x] Pass targeted test bundle:
  - [x] `pnpm -C ui test -- src/App.test.tsx`
  - [x] `pnpm -C ui test:e2e -- tests/e2e/onboarding.spec.ts tests/e2e/basic.spec.ts tests/e2e/route-journeys.spec.ts tests/e2e/keyboard.spec.ts`
  - [x] `pnpm -C ui typecheck`
  - [x] `pnpm -C ui lint`

### Phase 6 - Docs And Launch Readiness

- [x] Add this research+implementation plan artifact.
- [x] Update UX final report to include focused-mode architecture outcome.
- [x] Update docs hub/README references.
- [x] Refresh screenshots/GIF evidence to reflect new focused/full behavior.
- [x] Re-run release evidence gates and deploy production build.

## Primary Files Touched

- `ui/src/App.tsx`
- `ui/src/styles/main.css`
- `ui/src/utils/saasUx.ts`
- `ui/src/App.test.tsx`
- `ui/tests/e2e/onboarding.spec.ts`
- `ui/tests/e2e/basic.spec.ts`
- `ui/tests/e2e/route-journeys.spec.ts`
- `ui/tests/e2e/keyboard.spec.ts`

## Outcome

Focused mode is now the default post-onboarding route experience, with explicit and reversible expansion into full analysis canvas. This materially reduces perceived complexity while retaining full backend-powered functionality.
