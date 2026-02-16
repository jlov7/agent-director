# Overnight UX Transformation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver ten high-impact frontend UX upgrades in one tracked sprint with test coverage and verification evidence.

**Architecture:** Build additive UX layers on top of existing App orchestration and shared components (`Header`, `IntroOverlay`, `JourneyPanel`, `CommandPalette`, `DirectorBrief`). Keep state in `App.tsx` and pass down typed props; preserve current data contracts and backend APIs.

**Tech Stack:** React, TypeScript, Vitest, Playwright-ready DOM patterns, CSS token system in `ui/src/styles/main.css`.

---

## Requirements

1. Add mission pulse, health, motion controls, and handoff action entry points in top-level UX.
2. Add adaptive launch paths in intro flow with persisted preference and startup wiring.
3. Add journey priority queue with actionable severity-ranked items.
4. Add command palette recents/pinned/macros behavior.
5. Add tabbed Director Brief workspace and action-plan completion UX.
6. Add mobile quick rail and responsive polish.
7. Add/refresh component tests for changed behaviors.
8. Run `pnpm -C ui typecheck` and `pnpm -C ui test`.
9. Update task tracking artifacts to complete status.

## Files In Scope

- `ui/src/App.tsx`
- `ui/src/components/Header/index.tsx`
- `ui/src/components/common/IntroOverlay.tsx`
- `ui/src/components/common/JourneyPanel.tsx`
- `ui/src/components/common/CommandPalette.tsx`
- `ui/src/components/common/DirectorBrief.tsx`
- `ui/src/styles/main.css`
- `ui/src/components/__tests__/Header.test.tsx`
- `ui/src/components/__tests__/IntroOverlay.test.tsx`
- `ui/src/components/__tests__/CommandPalette.test.tsx`
- `ui/src/components/__tests__/DirectorBrief.test.tsx`
- `ui/src/components/__tests__/JourneyPanel.test.tsx` (new)

## Validation Gates

1. Component tests pass for touched components.
2. `pnpm -C ui typecheck` passes.
3. `pnpm -C ui test` passes.
4. Task/plan artifacts reflect final status and evidence.

## Risks

- Existing tests that assert exact UI labels may require expected-value updates.
- CSS additions could impact visual baselines; keep selectors scoped and additive.
- New localStorage-backed preferences must avoid SSR assumptions and null-safe browser APIs.
