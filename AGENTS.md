# Repository Working Agreements

## Objective
Ship a production-ready v1 of Agent Director with coherent end-to-end journeys, onboarding/help, quality gates, accessibility basics, performance basics, security hygiene, and launch docs.

## Gap Loop (Strict)
1. Run `make doctor` to refresh release evidence in `artifacts/doctor.json`.
2. Update `GAPS.md` from evidence, keeping P0/P1/P2 prioritized and status-accurate.
3. Pick the highest-priority non-closed gap.
4. Implement the smallest safe fix for that gap.
5. Run targeted checks for touched areas, then rerun `make doctor`.
6. If checks pass, update `GAPS.md`, `RELEASE_GATES.md` evidence notes, and commit.
7. Repeat from step 2 until stop conditions are met.

## Gap Loop Rules
- Do not stop after planning; planning only updates loop state.
- Do not skip failing checks; either fix the issue or mark it blocked with evidence in `QUESTIONS.md`.
- If blocked on product decisions, keep shipping unrelated unblocked gaps.
- Keep changes minimal-risk and reviewable.
- Commit frequently with one logical change per commit.

## Stop Conditions
- All gates in `RELEASE_GATES.md` are satisfied with current evidence.
- `GAPS.md` has no open P0 or P1 gaps.
- Any blocked gap is logged in `QUESTIONS.md` with clear decision needed.
- `make doctor` passes and emits a fresh `artifacts/doctor.json`.
- `make scorecard` passes with all domains at `10/10`.

## Non-Stop Conditions
- Writing plans alone.
- Updating checklists without code/test verification.
- Partially passing checks.

## Default Commands
- Install UI deps: `pnpm -C ui install`
- Run server locally: `python3 server/main.py`
- Run UI locally: `pnpm -C ui dev`
- Lint UI: `pnpm -C ui lint`
- Typecheck UI: `pnpm -C ui typecheck`
- Build UI: `pnpm -C ui build`
- Unit tests (UI): `pnpm -C ui test`
- E2E tests (UI): `pnpm -C ui test:e2e`
- Python tests: `python3 -m unittest discover -s server/tests`
- Full verification: `make verify`
- Strict verification: `make verify-strict`
- UX verification: `make verify-ux`
- Doctor loop evidence: `make doctor`
- 10/10 scorecards: `make scorecard`

## Quality Bar
- No regressions in `make verify`.
- Critical paths have tests (unit + key E2E).
- UX copy is explicit for success and key failure states.
- Accessibility basics are enforced on primary flows (keyboard/focus/labels/aria).
- Security defaults remain safe (redaction-first, no secrets, validated inputs).
- Documentation remains accurate for setup/run/test/deploy/env vars.
- Scorecard artifact reports `70/70` with all domains at `10/10`.

## Execution Rules
- Work in small, reviewable increments.
- Prefer minimal-risk changes over refactors.
- Keep release planning artifacts current: `PLANS.md`, `RELEASE_CHECKLIST.md`, `RELEASE_GATES.md`, `GAPS.md`, `QUESTIONS.md`.
- After each milestone, run relevant verification commands and fix failures before continuing.
