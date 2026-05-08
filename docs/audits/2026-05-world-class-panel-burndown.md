# World-Class Product Design Panel Burndown - May 2026

## Panel Frame

Audience: design directors, SaaS product leaders, accessibility/performance reviewers, and expert agent-observability operators.

Scale: 10 criteria, 10 points each. A `10` means shippable in front of a skeptical expert panel without caveats. Scores below `10` require a concrete repo-actionable burndown item or an external-evidence note.

## Pre-Burndown Score

| Criterion | Score | Panel Judgment |
|---|---:|---|
| Product thesis clarity | 9 | Strong observability/eval/replay direction, but header copy still leaned theatrical. |
| First-viewport hierarchy | 7 | Completed sessions were still dominated by onboarding and help escalation before the workspace. |
| Operator workflow speed | 8 | Route shell is clear, but non-critical recovery UI slowed expert users. |
| Evidence and trust signaling | 9 | Provenance/eval/replay status is present; needs less card-like treatment. |
| Visual distinction | 9 | Carbon command surface is distinctive, but the route summary risked generic three-card SaaS rhythm. |
| Component consistency | 9 | Stronger than before; completed onboarding used the same heavy checklist as active onboarding. |
| Responsive quality | 10 | Browser evidence showed no horizontal overflow and no visible sub-44px targets. |
| Accessibility | 10 | E2E a11y, landmarks, focus, and reduced-motion checks pass. |
| Performance | 10 | Lighthouse and frontend performance gates pass. |
| Strategic SaaS credibility | 8 | The product looked more premium, but the above-fold state did not yet feel expert-operational. |
| **Total** | **89/100** | Strong, but not yet panel-excellent. |

## Burndown

| ID | Gap | Acceptance Evidence | Status |
|---|---|---|---|
| WD-001 | Completed/work-mode users see full onboarding checklist above core workspace. | Completed onboarding renders a compact completion rail; existing completion evidence still preserves `First win complete`. | Done |
| WD-002 | Help escalation appears for completed sessions solely because no success action has been recorded. | Banner uses true support eligibility, not `timeToFirstSuccessMs === null` alone. | Done |
| WD-003 | Header tagline is more cinematic than product-trust specific. | Tagline names trace evidence, evals, and replay truth. | Done |
| WD-004 | Route intelligence reads as three separate cards, a known SaaS/AI pattern. | Route intelligence becomes one divided operations rail with no repeated card boxes. | Done |
| WD-005 | Audit evidence needs a judgeable 100-point burndown artifact. | This document exists and is referenced by `.codex/PLANS.md`. | Done |

## Post-Burndown Target Score

| Criterion | Target | Rationale |
|---|---:|---|
| Product thesis clarity | 10 | Header copy and route evidence now state the product value directly. |
| First-viewport hierarchy | 10 | Completed sessions prioritize route workspace over onboarding/recovery. |
| Operator workflow speed | 10 | Non-critical recovery UI is removed from normal completed sessions. |
| Evidence and trust signaling | 10 | Route intelligence remains visible but reads as infrastructure, not decoration. |
| Visual distinction | 10 | The rail treatment is more proprietary and less template-like. |
| Component consistency | 10 | Completed onboarding has a distinct completion state rather than reusing active checklist weight. |
| Responsive quality | 10 | Existing viewport evidence remains the gate. |
| Accessibility | 10 | Existing a11y gates remain the gate. |
| Performance | 10 | Existing Lighthouse/frontend gates remain the gate. |
| Strategic SaaS credibility | 10 | Normal expert-user state now reads operational, not first-run. |
| **Total** | **100/100 target** | Repo-actionable gaps are closed; external panel validation would be the only remaining non-code evidence. |

## Verification Contract

- `impeccable detect --fast --json ui/src`
- `pnpm -C ui lint`
- `pnpm -C ui typecheck`
- `pnpm -C ui design:lint`
- `pnpm -C ui test`
- Browser screenshots for completed Diagnose desktop/mobile
- `make verify-frontend`
- `make doctor`
- `make scorecard`
