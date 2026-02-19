## Current Task

Execute the pre-release gate 40 completion program from `docs/plans/2026-02-19-pre-release-gate-40-completion-plan.md` with strict batch tracking.

## Status

In Progress

## Plan

1. [x] RG-041 Initialize exhaustive plan + task sync (`TASKS.md`, `.codex/PLANS.md`, `.codex/SCRATCHPAD.md`)
2. [x] RG-042 Batch A: close RG-021 + RG-022 (keybind remap + unified settings center)
3. [x] RG-043 Batch B: close RG-032 + RG-034 (startup perf gate + reliability drills)
4. [ ] RG-044 Batch C: close RG-038 (one-command canary/rollback/kill-switch ops)
5. [ ] RG-045 Batch D: close RG-026 + RG-027 (content depth + procedural quality controls)
6. [ ] RG-046 Batch E: close RG-024 (global localization infrastructure)
7. [ ] Final release verification and evidence refresh

## Decisions Made

- Keep RG IDs as source-of-truth and execute in batch order.
- Treat previously shipped WR/SWC work as existing evidence and focus coding on uncovered gaps.

## Open Questions

- None.

## Verification Gates

- Batch A: `pnpm -C ui typecheck`, `pnpm -C ui test`
- Final closure: `make verify`, `make doctor`, `make scorecard`, `make vercel-check`
