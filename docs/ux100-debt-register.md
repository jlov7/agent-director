# UX100 Debt Register

Last updated: 2026-02-20
Source plan: `docs/plans/2026-02-19-ux100-execution-plan.md`

## Priority Rules
- `P0`: blocks clarity/comprehension of primary workflows.
- `P1`: materially impacts efficiency and confidence.
- `P2`: polish/consistency debt after primary usability closure.

## Active Debt

None.

## Closed Debt

| ID | Priority | Area | Debt | Impact | Owner | Status |
|---|---|---|---|---|---|---|
| UXD-001 | P0 | IA | Top-level navigation still mixes domain nouns and actions in some surfaces. | Slower orientation and task-start confusion. | Frontend | Closed (2026-02-20) |
| UXD-002 | P0 | IA | Secondary actions are still too visible in several panels. | Decision overload for first-run users. | Frontend | Closed (2026-02-20) |
| UXD-003 | P0 | Journey | Primary CTA discipline not yet enforced across all major screens. | Competing affordances reduce completion rates. | Frontend | Closed (2026-02-20) |
| UXD-004 | P0 | Accessibility | Full route-by-route semantic structure pass is incomplete. | Potential SR confusion and inconsistent landmarks. | Frontend | Closed (2026-02-20) |
| UXD-005 | P1 | Design System | Non-token styling values remain in older components. | Inconsistent visual rhythm and harder maintenance. | Frontend | Closed (2026-02-20) |
| UXD-006 | P1 | Interaction | Inline validation and recovery patterns differ by surface. | Uneven error recovery experience. | Frontend | Closed (2026-02-20) |
| UXD-007 | P1 | Responsive | Tablet split-view and touch target audits are not closed. | Reduced usability on medium/touch devices. | Frontend | Closed (2026-02-20) |
| UXD-008 | P1 | Performance | CI-level performance regression alerts not yet enforcing thresholds. | Risk of unnoticed perf drift. | Frontend | Closed (2026-02-20) |
| UXD-009 | P1 | Polish | Microcopy consistency across empty/loading/success states is incomplete. | Perceived product quality inconsistency. | Frontend | Closed (2026-02-20) |
| UXD-010 | P2 | Trust UX | Collaboration audit visibility can be expanded for sensitive actions. | Lower operator confidence in accountability tracing. | Frontend | Closed (2026-02-20) |

## Closure Evidence (UX Reboot)

- Closure commit: `b2f5036` (`feat(ux): deliver route-shell reboot and close release gates`)
- Linked reboot tasks: `UXR-016..UXR-100` in `TASKS.md`
- Verification evidence:
  - `make verify-strict` (full unit/E2E/mutation path green)
  - `make verify-ux` (83/83 Playwright + Lighthouse budgets)
  - `make release-safety` (includes `verify`, `doctor`, `scorecard`, `vercel-check`)
  - `artifacts/doctor.json` = `overall_status: pass`
  - `artifacts/scorecards.json` = `70/70` and `all_perfect: true`

## Closure Criteria
- A debt item is closed only after linked UX100 task(s) are marked `DONE` with verification evidence.
- Every closure must reference a commit SHA and verification command output.
