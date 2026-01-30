# Story: Agent Director

## The problem
Agents are now orchestration engines: multiple tools, overlapping spans, retries, and emergent behaviors. Today we still debug them like 2015—by reading logs. That gap is the opportunity.

## The core insight
If you can **watch** a run unfold, you can **direct** it. When the UI is cinematic and faithful to time, everything else—bottlenecks, concurrency, errors, retries—becomes obvious.

## The promise
> “Watch your agent think. Then direct it.”

Agent Director turns traces into a film strip you can scrub, inspect, and replay. It’s chat-native, fast to load, safe to share, and built around the magical moment of the timeline morphing into a graph.

## Why now
- Tool-using agents are everywhere.
- Existing dashboards are detached from the place people work: chat.
- We finally have rich traces (time, IO, tool call IDs) to render truthfully.

## Principles
1. **Truthful time** — absolute timestamps, overlap lanes, no summed-duration fiction.
2. **Meaningful structure** — graph edges reflect semantics, not just order.
3. **Replay with integrity** — replay strategy is explicit, and diffs are explainable.
4. **Safe by default** — redaction-first, explicit reveals, safe export guardrails.
5. **Instant comprehension** — insight strip surfaces the story in 5 seconds.

## The three magic moments
1. **Cinema Mode** — faithful playback with bottlenecks and parallelism visible.
2. **The Morph** — timeline morphs to graph without flicker (FLIP animation).
3. **Director’s Cut** — edit a step, choose a strategy, replay and diff.

## The demo accelerants
- **Story mode** auto-runs the narrative for instant demos.
- **Command palette** exposes every action in two keystrokes.

## Storyboard (ASCII)
```
[ Load run ] -> [ Cinema playback ] -> [ Inspect step ]
                          |                 |
                          v                 v
                    [ Morph to Flow ]  [ Edit + Replay ]
                          |                 |
                          v                 v
                    [ Overlay + Diff ] -> [ Export summary ]
```
