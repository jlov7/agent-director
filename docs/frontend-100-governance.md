# Front-End 100/100 Governance

## FE-001: Rubric (100/100)

A frontend release is 100/100 only when all domains pass:

- UX clarity: critical journey tests pass; one dominant CTA per active route; route states provide explicit next action.
- Visual quality: deterministic visual suite passes (`pnpm verify:visual`) with no geometry failures and approved baseline policy.
- Accessibility: keyboard + axe suites pass on critical routes and mobile; landmarks/headings/focus order remain valid.
- Performance: LHCI budgets pass (LCP/CLS/perf score) and route perf budget instrumentation emits no unresolved regressions.
- Reliability: unit + E2E pass; no blocking regressions in `make verify` / `make verify-ux`.
- Security/privacy UX: safe export/redaction/default trust posture checks pass.

## FE-003: Browser/Device Support Policy

Required support matrix:

- Browsers: Chromium, Firefox, WebKit.
- DPR/viewport profiles: `retina-desktop`, `standard-desktop`, `tablet-retina`, `mobile-retina`.
- Orientation: portrait + landscape for mobile/tablet route shell.
- Zoom checks: 100/125/150 equivalent layout probe via viewport hardening suite.

Enforcement:

- CI workflow: `.github/workflows/visual-verify.yml`
- Command: `pnpm -C ui test:e2e:visual-matrix`

## FE-005 + FE-072: Baseline Screenshot Approval Protocol

Rules:

- Any baseline image update requires visual diff review in PR.
- PR must include why baseline changed and whether change is intentional.
- No baseline update without deterministic suite run (`pnpm verify:visual`).

## FE-006 + FE-090: UX Impact Changelog Discipline

Every PR touching UX must include:

- User-visible behavior change summary.
- Impacted journeys/routes.
- Before/after evidence (screenshots or diff artifacts).
- Verification commands executed.

Template is enforced via `.github/pull_request_template.md`.

## FE-007 + FE-008: Journey + Ownership Map

Journey owners (initial):

- Overview + Triage: frontend route-shell owners.
- Diagnose + Matrix + Flow: analysis surface owners.
- Coordinate + Handoff: collaboration surface owners.
- Settings + Trust controls: platform UX/security owners.

High-risk surface ownership:

- `ui/src/App.tsx` (shell orchestration)
- `ui/src/routes/WorkspaceRoute.tsx` (route contracts)
- `ui/src/components/FlowMode/FlowCanvas.tsx` (deterministic visual contract)
- `ui/src/components/Matrix/index.tsx` (replay + risk UX)
- `ui/src/store/api.ts` (redaction/safe export UX data path)

## FE-009 + FE-078: Visual Debt + Baseline Pruning Cadence

Monthly sweep:

- Identify stale snapshots with no current test references.
- Delete obsolete baselines after review.
- Regenerate `artifacts/visual-verification/index.json` and `index.md`.
- Record sweep in release notes.

Quarterly prune:

- Remove superseded snapshots from old component states.
- Keep only current route and component visual contract coverage.

## FE-010: Frontend Incident Taxonomy

Incident classes:

- VISUAL_REGRESSION: unexpected screenshot diff or broken layout.
- A11Y_REGRESSION: keyboard/focus/ARIA/contrast failure.
- PERF_REGRESSION: LHCI or route perf budget regression.
- TRUST_REGRESSION: safe export/redaction/privacy indicator failure.
- JOURNEY_REGRESSION: route flow or next-action behavior break.

Severity guide:

- P0: user-blocking, safety/privacy risk, or widespread render failure.
- P1: major journey degradation without full outage.
- P2: localized UX defect with workaround.
