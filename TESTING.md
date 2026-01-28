# Testing Guide

## Verify
Run the full deterministic verification suite:

```bash
make verify
```

Strict mode adds mutation checks:

```bash
make verify-strict
```

## UX deep review
Run the UX review bundle (traces + video, Lighthouse, optional Percy):

```bash
make verify-ux
```

Playwright will generate an HTML report in `ui/playwright-report` with traces and videos.

## What runs
- Python syntax check via `compileall`
- Python unit tests (unittest)
- AI evals (golden invariants, JSON output)
- UI lint (ESLint)
- UI typecheck (tsc --noEmit)
- UI unit tests (Vitest)
- UI E2E tests (Playwright)
- Accessibility scan (Axe via Playwright)
- Responsive snapshot suite (tablet + mobile)
- Mutation checks (strict mode)

## Playwright setup
If Playwright browsers are not installed, run:

```bash
pnpm -C ui exec playwright install chromium
```

Playwright runs with `VITE_FORCE_DEMO=1` to keep UI snapshots deterministic.

## Lighthouse CI
Run local Lighthouse budgets (uses Playwright’s Chromium binary):

```bash
pnpm -C ui lhci
```

Results are written to `ui/.lighthouseci`.

## Percy (optional)
Set `PERCY_TOKEN` to enable cloud visual diffs:

```bash
PERCY_TOKEN=... pnpm -C ui percy:playwright
```

If Percy fails to start due to blocked install scripts, run:

```bash
pnpm approve-builds
```

## Visual snapshots
Update visual snapshots when UI changes:

```bash
pnpm -C ui exec playwright test --update-snapshots
```
