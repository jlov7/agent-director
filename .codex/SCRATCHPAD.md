## Current Task
AppShell decomposition first slice.

## Status
Complete

## Plan
1. [x] Identify a safe `App.tsx` seam that reduces shell complexity without visual or behavior changes.
2. [x] Extract app-shell copy/types/route constants into `ui/src/appShellConfig.ts`.
3. [x] Extract legacy gameplay session adaptation into `ui/src/utils/gameplaySessionMapper.ts`.
4. [x] Verify typecheck, lint, unit tests, build, and design lint.

## Decisions Made
- Decompose by real seams, not arbitrary line-count slicing.
- Keep the extraction behavior-preserving; no visual changes in this slice.
- Move legacy gameplay adaptation away from the main observability shell to improve product locality.

## Open Questions
- None blocking; user authorized autonomous ambitious work.

## Completion Evidence
- `pnpm -C ui typecheck` passes.
- `pnpm -C ui lint` passes.
- `pnpm -C ui test -- src/App.test.tsx src/utils/gameplayEngine.test.ts` passes.
- `pnpm -C ui build` passes.
- `pnpm -C ui design:lint` passes.
