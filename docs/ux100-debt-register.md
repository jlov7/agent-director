# UX100 Debt Register

Last updated: 2026-02-19
Source plan: `docs/plans/2026-02-19-ux100-execution-plan.md`

## Priority Rules
- `P0`: blocks clarity/comprehension of primary workflows.
- `P1`: materially impacts efficiency and confidence.
- `P2`: polish/consistency debt after primary usability closure.

## Active Debt

| ID | Priority | Area | Debt | Impact | Owner | Status |
|---|---|---|---|---|---|---|
| UXD-001 | P0 | IA | Top-level navigation still mixes domain nouns and actions in some surfaces. | Slower orientation and task-start confusion. | Frontend | Open |
| UXD-002 | P0 | IA | Secondary actions are still too visible in several panels. | Decision overload for first-run users. | Frontend | Open |
| UXD-003 | P0 | Journey | Primary CTA discipline not yet enforced across all major screens. | Competing affordances reduce completion rates. | Frontend | Open |
| UXD-004 | P0 | Accessibility | Full route-by-route semantic structure pass is incomplete. | Potential SR confusion and inconsistent landmarks. | Frontend | Open |
| UXD-005 | P1 | Design System | Non-token styling values remain in older components. | Inconsistent visual rhythm and harder maintenance. | Frontend | Open |
| UXD-006 | P1 | Interaction | Inline validation and recovery patterns differ by surface. | Uneven error recovery experience. | Frontend | Open |
| UXD-007 | P1 | Responsive | Tablet split-view and touch target audits are not closed. | Reduced usability on medium/touch devices. | Frontend | Open |
| UXD-008 | P1 | Performance | CI-level performance regression alerts not yet enforcing thresholds. | Risk of unnoticed perf drift. | Frontend | Open |
| UXD-009 | P1 | Polish | Microcopy consistency across empty/loading/success states is incomplete. | Perceived product quality inconsistency. | Frontend | Open |
| UXD-010 | P2 | Trust UX | Collaboration audit visibility can be expanded for sensitive actions. | Lower operator confidence in accountability tracing. | Frontend | Open |

## Closure Criteria
- A debt item is closed only after linked UX100 task(s) are marked `DONE` with verification evidence.
- Every closure must reference a commit SHA and verification command output.
