# Gap Backlog (Release v1)

Status legend: `Open` | `In Progress` | `Blocked` | `Closed`

## P0

### GAP-P0-001: Missing strict, repeatable doctor command with machine-readable evidence
- Evidence: No `scripts/doctor.*` command or `artifacts/doctor.json` release evidence artifact existed.
- Impacted journey: Engineering release sign-off and CI parity validation.
- Fix strategy: Add `scripts/doctor.py` + `make doctor` to run full checks and emit gate evidence JSON.
- Status: `Closed` (2026-02-14, `make doctor` now emits passing `artifacts/doctor.json`)

### GAP-P0-002: Release gates not codified with explicit evidence requirements
- Evidence: No `RELEASE_GATES.md`; release criteria were checklist-style only.
- Impacted journey: Final go/no-go release decision.
- Fix strategy: Add `RELEASE_GATES.md` with gate IDs, pass criteria, and evidence mapping to `artifacts/doctor.json`.
- Status: `Closed` (2026-02-14, `RELEASE_GATES.md` added and wired to doctor output)

### GAP-P0-003: `verify_strict` failing in `make doctor` due to sandboxed runtime permissions
- Evidence: Prior run had local runtime permission errors that prevented strict verification.
- Impacted journey: Core journeys, quality, accessibility, and performance gates (`G1`, `G3`, `G4`, `G5`).
- Fix strategy: Re-run in fully permitted environment and confirm strict verification is stable.
- Status: `Closed` (2026-02-14, no longer reproducible; `make verify-strict` and `make doctor` passing)

### GAP-P0-004: Dependency audit blocked by offline registry access
- Evidence: Prior run had transient registry connectivity issues during `pnpm audit`.
- Impacted journey: Security gate (`G6`).
- Fix strategy: Re-run release checks in online environment and confirm dependency audit pass.
- Status: `Closed` (2026-02-14, `dependency_audit=pass` in current `artifacts/doctor.json`)

### GAP-P0-005: CI status check blocked by GitHub API access
- Evidence: Prior run had transient GitHub API connectivity errors from `gh pr view`.
- Impacted journey: CI gate (`G8`).
- Fix strategy: Re-run CI evidence checks and confirm active PR status is green.
- Status: `Closed` (2026-02-14, `ci_status=pass` in `artifacts/doctor.json` and PR checks green)

## P1

### GAP-P1-006: Replay engine emitted invalid UTC timestamp format (`+00:00Z`)
- Evidence: replay traces serialized times like `2026-...+00:00Z`, which is not valid strict ISO-8601 UTC Z form.
- Impacted journey: Replay/compare timeline parsing and backend contract consistency.
- Fix strategy: Normalize replay timestamp serialization to millisecond UTC Z format and add regression coverage.
- Status: `Closed` (2026-02-14, fixed in `server/replay/engine.py` with `test_replay_engine.py`)

### GAP-P1-007: API accepted empty IDs and returned inconsistent error semantics
- Evidence: validation allowed empty strings for trace/step IDs, causing downstream 404s instead of input 400s.
- Impacted journey: API consumer clarity and failure-state predictability.
- Fix strategy: enforce non-empty string validation for IDs in MCP schema and add API regression tests.
- Status: `Closed` (2026-02-14, fixed in `server/mcp/schema.py` and `server/tests/test_api.py`)

### GAP-P1-008: No executable 10/10 scorecard across journey + backend + system quality
- Evidence: release gates existed, but there was no single pass/fail score artifact requiring 10/10 in each domain.
- Impacted journey: Autonomous completion confidence and repeatable release sign-off.
- Fix strategy: add `scripts/scorecard.py`, `SCORECARDS.md`, and `make scorecard` with artifact output and strict all-perfect requirement.
- Status: `Closed` (2026-02-14, scorecards now generated in `artifacts/scorecards.json`)

### GAP-P1-009: A11y probe depended on transitive `axe-core` resolution
- Evidence: e2e a11y specs used `require.resolve('axe-core/axe.min.js')` without declaring `axe-core` directly, relying on transitive dependency shape.
- Impacted journey: Release-test determinism for accessibility gates.
- Fix strategy: declare `axe-core` as an explicit UI dev dependency and refresh lockfile.
- Status: `Closed` (2026-02-14, `ui/package.json` now declares `axe-core`)

### GAP-P1-010: API returned raw internal exception details on `500` responses
- Evidence: unhandled exceptions were serialized with `str(exc)`, which could leak internals to clients.
- Impacted journey: Security hygiene and safe failure-state UX.
- Fix strategy: sanitize `500` payloads to a fixed message and add regression coverage.
- Status: `Closed` (2026-02-15, `server/main.py` now returns `Internal server error`)

### GAP-P1-011: API lacked request-size guardrails for JSON POST payloads
- Evidence: `_read_json` accepted unbounded `Content-Length`, allowing oversized request bodies.
- Impacted journey: Backend resilience and security posture.
- Fix strategy: enforce `MAX_REQUEST_BYTES` with `413 Payload too large` response and add regression tests.
- Status: `Closed` (2026-02-15, 1MB limit enforced in `server/main.py` with tests)

### GAP-P1-012: API had no per-client request throttling
- Evidence: request handlers had no server-side throttling, allowing unbounded burst traffic from a single client.
- Impacted journey: Backend availability and graceful degradation under abusive/accidental burst load.
- Fix strategy: add conservative in-memory per-IP rate limiting with `429` + `Retry-After`, and cover with API tests.
- Status: `Closed` (2026-02-15, implemented in `server/main.py` and validated by `test_rate_limit_returns_429`)

### GAP-P1-013: API accepted non-JSON POST payload media types
- Evidence: POST endpoints parsed bodies without enforcing `Content-Type: application/json`.
- Impacted journey: API boundary correctness and predictable client error semantics.
- Fix strategy: enforce JSON media type for non-empty POST payloads and return `415` on mismatch with regression tests.
- Status: `Closed` (2026-02-15, implemented in `server/main.py` with `test_post_requires_json_content_type`)

### GAP-P2-004: API did not explicitly validate malformed `Content-Length` values
- Evidence: invalid/non-numeric `Content-Length` could bypass explicit boundary semantics and produce generic failure paths.
- Impacted journey: Robust failure-state UX and API boundary hygiene.
- Fix strategy: validate header format early, return explicit `400 Invalid Content-Length`, and cover with raw-socket regression tests.
- Status: `Closed` (2026-02-15, implemented in `server/main.py` with `test_invalid_content_length_returns_400`)

### GAP-P2-003: API responses missing baseline security headers
- Evidence: API responses did not include baseline hardening headers like `X-Content-Type-Options`.
- Impacted journey: Security hygiene for release-ready deployment defaults.
- Fix strategy: add low-risk security headers in `_send_json` and test for `/api/health`.
- Status: `Closed` (2026-02-15, headers added and covered by API tests)

### GAP-P2-002: Verification scripts emitted avoidable runtime warning noise
- Evidence: verification runs produced repeated `NO_COLOR`/`FORCE_COLOR` warnings in node subprocess output.
- Impacted journey: Signal-to-noise in release verification evidence and CI diagnostics.
- Fix strategy: normalize environment in verify scripts by unsetting `NO_COLOR` before running toolchain commands.
- Status: `Closed` (2026-02-14, warning noise reduced in `make verify-strict`)

### GAP-P1-003: Guided tour keyboard behavior blocked accessibility primary flow
- Evidence: Deep UX probe reported focus escaping tour card and `Escape` not closing the tour.
- Impacted journey: First-run onboarding for keyboard-only and assistive-tech users.
- Fix strategy: Add focus trapping + `Escape` close handling within guided tour and app-level shortcut routing.
- Status: `Closed` (2026-02-14, fixed in `GuidedTour.tsx` and `App.tsx`, validated by new E2E regression tests)

### GAP-P1-004: Mobile quick-actions entry point was off-screen on initial viewport
- Evidence: Deep UX probe at `390x844` found quick-actions toggle out of viewport.
- Impacted journey: Mobile user discoverability for core controls.
- Fix strategy: Keep quick-actions toggle/panel fixed to viewport on narrow breakpoints with bounded panel height.
- Status: `Closed` (2026-02-14, fixed in `main.css`, validated by regression test)

### GAP-P1-005: UX quality signals showed avoidable Lighthouse errors
- Evidence: LHCI flagged console errors from API connection attempts and missing favicon.
- Impacted journey: Release reviewer confidence and quality-gate reliability.
- Fix strategy: Run LHCI in deterministic demo mode, add inline favicon, and tune font-loading to reduce layout shift noise.
- Status: `Closed` (2026-02-14, `pnpm -C ui lhci` passing with clean console audit)

### GAP-P1-001: AGENTS workflow did not enforce a non-terminating gap loop
- Evidence: Existing `AGENTS.md` had milestone guidance but no strict algorithm or stop conditions.
- Impacted journey: Autonomous release execution cadence.
- Fix strategy: Add strict Gap Loop algorithm, rules, stop conditions, and non-stop conditions in `AGENTS.md`.
- Status: `Closed` (2026-02-14, strict loop + stop conditions added)

### GAP-P1-002: Doctor secret scan produced false positives
- Evidence: Initial `make doctor` failed security gate by matching `scripts/doctor.py` and `.pyc` cache artifacts.
- Impacted journey: Security gate reliability in automated release verification.
- Fix strategy: Exclude known-safe test fixture, scanner implementation file, and compiled cache artifacts from static secret scan.
- Status: `Closed` (2026-02-14, `make doctor` passes after scanner exclusions)

## P2

### GAP-P2-001: Gap backlog artifact was missing
- Evidence: No `GAPS.md` existed, so open/closed release gaps were not tracked in one place.
- Impacted journey: Transparent prioritization and reviewability.
- Fix strategy: Create `GAPS.md` and keep it current each loop cycle.
- Status: `Closed` (2026-02-14, backlog created and actively maintained)
