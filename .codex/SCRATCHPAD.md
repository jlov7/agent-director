## Current Task
Real trace corpus, dogfood evidence gate, and Diagnose UI excellence wave.

## Status
Complete

## Plan
1. [x] Load product/design context and inspect current trace/eval/replay implementation.
2. [x] Add an eight-fixture real/adversarial trace corpus and dogfood evidence script.
3. [x] Wire the evidence script into doctor/scorecard release pressure.
4. [x] Tighten Diagnose UI around import warnings, eval proof, and replay truth.
5. [x] Verify backend, frontend, visual, doctor, scorecard; commit and push.

## Decisions Made
- Treat "frontier" as falsifiable evidence: ugly traces must import, generate eval cases, run deterministically, and preserve replay truth.
- Keep the visual direction product-grade: dense evidence rails, clear warning states, no decorative motion or generic card proliferation.
- Extend release scoring instead of relying on the existing 70/70 optimism.

## Open Questions
- None blocking; user authorized autonomous ambitious work.

## Completion Evidence
- `python3 scripts/dogfood_trace_evidence.py` passes and emits `artifacts/dogfood-trace-evidence.json`.
- `make verify-frontend` passes, including deterministic visual verification and visual matrix.
- `make doctor` passes with `G1` through `G9`.
- `make scorecard` passes with `80/80`.
