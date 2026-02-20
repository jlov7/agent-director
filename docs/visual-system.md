# Visual System v2

## Purpose

Define a stable, low-friction visual system for route-shell journeys so every screen is fast to scan and action-oriented.

## CSS Architecture

- `ui/src/styles/tokens.css`: typography tiers, spacing rhythm, chip/state tokens.
- `ui/src/styles/layout.css`: app and route-shell layout structure by breakpoint.
- `ui/src/styles/components.css`: route cards, progress, timeline, and contextual interaction components.
- `ui/src/styles/main.css`: legacy/global styles and shared primitives, now importing layered files above.

## Typography Rules

- Route-shell surfaces are limited to four text tiers:
1. `--ux-tier-1`: largest emphasis.
2. `--ux-tier-2`: card/section titles.
3. `--ux-tier-3`: body copy.
4. `--ux-tier-4`: metadata and helper copy.
- `ui/scripts/design_lint.mjs` enforces tier usage in `components.css`.

## Spacing Rhythm

- Base rhythm uses tokenized spacing with responsive step-up at tablet and desktop breakpoints.
- Route-shell card spacing and gaps must align to approved rhythm values.
- `ui/scripts/design_lint.mjs` enforces rhythm-scale spacing usage in `layout.css` and `components.css`.

## Heavy Treatment Rule

- Any single route card section may use only one heavy treatment property:
1. `background`
2. `box-shadow`
3. `backdrop-filter`
- Violations are blocked by `ui/scripts/design_lint.mjs`.

## Route Snapshot Coverage

- Desktop snapshots: `ui/tests/e2e/visual.spec.ts` captures `overview`, `triage`, `diagnose`, `coordinate`, `settings`.
- Tablet snapshots: `ui/tests/e2e/ux-review.spec.ts` captures the same route set.
- 3-second comprehension proxy: `ui/tests/e2e/scan.spec.ts` + `pnpm -C ui scan:check`.
