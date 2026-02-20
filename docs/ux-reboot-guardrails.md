# UX Reboot Migration Guardrails

Date: 2026-02-20
Status: Active

These guardrails apply to all `UXR-*` implementation tasks.

## Product Guardrails

1. Keep one dominant primary CTA per major route viewport.
2. Keep advanced/rare controls behind explicit progressive disclosure.
3. Keep first-run flow to one decision at a time.
4. Keep route labels action-first and unambiguous.
5. Keep recovery actions explicit in error/empty states.

## Architecture Guardrails

1. Migrate route-by-route; do not big-bang replace app shell.
2. Keep backend and API contracts stable during IA migration.
3. Preserve command palette parity while simplifying visible chrome.
4. Remove legacy surfaces only after replacement test parity exists.
5. Prefer additive feature-flag rollout before hard cutover.

## Quality Guardrails

1. Add or update tests before behavior changes (TDD red-green cycle).
2. Enforce CTA and interaction-density assertions in automated tests.
3. Require accessibility checks on modified flows (keyboard + labels + landmarks).
4. Require performance checks on interaction-heavy changes.
5. Reject completion claims without fresh verification output.

## Tracker Guardrails

1. Update `TASKS.md` status per completed `UXR-*` item.
2. Keep `.codex/PLANS.md` and `.codex/SCRATCHPAD.md` current at each phase boundary.
3. Update evidence artifacts (`artifacts/ux-baseline.json`, delta artifacts) when measurements change.
4. Treat stale evidence as incomplete work.
