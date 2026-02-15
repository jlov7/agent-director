# Open Questions

## Active (non-blocking)
- 2026-02-15: ExecPlan "Release-ready v1" shows all milestones complete; no next task found.
- 2026-02-15: ExecPlan "Release-ready v1" still complete on latest check; no actionable milestone available.
- 2026-02-15: ExecPlan "Release-ready v1" still complete in `/Users/jasonlovell/AI/Agent Director`; no next task available for this run.

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
- 2026-02-15: API `500` responses exposed raw exception text to clients.
  Decision: return a sanitized fixed `Internal server error` message and cover behavior with regression tests.
- 2026-02-15: API POST parsing had no request-size limit and accepted oversized JSON payloads.
  Decision: enforce a 1MB request cap with explicit `413 Payload too large` handling.
- 2026-02-15: API responses lacked baseline security headers.
  Decision: add `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Cache-Control` headers for JSON responses.
- 2026-02-15: API had no server-side throttling to protect against burst abuse.
  Decision: add conservative in-memory per-IP rate limiting and return `429` with `Retry-After`.
- 2026-02-15: API accepted non-JSON media types on POST bodies.
  Decision: enforce `application/json` for non-empty POST payloads and return `415` on mismatch.
- 2026-02-15: API boundary handling did not explicitly cover malformed `Content-Length` headers.
  Decision: validate `Content-Length` and return `400 Invalid Content-Length` with regression coverage.
- 2026-02-15: Unit test runs emitted persistent localStorage warning noise from jsdom runtime defaults.
  Decision: provide deterministic in-memory `localStorage`/`sessionStorage` shims in test setup to remove warning noise.
- 2026-02-15: Release artifact commands still inherited conflicting color env vars in subprocesses.
  Decision: remove `NO_COLOR` in doctor/scorecard subprocess environments to keep evidence logs high signal.
- 2026-02-15: Trace/step identifier validation accepted path-like values (for example `..` and `../s1`) at API boundaries.
  Decision: enforce strict identifier allowlist checks in shared MCP schema validation and return `400` for invalid IDs.
- 2026-02-15: ExecPlan "Release-ready v1" remains fully complete in worktree; no actionable milestone found this run.

- 2026-02-15: Automation run found ExecPlan "Release-ready v1" fully complete; no actionable task to implement.
