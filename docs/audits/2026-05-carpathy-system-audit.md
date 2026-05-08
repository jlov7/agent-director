# Carpathy System Audit: May 2026

## Premise

The build is green, but green is only useful if the checks encode the right truth. The current product should be judged as an agent observability and improvement loop: ingest real traces, preserve provenance, convert runs into eval evidence, label replay honestly, and give operators a coherent command surface.

## Current Evidence

- `make doctor` is passing with `G1` through `G10`.
- `make scorecard` is passing at `90/90`.
- `artifacts/dogfood-trace-evidence.json` proved 8 fixtures across Agent Director JSON, OpenAI Agents-style spans, OTel GenAI, and OpenInference with deterministic evals and counterfactual replay truth.
- `docs/videos/agent-director-overview/renders/agent-director-overview.mp4` gives the repository a proof-film front door for the trace-to-eval and replay-truth loop.
- `App.tsx` is still large, but the most recent frontier work extracted trace/eval evidence into focused seams rather than doing a risky broad rewrite.

## Findings

| Rank | Area | Finding | Risk | Resolution |
|---|---|---|---|---|
| P0 | Release truth | `SCORECARDS.md` still advertised an older seven-domain bar after the Frontier Evidence Loop had raised the standard. | Humans can ship against stale evidence language. | Updated scorecards to the current `90/90` bar and added a coherence domain. |
| P0 | Product thesis | A legacy gameplay release tracker remained at repo root and described the wrong product direction. | A future agent or contributor could revive the wrong product direction. | Archived it under legacy notes and made root-level gameplay trackers fail the coherence audit. |
| P1 | Audit durability | Product coherence was a manual judgment, not a gate. | Drift returns silently. | Added `scripts/system_coherence_audit.py`, `G10-system-coherence`, and a scorecard domain. |
| P1 | Burndown visibility | The step-back audit had no single burnable list. | Work becomes conversational instead of operational. | Added `BURNDOWN.md` with closed findings and evidence. |
| P1 | Repo front door | The overview film became a key product artifact, but its README linkage and render presence were not release-blocking. | The most legible product explanation could disappear while gates stay green. | Added overview-film presence, poster, render, source, and root-composition budget checks to system coherence. |
| P2 | Frontend architecture | `App.tsx` remains too large to be comfortable. | Broad route-shell changes can be harder to reason about. | Keep extracting only at touched route seams; current release guard is evidence-based, not a risky bulk refactor. |
| P2 | Media source maintainability | The first HyperFrames film source rendered correctly but emitted a file-size maintainability warning. | Future edits would be harder to review. | Split the film into five segment compositions; HyperFrames check now reports zero warnings. |

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
- README overview media must remain present, linked, rendered, and backed by reviewable segmented HyperFrames source.

## Outcome

No open P0/P1/P2 items remain from this audit. The important change is that product coherence, including the repo front-door film, is now executable evidence rather than a note in a chat thread.
