# Deep Visual UX Overhaul Execution Plan (2026-02-23)

## Purpose

Execute a full closure pass on current, concrete frontend UX gaps with an evidence-first process and no partial completion claims.

## Quality Bar

- Every changed behavior has a machine-verifiable assertion path.
- Core keyboard and modal interactions are deterministic in headless CI.
- Accessibility semantics are valid for updated surfaces.
- No dead frontend code remains from this identified gap set.

## Task Ledger

1. `DVUX-001` Track this program in planning artifacts (`.codex/PLANS.md`, `.codex/SCRATCHPAD.md`, `TASKS.md`). Status: `Done`
2. `DVUX-002` Add shared app modal contract component (focus trap, `Escape`, backdrop click, focus return). Status: `Done`
3. `DVUX-003` Migrate app-level confirm dialog to shared modal contract. Status: `Done`
4. `DVUX-004` Migrate setup wizard dialog to shared modal contract. Status: `Done`
5. `DVUX-005` Migrate support diagnostics modal path to shared modal contract. Status: `Done`
6. `DVUX-006` Remove nested interactive role conflict in command palette pin control. Status: `Done`
7. `DVUX-007` Harden command palette keyboard behavior for pin control without nested buttons. Status: `Done`
8. `DVUX-008` Add complete tab semantics to `DirectorBrief` (`id`, `aria-controls`, `tabpanel`). Status: `Done`
9. `DVUX-009` Correct `Matrix` detail semantics from modal-dialog misuse to inline detail panel semantics. Status: `Done`
10. `DVUX-010` Fix diagnose route keyboard-flow reliability for E2E determinism. Status: `Done`
11. `DVUX-011` Ensure route-shell users still get friction/help escalation CTA when needed. Status: `Done`
12. `DVUX-012` Avoid mobile quick-rail and quick-actions dock control competition in narrow viewports. Status: `Done`
13. `DVUX-013` Remove dead hooks (`useOnboarding`, `useStoryMode`, `usePlaybackState`, `useKeyboardShortcuts`) if unused. Status: `Done`
14. `DVUX-014` Remove dead components (`OnboardingTips`, `ContextualHint`) if unused. Status: `Done`
15. `DVUX-015` Remove stale tests tied only to removed dead components, keeping net suite signal clean. Status: `Done`
16. `DVUX-016` Add/refresh targeted tests for updated modal and interaction semantics. Status: `Done`
17. `DVUX-017` Run frontend verification bundle and record closure evidence. Status: `Done`
18. `DVUX-018` Mark all tasks complete and publish outcome summary. Status: `Done`

## Verification Commands

- `pnpm -C ui lint`
- `pnpm -C ui typecheck`
- `pnpm -C ui test`
- `pnpm -C ui test:e2e -- tests/e2e/route-journeys.spec.ts tests/e2e/a11y.spec.ts tests/e2e/ux-audit-deep.spec.ts`
- `make verify-ux`

## Evidence Log

- `pnpm -C ui lint` -> pass
- `pnpm -C ui typecheck` -> pass
- `pnpm -C ui test -- src/components/__tests__/ModalDialog.test.tsx src/components/__tests__/CommandPalette.test.tsx src/components/__tests__/DirectorBrief.test.tsx src/components/__tests__/Matrix.test.tsx` -> pass
- `pnpm -C ui test:e2e -- tests/e2e/route-journeys.spec.ts --grep "diagnose journey: keyboard sequence and evidence timeline"` -> pass
- `pnpm -C ui test:e2e -- tests/e2e/a11y.spec.ts tests/e2e/ux-audit-deep.spec.ts` -> pass
- `make verify-ux` -> pass
- `make verify` -> pass
- `make doctor` -> fail only on `G8-ci` (GitHub `verify` workflow on `main` failing externally; all local gates `G1..G7` passing)
