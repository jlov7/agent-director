# World-Class Release Readiness Master TODO

Status legend: `todo` | `in_progress` | `blocked` | `done`

## Objective

Ship Agent Director as a public, release-ready, world-class game product with durable gameplay retention, operational safety, and launch-grade trust/compliance.

## Execution Rules

- Work strictly in ID order unless dependencies require reordering.
- A task can be marked `done` only when its definition of done is satisfied and verified.
- Every implementation batch must update this file, `.codex/PLANS.md`, and `.codex/SCRATCHPAD.md`.

## Master Backlog

| ID | Status | Track | Requirement | Definition of Done |
|---|---|---|---|---|
| WR-001 | done | Core Loop | Lock v1 core loop and target session length | Single documented loop used in gameplay UI + docs + telemetry funnel names |
| WR-002 | done | Core Loop | Explicit mission outcomes (win/loss/partial) | Outcome model wired through gameplay state, UI, and persistence |
| WR-003 | done | Difficulty | Difficulty ramp table | Difficulty bands with deterministic tuning config and tests |
| WR-004 | done | Onboarding | Full first-session tutorial | Guided, skippable, replayable tutorial with completion telemetry |
| WR-005 | done | Onboarding | Sandbox mode | Separate low-risk mode with no progression penalties |
| WR-006 | done | Progression | Persistent XP and milestone system | XP accrual + leveling + rewards + save/load contracts |
| WR-007 | done | Progression | Skill tree/loadout balancing | Costs, unlock paths, and slot constraints tuned and validated |
| WR-008 | done | Economy | Economy balance pass | Stable source/sink loop with anti-inflation safeguards |
| WR-009 | done | Rewards | Reward cadence | Daily/session/streak/mastery rewards with UX surfaces |
| WR-010 | done | Encounters | Boss encounter depth | Multi-phase boss logic + visible phase mechanics + tests |
| WR-011 | done | Content | Procedural mission generation | Seeded generation with reproducibility and replay consistency |
| WR-012 | done | Content | Daily/weekly challenges | Rotating challenge system with schedule + claim flow |
| WR-013 | done | Content | Seasonal framework | Season cadence, rewards, reset behavior, and migration rules |
| WR-014 | done | Multiplayer | Co-op lifecycle hardening | Create/join/reconnect/leave flows stable across failures |
| WR-015 | done | Multiplayer | Team comms UX | Quick ping/intents for coordinated runs |
| WR-016 | done | Social | Guild progression depth | Shared goals, team scoreboards, and seasonal guild rewards |
| WR-017 | done | Social | Friends + invites | Friend graph, invite flow, recent teammate UX |
| WR-018 | done | Safety | Reporting/mute/block tooling | In-app controls with persistence, reason capture, and moderation surface |
| WR-019 | done | Security | Authoritative anti-cheat hardening | Server trust boundary documented + validation checks enforced |
| WR-020 | done | Reliability | Replay/state integrity controls | Replay determinism checks + corruption recovery path |
| WR-021 | done | Feel | Game-feel pass | UX motion/audio/feedback pass with meaningful interaction clarity |
| WR-022 | done | Input | Controller support | Full gamepad input mapping and remap options |
| WR-023 | done | Accessibility | Full accessibility pass | Keyboard, focus, contrast, reduced-motion, labels, and screen-reader checks |
| WR-024 | done | Localization | Localization pipeline | Extracted strings + locale switching + baseline locale pack |
| WR-025 | done | Responsive | Mobile/tablet polish pass | Touch-first interaction tuning and no major viewport regressions |
| WR-026 | done | Performance | Low-end performance hardening | Budget targets and no UX degradation at large trace/mission sizes |
| WR-027 | done | Resilience | Async/retry/offline UX | Retry states, recovery states, and conflict-safe messaging |
| WR-028 | done | QA | CI determinism and flake elimination | Stable CI pipeline with no recurring nondeterministic failures |
| WR-029 | done | Observability | Runtime observability stack | Error tracking, latency dashboards, and actionable alerts |
| WR-030 | done | Analytics | Product telemetry + funnels | D1/D7/D30 funnels and progression drop-off dashboards |
| WR-031 | done | LiveOps | Live balancing tooling | Operator-facing tuning controls + audit history |
| WR-032 | done | Content Ops | Mission/event authoring tools | Internal content workflow for creating and validating missions |
| WR-033 | done | UGC | Scenario sharing/discovery | Share/import/discover with safe defaults and moderation guardrails |
| WR-034 | done | Sharing | Replay export polish | High-fidelity share assets and robust replay artifact exports |
| WR-035 | done | Commercial | Monetization architecture | Cosmetic-first monetization with no pay-to-win mechanics |
| WR-036 | done | Compliance | Terms/privacy/consent/deletion readiness | Public policy docs + user-visible links + operational handling notes |
| WR-037 | done | Security | Launch security hardening pass | Abuse/rate limit/authz/secret checks with test evidence |
| WR-038 | done | Release Ops | Canary + rollback runbook | Documented release safety process and rollback commands |
| WR-039 | done | Support Ops | In-app support and known-issues process | Support runbook and user-visible support entry points |
| WR-040 | done | Launch | Closed beta -> retention iteration | Beta gate criteria and post-beta tuning workflow |

## Execution Batches

### Batch A

- WR-036 Compliance docs + links
- WR-038 Release safety runbook
- WR-039 Support operations runbook
- WR-031 Live balancing operator runbook
- WR-018 Safety and moderation interaction layer

### Batch B

- Completed: WR-029 and WR-030

### Batch C

- Completed: WR-011 through WR-017
- Completed: WR-019 through WR-028
- Completed: WR-032 through WR-035
- Completed: WR-037 and WR-040

## Progress Log

- 2026-02-17: Initialized exhaustive world-class release TODO and moved WR-031/036/038/039 to `in_progress`.
- 2026-02-17: Completed WR-036, WR-038, and WR-039 with new legal/ops docs and public navigation links.
- 2026-02-17: Moved WR-018 to `in_progress` after shipping in-app report/mute/block controls and safety state tracking.
- 2026-02-17: Completed WR-018 and WR-031 with multiplayer-safe safety actions, live balancing controls, and operator tuning history.
- 2026-02-17: Completed WR-001 through WR-004 by shipping a documented v1 core loop, explicit outcome state, deterministic difficulty ramp bands, and tutorial telemetry funnels.
- 2026-02-17: Completed WR-029 and WR-030 with backend observability/analytics endpoints, gameplay dashboards, funnel drop-off + D1/D7/D30 retention reporting, and alert thresholds.
- 2026-02-17: Completed WR-005 by shipping sandbox mode toggle and no-penalty campaign failure behavior for safe practice runs.
- 2026-02-17: Completed WR-006 with persistent profile XP/level progression, milestone unlocks, and frontend/backend save-load mapping.
- 2026-02-17: Completed WR-007 with tuned multi-tier skill costs, level/milestone unlock paths, per-slot loadout limits, and frontend/backend validation tests.
- 2026-02-17: Completed WR-008 with adaptive reward scaling, anti-inflation sinks, weekly upkeep drains, and economy validation across UI/backend contracts.
- 2026-02-17: Completed WR-009 with daily/session/streak/mastery claim flows, backend validation rules, and in-app reward cadence surfaces.
- 2026-02-17: Completed WR-010 with phase-aware boss damage tuning, visible vulnerability mechanics, and expanded encounter regression coverage.
- 2026-02-17: Completed WR-011 with deterministic seeded mission metadata, replay-stable campaign blueprints, backward-compatible mission normalization, and regression tests across UI/backend contracts.
- 2026-02-17: Completed WR-012 through WR-017 with weekly challenge progression, seasonal liveops cadence controls, reconnect-safe multiplayer lifecycle, team ping intents, guild progression surfaces, and friend/invite teammate workflows.
- 2026-02-17: Completed WR-019 through WR-028 with anti-cheat trust-boundary documentation, replay integrity and recovery runbook, UX quality pass evidence, controller + localization + offline/retry controls, responsive/performance hardening, and CI determinism documentation.
- 2026-02-17: Completed WR-032 through WR-035 by shipping mission/event content authoring validation tooling, safe scenario sharing/replay export workflow docs, and cosmetic-first monetization architecture.
- 2026-02-17: Completed WR-037 and WR-040 with launch security hardening checklist and closed beta retention iteration playbook.
