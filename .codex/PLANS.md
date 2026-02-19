# Documentation Excellence ExecPlan

## Purpose / Big Picture

Deliver a public-facing, world-class documentation experience so both technical and non-technical readers can understand, run, evaluate, and present Agent Director from the repository alone.

## Scope

- In scope: `README.md` and documentation hub/guide upgrades with richer structure, diagrams, visuals, and audience-specific onboarding paths.
- Out of scope: feature implementation in application/runtime code.

## Progress

- [x] Audit current README/docs/media inventory and identify documentation gaps.
- [x] Implement README world-class refresh (structure, audience paths, diagrams, media narrative).
- [x] Add audience-specific explainers for technical and non-technical readers.
- [x] Add user-journey documentation with visual flows for onboarding/demo/evaluation.
- [x] Upgrade docs hub (`docs/index.md`) to a role-based map.
- [x] Validate docs references and run verification gates.
- [x] Commit and push documentation upgrade.

## Decision Log

- Preserve existing ASCII logo and legal disclaimer while upgrading readability and information architecture.
- Reuse existing screenshots/GIF/concept art and pair them with clearer journey context instead of adding decorative-only content.
- Keep docs composable: README for first contact, docs hub for depth, role guides for fast alignment.

## Validation Plan

- Markdown link/reference sanity check via manual pass.
- Full quality gates: `make verify`, `make doctor`, `make scorecard`.

## Outcomes & Retrospective

Completed.
- Rebuilt README as a world-class front door with role-based paths, diagrams, visuals, and clear onboarding.
- Added dedicated technical/non-technical guides and user journey mapping docs.
- Upgraded docs hub for role/lifecycle navigation and verified evidence gates (`make verify`, `make doctor`, `make scorecard`).

---

# Pre-Release Gate 40 Completion ExecPlan

## Purpose / Big Picture

Close the complete pre-release feature/polish/fix set required to ship as a world-class public product, with evidence-backed completion rather than checklist-only claims.

## Scope

- In scope: `RG-001..RG-040` tracked in `docs/plans/2026-02-19-pre-release-gate-40-completion-plan.md`.
- Out of scope: unscoped architecture rewrites not required to close open RG items.

## Progress

- [x] Initialize exhaustive RG tracker and batch plan
- [x] Batch A: RG-021 and RG-022 (input remap + unified settings center)
- [x] Batch B: RG-032 and RG-034 (startup perf gate + reliability drills)
- [x] Batch C: RG-038 (release safety one-command operations)
- [x] Cross-cutting: RG-007 and RG-011 (profile migration contract + matchmaking flow)
- [x] Batch D: RG-026 and RG-027 (content depth + procedural quality controls)
- [x] Batch E: RG-024 (global localization infrastructure)
- [ ] Full closure verification and release evidence refresh

## Decision Log

- Treat existing completed WR/SWC work as evidence for already-implemented RG items, and focus engineering on true remaining gaps only.
- Execute in minimal-risk, verification-backed slices so `main` remains releasable throughout.

## Validation Plan

- Per-batch targeted verification in changed domains.
- Final gates: `make verify`, `make doctor`, `make scorecard`, `make vercel-check`.

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
- [x] Sync tracker references in `TASKS.md`, `PLANS.md`, `.codex/PLANS.md`, and `.codex/SCRATCHPAD.md`.
- [x] Shipped IA clarity pass, semantic landmarks, density controls, and perf CI regression gate.
- [x] Shipped orientation/intent pass: 5-intent navigation (`Validate` included), breadcrumbs, and next-best-action guidance.
- [x] Closed responsive/navigation/density/accessibility/perf-prefetch batch (`UX100-057`, `UX100-061`, `UX100-062`, `UX100-065`, `UX100-066`, `UX100-071`, `UX100-073`, `UX100-074`) and advanced `UX100-070`.
- [x] Continue Batch 2 closures (`UX100-016`, `UX100-017`, `UX100-018`, `UX100-019`, `UX100-020`, interaction-quality set, `UX100-070` profiling artifact).

## Validation Plan

- Program gates: `make verify`, `make doctor`, `make scorecard`.

## Outcomes & Retrospective

Completed. Latest evidence run is green for `make verify`, `make doctor`, and `make scorecard`, with UX100 tracker closed to `DONE: 100`.

---

# SaaS UX World-Class Sweep ExecPlan

## Purpose / Big Picture

Upgrade the frontend experience from feature-rich demo quality to SaaS-grade product quality with deep-linkable journeys, resilient state UX, and web-product readiness.

## Scope

- In scope: SWC-001..SWC-027 from `docs/plans/2026-02-18-saas-ux-world-class-sweep-plan.md`.
- Out of scope: backend architecture rewrites that are not required for the UX journey contract.

## Progress

- [x] SWC-001 tracked plan initialized
- [x] SWC-002 deep-link URL state for mode/trace/step
- [x] SWC-003 unified app shell states
- [x] SWC-004 global notification center
- [x] SWC-005 async action resilience UX consistency
- [x] SWC-006 SEO baseline
- [x] SWC-007 PWA baseline
- [x] SWC-008 keyboard/a11y parity
- [x] SWC-009 session UX contract + expiry controls
- [x] SWC-010 workspace switcher in header
- [x] SWC-011 role-aware action gating
- [x] SWC-012..SWC-027 remaining SaaS UX program

## Decision Log

- Execute highest-leverage foundational UX changes first because downstream journey work depends on reliable routing, state surfacing, and web metadata.
- Keep first execution batch additive and low-risk to preserve existing release-gate stability.
- Ship the remaining sweep as one cohesive SaaS control layer (setup/support/saved views/export/ownership/flags) to reduce UX fragmentation.

## Validation Plan

- `pnpm -C ui typecheck`
- `pnpm -C ui test`
- `pnpm -C ui test:e2e`
- `make verify-ux`

## Outcomes & Retrospective

Done:
- Added first-run setup wizard with validation and completion tracking.
- Added workspace navigation with contextual Journey/Analysis/Collaboration/Operations surfaces.
- Added async action resilience UX (status, retry/resume) and export queue with retry.
- Added confirm + undo patterns for destructive matrix/session actions.
- Added support diagnostics payload flow, ownership/handoff refinements, and saved views.
- Added command palette intelligence v2 and feature-flag-ready UX toggles.
- Added frontend analytics taxonomy + telemetry hooks and CI UX gate automation on PR/push.
- Synced README and operations/UX documentation for the shipped UX contract.

---

# Pre-Release Hardening ExecPlan

## Purpose / Big Picture

Close final release-operations gaps so deployment behavior on Vercel and public documentation remain deterministic and verifiable.

## Scope

- In scope: RRH-001 through RRH-005 in `docs/plans/2026-02-17-pre-release-hardening-plan.md`.
- Out of scope: new gameplay/UX feature expansion and architecture rewrites.

## Progress

- [x] RRH-001 tracker + plan initialization
- [x] RRH-002 deterministic Vercel toolchain hardening
- [x] RRH-003 deployment verification automation
- [x] RRH-004 deployment docs hardening
- [x] RRH-005 full verification and evidence refresh

## Decision Log

- Prioritize production-safety hardening before any additional feature work.
- Keep changes additive and low-risk: config pinning, scripts, and documentation only.

## Validation Plan

- `make verify`
- `make doctor`
- `make scorecard`
- `make vercel-check`

## Outcomes & Retrospective

Done:
- Added root `package.json` with pinned `packageManager` for deterministic workspace/Vercel installs.
- Updated Vercel install command to use `corepack pnpm install --frozen-lockfile`.
- Added `scripts/vercel_release_check.sh` and `make vercel-check` release gate.
- Hardened deployment docs in `README.md` and `docs/hosting.md`.
- Verified green with `make verify`, `make doctor`, `make scorecard`, and `make vercel-check`.

---

# Pre-Release World-Class Launch ExecPlan

## Purpose / Big Picture

Ship Agent Director at a true public-launch quality bar: durable gameplay, operational safety, compliance readiness, and retention-grade user journeys.

## Scope

- In scope: all items in `WORLD_CLASS_RELEASE_TODO.md` (`WR-001..WR-040`).
- Out of scope: unrelated refactors and speculative architecture rewrites that do not advance a tracked WR item.

## Progress

- [x] Initialize exhaustive tracker and task IDs (`WORLD_CLASS_RELEASE_TODO.md`)
- [x] Sync launcher section in `TASKS.md`
- [x] Batch A (WR-031, WR-036, WR-038, WR-039, WR-018)
- [x] Batch B (WR-029, WR-030)
- [x] Batch C (remaining WR items)
- [x] Final verification and release evidence refresh

## Surprises & Discoveries

- Existing codebase already includes substantial gameplay/liveops primitives; several WR items are hardening/polish work rather than greenfield builds.

## Decision Log

- Use WR IDs with explicit definitions-of-done to avoid losing scope under rapid iteration.
- Implement in small verification-backed batches while preserving `main` branch stability.

## Validation Plan

- Per-batch targeted checks plus full gates before completion claims:
  - `pnpm -C ui typecheck`
  - `pnpm -C ui test`
  - `make verify`
  - `make doctor`
  - `make scorecard`

## Outcomes & Retrospective

Completed.

Execution updates:
- Completed WR-036 (terms/privacy docs and doc navigation wiring).
- Completed WR-038 (release safety canary/rollback runbook).
- Completed WR-039 (support operations runbook and user-facing help section).
- Completed WR-018 with in-app safety controls, multiplayer-safe safety actions, and persisted reports.
- Completed WR-031 with operator live-balancing controls, tuning history, and backend support for balance actions.
- Completed WR-001 through WR-004 with a documented core loop, explicit run outcomes, deterministic difficulty ramp, and tutorial funnel telemetry.
- Completed WR-029 and WR-030 with observability/analytics snapshots, alerting thresholds, funnel dashboards, and retention reporting.
- Completed WR-005 with sandbox toggle UX and no-penalty failure handling in gameplay progression.
- Completed WR-006 with persistent XP progression, level-up rewards, milestone unlock contracts, and backend save/load support.
- Completed WR-007 with tuned skill unlock paths, per-slot loadout constraints, and validated frontend/backend progression rules.
- Completed WR-008 with anti-inflation economy controls, source/sink balancing, and week-over-week upkeep safeguards.
- Completed WR-009 with cadence rewards (daily/session/streak/mastery), claim validation, and frontend reward claim UX.
- Completed WR-010 with deeper multi-phase boss mechanics, visible vulnerability cues, and backend/frontend encounter logic tests.
- Completed WR-011 with deterministic mission seeding, replay-stable campaign blueprint metadata, compatibility normalization for legacy sessions, and UI/backend seeded-generation tests.
- Completed WR-012 through WR-017, WR-019 through WR-028, WR-032 through WR-035, WR-037, and WR-040 with gameplay/session hardening, social and resilience features, release security and integrity docs, content-authoring workflow, scenario sharing/export operations, monetization architecture, and closed-beta retention playbook.
- Re-ran `make verify`, `make doctor`, and `make scorecard` to close the release evidence loop.

# World-Class UX Program ExecPlan

## Purpose / Big Picture

Ship a full frontend leap that feels materially more premium, faster, and more collaborative while preserving existing production behaviors.

## Scope

- In scope: implement all eight requested "super hard" frontend tracks as shippable v1 slices with exhaustive task tracking.
- Out of scope: backend architecture rewrites, unrelated refactors, and speculative post-v1 variants.

## Progress

- [x] Initialize exhaustive execution tracker files
- [x] Track 1: Cinematic Timeline Studio (bookmarks + clip controls + exports)
- [x] Track 2: Causality Graph Lab (visual causal map in Matrix mode)
- [x] Track 3: Scenario Workbench v2 (duplicate/reorder scenario authoring UX)
- [x] Track 4: Collaboration Layer v2 (session presence + shareable live link)
- [x] Track 5: AI Director Layer (recommendation cards from investigation/matrix)
- [x] Track 6: Adaptive Onboarding (persona selection + persona-aware tour copy)
- [x] Track 7: Visual System Upgrade (theme controls + tokenized style variants)
- [x] Track 8: Performance Lift (deferred filtering + reduced interaction cost)
- [x] Verification + release sync + push to main

## Surprises & Discoveries

- Existing app already contains strong primitives (story mode, matrix, investigation, comments), enabling high-value upgrades without backend surgery.
- Main branch is checked out in an external worktree; this workspace is detached-head and requires push via `HEAD:main`.

## Decision Log

- Implement each track as additive slices on current architecture to preserve release stability.
- Prioritize stateful UX controls and discoverability upgrades over brand-new backend endpoints.
- Use targeted test additions around new behavior surfaces instead of broad suite refactors.

## Risks

- `ui` visual snapshots may shift due theme and timeline controls.
- New onboarding copy and controls may require snapshot and E2E updates.

## Validation Plan

- UI unit tests for updated components (`MiniTimeline`, `Matrix`, `IntroOverlay`, `DirectorBrief` as touched).
- `pnpm -C ui typecheck`
- `pnpm -C ui test`
- `make verify` before final completion claim.

## Outcomes & Retrospective

Done:
- Implemented timeline studio bookmarks, clip range controls, and clip export in `MiniTimeline`.
- Added scenario duplication/reordering and weighted causal bars in Matrix mode.
- Added live session presence + share-link controls in header.
- Added recommendation cards in Director Brief with actionable wiring.
- Added onboarding persona selection and persona-aware tour copy.
- Added persisted theme variants and CSS token overrides.
- Added deferred filtering path using `useDeferredValue` for large-trace query smoothness.
- Updated E2E selectors and refreshed visual snapshot baselines for upgraded UI.
- Ran `pnpm -C ui typecheck`, targeted tests, and `make verify` successfully.

Not done:
- None.

---

# Gameplay Overhaul Final Completion ExecPlan

## Purpose / Big Picture

Deliver full production-grade completion for all 12 gameplay systems, including backend authority, realtime multiplayer synchronization, persistent progression, and world-class UX surfaces.

## Progress

- [x] Initialize exhaustive tracking artifacts (`TASKS.md`, `.codex`, gameplay plan doc)
- [x] Track 1: Co-op Incident Raids (backend authoritative multiplayer + realtime sync)
- [x] Track 2: Roguelike Scenario Campaign (procedural runs + permadeath progression)
- [x] Track 3: Branching Narrative Director Mode (persistent branch outcomes)
- [x] Track 4: Skill Tree + Loadout (persistent profiles + modifiers)
- [x] Track 5: Asymmetric PvP (hidden-state role conflict loop)
- [x] Track 6: Time Manipulation Mechanics (deterministic fork/rewind/merge)
- [x] Track 7: Boss Encounter Runs (adaptive multi-phase encounters)
- [x] Track 8: Adaptive AI Dungeon Master (dynamic hazard/goal rewriting)
- [x] Track 9: Mission Economy + Crafting (ledger + balancing loop)
- [x] Track 10: Guild/Team Operations (persistent guilds + event calendar)
- [x] Track 11: Cinematic Event Engine (triggered choreography + safe fallbacks)
- [x] Track 12: Seasonal LiveOps Framework (weekly rotations + rewards + telemetry)
- [x] Verification + release sync + push

## Decision Log

- Keep prior Gameplay Mode v1 as compatibility layer while introducing backend-authoritative state.
- Use SSE for realtime synchronization to align with existing server transport model.
- Preserve existing debugger journeys (cinema/flow/compare/matrix) as non-regression requirement.

## Validation Plan

- Add backend gameplay unit tests and API coverage for multiplayer and progression endpoints.
- Add frontend gameplay integration tests for synchronized session flows.
- Run `python3 -m unittest discover -s server/tests`, `pnpm -C ui typecheck`, `pnpm -C ui test`, and `make verify`.

Lessons:
- Visual drift is expected with intentional UX elevation; snapshot refresh is part of planned completion, not incidental churn.
- Backend authority is required for honest “100% complete” claims on multiplayer and persistent progression features.

## Outcomes & Retrospective

Done:
- Added backend-authoritative gameplay platform in `server/gameplay/store.py` with session lifecycle, role abilities, conflict-safe actions, persistent profiles, guilds, and liveops state.
- Added gameplay API + stream endpoints in `server/main.py` and coverage in `server/tests/test_gameplay_api.py`.
- Added frontend gameplay API surface + stream subscriptions in `ui/src/store/api.ts` with extended tests in `ui/src/store/api.test.ts`.
- Upgraded gameplay UX in `ui/src/components/GameplayMode/index.tsx` to support multiplayer sessions, backend action dispatch, guild workflows, and richer progression controls.
- Integrated backend gameplay synchronization in `ui/src/App.tsx` via session subscriptions and authoritative state mapping.
- Added gameplay e2e coverage in `ui/tests/e2e/gameplay.spec.ts`.
- Updated launch docs and final checklist status in `README.md`, `TASKS.md`, `docs/plans/2026-02-15-gameplay-overhaul-plan.md`, `.codex/SCRATCHPAD.md`.
- Verified with `python3 -m unittest discover -s server/tests`, `pnpm -C ui typecheck`, `pnpm -C ui test`, and `make verify` (green).

Not done:
- None.

---

# Phase 2 Hard Features ExecPlan

## Purpose / Big Picture

Complete the full advanced feature depth across timeline studio, causal analysis, replay IDE workflows, collaboration, AI guidance, onboarding adaptivity, motion system quality, and large-trace architecture.

## Progress

- [x] Initialize Phase 2 exhaustive plan and checklist artifacts
- [x] Track 1: Advanced Timeline Studio
- [x] Track 2: Advanced Causality Graph Lab
- [x] Track 3: Scenario Workbench Replay IDE
- [x] Track 4: Realtime Collaborative Debugging
- [x] Track 5: Advanced AI Director Layer
- [x] Track 6: Advanced Adaptive Onboarding
- [x] Track 7: Visual System + Motion Engine polish
- [x] Track 8: Large-trace performance architecture
- [x] Verification + release sync + push to main

## Decision Log

- Implement each advanced track as additive slices with deterministic local behavior.
- Keep backend-impact minimal unless absolutely necessary for UI correctness.
- Refresh visual snapshots as first-class deliverables for intentional UI changes.

## Validation Plan

- Add focused unit tests for advanced timeline/matrix/onboarding logic.
- Update E2E where selectors/flows expand.
- Run `pnpm -C ui typecheck`, `pnpm -C ui test`, and `make verify`.

## Outcomes & Retrospective

Done:
- Added lane strategy regrouping, lane visibility, and lane reordering with persisted timeline studio config.
- Added scene segment labeling and segment-aware clip export metadata.
- Added causal simulations, projected impacts, heatmaps, and causal path explorer in Matrix mode.
- Added schema-aware scenario scalar editing, side-by-side diff previews, and batch profile execution.
- Added profile integrity checks for duplicate names/payloads and scalar type conflicts.
- Added multi-session cursor sync, remote playheads, shared annotation merge semantics, and activity feed persistence.
- Added AI narrative panel, deterministic ask-director responses, guided action plans, and markdown export.
- Added mission-driven progressive disclosure in Director Brief with mission reset controls.
- Added motion tokens/utilities and reduced-motion-safe transitions.
- Added progressive hydration/filter telemetry and large table incremental rendering guardrails.
- Added new utility/component tests and regenerated visual + UX snapshot baselines.
- Verified with `pnpm -C ui typecheck`, `pnpm -C ui test`, and `make verify` (green).

Not done:
- None.

---

# Overnight UX Transformation ExecPlan

## Purpose / Big Picture

Deliver a focused overnight frontend transformation that materially improves usability, user journeys, and perceived product quality without destabilizing existing production flows.

## Progress

- [x] Initialize exhaustive sprint tracking artifacts
- [x] Track 1: Mission Pulse Header
- [x] Track 2: Adaptive Intro Launch Paths
- [x] Track 3: Journey Priority Queue
- [x] Track 4: Command Palette Intelligence
- [x] Track 5: Director Brief Workspace Tabs
- [x] Track 6: Action Plan Completion UX
- [x] Track 7: Session Handoff Digest
- [x] Track 8: Motion Direction Controls
- [x] Track 9: Mobile Quick Rail
- [x] Track 10: Tests, verification, and docs sync

## Decision Log

- Prioritize additive UX layers over architecture rewrites to keep delivery risk low.
- Reuse existing gameplay/matrix/onboarding data to drive new journey and guidance experiences.
- Keep all new controls keyboard-accessible and persisted when behavior is preference-driven.

## Validation Plan

- Update component tests for Header, IntroOverlay, JourneyPanel, DirectorBrief, and CommandPalette.
- Run `pnpm -C ui typecheck`.
- Run `pnpm -C ui test`.

## Outcomes & Retrospective

Done:
- Added mission health pulse, mission completion status, hotkey hints, motion profile selector, and handoff digest controls in the header.
- Added adaptive launch-path onboarding cards (rapid triage, deep diagnosis, team sync) with persisted preference and app-level execution wiring.
- Added a severity-ranked Journey priority queue with action wiring and resolved-state indicators.
- Added command palette recents, pinned commands, and macro surfaces.
- Added Director Brief tabbed workspaces plus recommendation completion tracking.
- Added global handoff digest generation and command palette macro/action entries.
- Added motion profile persistence and global motion dataset binding.
- Added mobile sticky quick-action rail for story/tour/command/handoff.
- Updated component tests and added JourneyPanel coverage.
- Re-generated visual baseline snapshots for changed intentional UX layout.
- Verified with `pnpm -C ui typecheck`, `pnpm -C ui test`, and `make verify`.

Not done:
- None.

---

# UX100 World-Class Frontend Program ExecPlan

## Purpose / Big Picture

Close all in-repo actionable tasks in the UX100 program and maintain explicit status for external-review-dependent items.

## Scope

- In scope: `UX100-001..UX100-100` in `docs/plans/2026-02-19-ux100-execution-plan.md`.
- Out of scope: claims requiring external human panel validation without external evidence.

## Progress

- [x] Initialize exhaustive UX100 tracker with DoD + verification + evidence fields.
- [x] Sync tracker entry points in `TASKS.md`, `PLANS.md`, `.codex/PLANS.md`, and `.codex/SCRATCHPAD.md`.
- [x] Ship first clarity/hierarchy slice (primary vs advanced toolbar, workspace contextual headers).
- [x] Ship second batch slice (semantic landmarks, accessible-name audit checks, density reduction, typography/spacing standards, CI performance regression workflow).
- [ ] Execute remaining Batch 1 open items from tracker.

## Decision Log

- Keep blocked items explicit when they require external reviewers/test participants.
- Use existing release evidence artifacts to avoid re-implementing already-closed quality gates.
- Treat UX100 closure as evidence-based, not assertion-based.

## Validation Plan

- Per-batch targeted checks.
- Program-level checks: `make verify`, `make doctor`, `make scorecard`.

## Outcomes & Retrospective

In progress.
- Evidence refresh after second slice: `make verify`, `make doctor`, and `make scorecard` all pass.
