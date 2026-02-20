# Agent Director — Perfecting Tasks

Below is the complete, prioritized list of "perfecting" work. Each item is framed as a checkable task. We can tackle them in batches instead of one‑by‑one.

## Launch Tomorrow — Exhaustive Readiness Sweep (Active)
- [x] LTX-000 Create launch execution plan `docs/plans/2026-02-20-launch-readiness-execution-plan.md`
- [x] LTX-001 Baseline workspace hygiene + toolchain verification
- [x] LTX-002 Full baseline verification `make verify`
- [x] LTX-003 Strict verification `make verify-strict`
- [x] LTX-004 UX verification bundle `make verify-ux`
- [x] LTX-005 Release evidence refresh `make doctor`
- [x] LTX-006 Scorecard refresh `make scorecard`
- [x] LTX-007 Release preflight `make release-safety`
- [x] LTX-008 Rodney live onboarding/help/support checks
- [x] LTX-009 Rodney live mode-switch/inspector/replay checks
- [x] LTX-010 Rodney responsive visual checks (mobile/tablet/desktop)
- [x] LTX-011 Deployment readiness check `make vercel-check`
- [x] LTX-012 Final artifact/gate reconciliation and gap closure
- [x] LTX-013 Commit + push launch-readiness evidence

## SaaS UX Reboot Program (Active)
Source plan: `docs/plans/2026-02-20-saas-ux-reboot-implementation-plan.md`

### Phase A — Foundations and Baseline
- [x] UXR-001 Add SaaS UX Reboot task ledger to `TASKS.md`
- [x] UXR-002 Sync reboot ExecPlan status in `.codex/PLANS.md`
- [x] UXR-003 Generate baseline complexity artifact `artifacts/ux-baseline.json`
- [x] UXR-004 Add journey metric schema in `ui/src/ux/metrics.ts`
- [x] UXR-005 Add first-meaningful-interaction and first-success hooks
- [x] UXR-006 Add onboarding exit telemetry (skip/complete/abandon)
- [x] UXR-007 Define route architecture contract
- [x] UXR-008 Add route-ready shell wrapper + feature flag
- [x] UXR-009 Add route-level legacy/new shell smoke test
- [x] UXR-010 Capture baseline journey durations by persona
- [x] UXR-011 Update done-definition to require measured outcomes
- [x] UXR-012 Add migration guardrail documentation
- [x] UXR-013 Add assertion for multi-primary CTA violations
- [x] UXR-014 Add assertion for above-fold control-count threshold
- [x] UXR-015 Refresh and persist Phase A baseline evidence

### Phase B — IA and Navigation Simplification
- [x] UXR-016 Define top-level routes (`overview`, `triage`, `diagnose`, `coordinate`, `settings`)
- [x] UXR-017 Move global mode switcher to contextual analysis tools
- [x] UXR-018 Reduce header default controls to core essentials + overflow
- [x] UXR-019 Move workspace/role/theme/motion/density controls to Settings route
- [x] UXR-020 Keep command palette global and remove duplicate quick-entry controls
- [x] UXR-021 Replace mixed-intent labels with action-first labels
- [x] UXR-022 Implement route breadcrumb + single next-best-action component
- [x] UXR-023 Enforce one visible primary CTA per route viewport
- [x] UXR-024 Move secondary actions behind overflow in route headers
- [x] UXR-025 Add consistent route-level empty/loading/error shells
- [x] UXR-026 Remove duplicate orientation modules and keep one canonical surface
- [x] UXR-027 Gate validation nav entry behind prerequisites
- [x] UXR-028 Add IA regression tests for nav clarity/transitions
- [x] UXR-029 Add mobile-first route navigation behavior
- [x] UXR-030 Publish IA v2 old-to-new mapping

### Phase C — Onboarding and First-Time Value
- [x] UXR-031 Replace multi-surface onboarding with one orchestrator
- [x] UXR-032 Keep one initial first-load decision
- [x] UXR-033 Define role paths (`Evaluate`, `Operate`, `Investigate`)
- [x] UXR-034 Add 3-step first-win checklists by role
- [x] UXR-035 Reframe guided tour as optional assist, not default path
- [x] UXR-036 Make explain overlay contextual on demand
- [x] UXR-037 Remove duplicated onboarding triggers in shell surfaces
- [x] UXR-038 Add first-run progress indicator with confidence signal
- [x] UXR-039 Add onboarding restart/start-over control
- [x] UXR-040 Add safe-skip with recommended next action
- [x] UXR-041 Add first-value telemetry per role path
- [x] UXR-042 Add onboarding abandonment telemetry and friction tags
- [x] UXR-043 Complete onboarding copy pass for plain language
- [x] UXR-044 Add onboarding E2E for all role paths
- [x] UXR-045 Capture onboarding before/after delta artifact

### Phase D — Core Persona Journeys
- [x] UXR-046 Define explicit outcome per route and enforce in copy
- [x] UXR-047 Rebuild Overview route (executive/evaluator clarity)
- [x] UXR-048 Rebuild Triage route (on-call problem-first flow)
- [x] UXR-049 Rebuild Diagnose route (deep analysis sequence)
- [x] UXR-050 Rebuild Coordinate route (ownership/handoff flow)
- [x] UXR-051 Rebuild Settings route (setup/preferences/feature controls)
- [x] UXR-052 Move workspace panel content into route-specific cards
- [x] UXR-053 Simplify JourneyPanel to route progress indicator
- [x] UXR-054 Remove duplicate checklist surfaces
- [x] UXR-055 Standardize action-card format (outcome/why/one CTA)
- [x] UXR-056 Add last-completed and resume markers per route
- [x] UXR-057 Reorder diagnostics actions by task sequence
- [x] UXR-058 Move support diagnostics entry to contextual recovery points
- [x] UXR-059 Add route empty states with one primary and one alternate action
- [x] UXR-060 Add route success states with what-changed confirmation
- [x] UXR-061 Add route failure states with direct recovery controls
- [x] UXR-062 Unify export queue and async action status timeline
- [x] UXR-063 Reduce modal reliance with inline side panels where possible
- [x] UXR-064 Add persistent collaboration action-history strip
- [x] UXR-065 Add journey snapshots for handoff-ready state
- [x] UXR-066 Add route-scoped command palette ranking
- [x] UXR-067 Add keyboard-only triage and diagnose task flows
- [x] UXR-068 Add route-level analytics checkpoints
- [x] UXR-069 Add full regression E2E for five canonical journeys
- [x] UXR-070 Capture journey-time delta artifact

### Phase E — Visual Hierarchy and Interaction Simplification
- [x] UXR-071 Split stylesheet into token/layout/component layers
- [x] UXR-072 Enforce strict typography hierarchy tiers
- [x] UXR-073 Enforce breakpoint spacing rhythm with lint checks
- [x] UXR-074 Reduce decorative chrome/background noise
- [x] UXR-075 Normalize card density and remove mixed-density screens
- [x] UXR-076 Standardize status chips/state indicators
- [x] UXR-077 Rebuild quick actions as contextual task actions (max 4)
- [x] UXR-078 Remove duplicated Guide/Command/Explain entries
- [x] UXR-079 Simplify command palette groups to task categories
- [x] UXR-080 Enforce one heavy visual treatment per section rule
- [x] UXR-081 Refresh microcopy to short outcome-first labels
- [x] UXR-082 Add visual snapshots for route x breakpoint matrix
- [x] UXR-083 Add internal 3-second scan comprehension script
- [x] UXR-084 Update style governance documentation
- [x] UXR-085 Publish visual QA checklist and failure criteria

### Phase F — Accessibility, Performance, and Trust UX
- [x] UXR-086 Complete route-level landmark and heading hierarchy
- [x] UXR-087 Improve SR announcements for async/nav changes
- [x] UXR-088 Validate keyboard-only completion for five core journeys
- [x] UXR-089 Enforce touch target and focus visibility consistency
- [x] UXR-090 Profile heavy routes and reduce unnecessary rerenders
- [x] UXR-091 Add route performance budgets + regression thresholds
- [x] UXR-092 Clarify trust states inline (safe/raw/role constraints)
- [x] UXR-093 Add explicit confirmation + reversible high-risk flows
- [x] UXR-094 Expand localization overflow checks across primary routes
- [x] UXR-095 Publish trust/a11y/perf hardening evidence pack

### Phase G — Rollout, Adoption, and Cleanup
- [x] UXR-096 Roll out reboot behind staged feature flag cohorts
- [x] UXR-097 Collect 7-day telemetry and compare baseline deltas
- [x] UXR-098 Remove deprecated duplicated legacy surfaces
- [x] UXR-099 Update docs/runbooks/screenshots to new IA and journeys
- [x] UXR-100 Lock UX reboot release-gate criteria and close tracker

## UX100 World-Class Program (Active)
- [x] UX100-000 Create exhaustive execution tracker: `docs/plans/2026-02-19-ux100-execution-plan.md`
- [x] UX100-B1 Execute Batch 1 (IA + hierarchy + accessibility/perf gate closure)
- [x] UX100-B2 Execute Batch 2 (design-system consistency + interaction grammar)
- [x] UX100-B3 Execute Batch 3 (journey coherence + onboarding discoverability closure)
- [x] UX100-B4 Execute Batch 4 (responsive/performance/reliability remaining items)
- [x] UX100-B5 Execute Batch 5 (polish and trust/safety remaining items + external review prep)

## Documentation Excellence Program (Active)
- [x] DOCX-001 Inventory docs + README gaps across technical and non-technical audiences
- [x] DOCX-002 World-class README refactor (IA, value narrative, role paths, diagrams, visuals)
- [x] DOCX-003 Add non-technical explainer with use cases, outcomes, and demo path
- [x] DOCX-004 Add technical explainer with architecture, contracts, and extensibility map
- [x] DOCX-005 Add user-journey map doc with walkthrough flows and success criteria
- [x] DOCX-006 Upgrade docs index to role-based + lifecycle-based navigation hub
- [x] DOCX-007 Verify documentation accuracy against current commands/features
- [x] DOCX-008 Run `make verify`, `make doctor`, `make scorecard`
- [x] DOCX-009 Commit + push documentation sweep

## Pre-Release Gate 40 Program (Active)
- [x] RG-001 First-session funnel with guaranteed first win
- [x] RG-002 Explicit mission objectives + fail reasons
- [x] RG-003 Adaptive difficulty director
- [x] RG-004 Deterministic run-state integrity (pause/rewind/fork/merge)
- [x] RG-005 Transparent post-run scoring model
- [x] RG-006 Reward loop clarity (XP/credits/unlocks)
- [x] RG-007 Persistent cloud profile save/load + migration safety
- [x] RG-008 Skill-tree respec + loadout presets
- [x] RG-009 Economy balancing controls
- [x] RG-010 Anti-exploit validation for progression/rewards
- [x] RG-011 Multiplayer matchmaking/lobby assignment
- [x] RG-012 Session reconnect + crash recovery
- [x] RG-013 Conflict-safe co-op actions with rollback semantics
- [x] RG-014 Collaboration ownership/handoff audit timeline
- [x] RG-015 Trust/safety controls (mute/block/report)
- [x] RG-016 UX consistency sweep across core modes
- [x] RG-017 Full async-state coverage on critical surfaces
- [x] RG-018 Confirm + undo for destructive actions
- [x] RG-019 WCAG 2.2 AA baseline closure
- [x] RG-020 Mobile/tablet parity for critical paths
- [x] RG-021 Keybind remapping + controller support baseline
- [x] RG-022 Unified settings center (input/motion/accessibility/privacy)
- [x] RG-023 In-app help/support center with diagnostics payload export
- [x] RG-024 Global localization infrastructure
- [x] RG-025 Mission/content authoring pipeline with validation/versioning
- [x] RG-026 Launch content pack depth target
- [x] RG-027 Procedural mission quality controls (novelty/repetition)
- [x] RG-028 Branching campaign consequences persistence
- [x] RG-029 Narrative recap engine (what happened/why/what next)
- [x] RG-030 Seasonal liveops framework
- [x] RG-031 60fps usability guardrails for large traces
- [x] RG-032 Cold-start performance budget + automation gate
- [x] RG-033 Full observability stack (errors/perf/gameplay KPIs)
- [x] RG-034 Reliability drills (disconnect/corruption/retry chaos checks)
- [x] RG-035 Security hardening pass
- [x] RG-036 Backup/restore + disaster-recovery runbook
- [x] RG-037 Blocking release CI gates
- [x] RG-038 Canary + one-click rollback + runtime kill-switches
- [x] RG-039 Public docs pack
- [x] RG-040 Launch analytics dashboard

- [x] RG-041 Create exhaustive master plan `docs/plans/2026-02-19-pre-release-gate-40-completion-plan.md`
- [x] RG-042 Execute Batch A (RG-021, RG-022)
- [x] RG-043 Execute Batch B (RG-032, RG-034)
- [x] RG-044 Execute Batch C (RG-038)
- [x] RG-045 Execute Batch D (RG-026, RG-027)
- [x] RG-046 Execute Batch E (RG-024)

## Pre-Release World-Class Launch Program (Active)
- [x] Master tracker: `WORLD_CLASS_RELEASE_TODO.md`
- [x] Batch A: WR-031, WR-036, WR-038, WR-039, WR-018
- [x] Batch B: WR-029, WR-030
- [x] Batch C: WR-011..WR-017, WR-019..WR-028, WR-032..WR-035, WR-037, WR-040

## Pre-Release Hardening Wave (Active)
- [x] RRH-001 Tracker + plan sync (`docs/plans/2026-02-17-pre-release-hardening-plan.md`, `.codex/PLANS.md`, `.codex/SCRATCHPAD.md`)
- [x] RRH-002 Deterministic Vercel toolchain hardening (`package.json`, `vercel.json`)
- [x] RRH-003 Deployment verification automation (`scripts/vercel_release_check.sh`, `Makefile`)
- [x] RRH-004 Public docs hardening (`README.md`, `docs/hosting.md`)
- [x] RRH-005 Full verification + evidence refresh (`make verify`, `make doctor`, `make scorecard`, `make vercel-check`)

## SaaS UX World-Class Sweep (Active)
- [x] SWC-001 Create executable plan (`docs/plans/2026-02-18-saas-ux-world-class-sweep-plan.md`)
- [x] SWC-002 Deep-link URL state (mode/trace/step) and shareable journey URLs
- [x] SWC-003 Unified loading/empty/error/recovery app shell states
- [x] SWC-004 Global notification center with deduped success/warn/error events
- [x] SWC-005 Async action resilience UX (retry/cancel/resume status consistency)
- [x] SWC-006 SEO baseline (`robots.txt`, `sitemap.xml`, canonical/OG/Twitter metadata)
- [x] SWC-007 PWA baseline (manifest, icons, service worker, installability)
- [x] SWC-008 Keyboard/a11y parity for new UX surfaces
- [x] SWC-009 Auth/session UX contract and expiry handling
- [x] SWC-010 Workspace/org switcher in global navigation
- [x] SWC-011 Role-aware UI (viewer/operator/admin states)
- [x] SWC-012 First-run SaaS setup wizard (connect/import/invite)
- [x] SWC-013 Global IA navigation polish and contextual secondary nav
- [x] SWC-014 Confirm + undo UX for destructive/high-risk actions
- [x] SWC-015 In-app support flow with diagnostics/handoff payload
- [x] SWC-016 Persona-driven onboarding progression enhancements
- [x] SWC-017 Saved views and journey presets
- [x] SWC-018 Command palette intelligence v2
- [x] SWC-019 Collaboration ownership/handoff refinement
- [x] SWC-020 Export center UX and retry queue
- [x] SWC-021 Form validation/state consistency layer
- [x] SWC-022 Responsive + small-screen workflow polish
- [x] SWC-023 Product analytics taxonomy instrumentation pass
- [x] SWC-024 Frontend error/perf telemetry integration
- [x] SWC-025 Experiment/feature-flag-ready UX hooks
- [x] SWC-026 CI UX gates (SEO/PWA/a11y/visual)
- [x] SWC-027 Documentation and ops runbook sync for SaaS UX

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

## Overnight Frontend UX Transformation Sprint (Complete)

### Tracking + Governance
- [x] Create exhaustive sprint plan in `docs/plans/2026-02-16-overnight-ux-transformation-plan.md`.
- [x] Sync `.codex/PLANS.md` and `.codex/SCRATCHPAD.md` with active status and progress.
- [x] Keep this section status-accurate until every track below is complete.

### Track 1 — Mission Pulse Header
- [x] Add run-health pulse summary in header.
- [x] Add mission completion snapshot in header.
- [x] Add mode-aware keyboard hint strip in header.

### Track 2 — Adaptive Intro Launch Paths
- [x] Add launch path cards (rapid triage, deep diagnosis, team sync).
- [x] Wire launch paths to app startup behavior.
- [x] Add persisted launch-path preference.

### Track 3 — Journey Priority Queue
- [x] Add urgency queue panel in Journey with severity labels.
- [x] Add queue actions wired to existing jump/replay/mode actions.
- [x] Add completion indicator for resolved queue items.

### Track 4 — Command Palette Intelligence
- [x] Add recent-command memory.
- [x] Add pinned-command controls.
- [x] Add quick macros/suggestions section.

### Track 5 — Director Brief Workspace Tabs
- [x] Add Overview/Narrative/Collab tab layout.
- [x] Keep progressive-disclosure locks per mission stage.
- [x] Preserve existing annotation + activity workflows in tabbed UI.

### Track 6 — Action Plan Completion UX
- [x] Add recommendation action checklist with completion states.
- [x] Add plan completion summary in Director Brief.
- [x] Support narrative export and ask-director from the narrative workspace tab.

### Track 7 — Session Handoff Digest
- [x] Add one-click handoff digest generator with current mode/step/risk summary.
- [x] Add clipboard copy status feedback in header.
- [x] Add command-palette action for digest generation.

### Track 8 — Motion Direction Controls
- [x] Add motion mode selector (cinematic/balanced/minimal).
- [x] Bind selector to CSS motion tokens and reduced-motion-safe behavior.
- [x] Persist motion mode and apply globally.

### Track 9 — Mobile Quick Rail
- [x] Add sticky mobile quick-action rail for story/tour/palette.
- [x] Keep desktop unchanged while improving small-screen reachability.
- [x] Ensure keyboard/a11y labels exist for mobile rail controls.

### Track 10 — Validation + Docs
- [x] Update relevant component tests for all new UX surfaces.
- [x] Run `pnpm -C ui typecheck`.
- [x] Run `pnpm -C ui test`.
- [x] Update README UX notes without removing the R&D/passion-project disclaimer footer.

## Overnight Gameplay Overhaul Program — Final Completion Pass (Complete)

### Tracking + Governance
- [x] Create exhaustive implementation plan in `docs/plans/2026-02-15-gameplay-overhaul-plan.md`.
- [x] Sync `.codex/PLANS.md` and `.codex/SCRATCHPAD.md` for this active stream.
- [x] Re-open execution checklist against full “world-class + multi-hour” scope and close all residual gaps.

### Track 1 — Co-op Incident Raids
- [x] Backend: session lifecycle API (create/join/leave/start/end) with strict 2–5 player limit.
- [x] Backend: role abilities with cooldowns and authoritative objective progression.
- [x] Backend: optimistic concurrency (`version`) and conflict-safe action application.
- [x] Realtime sync: gameplay SSE stream with session, event, and presence updates.
- [x] UI: multiplayer lobby, role assignment, objective board, synchronized state indicator.
- [x] Tests: API + multiplayer sync + UI raid flow.

### Track 2 — Roguelike Scenario Campaign
- [x] Backend: seeded procedural mission generation with escalating constraints.
- [x] Backend: run lifecycle with permadeath penalties and campaign reset rules.
- [x] Backend: unlockable mutator rewards and campaign state persistence.
- [x] UI: campaign map/run summary/reward choices.
- [x] Tests: deterministic generation + run progression + failure penalties.

### Track 3 — Branching Narrative Director Mode
- [x] Backend: narrative graph with branch state persisted per session.
- [x] Backend: branch outcomes mutate mission constraints/tool availability.
- [x] UI: narrative decision panel with branch history and consequences.
- [x] Tests: branch transitions and branch-effect propagation.

### Track 4 — Skill Tree + Loadout System
- [x] Backend: persistent player profile with skill unlocks and prerequisites.
- [x] Backend: loadout equip/unequip validation + derived gameplay modifiers.
- [x] UI: skill tree map + equipable loadout with saved presets.
- [x] Tests: prerequisite enforcement + modifier application + persistence.

### Track 5 — Asymmetric PvP (Saboteur vs Operator)
- [x] Backend: role-locked asymmetric actions and hidden sabotage state.
- [x] Backend: fog-of-war visibility model and round resolution with win conditions.
- [x] UI: dual-role controls and state views with fog-aware rendering.
- [x] Tests: role constraints + hidden information + victory logic.

### Track 6 — Time Manipulation Mechanics
- [x] Backend: branchable timeline model with fork snapshots and deterministic merge.
- [x] Backend: rewind semantics with irreversible audit trail entries.
- [x] UI: fork graph controls (fork/rewind/merge) with branch metadata.
- [x] Tests: deterministic rewind/merge and branch integrity.

### Track 7 — Boss Encounter Runs
- [x] Backend: multi-phase boss behavior engine with adaptive counter-moves.
- [x] Backend: enrage + team-check mechanics and phase-specific hazards.
- [x] UI: phase timeline, boss telegraphing, team coordination prompts.
- [x] Tests: phase transitions, adaptation, and defeat conditions.

### Track 8 — Adaptive AI Dungeon Master
- [x] Backend: adaptive mission orchestrator that rewrites goals/hazards/hints from telemetry.
- [x] Backend: skill-tier targeting and anti-repetition safeguards for generated directives.
- [x] UI: DM guidance feed with rationale and difficulty telemetry.
- [x] Tests: adaptation policies and hazard/hint generation constraints.

### Track 9 — Mission Economy + Crafting
- [x] Backend: token/material economy with source/sink ledger and balance rules.
- [x] Backend: crafting recipes, rarity tiers, and risk/reward tradeoff modifiers.
- [x] UI: crafting station with affordability, recipe preview, and outcomes.
- [x] Tests: ledger correctness, recipe costs, and modifier effects.

### Track 10 — Guild/Team Operations Layer
- [x] Backend: persistent guild model (roster, shared objectives, team progression).
- [x] Backend: event calendar + cooperative operation scheduling + scoreboards.
- [x] UI: guild dashboard with roster, event schedule, and progression board.
- [x] Tests: guild state transitions, event completion, and rankings.

### Track 11 — Cinematic Event Engine
- [x] Backend: cinematic event timeline with choreography metadata and trigger hooks.
- [x] UI: high-fidelity reactive transitions tied to gameplay moments and states.
- [x] UI: reduced-motion-safe choreography fallback path.
- [x] Tests: event trigger sequencing and motion state transitions.

### Track 12 — Seasonal LiveOps Framework
- [x] Backend: season/week scheduler with rotating modifiers and challenge templates.
- [x] Backend: reward pipeline + telemetry capture + balancing knobs.
- [x] UI: seasonal hub with weekly challenge rotation and reward claim flow.
- [x] Tests: schedule rotation, reward issuance, and telemetry integrity.

### Validation + Release
- [x] Unit tests for backend gameplay domain logic.
- [x] API tests for gameplay endpoints and realtime streams.
- [x] UI component tests for multiplayer/campaign/pvp/liveops journeys.
- [x] `python3 -m unittest discover -s server/tests`
- [x] `pnpm -C ui typecheck`
- [x] `pnpm -C ui test`
- [x] `make verify`
