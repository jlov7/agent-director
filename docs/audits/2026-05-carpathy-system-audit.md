# Carpathy System Audit: May 2026

## Premise

The build is green, but green is only useful if the checks encode the right truth. The current product should be judged as an agent observability and improvement loop: ingest real traces, preserve provenance, convert runs into eval evidence, label replay honestly, and give operators a coherent command surface.

## Current Evidence

- `make doctor` was passing with `G1` through `G9`.
- `make scorecard` was passing at `80/80`.
- `artifacts/dogfood-trace-evidence.json` proved 8 fixtures across Agent Director JSON, OpenAI Agents-style spans, OTel GenAI, and OpenInference with deterministic evals and counterfactual replay truth.
- `App.tsx` is still large at 7,266 lines, but the most recent frontier work extracted trace/eval evidence into focused seams rather than doing a risky broad rewrite.

## Findings

| Rank | Area | Finding | Risk | Resolution |
|---|---|---|---|---|
| P0 | Release truth | `SCORECARDS.md` still advertised `70/70` after the Frontier Evidence Loop made the real bar `80/80`. | Humans can ship against stale evidence language. | Updated scorecards to the new `90/90` bar and added a coherence domain. |
| P0 | Product thesis | `WORLD_CLASS_RELEASE_TODO.md` remained at repo root and described a world-class game product. | A future agent or contributor could revive the wrong product direction. | Archived it under legacy notes and made root-level gameplay TODOs fail the coherence audit. |
| P1 | Audit durability | Product coherence was a manual judgment, not a gate. | Drift returns silently. | Added `scripts/system_coherence_audit.py`, `G10-system-coherence`, and a scorecard domain. |
| P1 | Burndown visibility | The step-back audit had no single burnable list. | Work becomes conversational instead of operational. | Added `BURNDOWN.md` with closed findings and evidence. |
| P2 | Frontend architecture | `App.tsx` remains too large to be comfortable. | Broad route-shell changes can be harder to reason about. | Keep extracting only at touched route seams; current release guard is evidence-based, not a risky bulk refactor. |

## Architecture Judgment

The deepest product seams are now:

- Trace import adapters in `server/trace/importers.py`.
- Trace store and detail records in `server/trace/store.py`.
- Eval persistence and deterministic runs in `server/evals/store.py`.
- Replay truth and branch construction in `server/replay/engine.py`.
- UI trace/eval evidence derivation in `ui/src/utils/traceEvidence.ts` and `ui/src/hooks/useEvalEvidence.ts`.

The main shallow module remains `ui/src/App.tsx`. It is acceptable only because recent work created route-level seams and because visual/E2E gates cover the current shell. The rule going forward is local extraction when a route changes, not architecture theatre.

## New Release Bar

- `G10-system-coherence` must pass in `make doctor`.
- `make scorecard` must pass at `90/90`.
- Active docs must not advertise stale scorecard totals.
- Legacy gameplay planning must remain archived unless explicitly revived behind a separate product decision.

## Outcome

No open P0/P1/P2 items remain from this audit. The important change is that product coherence is now executable evidence, not a note in a chat thread.
