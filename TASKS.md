# Agent Director — Perfecting Tasks

Below is the complete, prioritized list of "perfecting" work. Each item is framed as a checkable task. We can tackle them in batches instead of one‑by‑one.

## P0 — Must‑Have Excellence (UX + Correctness + Scale)
- [x] UX audit pass across Cinema / Flow / Compare / Inspector (spacing, hierarchy, zero dead‑zones)
- [x] Accessibility baseline: focus order, ARIA labels, keyboard traps, contrast check
- [x] Timeline virtualization for 500+ steps (windowed rows + offscreen pooling)
- [x] Flow graph windowing: edge pruning for large graphs + throttle layout updates
- [x] Timestamp normalization: detect skew/missing timestamps, label "timing degraded"
- [x] IO binding validation: emit→tool→consume chain sanity checks + warnings
- [x] Safe export enforcement across UI and MCP (no raw leaks)

## P1 — Polished UX (Delight + Flow)
- [x] Contextual onboarding tips and empty states
- [x] Per‑step type iconography and consistent badge system
- [x] Improved hover/selection feedback (micro‑motion + accessibility)
- [x] Tooltips for insight chips and controls
- [x] Persist user preferences (mode, overlays, windowed, safe export)

## P1 — Compare + Replay Clarity
- [x] Diff overlay in Cinema Mode (ghost trace + changed highlights)
- [x] Compare alignment by toolCallId + timestamp (stable matching)
- [x] Diff summary export (provenance + deltas)
- [x] Replay determinism: recorded cache + dependency invalidation

## P2 — Performance & Reliability
- [x] Prefetch step details near selection/playhead
- [x] Memoized graph layout cache by trace id
- [x] Trace store migrations + index optimization
- [x] Resilient ingest (partial traces + recovery)
- [x] Disk cleanup tools + snapshot export

## P2 — MCP Integration Hardening
- [x] JSON schema validation for MCP tool inputs/outputs
- [x] Host compatibility tests (stdio + streamable HTTP)
- [x] UI manifest versioning + compatibility policy

## P2 — Testing & Quality Gate Hardening
- [x] Visual regression tests for Cinema/Flow/Compare
- [x] Performance tests with 1k/5k step traces
- [x] Property‑based tests for timing/lane assignment
- [x] Contract tests for MCP tool APIs

## P3 — Documentation & Demo
- [x] README upgrade with screenshots + demo GIF
- [x] Short "How it works" diagrams (trace→store→UI)
- [x] Demo script refinements + canned traces

## Optional — Analytics & Insights Expansion
- [x] Critical path computation + concurrency heatmap
- [x] Cost breakdown by model/tool + trend deltas
- [x] Step retry patterns and reliability highlights
