## Current Task

Finish Counterfactual Replay Matrix end-to-end (UI, docs, tests, verification).

## Status

Ready to Commit

## Plan

1. [x] Backend replay job APIs + execution + matrix summary + causal ranking.
2. [x] UI API/types + Matrix component + App wiring.
3. [x] Styles for Matrix mode and error states.
4. [x] Docs updates for Matrix workflow.
5. [x] Install UI deps and run tests/typecheck/lint.
6. [x] Run full verification and commit.

## Decisions Made

- Synchronous replay execution for v1 to avoid job queue complexity.
- Weighted causal ranking by confidence to reduce single-sample noise.

## Open Questions

- None.
