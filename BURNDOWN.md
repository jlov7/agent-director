# Carpathy System Audit Burndown

Status legend: `Open` | `In Progress` | `Done`

This burndown records the May 8, 2026 step-back audit. The goal is not to admire a green build; it is to make product truth, release evidence, and operator trust harder to regress.

## Current Score

- Doctor: `pass`, `G1` through `G10` required.
- Scorecard: `90/90`, all domains `10/10` required.
- Product bar: trace ingestion, provenance, trace-to-eval, truthful replay, visual clarity, and documentation coherence must all be release evidence.

## Burned Down

| Priority | ID | Status | Finding | Action | Evidence |
|---|---|---|---|---|---|
| P0 | CARP-P0-001 | Done | Active scorecard docs still described the previous seven-domain release bar. | Updated scorecard docs to include Frontier Evidence Loop, System Coherence, and `90/90`. | `SCORECARDS.md`; `make scorecard`. |
| P0 | CARP-P0-002 | Done | A root-level legacy gameplay release tracker contradicted the current agent observability product thesis. | Archived the legacy gameplay tracker under `docs/archive/legacy-notes/` so it no longer reads as active product direction. | `docs/archive/legacy-notes/world-class-release-todo-gameplay.md`; system coherence audit. |
| P1 | CARP-P1-001 | Done | Product/documentation coherence was manually reviewed but not release-blocking. | Added `scripts/system_coherence_audit.py` and wired it into doctor as `G10-system-coherence`. | `artifacts/system-coherence-audit.json`; `make doctor`. |
| P1 | CARP-P1-002 | Done | Scorecards proved technical gates but did not separately score product coherence. | Added a System Coherence scorecard domain. | `artifacts/scorecards.json`; `make scorecard`. |
| P1 | CARP-P1-003 | Done | The audit itself needed a durable, reviewable artifact. | Added this burndown and a written audit report. | `BURNDOWN.md`; `docs/audits/2026-05-carpathy-system-audit.md`. |
| P1 | CARP-P1-004 | Done | The new overview film improved the repo front door, but media presence was not part of executable product coherence. | Added the overview film, poster, source composition, and README linkage to the system coherence audit. | `scripts/system_coherence_audit.py`; `docs/videos/agent-director-overview/`; `make doctor`. |
| P1 | CARP-P1-005 | Done | Active audit and `.codex` planning docs still contained older scorecard totals and an unchecked film ship step after the branch had moved to the `90/90` bar. | Removed stale scorecard totals from active steering docs, marked the film ship work complete, and expanded system coherence to scan active audits plus `.codex/PLANS.md`. | `scripts/system_coherence_audit.py`; `.codex/PLANS.md`; `.codex/SCRATCHPAD.md`; `python3 scripts/system_coherence_audit.py`. |
| P2 | CARP-P2-001 | Done | `App.tsx` remains large, but broad extraction without a touched seam would be riskier than useful right now. | Kept the prior route/eval seams and made coherence evidence release-blocking; future UI work should extract only where a route change gives a real seam. | `.codex/PLANS.md`; existing route/eval tests. |
| P2 | CARP-P2-002 | Done | HyperFrames source rendered correctly but still emitted a maintainability warning because the proof film lived in one long composition file. | Split the film into five segment compositions with a small root composition. | `npm run check` in `docs/videos/agent-director-overview` reports `0 errors, 0 warnings`. |

## Closed Criteria

- No open P0/P1/P2 rows from this audit.
- Product drift has an executable guard.
- Release gates and scorecards agree on the current bar.
- Legacy gameplay planning is archived rather than active.
- The overview film is a release-visible artifact with executable presence checks.
