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

## What runs
- Python syntax check via `compileall`
- Python unit tests (unittest)
- AI evals (golden invariants, JSON output)
- UI lint (ESLint)
- UI typecheck (tsc --noEmit)
- UI unit tests (Vitest)
- UI E2E tests (Playwright)
- Mutation checks (strict mode)

## Playwright setup
If Playwright browsers are not installed, run:

```bash
pnpm -C ui exec playwright install chromium
```

## Visual snapshots
Update visual snapshots when UI changes:

```bash
pnpm -C ui exec playwright test --update-snapshots
```
