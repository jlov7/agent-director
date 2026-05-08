## Current Task
Carpathy system audit, coherence burndown, and executable release drift guard.

## Status
Complete

## Plan
1. [x] Audit current evidence artifacts, product/design docs, release docs, and active planning files.
2. [x] Identify product/release drift that green gates did not previously catch.
3. [x] Add a durable burndown and written audit artifact.
4. [x] Archive legacy gameplay planning outside the active root.
5. [x] Add executable system coherence audit and wire it into doctor/scorecard.

## Decisions Made
- Treat green gates as insufficient unless they encode product truth.
- Archive stale gameplay planning rather than deleting it, preserving history while removing active product drift.
- Add System Coherence as its own scored release domain so documentation/product drift is not a manual review step.

## Open Questions
- None blocking; user authorized autonomous ambitious work.

## Completion Evidence
- `python3 scripts/system_coherence_audit.py` passes and emits `artifacts/system-coherence-audit.json`.
- `python3 -m unittest server.tests.test_system_coherence_audit` passes.
- `make doctor` passes with `G10-system-coherence`.
- `make scorecard` passes with `90/90`.
