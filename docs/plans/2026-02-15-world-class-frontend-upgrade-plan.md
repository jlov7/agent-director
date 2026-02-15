# World-Class Frontend Upgrade Plan

> **For execution:** this plan is being implemented directly in-session with exhaustive task tracking.

**Goal:** Deliver a materially upgraded Agent Director frontend across eight high-complexity UX tracks.

**Architecture:** Build additive capabilities on top of the existing React + Vite architecture (`App.tsx` orchestration, feature components, typed API client). Keep changes modular by extending existing components (`MiniTimeline`, `Matrix`, `IntroOverlay`, `Header`, `DirectorBrief`) and shared state in `App.tsx`.

**Tech Stack:** React 18, TypeScript, Vitest, Playwright, existing Agent Director UI style system.

---

## Program Scope

1. Cinematic Timeline Studio
2. Causality Graph Lab
3. Scenario Workbench v2
4. Collaboration Layer v2
5. AI Director Layer
6. Adaptive Onboarding
7. Visual System Upgrade
8. Performance Lift

## Task Checklist (Exhaustive)

### Track 1: Timeline Studio
- [x] Add timeline bookmarks to state and persistence.
- [x] Render bookmark markers in mini timeline.
- [x] Add jump controls (previous/next bookmark).
- [x] Add clip range controls (set start/end/clear).
- [x] Add clip export action with structured JSON artifact.

### Track 2: Causality Graph Lab
- [x] Add causal map section in Matrix mode.
- [x] Visualize top causal factors as weighted bars.
- [x] Surface confidence and sample counts alongside bars.

### Track 3: Scenario Workbench v2
- [x] Add duplicate-scenario action.
- [x] Add scenario reorder controls (up/down).
- [x] Wire new actions through `App.tsx` state handlers.

### Track 4: Collaboration Layer v2
- [x] Add lightweight live presence (multi-tab/session).
- [x] Add shareable live session link action.
- [x] Surface session signals in header UX.

### Track 5: AI Director Layer
- [x] Compute recommendation cards from investigation/matrix/trace signals.
- [x] Render actionable recommendations in Director Brief.
- [x] Wire actions to existing navigation/replay controls.

### Track 6: Adaptive Onboarding
- [x] Add onboarding persona selector (intro overlay).
- [x] Persist persona preference.
- [x] Adjust tour copy by selected persona.

### Track 7: Visual System Upgrade
- [x] Add theme mode selector and persisted preference.
- [x] Introduce theme class wiring and CSS variables overrides.
- [x] Ensure contrast and clarity across modes.

### Track 8: Performance Lift
- [x] Add deferred filtering for high-step trace search.
- [x] Reduce synchronous render pressure in query-heavy paths.

### Validation
- [x] Add/extend unit tests for changed components.
- [x] Run `pnpm -C ui typecheck`.
- [x] Run `pnpm -C ui test`.
- [x] Run `make verify`.
- [x] Sync task trackers with completion states.
