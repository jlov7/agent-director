# Non-Technical Guide

This guide explains Agent Director in plain language for product, operations, leadership, customer-facing teams, and demo audiences.

## What Agent Director Is

Agent Director helps teams understand what an AI agent did, why it did it, and what changed after a fix.

Think of it as:
- A **video player** for agent behavior (timeline playback)
- A **map** of cause and effect (flow graph)
- A **safe experimentation desk** (replay + compare)

## Why It Matters

Without this kind of visibility, teams lose time in scattered logs and guesswork.

With Agent Director, teams can:
- Detect problems faster
- Explain incidents clearly to stakeholders
- Reproduce and compare fixes before rollout
- Share evidence safely without leaking sensitive data

## Who Uses It

- **Product managers:** understand failure patterns and user impact.
- **Support/operations:** triage incidents and hand off cleanly.
- **Engineering leaders:** assess reliability and release readiness.
- **Demo teams/sales engineers:** tell a clear story in minutes.

## The Core Story (3 Acts)

1. **Observe**
Load the latest run and watch exactly what happened in time order.

2. **Inspect**
Open the step that looks suspicious and examine structured details.

3. **Direct**
Replay from a chosen point, compare outcomes, and export the summary for review.

## 90-Second Demo Path

1. Open Agent Director and load the latest run.
2. Press play in Cinema mode.
3. Click a high-latency step in Insight Strip.
4. Switch to Flow mode to show structure.
5. Replay from a tool step and move to Compare.
6. Export the diff summary.

Detailed narration: [`demo-script.md`](demo-script.md)

## Typical Use Cases

- **Incident review:** Why did a run fail in production?
- **Release gate check:** Did a new strategy improve reliability or regress cost?
- **Team handoff:** Can we share an actionable run summary without exposing secrets?
- **Experimentation:** Which scenario change has the highest positive impact?

## Safety and Trust

Agent Director uses safety-by-default behaviors:
- Sensitive fields are redacted by default.
- Reveals are explicit and scoped.
- Safe export mode keeps shared artifacts redaction-safe.

## Success Looks Like

A healthy implementation usually shows:
- Shorter mean time to diagnose incidents
- Faster cross-team handoffs
- Fewer "cannot reproduce" cases
- Better confidence in release decisions

## Where To Go Next

- Product story: [`story.md`](story.md)
- User journey maps: [`user-journeys.md`](user-journeys.md)
- Executive summary: [`executive-summary.md`](executive-summary.md)
- Full docs hub: [`index.md`](index.md)
