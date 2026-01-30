% Agent Director — Executive Summary
% Jason Lovell
% January 30, 2026

# Executive Summary

Agent Director is a cinematic, chat-native trace debugger for AI agents. It makes agent runs **visible**, **comparable**, and **replayable** inside the chat experience—no separate dashboard required.

## The problem
Modern agents are multi-step, parallel, and tool-heavy. Debugging still relies on logs and dashboards, creating slow feedback cycles and limited comprehension.

## The solution
Agent Director turns traces into a film strip and a semantic graph, with replay and diff to run experiments safely.

## Key differentiators
- **Truthful time:** absolute timestamps with overlap lanes (no summed-duration fiction).
- **Meaningful graph:** edges map structure, sequence, and I/O binding.
- **Replay integrity:** strategies are explicit, invalidation is deterministic, diffs are exportable.
- **Safe by default:** redaction-first with explicit reveal and safe export enforcement.
- **Instant insight:** top latency, cost, errors, critical path, and concurrency at a glance.
- **Instant onboarding:** intro overlay, director briefing, guided tour, and explain mode.

## Proof of quality
- Full `make verify` and `make verify-strict` suites are green.
- Visual regression snapshots + mutation testing are enabled.
- MCP contracts validate inputs/outputs.

## Demo (90 seconds)
1. Load the latest run and play the timeline.
2. Jump to the bottleneck via Insight Strip.
3. Morph to Flow and enable I/O edges.
4. Replay from a tool step and Compare.
5. Export the diff summary.

## Call to action
Agent Director establishes a new standard for trace debugging.
