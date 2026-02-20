# SaaS UX Reboot Design Brief

Date: 2026-02-20  
Status: Implemented (2026-02-20)

## Purpose

Define a reality-based UX redesign strategy that simplifies Agent Director, clarifies user journeys, and aligns the frontend with world-class SaaS product patterns without losing existing backend capabilities.

## Current State: Where We Actually Are

This is grounded in code, docs, and live app probes from this repo.

### Product/architecture facts

- `ui/src/App.tsx` is `5,421` lines and currently acts as a monolithic orchestration layer.
- `ui/src/styles/main.css` is `4,960` lines and carries both token system and many surface-specific rules.
- `ui/src/App.tsx` contains:
  - `45` state hooks (`22` `useState`, `23` `usePersistedState`)
  - `65` `useEffect` hooks
  - `73` `useCallback` hooks
  - `76` direct interactive element tags (`<button>`, `<select>`, `<input>`, `<textarea>`)
- Multiple onboarding and guidance systems are simultaneously active:
  - Intro overlay
  - Hero ribbon
  - Guided tour
  - Context help overlay
  - Story mode banner
  - Journey panel
  - Quick actions dock
  - Command palette

### First-view complexity probe (Playwright, fresh local storage)

- Desktop (`1440x900`):
  - `27` visible interactive controls above fold
  - `16` visible header controls
- Tablet (`1024x768`):
  - `26` visible controls (`25` fully above fold)
- Mobile (`390x844`):
  - `19` visible controls (`18` fully above fold)

### Practical diagnosis

- We shipped broad feature coverage and quality gates, but too many controls are presented too early.
- IA and onboarding are additive rather than layered; users are asked to choose too much before they understand the mental model.
- Primary CTA discipline exists in some sections, but the global shell still has high concurrent decision load.
- The product currently optimizes for capability exposure more than guided task completion.

## Root Cause Summary

1. **Monolith orchestration** in `ui/src/App.tsx` mixes concerns (onboarding, workspace ops, advanced diagnostics, gameplay, collaboration, safety, and personalization) inside one render tree.
2. **Parallel guidance systems** (tour + explain + story + journey + quick actions) compete for attention and increase cognitive load.
3. **Single-screen product model** pushes too much global state and control surface into one route.
4. **Feature-first growth pattern** increased power, but not enough subtraction or progressive disclosure.
5. **Validation focus** has been pass/fail quality gates, not user-task completion speed and comprehension confidence.

## Benchmark Research: What World-Class SaaS Systems Repeatedly Do

The pattern set below is synthesized from official UX standards and top SaaS documentation.

### Non-negotiable principles

1. **Visibility of system status** with clear, timely feedback.
2. **Recognition over recall** and reduced memory burden.
3. **Aesthetic/minimalist presentation** that removes irrelevant choices.
4. **Progressive disclosure**: reveal advanced controls only when needed.
5. **Role-aware onboarding and guidance paths** instead of one generic flow.
6. **Contextual orientation**: breadcrumb/location + one clear next action.
7. **Embedded support recovery** when users stall.

### Practical product patterns to emulate

- Role-specific startup guides and templates (Notion, Linear).
- Strong default views/workspaces and triage-first team surfaces (Linear).
- Explicit nav hierarchy and workspace context (Stripe Dashboard).
- Empty state design with one clear action path (Atlassian design guidance).
- User-needs-first design iteration loops (GOV.UK, NIST HCD standards).
- Strict accessibility semantics and dynamic update support (WCAG 2.2 + ARIA live regions).

## User Profiles (Primary + Secondary)

### P1 users (must optimize first)

1. **First-time evaluator (buyer/champion)**  
Goal: understand value in <5 minutes.
2. **Daily operator (on-call / incident responder)**  
Goal: isolate issue and hand off quickly.
3. **Technical investigator (engineer/analyst)**  
Goal: deep diagnosis and replay validation.
4. **Team lead / manager**  
Goal: status, ownership, and confidence summary.

### P2 users (optimize after P1)

5. **Workspace admin**  
Goal: setup, permissions, safe defaults.
6. **Support/escalation agent**  
Goal: collect diagnostics and resolve friction quickly.
7. **Compliance/security reviewer**  
Goal: verify redaction and action traceability.
8. **Power user**  
Goal: keyboard-driven speed and advanced workflows.

## Target Journey Architecture

### Journey 1: First Value (Evaluator)

1. Landing context -> value proposition -> role choice.
2. One guided path (“See one run end-to-end”).
3. One successful completion signal.
4. Suggested next action by role.

### Journey 2: Triage (Operator)

1. Open latest failing run.
2. Immediate “what changed” cue.
3. Jump to bottleneck/failure.
4. Export/share handoff artifact.

### Journey 3: Deep Diagnosis (Investigator)

1. Enter analysis workspace.
2. Flow + compare + matrix progression.
3. Save reproducible view.
4. Publish outcome + recommendation.

### Journey 4: Team Coordination (Lead)

1. Assign owner + due action.
2. Monitor progress timeline.
3. Resolve blockers.
4. Close with clear status and evidence.

### Journey 5: Setup & Trust (Admin)

1. Complete workspace setup.
2. Configure role/safety defaults.
3. Validate support + export flows.
4. Confirm readiness signal.

## Recommended Redesign Strategy

### Option A: Keep current shell, simplify copy/spacing only

- Pros: fast, low refactor risk.
- Cons: does not solve structural decision overload.

### Option B: Full rewrite from scratch

- Pros: clean architecture.
- Cons: high regression and delivery risk.

### Option C (Recommended): Hybrid “strangler” redesign

- Introduce route-based workspace shells and progressive disclosure.
- Migrate one journey at a time from monolith to focused surfaces.
- Keep backend contracts and reuse proven components where possible.
- Decommission old surfaces only when replacement journey + tests pass.

## UX North Star Rules (Must Hold in Every Screen)

1. One primary intent per screen.
2. One dominant CTA per intent section.
3. Advanced controls are hidden by default.
4. User always sees: `Where am I`, `What happened`, `What next`.
5. First-run experience chooses one guided path, not five concurrent aids.
6. Empty/error states always include clear recovery action.
7. Every critical flow is keyboard and screen-reader complete.

## Measurement Framework (Before vs After)

### Core success metrics

- Time to first meaningful insight (TTFMI)
- Time to first successful end-to-end journey (TTFV)
- Journey completion rate by persona
- Misclick/backtrack events per session
- Support panel opens per 100 sessions
- Handoff completion rate
- Compare/matrix adoption after replay

### Complexity control metrics

- Visible controls above fold by breakpoint
- Number of primary CTAs per view (target: 1)
- Navigation choice count at first load
- Onboarding abandonment rate

## Risks and Controls

- **Risk:** Refactor churn in core shell  
  **Control:** route-by-route migration + feature flags + parity tests.
- **Risk:** Existing users lose shortcuts/workflows  
  **Control:** keep command palette parity and “Classic view” transition period.
- **Risk:** Visual simplification removes capability discoverability  
  **Control:** layered disclosure + role-aware “next actions.”
- **Risk:** Tracker says “done” while UX still feels complex  
  **Control:** redefine done using user-task metrics, not artifact completeness.

## Source Benchmarks

- [Nielsen Norman Group — 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [Nielsen Norman Group — First-Time UX (Tooltips & Tours)](https://www.nngroup.com/articles/first-time-ux/)
- [Nielsen Norman Group — Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- [Material Design — Navigation Design Basics](https://m1.material.io/patterns/navigation.html)
- [Atlassian Design — Empty State](https://atlassian.design/components/empty-state/)
- [Atlassian Design — Forms Pattern](https://atlassian.design/patterns/forms/)
- [Stripe Docs — Dashboard Basics](https://docs.stripe.com/get-started/account/dashboard-basics)
- [Linear Docs — Start Guide](https://linear.app/docs/start-guide)
- [Linear Docs — Team Pages](https://linear.app/docs/team-pages)
- [Notion Help — Start Here](https://www.notion.com/help/start-here)
- [Slack Engineering — Gentle Onboarding](https://slack.engineering/building-and-scaling-a-new-hire-onboarding-experience-at-slack/)
- [GOV.UK Service Manual — Understand User Needs](https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs)
- [NIST — Human-Centered Design](https://www.nist.gov/itl/iad/human-centered-design)
- [WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/)
- [MDN — ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)
