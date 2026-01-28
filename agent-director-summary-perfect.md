# Agent Director — One-Page Summary (Perfected)

```
    ___              _        ____  _               _
   / _ \__ _ _ __ __| |_   _ / ___|| |_ _ __ _   _(_)_ __
  / /_)/ _` | '__/ _` | | | | |    | __| '__| | | | | '_ \
 / ___/ (_| | | | (_| | |_| | |___ | |_| |  | |_| | | |_) |
 \/    \__,_|_|  \__,_|\__, |\____| \__|_|   \__,_|_| .__/
                       |___/                        |_|
```

## What It Is
Agent Director is a cinematic, chat-native trace debugger for AI agents, built as an MCP App (runs inside Claude/ChatGPT). It makes agent runs **visible**, **comparable**, and **replayable**—without a separate dashboard.

## The Hook
> "Watch your agent think. Then direct it."

## Why It's Impressive
- **Chat-native**: A real UI inside the conversation (MCP App), not another dashboard.
- **Faithful playback**: Timeline is driven by **absolute timestamps** (not summed durations), and correctly handles **overlaps/parallel spans** via lanes.
- **Debuggable visuals**: Built-in **Insight Strip** surfaces bottlenecks, cost, errors/retries, and parallelism at a glance.
- **Trustworthy timing**: Detects missing/skewed timestamps and labels “timing degraded.”
- **Novel interaction**: Cinematic timeline ↔ node graph **morph** (FLIP, no flicker).
- **Meaningful graph**: Flow Mode can toggle edge layers (**Structure**, **Sequence**, **I/O binding**).
- **Director’s Cut**: Edit (tool params first), replay using a clear strategy (Recorded / Live / Hybrid), then diff/compare.
- **Real-world ready**: **Lazy-loaded** step payloads + **redaction-by-default** + large-trace navigation & virtualization.
- **Shareable diffs**: Exportable compare summaries with provenance + deltas.

## The Three Magic Moments
1. **Cinema Mode** — Film-like playback of the run, with performance overlays and accurate timing.
2. **The Morph** — Timeline FLIP-morphs into a graph and exposes structure + dependencies.
3. **Director’s Cut** — Edit a step, choose replay strategy, and compare the branch to the original.

## Core Features (V1.0 → V1.2)
- Cinema timeline (timestamp-accurate, overlap lanes, scrub/play/speed)
- Inspector (on-demand step details via `get_step_details`)
- Flow Mode (React Flow) with edge layers toggle
- Insight Strip (latency/cost breakdown, errors/retries, critical path (wall time) vs total work)
- Search/filter/collapse for large traces + virtualization
- Privacy: redaction by default + click-to-reveal + “safe export” mode
- Director’s Cut: edit tool params + replay strategies + run diff + ghost overlay

## Tech Stack
- **Server**: Python + MCP SDK + SQLite (+ blob store for large step payloads)
- **UI**: React + TypeScript + Framer Motion + React Flow
- **Layout/Perf**: dagre, viewport rendering / virtualization, lazy-loading

## Build Timeline (Optimized)
| Milestone | Days | What You Can Demo |
|---|---:|---|
| P0: Correct + Fast Playback | 7–10 | Timestamp-accurate Cinema Mode + Inspector + Insight Strip + lazy-load |
| P1: Graph + Morph | 5–7 | Edge layers + robust FLIP morph + graph inspection |
| P2: Director’s Cut | 7–12 | Edit tool params + replay (Recorded/Live/Hybrid) + diff/ghost overlay |
| Polish | 3–5 | Redaction UX + large-trace nav + README/GIF/demo video |

## Demo Script (90 seconds)
1. “Show me my last run” → Cinema Mode plays with Insight Strip highlighting bottlenecks
2. Click a slow step → on-demand details load in inspector (no heavy payload upfront)
3. Toggle Flow → morph to graph; enable **I/O edges** to see tool bindings
4. Edit a tool step → replay with “Hybrid” strategy → new run appears as a branch
5. Side-by-side diff + ghost overlay → “Watch your agents think. Then direct them.”
