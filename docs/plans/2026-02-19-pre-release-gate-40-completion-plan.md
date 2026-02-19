# Pre-Release Gate 40 Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the full 40-item pre-release backlog with evidence-backed implementation, verification, and documentation updates.

**Architecture:** Use additive, low-risk slices on top of existing Agent Director gameplay + SaaS UX foundations. Execute in strict batches with explicit acceptance criteria and release-gate evidence after each batch.

**Tech Stack:** React + TypeScript (Vite), Python server, Playwright, Vitest, GitHub Actions, Vercel.

---

## Tracking Rules

- Source-of-truth IDs: `RG-001..RG-040` in this plan and `TASKS.md`.
- Each item closes only with code/docs evidence plus passing relevant checks.
- After each batch: update `.codex/SCRATCHPAD.md`, `.codex/PLANS.md`, `TASKS.md`.
- Verification cadence:
  - Per-batch targeted checks first.
  - Full closure checks: `make verify`, `make doctor`, `make scorecard`, `make vercel-check`.

## Master Backlog (Exhaustive)

Status legend: `verified` (implemented with current evidence), `gap` (needs implementation), `pending_audit` (needs deeper proof before closure).

| ID | Status | Requirement | Definition of Done |
|---|---|---|---|
| RG-001 | verified | First-session funnel with guaranteed first win | Intro/tutorial flow is deterministic, tracked, and produces a successful first-run mission path. |
| RG-002 | verified | Explicit objectives + fail reasons | Missions expose primary/secondary objectives and user-visible failure semantics. |
| RG-003 | verified | Adaptive difficulty director | Difficulty scaling logic exists with bounded tuning behavior. |
| RG-004 | verified | Deterministic run-state integrity | Pause/rewind/fork/merge paths preserve deterministic state transitions. |
| RG-005 | verified | Transparent post-run scoring model | Scoring dimensions are explicit and surfaced in UI/state. |
| RG-006 | verified | Reward loop clarity | XP/credits/unlocks are connected to outcome UX and persistence. |
| RG-007 | verified | Persistent cloud profile save/load + migrations | Durable profile storage contract with migration-safe reads/writes and failure recovery UX. |
| RG-008 | verified | Skill-tree respec + loadout presets | Users can tune build choices and loadouts under server validation rules. |
| RG-009 | verified | Economy balancing controls | Source/sink constraints and anti-inflation controls are operationally adjustable. |
| RG-010 | verified | Anti-exploit validation | Backend validates reward/progression writes against abuse vectors. |
| RG-011 | verified | Multiplayer matchmaking/lobby assignment | Matchmaking queue or equivalent auto-assignment flow exists beyond manual invite only. |
| RG-012 | verified | Reconnect + recovery | Session continuity after disconnects is supported and tested. |
| RG-013 | verified | Conflict-safe co-op actions | Version-safe action application with mismatch handling exists. |
| RG-014 | verified | Ownership/handoff audit trail | Collaboration ownership and handoff trail is visible and exportable. |
| RG-015 | verified | Trust/safety controls | Report/mute/block workflows exist with moderation-facing artifacts. |
| RG-016 | verified | UX consistency sweep across core modes | Cinema/Flow/Compare/Matrix/Gameplays are coherent and verified by UX tests. |
| RG-017 | verified | Full async-state UX coverage | Loading/empty/error/recovery states are present on critical surfaces. |
| RG-018 | verified | Confirm + undo for destructive actions | High-risk actions enforce confirm/undo safeguards. |
| RG-019 | verified | WCAG 2.2 AA baseline closure | Keyboard/focus/labels/contrast/reduced-motion checks pass for primary journeys. |
| RG-020 | verified | Mobile/tablet critical path parity | Core flows are functional and tested on narrow viewports. |
| RG-021 | verified | Keybind remapping + controller baseline | Keyboard shortcuts are remappable in-product; controller baseline remains usable. |
| RG-022 | verified | Unified settings center | Input/accessibility/motion/notification/privacy controls are consolidated and persistent. |
| RG-023 | verified | In-app support center + diagnostics export | Support panel and diagnostics payload export are available. |
| RG-024 | gap | Localization infrastructure (global) | App-level strings are localizable with locale switching and structured catalogs. |
| RG-025 | verified | Content authoring pipeline | Authoring and validation workflow exists for missions/events/scenarios. |
| RG-026 | gap | Launch content pack depth | Handcrafted mission library reaches release target size and variety. |
| RG-027 | gap | Procedural quality controls | Repetition/novelty guardrails and quality scoring enforce mission variety. |
| RG-028 | verified | Branching campaign persistence | Campaign branch effects persist and influence subsequent runs. |
| RG-029 | verified | Narrative recap engine | Run summary and next-step narrative artifacts are generated. |
| RG-030 | verified | Seasonal liveops framework | Rotating challenge/reward cadence with tuning controls is implemented. |
| RG-031 | verified | 60fps budget enforcement (large traces) | Windowing/hydration/perf controls keep large traces usable. |
| RG-032 | verified | Cold-start performance budget gate | Startup budget is measured/enforced by automated release check. |
| RG-033 | verified | Full observability stack | Runtime error/perf/product telemetry is captured with ops artifacts. |
| RG-034 | verified | Reliability drills and chaos checks | Repeatable failure-injection drills exist and are runbooked/automated. |
| RG-035 | verified | Security hardening pass | Rate limits/validation/headers/secret hygiene are enforced with tests. |
| RG-036 | verified | Backup/restore + DR runbook | Operational recovery docs and maintenance tooling exist. |
| RG-037 | verified | Blocking release CI gates | Verify/UX/security/perf gates are wired and required. |
| RG-038 | verified | Canary + one-click rollback + kill-switches | End-to-end release safety actions are executable with minimal operator friction. |
| RG-039 | verified | Public docs pack | Public README/help/ops documents are launch-grade and cross-linked. |
| RG-040 | verified | Launch analytics dashboard | Funnel/retention/health reporting exists for release decisioning. |

## Execution Batches

### Batch A (Complete): Input + Settings Closure

- RG-021: keyboard remapping end-to-end (storage, UI, handler integration, shortcut docs modal sync).
- RG-022: unified settings center v1 in Operations with persistent input/motion/accessibility controls.

### Batch B (Complete): Performance + Reliability Gates

- RG-032: startup performance budget capture + enforced gate.
- RG-034: scripted reliability drills and evidence output.

### Batch C (Complete): Release Safety Operations

- RG-038: promote release-safety runbook to one-command operational flow with kill-switch toggles.

### Batch D: Gameplay Content Depth

- RG-026: launch mission pack target completion.
- RG-027: procedural novelty/repetition scoring guardrails.

### Batch E: Global Localization

- RG-024: globalized UI strings + locale registry + fallback behavior + tests.

## Validation Matrix

- Batch A: `pnpm -C ui typecheck`, `pnpm -C ui test`, targeted E2E keyboard/onboarding/gameplay specs.
- Batch B: perf and reliability scripts + `make verify`.
- Batch C: release-ops script checks + `make doctor`.
- Batch D/E: gameplay + UI + docs checks.
- Final closure: `make verify`, `make doctor`, `make scorecard`, `make vercel-check`.
