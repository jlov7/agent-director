## Current Task

Execute a deep visual UX overhaul with an exhaustive tracked checklist and close every scoped item with machine-verifiable frontend evidence.

## Status

Completed (local/frontend scope)

## Plan

1. [x] Create and sync an exhaustive execution tracker (`docs/plans/2026-02-23-deep-visual-ux-overhaul-execution-plan.md`, `.codex/PLANS.md`, `TASKS.md`).
2. [x] Implement modal/overlay interaction contract upgrades (focus trap, `Escape`, backdrop close, focus return) for app-level dialogs.
3. [x] Fix command palette semantics (remove nested interactive role conflicts) and retain pin/unpin behavior.
4. [x] Harden tab semantics in `DirectorBrief` (`aria-controls`, tabpanel relationships, keyboard-safe structure).
5. [x] Fix route journey reliability gap for diagnose keyboard flow.
6. [x] Improve route-shell help discoverability and mobile control conflict behavior.
7. [x] Remove dead frontend code surfaced by audit (unused hooks/components) with test updates.
8. [x] Run frontend verification gates and refresh tracker evidence.

## Decisions Made

- Track this wave as a discrete, fully-closed program to avoid mixing with prior completed programs.
- Prioritize high-impact UX/a11y fixes first, then structural cleanup, then full verification.
- Keep completion claims evidence-based (`lint`, `typecheck`, unit, targeted e2e, `make verify-ux`).

## Open Questions

- External CI gate `G8-ci` is currently failing on GitHub `main` (`verify` run `22283235684`), which causes `make doctor`/`make scorecard` to fail despite local gates passing.

## Validation Targets

- `pnpm -C ui lint`
- `pnpm -C ui typecheck`
- `pnpm -C ui test`
- `pnpm -C ui test:e2e -- tests/e2e/route-journeys.spec.ts tests/e2e/a11y.spec.ts tests/e2e/ux-audit-deep.spec.ts`
- `make verify-ux`

## Validation Evidence (2026-02-23)

- `pnpm -C ui lint` -> pass
- `pnpm -C ui typecheck` -> pass
- `pnpm -C ui test -- src/components/__tests__/ModalDialog.test.tsx src/components/__tests__/CommandPalette.test.tsx src/components/__tests__/DirectorBrief.test.tsx src/components/__tests__/Matrix.test.tsx` -> pass
- `pnpm -C ui test:e2e -- tests/e2e/route-journeys.spec.ts --grep "diagnose journey: keyboard sequence and evidence timeline"` -> pass
- `pnpm -C ui test:e2e -- tests/e2e/a11y.spec.ts tests/e2e/ux-audit-deep.spec.ts` -> pass
- `make verify-ux` -> pass
- `make verify` -> pass
- `make doctor` -> fail only on `G8-ci` due external GitHub workflow failure on `main`
