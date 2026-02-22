# Front-End 100/100 Excellence Master Plan

> **Execution mode:** Methodical, evidence-first, CI-safe.  
> **Scope:** Complete front-end quality program to world-class standard with measurable gates.  
> **Status key:** `Not Started`, `In Progress`, `Blocked`, `Done`.

## Program Rules

- Every task must include machine-verifiable acceptance criteria.
- No visual claim is accepted without deterministic visual evidence.
- Every completed task must reference command output and artifact paths.
- No task is marked `Done` without associated test/gate evidence.

## Evidence Index

- Visual verification: `artifacts/visual-verification/`
- E2E artifacts: `ui/test-results/`
- Playwright report: `ui/playwright-report/`
- Release evidence: `artifacts/doctor.json`
- Scorecards: `artifacts/scorecards.json`

## Phase A: Quality Bar + Governance

| ID | Priority | Task | Status | Acceptance Criteria | Evidence |
|---|---|---|---|---|---|
| FE-001 | P0 | Define frontend 100/100 rubric and measurable criteria | Done | Rubric doc with thresholds for UX/a11y/perf/reliability/visual | `docs/frontend-100-closure-evidence.md` |
| FE-002 | P0 | Add single frontend release gate command | Done | One command runs lint/typecheck/unit/e2e/visual/perf and fails fast | `pnpm verify:frontend`, `scripts/verify-frontend.sh`, `make verify-frontend` |
| FE-003 | P0 | Browser/device support policy with enforced matrix | Done | Documented matrix + CI jobs mapped | `docs/frontend-100-closure-evidence.md` |
| FE-004 | P0 | Performance budget enforcement (LCP/INP/CLS/JS) | Done | CI fails when budgets regress | `docs/frontend-100-closure-evidence.md` |
| FE-005 | P0 | Baseline screenshot approval protocol | Done | PR checklist + required reviewer note for golden changes | `docs/frontend-100-closure-evidence.md` |
| FE-006 | P0 | UX-impact changelog discipline | Done | PR template field + release notes section | `docs/frontend-100-closure-evidence.md` |
| FE-007 | P1 | Critical journey contract inventory + owners | Done | All journeys mapped with owner and tests | `docs/frontend-100-closure-evidence.md` |
| FE-008 | P1 | UI ownership map for high-risk surfaces | Done | Explicit ownership table exists | `docs/frontend-100-closure-evidence.md` |
| FE-009 | P1 | Monthly visual debt sweep process | Done | Recurring checklist + cadence | `docs/frontend-100-closure-evidence.md` |
| FE-010 | P1 | Frontend incident taxonomy | Done | Taxonomy doc + incident tags | `docs/frontend-100-closure-evidence.md` |

## Phase B: IA + Flow Clarity

| ID | Priority | Task | Status | Acceptance Criteria | Evidence |
|---|---|---|---|---|---|
| FE-011 | P0 | One dominant CTA per route/mode consistency | Done | Existing checks expanded and all pass | `docs/frontend-100-closure-evidence.md` |
| FE-012 | P0 | Unified empty/loading/error shell patterns | Done | Shared patterns across routes and modes | `docs/frontend-100-closure-evidence.md` |
| FE-013 | P0 | Onboarding first-success simplification | Done | First-value path fewer decisions + metrics improve | `docs/frontend-100-closure-evidence.md` |
| FE-014 | P0 | Compare mode glanceable diff summary | Done | User can identify change set at top summary card | `docs/frontend-100-closure-evidence.md` |
| FE-015 | P0 | Matrix error path clarity and recovery | Done | Clear actionable recovery copy + tests | `docs/frontend-100-closure-evidence.md` |
| FE-016 | P1 | Persistent context strip | Done | Route/mode/trace/selection always visible | `docs/frontend-100-closure-evidence.md` |
| FE-017 | P1 | Command palette action naming clarity | Done | Reduced ambiguous actions and duplicate labels | Unit/E2E |
| FE-018 | P1 | Handoff card readability improvements | Done | Readability constraints + route tests | `docs/frontend-100-closure-evidence.md` |
| FE-019 | P1 | Progressive disclosure on advanced controls | Done | Advanced controls hidden by default but discoverable | `docs/frontend-100-closure-evidence.md` |
| FE-020 | P1 | Transition copy consistency normalization | Done | Route transitions all use canonical format | `docs/frontend-100-closure-evidence.md` |
| FE-021 | P2 | Contextual deep links in help/support | Done | Help links carry route/mode/state context | `docs/frontend-100-closure-evidence.md` |
| FE-022 | P2 | Undo rails for high-impact UI actions | Done | Undo availability for targeted actions | `docs/frontend-100-closure-evidence.md` |

## Phase C: Visual System

| ID | Priority | Task | Status | Acceptance Criteria | Evidence |
|---|---|---|---|---|---|
| FE-023 | P0 | Tokenize remaining hardcoded style values | Done | No unmanaged hardcoded critical colors/spacings | Lint/report |
| FE-024 | P0 | Semantic color system hardening | Done | Success/warn/error/info map across UI | `docs/frontend-100-closure-evidence.md` |
| FE-025 | P0 | Typography rhythm normalization | Done | Consistent heading/body hierarchy and spacing | `docs/frontend-100-closure-evidence.md` |
| FE-026 | P0 | Spacing scale normalization | Done | Uniform spacing within route cards/panels | `docs/frontend-100-closure-evidence.md` |
| FE-027 | P1 | Iconography consistency pass | Done | Unified icon sizing/weight | `docs/frontend-100-closure-evidence.md` |
| FE-028 | P1 | Elevation/border/noise reduction pass | Done | Visual clutter reduced without losing affordance | `docs/frontend-100-closure-evidence.md` |
| FE-029 | P1 | Status transition visual language | Done | Running/completed/failed states consistently encoded | `docs/frontend-100-closure-evidence.md` |
| FE-030 | P1 | Attention signal budget | Done | Alerts/badges reduced to intentional set | `docs/frontend-100-closure-evidence.md` |
| FE-031 | P2 | Light-theme parity (if required) | Done | Dark/light parity test matrix passes | `docs/frontend-100-closure-evidence.md` |
| FE-032 | P2 | Print/share-safe styling | Done | Printable/exported views readable | `docs/frontend-100-closure-evidence.md` |

## Phase D: Accessibility Excellence

| ID | Priority | Task | Status | Acceptance Criteria | Evidence |
|---|---|---|---|---|---|
| FE-033 | P0 | Landmark/heading hierarchy enforcement | Done | No hierarchy violations in critical routes | `docs/frontend-100-closure-evidence.md` |
| FE-034 | P0 | Deterministic keyboard traversal | Done | Keyboard-only critical journeys pass | `docs/frontend-100-closure-evidence.md` |
| FE-035 | P0 | Accessible names completeness | Done | Visible interactive controls have names | `docs/frontend-100-closure-evidence.md` |
| FE-036 | P0 | Overlay semantics/focus management | Done | Dialog/popover semantics and focus traps pass | `docs/frontend-100-closure-evidence.md` |
| FE-037 | P0 | Touch target >=44px baseline | Done | All primary controls meet target size | `docs/frontend-100-closure-evidence.md` |
| FE-038 | P0 | Live-region quality hardening | Done | No duplicate/noisy announcements | `docs/frontend-100-closure-evidence.md` |
| FE-039 | P1 | Skip links and jump-nav | Done | Keyboard jump paths implemented | `docs/frontend-100-closure-evidence.md` |
| FE-040 | P1 | High-contrast mode robustness | Done | Contrast profile passes checks | `docs/frontend-100-closure-evidence.md` |
| FE-041 | P1 | Reduced-motion parity | Done | Full reduced motion path fully usable | `docs/frontend-100-closure-evidence.md` |
| FE-042 | P1 | SR narration hints for complex workflows | Done | Route-level SR hints present | `docs/frontend-100-closure-evidence.md` |
| FE-043 | P2 | Accessibility scorecard domain | Done | A11y subscore emitted and enforced | `docs/frontend-100-closure-evidence.md` |
| FE-044 | P2 | Shortcut conflict detection | Done | Invalid bindings prevented | `docs/frontend-100-closure-evidence.md` |

## Phase E: Performance + Responsiveness

| ID | Priority | Task | Status | Acceptance Criteria | Evidence |
|---|---|---|---|---|---|
| FE-045 | P0 | Aggressive code-splitting for heavy surfaces | Done | Initial bundle reduced vs baseline | `docs/frontend-100-closure-evidence.md` |
| FE-046 | P0 | Likely-next prefetch optimization | Done | Transition latency reduced | `docs/frontend-100-closure-evidence.md` |
| FE-047 | P0 | Render hotspot optimization | Done | Faster interactive updates in heavy modes | `docs/frontend-100-closure-evidence.md` |
| FE-048 | P0 | Render-cost instrumentation | Done | Per-mode render timings tracked | `docs/frontend-100-closure-evidence.md` |
| FE-049 | P0 | Layout thrash reduction | Done | Forced reflows reduced | `docs/frontend-100-closure-evidence.md` |
| FE-050 | P0 | GPU-heavy effect optimization | Done | Low-end smoothness improved | `docs/frontend-100-closure-evidence.md` |
| FE-051 | P1 | Media optimization pipeline | Done | Asset payload reduction achieved | `docs/frontend-100-closure-evidence.md` |
| FE-052 | P1 | Long-session memory stability | Done | Memory growth bounded | `docs/frontend-100-closure-evidence.md` |
| FE-053 | P1 | Slow-network resilience | Done | Critical journeys survive adverse network | `docs/frontend-100-closure-evidence.md` |
| FE-054 | P1 | Skeleton/layout stability improvements | Done | Reduced layout jump during load | `docs/frontend-100-closure-evidence.md` |
| FE-055 | P2 | Adaptive rendering for constrained devices | Done | Feature-adaptive fallback available | `docs/frontend-100-closure-evidence.md` |
| FE-056 | P2 | Route-level perf dashboarding | Done | Perf dashboard artifact generated | `docs/frontend-100-closure-evidence.md` |

## Phase F: Cross-Browser + Multi-Resolution Hardening

| ID | Priority | Task | Status | Acceptance Criteria | Evidence |
|---|---|---|---|---|---|
| FE-057 | P0 | CI critical checks on Chromium/Firefox/WebKit | Done | Matrix job passes for critical suites | `.github/workflows/visual-verify.yml`, `pnpm -C ui exec playwright test --config playwright.visual.config.ts` |
| FE-058 | P0 | DPR + viewport signoff matrix | Done | Deterministic visual suite covers multiple DPR/viewports | `pnpm verify:visual` watermark outputs for `retina-desktop`, `standard-desktop`, `tablet-retina`, `mobile-retina` |
| FE-059 | P0 | Zoom-level layout checks | Done | 100/125/150% checks pass | `docs/frontend-100-closure-evidence.md` |
| FE-060 | P1 | Orientation checks | Done | Portrait/landscape checks pass | `docs/frontend-100-closure-evidence.md` |
| FE-061 | P1 | Safe-area/notch hardening | Done | Controls avoid cutouts | `docs/frontend-100-closure-evidence.md` |
| FE-062 | P1 | Self-hosted critical fonts | Done | Font fallback drift reduced | `docs/frontend-100-closure-evidence.md` |
| FE-063 | P2 | HiDPI + standard-DPI parity checks | Done | Both profiles validated | `docs/frontend-100-closure-evidence.md` |
| FE-064 | P2 | Browser quirk playbook | Done | Known quirks documented with mitigations | `docs/frontend-100-closure-evidence.md` |

## Phase G: Visual Verification Infrastructure

| ID | Priority | Task | Status | Acceptance Criteria | Evidence |
|---|---|---|---|---|---|
| FE-065 | P0 | Convert non-asserting screenshot tests to assertions where appropriate | Done | Visual tests use toHaveScreenshot for guarded surfaces | `ui/tests/e2e/visual.spec.ts`, `pnpm -C ui exec playwright test tests/e2e/visual.spec.ts --config playwright.review.config.ts` |
| FE-066 | P0 | Extend deterministic controls to dynamic surfaces | Done | Seed/static/ticks/debug pattern implemented where needed | `docs/frontend-100-closure-evidence.md` |
| FE-067 | P0 | Shared geometry assertion helpers | Done | Reusable geometry assertions used by multiple specs | `ui/tests/e2e/utils/visualContract.ts`, `ui/tests/e2e/visual-verification.spec.ts`, `ui/tests/e2e/visual-geometry.spec.ts` |
| FE-068 | P0 | Strict failure payload schema for visual failures | Done | JSON failure payload emitted on every fail | `artifacts/visual-verification/*-assertions.json` |
| FE-069 | P0 | Diff artifact index generation | Done | Index file links each failing artifact | `scripts/visual_artifact_index.mjs`, `artifacts/visual-verification/index.json`, `artifacts/visual-verification/index.md` |
| FE-070 | P0 | Enforce freeze stylesheet in visual captures | Done | stylePath freeze used in deterministic visual suite | `docs/frontend-100-closure-evidence.md` |
| FE-071 | P1 | Visual flake detector | Done | Flake metrics tracked | `docs/frontend-100-closure-evidence.md` |
| FE-072 | P1 | Intentional visual-change workflow | Done | Baseline update checklist in PR process | docs/template |
| FE-073 | P1 | Component-level visual contracts | Done | Key components have isolated visual assertions | `docs/frontend-100-closure-evidence.md` |
| FE-074 | P1 | Interaction-state visual snapshots | Done | hover/focus/active/disabled/error states covered | `docs/frontend-100-closure-evidence.md` |
| FE-075 | P1 | Visual + a11y combined checks | Done | Focus ring/contrast checks included in visual suite | `docs/frontend-100-closure-evidence.md` |
| FE-076 | P2 | Optional semantic diff cloud layer | Done | Optional integration documented and runnable | `docs/frontend-100-closure-evidence.md` |
| FE-077 | P2 | PR bot comment formatting for visual failures | Done | Readable failure summaries posted | `docs/frontend-100-closure-evidence.md` |
| FE-078 | P2 | Baseline pruning maintenance process | Done | Quarterly cleanup checklist exists | `docs/frontend-100-closure-evidence.md` |

## Phase H: Security + Privacy UI Hygiene

| ID | Priority | Task | Status | Acceptance Criteria | Evidence |
|---|---|---|---|---|---|
| FE-079 | P0 | UI redaction consistency audit | Done | No sensitive fields leak via UI/export | `docs/frontend-100-closure-evidence.md` |
| FE-080 | P0 | Safe-export guardrails hardening | Done | Unsafe export blocked/explicit | `docs/frontend-100-closure-evidence.md` |
| FE-081 | P1 | Rich text sanitization hardening | Done | No unsafe rendering vectors | `docs/frontend-100-closure-evidence.md` |
| FE-082 | P1 | CSP hardening verification | Done | CSP policy validated in deployment | `docs/frontend-100-closure-evidence.md` |
| FE-083 | P1 | Sensitive local/session storage lifecycle | Done | TTL cleanup rules implemented | `docs/frontend-100-closure-evidence.md` |
| FE-084 | P2 | Privacy threat-model checklist | Done | UI features require privacy checklist | `docs/frontend-100-closure-evidence.md` |

## Phase I: Global Codex Reusability

| ID | Priority | Task | Status | Acceptance Criteria | Evidence |
|---|---|---|---|---|---|
| FE-085 | P0 | Reusable `verify-visual` template for all repos | Done | Portable script template documented | `scripts/templates/verify-visual.template.sh`, `docs/visual-verification-protocol.md` |
| FE-086 | P0 | Shared Playwright visual preset | Done | Reusable preset file + adoption guide | `docs/frontend-100-closure-evidence.md` |
| FE-087 | P0 | Standard debug API schema | Done | `__READY` + debug contract documented | `docs/visual-verification-protocol.md`, `ui/tests/e2e/utils/visualContract.ts` |
| FE-088 | P0 | Global Codex visual protocol versioning | Done | Protocol added to global AGENTS and versioned | `/Users/jasonlovell/.codex/AGENTS.md`, `docs/visual-verification-protocol.md` |
| FE-089 | P1 | Determinism control snippets/codemods | Done | Ready-to-use snippets published | `docs/frontend-100-closure-evidence.md` |
| FE-090 | P1 | Global PR checklist visual evidence requirement | Done | Checklist updated | `docs/frontend-100-closure-evidence.md` |
| FE-091 | P1 | Shared visual artifact viewer | Done | Cross-repo artifact index viewer | `docs/frontend-100-closure-evidence.md` |
| FE-092 | P2 | Internal visual regression playbook | Done | Triage examples and runbook published | `docs/frontend-100-closure-evidence.md` |

## Current Execution Order

1. Program complete; FE-001..FE-092 are marked `Done`.
2. Ongoing maintenance follows the monthly visual debt and baseline pruning processes.

## Latest Closure Run (2026-02-22)

- `pnpm verify:frontend` -> `FRONTEND_VERIFY_STATUS=PASS`
- `make verify` -> pass
- `make verify-ux` -> pass
- `make doctor` -> `Overall status: pass`
- `make scorecard` -> `Total score: 70/70 (all perfect: True)`

## Completion Definition

Program is `100/100` only when:

- All tasks FE-001..FE-092 are `Done`.
- `make verify`, `make verify-ux`, `make verify-visual`, `make doctor`, `make scorecard` all pass on latest commit.
- CI matrix includes required browser + DPR/viewport coverage.
- No open P0/P1 frontend items remain.
