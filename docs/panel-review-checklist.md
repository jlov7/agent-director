# Panel Review Checklist

## 1) Correctness (must pass)
- [ ] Timeline positions reflect absolute timestamps, not summed durations.
- [ ] Overlap lanes are consistent and deterministic.
- [ ] Compare alignment prefers ID → toolCallId → timestamp.
- [ ] Diff summary includes added/removed/changed + cost/wall time deltas.
- [ ] Replay strategy is explicit and preserved in metadata.

## 2) Safety & Privacy (must pass)
- [ ] Step payloads are redacted by default.
- [ ] Reveal requires explicit user action.
- [ ] Safe export blocks raw mode and reveal paths.
- [ ] Exported diffs never include raw payloads.

## 3) Performance (must pass)
- [ ] Large traces remain interactive (windowing + virtualization).
- [ ] Flow layout is cached and stable per trace id.
- [ ] Prefetching reduces inspector latency.

## 4) UX Clarity (must pass)
- [ ] One-click path to Cinema → Flow → Compare.
- [ ] Inspector explains status, tokens, cost, and redaction.
- [ ] Tooltips explain controls and insight chips.
- [ ] Keyboard shortcuts are discoverable and functional.

## 5) QA & Reliability (must pass)
- [ ] `make verify` passes end‑to‑end.
- [ ] `make verify-strict` passes mutation checks.
- [ ] Visual regression snapshots are up‑to‑date.
- [ ] MCP contracts validate inputs/outputs.

## 6) Presentation Quality (must pass)
- [ ] README tells the product story concisely.
- [ ] Diagrams match implementation semantics.
- [ ] Visual system is documented and consistent.
- [ ] Demo script runs in under 90 seconds.

## Final Decision
- [ ] PASS — acceptable for expert panel
- [ ] HOLD — address items above

Reviewer notes:

- …
