# Open Questions

## Active (non-blocking)
- 2026-02-14: `vite build` warns that the main JS chunk is ~589 kB minified; decide whether to accept for v1 or add code-splitting now.
- 2026-02-14: `a11y.spec.ts` is skipped when `@axe-core/playwright` import is unavailable; decide whether to enforce Axe availability in CI as a hard requirement.
- 2026-02-14: Legacy broad suites (`flow-mode.spec.ts`, `inspector.spec.ts`) remain intentionally skipped; decide whether to rehabilitate or retire them in v1.1.
- 2026-02-14: CI status for this branch has not been checked from this workspace; verify GitHub Actions are green before final release cut.

## Resolved During Execution
- 2026-02-14: Should help docs be a full routed page or minimal static page for v1?
  Decision: implement a minimal static help page (`ui/public/help.html`) and link it from the app shell for lowest risk.
