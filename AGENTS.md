# Repository Working Agreements

## Objective
Ship a production-ready v1 of Agent Director with coherent end-to-end journeys, onboarding/help, quality gates, accessibility basics, performance basics, security hygiene, and launch docs.

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

## Quality Bar
- No regressions in `make verify`.
- Critical paths have tests (unit + key E2E).
- UX copy is explicit for success and key failure states.
- Accessibility basics are enforced on primary flows (keyboard/focus/labels/aria).
- Security defaults remain safe (redaction-first, no secrets, validated inputs).
- Documentation remains accurate for setup/run/test/deploy/env vars.

## Execution Rules
- Work in small, reviewable increments.
- Prefer minimal-risk changes over refactors.
- Keep release planning artifacts current: `PLANS.md`, `RELEASE_CHECKLIST.md`, `QUESTIONS.md`.
- After each milestone, run relevant verification commands and fix failures before continuing.
