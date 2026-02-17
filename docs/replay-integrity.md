# Replay + State Integrity Controls

Last updated: 2026-02-17

## Objective

Guarantee deterministic replay behavior and provide a clear recovery path when replay artifacts are missing or corrupted.

## Determinism Model

- Replay trace IDs are derived from canonical replay input:
  - `trace_id`
  - `step_id`
  - `strategy`
  - canonicalized `modifications`
- Replay timestamps are deterministically shifted from source trace start.
- Invalidated steps are derived from deterministic dependency traversal.
- Replay checkpoints include step signatures (`replay.checkpoints`) for integrity auditing.

## Integrity Safeguards

- Replay job scenarios enforce allowed strategies only (`recorded/live/hybrid`).
- Step anchor validation rejects unknown replay anchor IDs.
- Scenario count guardrails prevent oversized replay batches.
- Replay matrix summarization tolerates partial failures and preserves explicit scenario status.

## Corruption Recovery Path

If replay artifacts are missing or inconsistent:

1. Re-run replay from the same anchor step and strategy.
2. Compare replay checkpoint signatures against prior export metadata.
3. Rebuild missing detail files using source trace + replay regeneration.
4. Export a fresh snapshot with `python3 scripts/store_maintenance.py snapshot --output ./agent-director-snapshot.zip`.

## Verification Evidence

- `server/tests/test_replay_engine.py`
- `server/tests/test_replay_jobs.py`
- `server/tests/test_matrix.py`
- `server/tests/test_large_trace.py`
