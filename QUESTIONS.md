# Open Questions

## Active (non-blocking)
- None at this time.

## Resolved During Execution
- 2026-02-14: Should help docs be a full routed page or minimal static page for v1?
  Decision: implement a minimal static help page (`ui/public/help.html`) and link it from the app shell for lowest risk.
- 2026-02-14: `vite build` warned that the main JS chunk was ~589 kB minified.
  Decision: add lazy-loaded code-splitting in `ui/src/App.tsx`; warning removed (largest chunk now below threshold).
- 2026-02-14: `a11y.spec.ts` previously skipped when `@axe-core/playwright` import failed.
  Decision: switch to direct `axe-core` injection to keep accessibility checks active in all environments.
- 2026-02-14: Legacy broad suites (`flow-mode.spec.ts`, `inspector.spec.ts`) were fully skipped.
  Decision: replace with stable critical-path E2E suites and run them in the default verify pipeline.
- 2026-02-14: CI status for this branch had not been checked from this workspace.
  Decision: open PR #1 and wait for checks; `verify` and deployment checks are green.
- 2026-02-14: `make verify` omitted a production build step, leaving a checklist gap.
  Decision: add `pnpm -C ui build` to `scripts/verify.sh` so build is validated on every verify run.
- 2026-02-14: Inspector unit tests emitted noisy async `act` warnings when mocked fetches resolved after assertions.
  Decision: default mocked detail fetches to unresolved promises and opt into resolved responses per test that requires loaded details.
- 2026-02-14: New doctor secret scan failed due scanner self-matching and compiled cache artifacts.
  Decision: exclude `scripts/doctor.py`, `.pyc`, and known-safe test fixture paths from static secret scanning.
- 2026-02-14: Deep UX audit found onboarding force-advanced after intro timeout and conflicted with first-run comprehension.
  Decision: remove intro auto-dismiss and require explicit user action (`Start guided tour`, `Play story mode`, or `Skip intro`).
- 2026-02-14: Deep UX audit found guided tour focus escape and no `Escape` close path.
  Decision: add focus trap and keyboard close handling in guided tour and route app-level `Escape` to close tour first.
- 2026-02-14: Deep UX audit found mobile quick-actions toggle rendered out of viewport.
  Decision: keep quick-actions toggle and panel fixed to viewport on narrow breakpoints.
- 2026-02-14: LHCI surfaced console-error noise and failed performance threshold due layout instability.
  Decision: run LHCI in deterministic demo mode, add inline favicon, and use optional font-display to reduce CLS.
- 2026-02-14: Replay traces were serialized with invalid timestamps (`+00:00Z`) in replay engine output.
  Decision: normalize replay timestamps to strict millisecond UTC Z format and add replay engine regression tests.
- 2026-02-14: API validation accepted empty identifiers and produced inconsistent downstream error semantics.
  Decision: enforce non-empty ID validation (`trace_id`, `step_id`, `left_trace_id`, `right_trace_id`) and add API 400 regression tests.
- 2026-02-14: User requested strict 10/10 scorecards across journey and backend/system.
  Decision: implement executable scorecards (`make scorecard`) with hard all-perfect requirement and machine-readable artifact output.
- 2026-02-14: Release verification had transient environment-level access failures (socket/DB/registry/GitHub API).
  Decision: rerun full verification in the current environment; all gates now pass (`make verify-strict`, `make doctor`, `make scorecard`, CI green).
- 2026-02-14: A11y tests used `axe-core` via transitive resolution instead of direct dependency declaration.
  Decision: add explicit `axe-core` dev dependency in UI package and refresh lockfile for deterministic test resolution.
- 2026-02-14: Verification output had repeated `NO_COLOR`/`FORCE_COLOR` warning noise.
  Decision: unset `NO_COLOR` in verification scripts to improve signal quality in release logs.
