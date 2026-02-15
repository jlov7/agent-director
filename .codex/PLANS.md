# Counterfactual Replay Matrix ExecPlan

## Purpose / Big Picture

- Build a multi-scenario replay matrix with causal ranking to compare outcomes across what-if runs.
- Ship an end-to-end UI flow so users can author scenarios, run jobs, and jump to Compare.
- Keep the implementation deterministic, test-covered, and safe for sharing.

## Progress

- [x] Backend replay job APIs (create, status, cancel) + tests
- [x] Backend execution + matrix summary + causal ranking + tests
- [x] UI API/types for replay jobs and matrix data
- [x] Matrix mode UI, scenario builder, and compare jump
- [x] Styling for matrix mode
- [x] Docs updates for matrix workflow and safe-share guidance
- [x] Full verification and final commit

## Surprises & Discoveries

- Date: 2026-02-15
  Discovery: UI tests blocked because `ui/node_modules` was missing.
  Impact: Need `pnpm -C ui install` before UI tests/typecheck.

## Decision Log

- Date: 2026-02-15
  Decision: Execute replay jobs synchronously in the API for v1.
  Rationale: Fastest path to stable UX without adding queue infrastructure.
  Alternatives considered: Background worker and polling only.

- Date: 2026-02-15
  Decision: Weight causal ranking by confidence (sample count).
  Rationale: Prevent single-sample factors from dominating rankings.
  Alternatives considered: Raw average score.

- Date: 2026-02-15
  Decision: Scenario builder lives inside Matrix mode rather than Inspector.
  Rationale: Keeps authoring and results in a single view with lower UI churn.
  Alternatives considered: Inline Inspector builder.

## Outcomes & Retrospective

- Completed: Replay matrix feature end-to-end with tests and docs.
- Deferred: None.
- Risks left: UI test warnings from existing Inspector tests (pre-existing).
- Follow-ups: Consider adding a dedicated Matrix E2E path if desired.

## Verification Evidence

- Commands run: `pnpm -C ui lint`, `pnpm -C ui typecheck`, `pnpm -C ui test`, `pnpm -C ui test:e2e`, `pnpm -C ui test:e2e --update-snapshots`, `python3 -m unittest discover -s server/tests`, `make verify`.
- Tests run: all above (note: `Inspector` tests emit pre-existing act() warnings).
- Manual checks: none.
