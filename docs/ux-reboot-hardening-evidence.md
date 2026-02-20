# UX Reboot Hardening Evidence

## Scope

Phase F hardening evidence for accessibility, keyboard completion, localization overflow, trust UX, and route performance budget instrumentation.

## Evidence Commands

1. `pnpm -C ui test:e2e tests/e2e/a11y.spec.ts tests/e2e/keyboard.spec.ts tests/e2e/localization-layout.spec.ts`
2. `pnpm -C ui design:lint`
3. `pnpm -C ui typecheck`

## Evidence Summary

- Route-shell landmarks are explicitly labeled and exposed through route-level section headings.
- Screen-reader announcements now include route entry and async-status updates in route mode.
- Keyboard-only journey completion coverage now includes all five canonical routes.
- Route-shell localization overflow checks now run across all canonical routes for mobile and tablet.
- High-risk trust changes (safe export and feature disable flows) require confirmation and provide undo.
- Route performance budgets are defined and emitted via `ux.route.perf_budget` analytics events.

## Artifacts and Files

- Route perf budgets: `ui/src/utils/perf.ts`
- Budget tests: `ui/src/utils/perf-budget.test.ts`
- A11y/keyboard/localization regressions:
  - `ui/tests/e2e/a11y.spec.ts`
  - `ui/tests/e2e/keyboard.spec.ts`
  - `ui/tests/e2e/localization-layout.spec.ts`
- Trust state UX and reversible controls:
  - `ui/src/routes/SettingsRoute.tsx`
  - `ui/src/App.tsx`
