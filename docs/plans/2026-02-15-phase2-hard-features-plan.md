# Phase 2 Hard Features Plan

Goal: Fully implement the advanced frontend feature set requested for world-class depth across interaction design, collaboration, causality analysis, and scale performance.

## Track 1 — Cinematic Timeline Studio (Advanced)
- [x] Add lane strategy controls (`type`, `status`, `parent`) with live regrouping.
- [x] Add lane visibility toggles and lane reorder controls.
- [x] Add scene segment labeling and segment-based clip export metadata.
- [x] Add “studio state” persistence for lane settings + scene segments.

Acceptance:
- [x] Timeline can be restructured without reload and persists per trace.
- [x] Clip export includes segment labels and lane context.

## Track 2 — Causality Graph Lab (Advanced)
- [x] Add causal factor simulation controls (weighted slider per factor).
- [x] Add projected metric panel derived from simulation model.
- [x] Add step influence heatmap based on scenario deltas.
- [x] Add “path explorer” showing top causal chains with confidence.

Acceptance:
- [x] Users can simulate factor adjustments and see predicted impacts.
- [x] Heatmap and chain views update with matrix result data.

## Track 3 — Scenario Workbench (Replay IDE)
- [x] Add schema-aware scalar editor for scenario modification JSON.
- [x] Add side-by-side scenario diff preview (baseline vs selected).
- [x] Add scenario batch profile runner (sequential orchestration presets).
- [x] Add validation for profile integrity and duplicate factor conflicts.

Acceptance:
- [x] Workbench supports both raw JSON and structured editing.
- [x] Batch profile runner creates reproducible matrix jobs.

## Track 4 — Realtime Collaborative Debugging
- [x] Add cross-session state sync for mode/playhead/step selection.
- [x] Add live participant cursors (timeline markers for other sessions).
- [x] Add shared trace annotations with conflict-safe merge semantics.
- [x] Add session activity feed (who changed what and when).

Acceptance:
- [x] Multi-tab collaboration is synchronized with deterministic merges.
- [x] Session activity is visible in UI and persisted safely.

## Track 5 — AI Director Layer (Advanced)
- [x] Add generated run narrative panel (incident-style summary).
- [x] Add NL “Ask Director” prompt box with deterministic local reasoning engine.
- [x] Add guided action plans from narrative output.
- [x] Add narrative export (markdown) with key evidence references.

Acceptance:
- [x] Narrative and answer flows are actionable and context-aware.
- [x] Guided actions deep-link into timeline, matrix, and inspector.

## Track 6 — Adaptive Onboarding Journeys (Advanced)
- [x] Add mission engine driven by user behavior signals.
- [x] Add persona-adaptive tour branch points and copy variants.
- [x] Add progressive disclosure gating by mission completion.
- [x] Add mission completion persistence + reset controls.

Acceptance:
- [x] Onboarding adapts to role and observed user behavior.
- [x] UI guidance changes as missions are completed.

## Track 7 — Visual System + Motion Engine
- [x] Add explicit motion tokens (durations/easing/intensity levels).
- [x] Add shared animation utility classes with reduced-motion fallbacks.
- [x] Add high-fidelity transitions for mode switches and panel reveals.
- [x] Add theme-specific surface styling parity checks.

Acceptance:
- [x] Motion language is coherent, tokenized, and accessibility-safe.
- [x] Mode transitions are visibly smoother without performance regressions.

## Track 8 — Large-Trace Performance Architecture
- [x] Add progressive hydration pipeline for large step collections.
- [x] Add staged filter computation for huge traces with graceful fallback.
- [x] Add guardrails for very large matrix tables (incremental rendering).
- [x] Add runtime perf telemetry surface in UI (render/filter timing).

Acceptance:
- [x] Large traces remain interactive with no blocking UX cliffs.
- [x] Perf indicators confirm staged processing behavior.

## Validation & Release Gates
- [x] Unit tests for new timeline/collab/workbench logic.
- [x] E2E tests for advanced matrix/workbench and collaboration flows.
- [x] Snapshot updates for intentional visual/motion changes.
- [x] `pnpm -C ui typecheck`
- [x] `pnpm -C ui test`
- [x] `make verify`
- [x] Update `TASKS.md`, `.codex/PLANS.md`, `.codex/SCRATCHPAD.md`.
