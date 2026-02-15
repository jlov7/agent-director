# Agent Director — Perfecting Tasks

Below is the complete, prioritized list of "perfecting" work. Each item is framed as a checkable task. We can tackle them in batches instead of one‑by‑one.

## P0 — Must‑Have Excellence (UX + Correctness + Scale)
- [x] UX audit pass across Cinema / Flow / Compare / Inspector (spacing, hierarchy, zero dead‑zones)
- [x] Accessibility baseline: focus order, ARIA labels, keyboard traps, contrast check
- [x] Timeline virtualization for 500+ steps (windowed rows + offscreen pooling)
- [x] Flow graph windowing: edge pruning for large graphs + throttle layout updates
- [x] Timestamp normalization: detect skew/missing timestamps, label "timing degraded"
- [x] IO binding validation: emit→tool→consume chain sanity checks + warnings
- [x] Safe export enforcement across UI and MCP (no raw leaks)

## P1 — Polished UX (Delight + Flow)
- [x] Contextual onboarding tips and empty states
- [x] Per‑step type iconography and consistent badge system
- [x] Improved hover/selection feedback (micro‑motion + accessibility)
- [x] Tooltips for insight chips and controls
- [x] Persist user preferences (mode, overlays, windowed, safe export)

## P1 — Compare + Replay Clarity
- [x] Diff overlay in Cinema Mode (ghost trace + changed highlights)
- [x] Compare alignment by toolCallId + timestamp (stable matching)
- [x] Diff summary export (provenance + deltas)
- [x] Replay determinism: recorded cache + dependency invalidation

## P2 — Performance & Reliability
- [x] Prefetch step details near selection/playhead
- [x] Memoized graph layout cache by trace id
- [x] Trace store migrations + index optimization
- [x] Resilient ingest (partial traces + recovery)
- [x] Disk cleanup tools + snapshot export

## P2 — MCP Integration Hardening
- [x] JSON schema validation for MCP tool inputs/outputs
- [x] Host compatibility tests (stdio + streamable HTTP)
- [x] UI manifest versioning + compatibility policy

## P2 — Testing & Quality Gate Hardening
- [x] Visual regression tests for Cinema/Flow/Compare
- [x] Performance tests with 1k/5k step traces
- [x] Property‑based tests for timing/lane assignment
- [x] Contract tests for MCP tool APIs

## P3 — Documentation & Demo
- [x] README upgrade with screenshots + demo GIF
- [x] Short "How it works" diagrams (trace→store→UI)
- [x] Demo script refinements + canned traces

## Optional — Analytics & Insights Expansion
- [x] Critical path computation + concurrency heatmap
- [x] Cost breakdown by model/tool + trend deltas
- [x] Step retry patterns and reliability highlights

## Next-Level Program — Counterfactual Replay Matrix + Causal Diff (Active)

### P0 — Batch Replay Platform (Backend)
- [x] Add replay job domain model (`queued`, `running`, `completed`, `failed`, `canceled`) and scenario schema.
- [x] Add in-memory replay job registry with deterministic IDs and timestamps.
- [x] Add `POST /api/replay-jobs` to submit N replay scenarios against one base trace + anchor step.
- [x] Add `GET /api/replay-jobs/{job_id}` for job status + per-scenario progress.
- [x] Add `POST /api/replay-jobs/{job_id}/cancel` and cancel propagation to pending scenarios.
- [x] Execute scenarios sequentially for v1 with structured progress events and error capture.
- [x] Persist generated replay traces with provenance linking scenario IDs and job ID.
- [x] Add job-level validation errors for invalid strategy, missing anchor step, and empty scenarios.
- [x] Add backend contract tests for replay job endpoints and state transitions.

### P0 — N-Way Diff + Causal Analysis (Backend)
- [x] Add matrix summary model for base vs all scenarios (wall time, cost, errors, retries, changed step counts).
- [x] Extend diff engine to produce stable pairwise deltas for every scenario vs base.
- [x] Add causal impact scoring heuristic (metric movement normalized by scenario changes).
- [x] Rank likely root-cause factors and return confidence + evidence fields.
- [x] Add safeguards for missing metrics and partially invalidated replays.
- [x] Add unit tests for ranking edge cases (ties, sparse data, contradictory outcomes).

### P1 — Matrix Mode (UI)
- [x] Add `matrix` mode to app state and command palette.
- [x] Add replay-job API client (`createReplayJob`, `getReplayJob`, `cancelReplayJob`).
- [x] Add matrix summary panel with sortable columns (latency, cost, errors, invalidated steps).
- [x] Add scenario detail drawer with modifications JSON and top changed steps.
- [x] Add causal ranking panel with factor, score, confidence, and evidence chips.
- [x] Add compare jump actions from matrix row to existing Compare mode.
- [x] Add loading, partial-failure, and canceled-job states.
- [x] Add responsive layout for desktop + tablet + mobile.

### P1 — Scenario Authoring UX
- [x] Add scenario builder UI to define 2-N modifications from one anchor step.
- [x] Add presets for common experiments (prompt tweak, tool timeout, strategy flip).
- [x] Add validation UI for duplicate scenario names and malformed modification payloads.
- [x] Add import/export of scenario sets as JSON.
- [x] Add keyboard support and explain-mode help for all matrix controls.

### P1 — Safety, Governance, and Sharing
- [x] Enforce safe export behavior in matrix views (redacted fields only when safe mode is on).
- [x] Disable raw payload reveal paths when safe export is enabled.
- [x] Add matrix export artifact (JSON + summary markdown) with explicit redaction metadata.
- [x] Add warnings when scenario modifications include likely sensitive keys.
- [x] Add docs for safe-share workflow for replay matrices.

### P2 — Performance and Reliability
- [x] Add trace-size guardrails and server-side limits for scenario counts.
- [x] Add caching for repeated base-vs-scenario diff computations.
- [x] Add incremental polling with backoff for long-running replay jobs.
- [x] Add timeout handling + retry policy for scenario execution failures.
- [x] Add performance tests for 10/25/50 scenario batches.

### P2 — Testing and Release Readiness
- [x] Add backend unit tests for replay jobs, matrix summary, and causal ranking.
- [x] Add UI unit tests for matrix reducers, sorting, and causal panel rendering.
- [x] Add Playwright E2E for scenario creation → run → matrix inspect → compare jump.
- [x] Add snapshot/visual tests for matrix mode empty/loading/loaded/error states.
- [x] Update README + docs with matrix mode quickstart and troubleshooting.
- [x] Run `make verify` and close all regressions before merge.

### Kickoff Now
- [x] Task 1 tonight: implement backend replay job primitives + failing tests first.

## Overnight World-Class Frontend Program (Active)

### Tracking + Governance
- [x] Create exhaustive execution plan in `docs/plans/2026-02-15-world-class-frontend-upgrade-plan.md`.
- [x] Sync `.codex/PLANS.md` and `.codex/SCRATCHPAD.md` with active status.
- [x] Keep this section status-accurate until all tracks are complete.

### Track 1 — Cinematic Timeline Studio
- [x] Bookmark markers + jump controls.
- [x] Clip range controls + clip export artifact.

### Track 2 — Causality Graph Lab
- [x] Causal map panel with weighted visual ranking.
- [x] Confidence/sample UX in causal visual.

### Track 3 — Scenario Workbench v2
- [x] Duplicate scenario action.
- [x] Reorder scenario actions (up/down).

### Track 4 — Collaboration Layer v2
- [x] Live session presence indicator.
- [x] Shareable session link action.

### Track 5 — AI Director Layer
- [x] Recommendation cards in Director Brief.
- [x] Action wiring from recommendations.

### Track 6 — Adaptive Onboarding
- [x] Persona selector in Intro Overlay.
- [x] Persona-aware tour copy.

### Track 7 — Visual System Upgrade
- [x] Theme selector (studio/focus/contrast).
- [x] Tokenized theme overrides in CSS.

### Track 8 — Performance Lift
- [x] Deferred search filtering for large traces.

### Validation + Release
- [x] Targeted tests for changed components.
- [x] `pnpm -C ui typecheck`
- [x] `pnpm -C ui test`
- [x] `make verify`

## Phase 2 — Full Advanced Feature Completion (Complete)

### Tracking + Governance
- [x] Create exhaustive plan in `docs/plans/2026-02-15-phase2-hard-features-plan.md`.
- [x] Keep this section status-accurate through completion.

### Track 1 — Cinematic Timeline Studio (Advanced)
- [x] Lane strategy controls (type/status/parent) + live regrouping.
- [x] Lane visibility toggles + lane reorder controls.
- [x] Scene segment labeling + segment-aware clip export.
- [x] Studio-state persistence for lane + segment configs.

### Track 2 — Causality Graph Lab (Advanced)
- [x] Causal factor simulation controls.
- [x] Projected metrics panel.
- [x] Step influence heatmap.
- [x] Causal path explorer.

### Track 3 — Scenario Workbench (Replay IDE)
- [x] Schema-aware scalar form editing.
- [x] Side-by-side scenario diff preview.
- [x] Batch profile orchestration runner.
- [x] Integrity/conflict validation for profiles.

### Track 4 — Realtime Collaborative Debugging
- [x] Cross-session state sync (mode/playhead/selection).
- [x] Live participant timeline cursors.
- [x] Shared annotations with conflict-safe merge.
- [x] Session activity feed.

### Track 5 — AI Director Layer (Advanced)
- [x] Generated run narrative panel.
- [x] NL ask-director prompt with deterministic reasoning.
- [x] Guided action plan generation.
- [x] Narrative markdown export.

### Track 6 — Adaptive Onboarding Journeys (Advanced)
- [x] Mission engine driven by behavior signals.
- [x] Persona-adaptive tour branching.
- [x] Progressive disclosure gating.
- [x] Mission persistence + reset.

### Track 7 — Visual System + Motion Engine
- [x] Motion tokens + utilities.
- [x] Reduced-motion safe fallbacks.
- [x] High-fidelity transitions for mode/panel changes.
- [x] Theme parity polish pass.

### Track 8 — Large-Trace Performance Architecture
- [x] Progressive hydration for large traces.
- [x] Staged filtering with graceful fallback.
- [x] Incremental rendering guardrails for large matrix tables.
- [x] UI perf telemetry for render/filter timing.

### Validation + Release
- [x] Unit/E2E/snapshot updates for advanced features.
- [x] `pnpm -C ui typecheck`
- [x] `pnpm -C ui test`
- [x] `make verify`
