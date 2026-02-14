# Open Questions

## Active (non-blocking)
- 2026-02-14: CI status for this branch has not been checked from this workspace; verify GitHub Actions are green before final release cut.

## Resolved During Execution
- 2026-02-14: Should help docs be a full routed page or minimal static page for v1?
  Decision: implement a minimal static help page (`ui/public/help.html`) and link it from the app shell for lowest risk.
- 2026-02-14: `vite build` warned that the main JS chunk was ~589 kB minified.
  Decision: add lazy-loaded code-splitting in `ui/src/App.tsx`; warning removed (largest chunk now below threshold).
- 2026-02-14: `a11y.spec.ts` previously skipped when `@axe-core/playwright` import failed.
  Decision: switch to direct `axe-core` injection to keep accessibility checks active in all environments.
- 2026-02-14: Legacy broad suites (`flow-mode.spec.ts`, `inspector.spec.ts`) were fully skipped.
  Decision: replace with stable critical-path E2E suites and run them in the default verify pipeline.
