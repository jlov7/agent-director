# ExecPlan: Release-ready v1

## Purpose / Big Picture
Prepare Agent Director for a v1 launch by closing release-critical gaps while minimizing risk: complete core journeys (including failure states), ensure onboarding/help quality, harden quality gates, and align docs/checklists to an auditable release standard.

## Scope
- UI/UX polish for key happy/failure states.
- Onboarding and help completion (including a minimal help page).
- Test and CI quality-gate hardening for critical flows.
- Accessibility and basic security/performance guardrails.
- Launch documentation completeness.

## Out of Scope
- Large architectural refactors.
- New major product features beyond v1 definition-of-done.

## Milestones
1. Baseline + release scaffolding + immediate blockers.
2. Core journey UX hardening (happy path + key failure states).
3. Onboarding/help completion and accessibility touch-ups.
4. Quality gate hardening (tests/lint/typecheck/build/CI alignment).
5. Launch docs polish and release readiness pass.

## Progress
- [x] Read repository structure, test/build scripts, and CI workflows.
- [x] Create release steering files (`AGENTS.md`, `PLANS.md`, `RELEASE_CHECKLIST.md`, `QUESTIONS.md`).
- [ ] Milestone 1: Baseline + immediate blockers.
- [ ] Milestone 2: Core journey UX hardening.
- [ ] Milestone 3: Onboarding/help + accessibility completion.
- [ ] Milestone 4: Quality gate hardening.
- [ ] Milestone 5: Launch docs and final release pass.

## Surprises & Discoveries
- Several large key-flow Playwright suites exist but are globally skipped (`onboarding`, `keyboard`, `flow-mode`, `inspector`).
- Onboarding and contextual in-app help are implemented in UI, but no dedicated minimal help page is currently exposed from the app shell.

## Decision Log
- Prioritize high-signal, minimal-risk release fixes first: restore key test coverage and add explicit help surface before broader UX polish.
- Use milestone commits to keep review and rollback simple.

## Risks
- Unskipping broad E2E suites may reveal flaky selectors and increase CI time.
- Help/onboarding changes can unintentionally regress initial user flow.

## Validation Gates
Per milestone, run:
- `pnpm -C ui lint`
- `pnpm -C ui typecheck`
- `pnpm -C ui test`
- Targeted `pnpm -C ui test:e2e -- <specs>` for changed flows
- `python3 -m unittest discover -s server/tests` when server changes
- `make verify` at major checkpoints

## Outcomes & Retrospective
- In progress.
