# Agent Director: Complete Build Playbook (Perfected)

> **Version:** 1.2.0  
> **Last Updated:** January 28, 2026  
> **Status:** Ready for Build (Codex-ready)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Strategy](#2-product-vision--strategy)
3. [User Stories & Magic Moments](#3-user-stories--magic-moments)
4. [Technical Architecture](#4-technical-architecture)
5. [Data Model, Semantics & Storage](#5-data-model-semantics--storage)
6. [UI/UX Specification](#6-uiux-specification)
7. [Build Phases & Milestones](#7-build-phases--milestones)
8. [File Structure](#8-file-structure)
9. [Implementation Details](#9-implementation-details)
10. [Master Prompts for Codex](#10-master-prompts-for-codex)
11. [Testing & Quality Assurance](#11-testing--quality-assurance)
12. [Edge Cases & Error Handling](#12-edge-cases--error-handling)
13. [Demo Script](#13-demo-script)
14. [Dissemination Strategy](#14-dissemination-strategy)

Appendices:
- [A. Sample Trace Fixture (with overlap + toolCallId)](#appendix-a-sample-trace-fixture-with-overlap--toolcallid)
- [B. Replay Strategies (Recorded / Live / Hybrid)](#appendix-b-replay-strategies-recorded--live--hybrid)
- [C. Redaction Policy & Safe Export](#appendix-c-redaction-policy--safe-export)

---

## 1. Executive Summary

### What Is Agent Director?

Agent Director is an MCP App that transforms how people understand and debug AI agent runs. It is designed around three “magic moments”:

1. **Cinema Mode** — timestamp-accurate, cinematic playback of a run (including overlaps/parallel spans)
2. **Flow Mode** — the same run as a graph with meaningful edge layers (Structure / Sequence / I/O binding)
3. **Director’s Cut** — edit a step, choose a replay strategy (Recorded / Live / Hybrid), and see diffs

### The One-Liner

> "Watch your agent think. Then direct it."

### What Makes This “Real,” Not Just Flashy

- **Correct on real traces**: playback is driven by absolute timestamps; overlaps are visualized via lanes (no “sum of durations” artifact).
- **Fast initial render**: `show_trace` returns step summaries and previews only; heavy payloads load on demand via `get_step_details`.
- **Debuggable at a glance**: an **Insight Strip** surfaces bottlenecks, cost, errors/retries, and parallelism immediately.
- **Meaningful Flow Mode**: edges can be toggled by semantics:
  - **Structure** (parent/child)
  - **Sequence** (chronological)
  - **I/O binding** (toolCallId wiring)
- **Shareable**: redaction-by-default + click-to-reveal + safe export mode (for screenshots/GIFs).

### Success Criteria

1. **Demo Impact**: A 90-second demo lands: “this is the best trace visualization I’ve seen.”
2. **Correctness**: Works on OpenAI Agents SDK traces with nested spans and parallel tool calls.
3. **Speed**: UI is interactive quickly after `show_trace` (details lazy-load).
4. **Director’s Cut credibility**: Replay explains itself (Recorded/Live/Hybrid) and preserves provenance.
5. **Shareability**: Can share the UI output redacted without leaking secrets.

---

## 2. Product Vision & Strategy

### Vision Statement

Agent Director makes agent behavior **visible and malleable**. Instead of reading logs or dashboards, you watch a run unfold—then change a decision and replay from that point.

### Positioning

| Existing Tools | Agent Director |
|---|---|
| Separate dashboards | Inside the chat (MCP App UI) |
| Static trace views | Animated playback with real timing |
| Read-only inspection | Edit + replay + compare |
| Single view | Timeline **and** graph (with morph) |
| Tool-agnostic but shallow | Tool-agnostic **and** semantically wired edges |

### Target Users

- **Primary:** AI/ML engineers building agentic systems
- **Secondary:** engineering leaders evaluating reliability/cost
- **Tertiary:** anyone trying to understand “what actually happened”

---

## 3. User Stories & Magic Moments

### Core User Stories

#### US-1: Watch a Run (timestamp-accurate)
> As an engineer, I want to watch my agent’s last run play back cinematically, so I can understand what happened without reading logs.

**Acceptance Criteria**
- `show_trace` loads a **lightweight** TraceSummary (no huge payload fetch).
- Timeline positions are derived from `startedAt/endedAt` (absolute timestamps).
- Playback cursor advances in **wall-clock time**.
- Overlapping steps render in separate **lanes**.
- Controls: play/pause/scrub/speed.
- Performance overlays: slowest step badge, cost badge, “jump to bottleneck.”

#### US-2: Inspect a Step (lazy-loaded + redaction)
> As an engineer, I want to click on any step and see full details, so I can understand exactly what happened.

**Acceptance Criteria**
- Clicking a step opens inspector and triggers `get_step_details` for that step only.
- Inspector shows redacted values by default and indicates what was redacted.
- User can click-to-reveal specific fields (prompt/tool I/O) via explicit UI action.
- Copy respects safe export mode (copies redacted by default).

#### US-3: Switch to Flow View (semantic edges)
> As an engineer, I want to see my run as a node graph, so I can understand structure and dependencies.

**Acceptance Criteria**
- Mode toggle triggers morph: timeline cards morph into graph nodes (robust FLIP; no flicker).
- Graph provides edge layer toggles:
  - **Structure**: parent/child spans
  - **Sequence**: chronological flow (within parent scope)
  - **I/O binding**: LLM toolCall → tool step → consuming LLM
- Clicking a node opens the same inspector.

#### US-4: Director’s Cut (edit + replay strategies)
> As an engineer, I want to modify a step and replay from that point, so I can test “what if” scenarios.

**Acceptance Criteria**
- Edit scope is explicit and staged:
  - **Tool step edits (default):** tool name + JSON params
  - **Model knob edits:** temperature/top_p/seed (if supported)
  - **Prompt edits (optional):** behind a “dangerous” toggle, clearly labeled nondeterministic
- Replay strategy is selectable: Recorded / Live / Hybrid.
- Branch is saved as a new trace with provenance (parentTraceId, branch point, modifications, strategy).

#### US-5: Compare Runs
> As an engineer, I want to compare two runs side-by-side, so I can see what changed.

**Acceptance Criteria**
- Side-by-side synchronized playback (wall time).
- Diff highlights steps added/removed/changed.
- Summary: steps changed count, cost delta, wall time delta.
- Optional ghost overlay in Cinema Mode: parent run in the background.

#### US-6: Handle Large Traces
> As an engineer, I want to navigate long traces efficiently.

**Acceptance Criteria**
- Search: `tool:web_search`, `type:llm_call`, `error:true`, free text.
- Filters by step type/status.
- Collapse/expand nested spans.
- Viewport rendering / virtualization for 200+ steps.
- “Jump to bottleneck” and “jump to first error.”

---

### Magic Moments (The “Wow” Points)

#### Magic Moment 1: First Playback
A run loads quickly. Steps appear in rhythm. Bottlenecks and parallelism are obvious.

**Technical requirement**
- Playback driven by timestamps with lane overlap handling.
- Smooth 60fps motion, but accuracy comes first.

#### Magic Moment 2: The Morph (robust)
Timeline doesn’t disappear; it **morphs** into a graph.

**Technical requirement**
- Precompute graph layout first.
- Measure timeline DOM rects.
- FLIP animate the same cards into target positions.
- Mount React Flow after morph completes (prevents flicker/transform jumps).

#### Magic Moment 3: Director’s Cut
Edit a tool call, replay, and watch the run diverge. Original ghosts behind the branch.

**Technical requirement**
- Branch provenance is first-class.
- Replay strategy is explicit and displayed in the UI.
- Diff is readable in <10 seconds.

---

## 4. Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Host (Claude/ChatGPT)                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Chat Interface                          │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              Sandboxed Iframe                        │  │  │
│  │  │  ┌─────────────────────────────────────────────┐    │  │  │
│  │  │  │         Agent Director UI (React)           │    │  │  │
│  │  │  │  - Cinema Mode (timestamp lanes)            │    │  │  │
│  │  │  │  - Flow Mode (edge layers)                  │    │  │  │
│  │  │  │  - Inspector (lazy-loaded details)          │    │  │  │
│  │  │  │  - Insight Strip (bottlenecks/cost/errors)  │    │  │  │
│  │  │  └─────────────────────────────────────────────┘    │  │  │
│  │  │                       │                              │  │  │
│  │  │                       │ postMessage (JSON-RPC)       │  │  │
│  │  │                       ▼                              │  │  │
│  │  └───────────────────────────────────────────────────────┘  │
│  │                          │                                   │
│  │                          │ MCP Protocol                      │
│  │                          ▼                                   │
│  └──────────────────────────────────────────────────────────────┘
│                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Director MCP Server                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │ list_traces    │  │ show_trace     │  │ get_step_details│     │
│  └────────────────┘  └────────────────┘  └────────────────┘     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │ replay_from_step│  │ compare_traces │  │ (optional)     │     │
│  └────────────────┘  └────────────────┘  └────────────────┘     │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Trace Store                                               │   │
│  │ - SQLite index (metadata + step summaries)                │   │
│  │ - JSON trace summary file                                 │   │
│  │ - Blob store for step details (optionally gzip)           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Trace Sources                        │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │ OpenAI Agents  │  │ LangSmith      │  │ Langfuse        │     │
│  │ SDK Traces     │  │ Export (future)│  │ Export (future) │     │
│  └────────────────┘  └────────────────┘  └────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### MCP Server (Python)
- Tool endpoints: list/show/details/replay/compare
- Trace store: summaries + blobs
- Normalizer: adapters for trace sources
- Insights + redaction: computed server-side

#### UI (React + TypeScript)
Cores
- Cinema Mode: timestamp axis + overlap lanes
- Flow Mode: edge layer toggles + graph interaction
- Morph Layer: FLIP animation orchestrator
- Inspector: lazy-loaded step details with redaction UX
- Compare: side-by-side + ghost overlay

---

## 5. Data Model, Semantics & Storage

This section is the “correctness backbone.” It prevents the classic failure mode where the UI looks cinematic but lies about what happened.

### 5.1 Canonical Trace Model (summary vs details)

**Principle:** `show_trace` must not ship megabytes of prompt/tool output. It returns step summaries and previews only. Step details are fetched on demand.

```ts
// Returned by show_trace (lightweight)
export interface TraceSummary {
  id: string;
  name: string;

  startedAt: string; // ISO 8601
  endedAt: string | null;
  status: 'running' | 'completed' | 'failed';

  metadata: {
    source: 'openai_agents' | 'langsmith' | 'langfuse' | 'manual';
    agentName: string;
    modelId: string;

    // Wall-clock duration (end-start), NOT sum(durations)
    wallTimeMs: number;

    // Optional: sum of step durations (shows parallelism)
    workTimeMs?: number;

    totalTokens?: number;
    totalCostUsd?: number;
    errorCount?: number;
    retryCount?: number;
  };

  steps: StepSummary[];

  // Replay provenance (branched traces)
  parentTraceId?: string;
  branchPointStepId?: string;
  replay?: {
    strategy: 'recorded' | 'live' | 'hybrid';
    modifiedStepId: string;
    modifications: Record<string, unknown>;
    createdAt: string; // ISO 8601
  };
}

export interface StepSummary {
  id: string;
  index: number;

  type: StepType;
  name: string;

  startedAt: string;
  endedAt: string | null;
  durationMs?: number;

  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;

  parentStepId?: string;
  childStepIds: string[];

  attempt?: number;
  retryOfStepId?: string;

  metrics?: { tokensTotal?: number; costUsd?: number };

  preview?: {
    title?: string;
    subtitle?: string;
    inputPreview?: string;
    outputPreview?: string;
  };

  // Lightweight IO wiring metadata (so Flow I/O edges can render without fetching heavy step details)
  io?: {
    emittedToolCallIds?: string[];   // toolCall IDs emitted by this step (assistant toolCalls)
    consumedToolCallIds?: string[];  // toolCall IDs consumed by this step (prompt tool messages)
  };

  toolCallId?: string; // for IO binding edges (tool_call steps)
}

export type StepType = 'llm_call' | 'tool_call' | 'decision' | 'handoff' | 'guardrail';

// Returned by get_step_details (heavy)
export interface StepDetails extends StepSummary {
  data: LLMCallData | ToolCallData | DecisionData | HandoffData | GuardrailData;

  redaction?: {
    mode: 'redacted' | 'raw';
    fieldsRedacted: Array<{ path: string; kind: 'secret' | 'pii' | 'token' }>;
  };
}
```

### 5.2 Message + ToolCall identity (for IO binding)

```ts
export interface ToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;

  toolCalls?: ToolCall[]; // assistant emits
  toolCallId?: string;    // tool message binds result to call
  name?: string;
}
```

### 5.3 Timing semantics

**Rule:** Position steps based on absolute timestamps (`startedAt/endedAt`), not on sum of durations.

Definitions:
- `traceStartMs = parse(trace.startedAt)`
- `traceEndMs = parse(trace.endedAt) || max(step endedAt)`
- `wallTimeMs = traceEndMs - traceStartMs`

For a step:
- `startMs = parse(step.startedAt) - traceStartMs`
- `endMs = parse(step.endedAt || step.startedAt) - traceStartMs`

### 5.4 Overlap lanes (greedy interval coloring)

Sort by `startMs` then `endMs`. Maintain `laneEndMs[]` and place each step into the first available lane; otherwise create a new lane.

### 5.5 Edge semantics (Flow Mode layers)

- **Structure edges**: parentStepId → child
- **Sequence edges**: chronological within scope
- **I/O binding edges**: toolCallId wiring (emit → tool → consume)

### 5.6 Storage model (SQLite index + summary JSON + step blobs)

Directory layout:

```
~/.agent-director/
  traces.db
  traces/
    <traceId>.summary.json
  steps/
    <traceId>/
      <stepId>.details.json.gz
```

SQLite stores:
- Traces table: id, name, startedAt, endedAt, wallTimeMs, tokens, cost, status, parentTraceId, createdAt
- Steps table: traceId, stepId, type, name, startedAt, endedAt, status, durationMs, toolCallId, metrics, preview

### 5.7 Redaction model

Server stores raw data locally, but tool responses to the UI are **redacted by default**.

`get_step_details` input:
```json
{
  "trace_id": "...",
  "step_id": "...",
  "redaction_mode": "redacted"
}
```

Safe export mode:
- forces redaction
- disables “raw reveal” and raw copy

---

## 6. UI/UX Specification

### 6.1 Design Principles

1. **Cinematic, not clinical**
2. **Accurate, not approximate**
3. **Progressive disclosure**
4. **Explainability**
5. **Scale**

### 6.2 Color Palette

```css
:root {
  /* Background layers */
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #21262d;
  --bg-elevated: #1c2128;

  /* Text */
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-muted: #6e7681;

  /* Accent colors by step type */
  --color-llm: #a371f7;
  --color-tool: #3fb950;
  --color-decision: #58a6ff;
  --color-handoff: #f0883e;
  --color-guardrail: #db61a2;
  --color-error: #f85149;

  /* UI */
  --border: #30363d;
  --border-focus: #58a6ff;

  /* Animation */
  --transition-fast: 150ms ease;
  --transition-medium: 300ms ease;
  --transition-slow: 500ms ease;
}
```

### 6.3 Typography

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
}
```

### 6.4 Layout Structure (with Insight Strip)

```
┌─────────────────────────────────────────────────────────────┐
│ Header: 🎬 Agent Director | Run: abc123 | Status | Wall: 4.2s│
│ Insight Strip: Bottleneck | Cost | Errors | Parallelism      │
├─────────────────────────────────────────────────────────────┤
│ Main View (Cinema or Flow)                                   │
├─────────────────────────────────────────────────────────────┤
│ Controls: transport | scrubber | speed | mode | edge toggles  │
├─────────────────────────────────────────────────────────────┤
│ Inspector (lazy details + redaction controls)                 │
└─────────────────────────────────────────────────────────────┘
```

### 6.5 Insight Strip (always visible)

Show (each is clickable jump-to):
- **Top 3 latency steps**
- **Cost by type** (LLM vs tool)
- **Errors / retries**
- **Wall vs Work** (critical path vs total work): workTime vs wallTime
- **Branch summary** when comparing or viewing a branch

### 6.6 Cinema Mode (timestamp lanes)

**Visual model:** Think “Gantt-lite” with cinematic motion.
- Horizontal axis: wall time
- Vertical lanes: overlap
- Cards animate in at their start times

**Step card design**
```
┌─────────────────────────┐
│ 🤖  LLM Call            │
│ gpt-4o-...              │
│ 847 tok  •  0.8s  • $0.004│
│ preview: "Analyzing..." │
└─────────────────────────┘
```

**Animation rules**
- On load: stagger fade-in (100ms) for initial visible set
- During playback: active steps pulse; completed steps dim
- Hover: translateY(-4px), shadow increase
- Click: select step, open inspector (details lazy-load)

**Performance overlays**
- “Bottleneck” badge on the longest duration step
- Cost badge (if present)
- Optional heat shading for top 10% duration steps

**Large traces**
- Search/filter bar
- Collapse by parentStepId
- Viewport rendering: only render steps that intersect viewport window

### 6.7 Flow Mode (semantic graph)

**Nodes**
- Same visual language as step cards (icon, title, metrics, preview)

**Edge layer toggles**
- Structure / Sequence / I/O binding
- Default: Structure + I/O

**Edge styling**
- Structure edges: subtle, thin
- Sequence edges: dotted
- I/O edges: highlighted on hover (show toolCallId)

### 6.8 Playback Controls

```
⏮  ⏪  ▶️  ⏩  ⏭   |━━━●━━━━|  1.0x ▼  | 🎬  📊 | Edges ▼ | Safe Export ☐
```

Keyboard shortcuts:
- Space: play/pause
- ← / →: step back/forward (nearest step boundary)
- Shift+← / Shift+→: jump start/end
- F: toggle Flow mode
- I: toggle Inspector
- ?: show shortcuts modal
- Esc: close inspector/modals

### 6.9 The Morph Transition (robust FLIP)

**Required implementation pattern**
1. Precompute dagre layout for nodes (target positions)
2. Measure source DOM rects in Cinema
3. Render MorphLayer of absolutely positioned cards
4. Animate rect → rect (FLIP)
5. Mount React Flow after animation completes

### 6.10 Inspector (lazy + redaction-aware)

- Summary: type/name/status/duration/tokens/cost
- Payload sections (prompt/tool I/O)
- Redaction: show “redacted” chips; allow click-to-reveal field-by-field
- Copy buttons respect safe export

### 6.11 Compare & Ghost Overlay

- Side-by-side timelines with synced scrubber
- Diff highlights:
  - added/removed steps
  - changed outputs
- Summary banner: “+2 steps, +$0.01, +0.8s”
- Optional ghost overlay: parent run at 30% opacity behind branch

---

## 7. Build Phases & Milestones

### P0 (7–10 days): Correct + Fast Playback
- Trace store (SQLite + summary JSON + step blobs)
- `list_traces`, `show_trace` (light), `get_step_details` (lazy)
- Cinema Mode: timestamps + overlap lanes
- Insight Strip
- Redaction by default + safe export

### P1 (5–7 days): Graph + Morph + Edge Semantics
- Flow Mode with edge layer toggles
- Robust morph (measure → animate → mount)
- Search/filter + collapse basics

### P2 (7–12 days): Director’s Cut
- Edit tool params
- Replay strategies (Recorded/Live/Hybrid) + provenance
- Diff + ghost overlay + compare

### Polish (3–5 days)
- Virtualization/viewport rendering
- Error handling, empty states, demo assets

---

## 8. File Structure

```
agent-director/
├── README.md
├── LICENSE
├── pyproject.toml
├── package.json
├── pnpm-workspace.yaml
│
├── server/
│   ├── main.py
│   ├── config.py
│   ├── mcp/
│   │   ├── server.py
│   │   ├── tools/
│   │   │   ├── list_traces.py
│   │   │   ├── show_trace.py            # returns TraceSummary (light)
│   │   │   ├── get_step_details.py      # returns StepDetails (heavy)
│   │   │   ├── replay_from_step.py      # V1.2
│   │   │   └── compare_traces.py        # optional
│   │   └── resources/
│   │       └── ui_resource.py
│   │
│   ├── trace/
│   │   ├── schema.py                    # TraceSummary / StepSummary / StepDetails models
│   │   ├── normalizer.py
│   │   ├── insights.py                  # compute insight strip values
│   │   ├── redaction.py                 # redaction + safe export helpers
│   │   ├── store.py                     # SQLite + summary + blob details
│   │   └── adapters/
│   │       ├── openai_agents.py
│   │       └── manual.py
│   │
│   ├── replay/
│   │   ├── engine.py                    # recorded/live/hybrid replay
│   │   └── diff.py                      # alignment + diff summary
│   │
│   └── tests/
│       ├── test_timing.py
│       ├── test_io_edges.py
│       ├── test_redaction.py
│       └── fixtures/
│
├── ui/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── styles/
│       ├── store/
│       ├── components/
│       │   ├── Header/
│       │   ├── InsightStrip/
│       │   ├── SearchBar/
│       │   ├── CinemaMode/
│       │   │   ├── TimestampTimeline.tsx
│       │   │   ├── LaneRow.tsx
│       │   │   └── StepCard.tsx
│       │   ├── FlowMode/
│       │   │   ├── FlowCanvas.tsx
│       │   │   ├── EdgeLayerToggles.tsx
│       │   │   └── nodeTypes.ts
│       │   ├── Morph/
│       │   │   ├── MorphOrchestrator.tsx
│       │   │   └── MorphLayer.tsx
│       │   ├── Inspector/
│       │   ├── Compare/
│       │   └── common/
│       ├── hooks/
│       └── utils/
│           ├── timingUtils.ts
│           ├── ioEdgeUtils.ts
│           ├── insights.ts
│           └── diff.ts
│
└── demo/
    ├── traces/
    └── scripts/
```

---

## 9. Implementation Details

### 9.1 Timestamp layout + lane assignment (UI)

```ts
// ui/src/utils/timingUtils.ts
export type StepInterval = {
  stepId: string;
  startMs: number;
  endMs: number;
  lane: number;
  xPct: number;
  wPct: number;
};

export function buildIntervals(
  traceStartIso: string,
  traceEndIso: string | null,
  steps: Array<{ id: string; startedAt: string; endedAt: string | null }>
): { wallTimeMs: number; intervals: StepInterval[]; laneCount: number } {
  const traceStart = Date.parse(traceStartIso);

  const endCandidates = steps
    .map(s => Date.parse(s.endedAt ?? s.startedAt))
    .filter(Number.isFinite);

  const traceEnd = traceEndIso ? Date.parse(traceEndIso) : Math.max(...endCandidates);
  const wallTimeMs = Math.max(1, traceEnd - traceStart);

  const raw = steps.map(s => {
    const startMs = Math.max(0, Date.parse(s.startedAt) - traceStart);
    const endMs = Math.max(startMs, Date.parse(s.endedAt ?? s.startedAt) - traceStart);
    return { stepId: s.id, startMs, endMs };
  }).sort((a, b) => (a.startMs - b.startMs) || (a.endMs - b.endMs));

  const laneEnd: number[] = [];
  const intervals: StepInterval[] = [];

  for (const it of raw) {
    let lane = laneEnd.findIndex(e => e <= it.startMs);
    if (lane === -1) {
      lane = laneEnd.length;
      laneEnd.push(it.endMs);
    } else {
      laneEnd[lane] = it.endMs;
    }

    intervals.push({
      stepId: it.stepId,
      startMs: it.startMs,
      endMs: it.endMs,
      lane,
      xPct: (it.startMs / wallTimeMs) * 100,
      wPct: Math.max(0.75, ((it.endMs - it.startMs) / wallTimeMs) * 100),
    });
  }

  return { wallTimeMs, intervals, laneCount: laneEnd.length };
}
```

### 9.2 I/O binding edge builder (from StepSummary)

Because Flow Mode should not require fetching heavy step details just to draw edges, we include minimal I/O wiring in `StepSummary.io`.

```ts
// ui/src/utils/ioEdgeUtils.ts
import type { StepSummary } from '../types';

export function buildIoEdgesFromSummary(steps: StepSummary[]) {
  const toolStepByCallId = new Map<string, string>(); // toolCallId -> tool_call stepId
  for (const s of steps) {
    if (s.type === 'tool_call' && s.toolCallId) toolStepByCallId.set(s.toolCallId, s.id);
  }

  const edges: Array<{ id: string; source: string; target: string; kind: 'io'; toolCallId: string }> = [];

  for (const s of steps) {
    if (s.type !== 'llm_call' || !s.io) continue;

    for (const callId of s.io.emittedToolCallIds ?? []) {
      const toolStepId = toolStepByCallId.get(callId);
      if (toolStepId) {
        edges.push({ id: `io_emit_${s.id}_${toolStepId}`, source: s.id, target: toolStepId, kind: 'io', toolCallId: callId });
      }
    }

    for (const callId of s.io.consumedToolCallIds ?? []) {
      const toolStepId = toolStepByCallId.get(callId);
      if (toolStepId) {
        edges.push({ id: `io_consume_${toolStepId}_${s.id}`, source: toolStepId, target: s.id, kind: 'io', toolCallId: callId });
      }
    }
  }

  return edges;
}
```

### 9.3 Server tool skeleton (show_trace + get_step_details)

Key principle: `show_trace` returns summaries; details are stored separately.

```py
# server/mcp/tools/show_trace.py (sketch)
async def execute(store: TraceStore, trace_id: str | None = None):
    trace = store.get_summary(trace_id)  # lightweight
    insights = compute_insights(trace)
    return {
      "content": [{"type": "text", "text": f"Showing trace: {trace.name}"}],
      "structuredContent": {"trace": trace.model_dump(), "insights": insights}
    }

# server/mcp/tools/get_step_details.py (sketch)
async def execute(store: TraceStore, trace_id: str, step_id: str, redaction_mode: str = "redacted"):
    step = store.get_step_details(trace_id, step_id)  # heavy payload
    step_out = redact_step(step) if redaction_mode == "redacted" else step
    return {
      "content": [{"type": "text", "text": f"Loaded step details: {step_id}"}],
      "structuredContent": {"step": step_out.model_dump()}
    }
```

---

## 10. Master Prompts for Codex

### P0 Prompt: Correct + Fast Playback (Timestamp-Accurate)

```text
Build Agent Director as an MCP App UI for visualizing agent traces.

Hard correctness requirements:
- Timeline positions MUST be derived from absolute timestamps startedAt/endedAt.
- Overlapping steps MUST render in separate lanes.
- show_trace MUST return a lightweight TraceSummary (no huge payloads).
- get_step_details MUST lazy-load a single step’s heavy data.

Add:
- Insight Strip: top latency, cost by type, errors/retries, and wall-vs-work (critical path vs total work).
- Redaction by default + safe export toggle.
- Search/filter + viewport rendering for large traces.

Quality gates:
- No cumulative-duration positioning anywhere.
- UI interactive quickly after show_trace.
```

### P1 Prompt: Flow Mode + Robust Morph + Edge Layers

```text
Add Flow Mode and a robust morph transition.

Flow Mode:
- Use React Flow.
- Provide edge layer toggles: Structure, Sequence, I/O binding (toolCallId wiring).

Morph:
- Precompute target node positions before switching.
- Measure Cinema DOM rects.
- FLIP animate DOM cards into target positions.
- Mount React Flow only after morph completes.
```

### P2 Prompt: Director’s Cut (Edit + Replay + Diff)

```text
Implement edit + replay + compare.

Edit scope:
- Tool steps: edit toolName + JSON params (default)
- Model knobs: temp/top_p/seed (secondary)
- Prompt edits: dangerous toggle + nondeterministic label

Replay strategies:
- recorded / live / hybrid
- branch provenance persisted (parentTraceId, branchPointStepId, strategy, modifications, createdAt)

Diff:
- side-by-side compare, synced scrubber
- diff summary banner (steps/cost/wall time)
- optional ghost overlay
```

---

## 11. Testing & Quality Assurance

Must-have tests:
- timestamp → interval conversion correctness
- overlap lane assignment
- IO edge builder correctness (toolCallId emit/consume)
- redaction patterns + raw mode gating
- large trace smoke test (500+ steps)

---

## 12. Edge Cases & Error Handling

- endedAt null: treat as running; compute traceEnd from latest span end
- missing timestamps: degrade gracefully but label “timing degraded”
- zero-duration steps: minimum width
- huge outputs: never sent in show_trace; truncate in inspector with “expand”
- nested spans: collapse at depth > 2 by default
- tool call timeout: show error chip; jump to error via Insight Strip

---

## 13. Demo Script

### 90-second demo
1. `show_trace` → Cinema Mode plays; Insight Strip highlights bottleneck + parallelism
2. Click bottleneck step → inspector lazy-loads details
3. Toggle Flow → morph; toggle IO edges to show tool wiring
4. Edit tool params → replay (Hybrid) → branch appears
5. Compare view + ghost overlay + diff banner

---

## 14. Dissemination Strategy

README hero:
- 15s GIF: playback → morph → edit+replay → diff

Internal write-up:
- emphasize correctness (timestamps + overlaps) and semantic IO edges

---

## Appendix A: Sample Trace Fixture (with overlap + toolCallId)

Use this fixture to validate:
- overlap lanes (parallel tool calls)
- toolCallId emit → tool step → consume edges

```json
{
  "id": "demo-trace-overlap-001",
  "name": "Overlap + ToolCallId Demo",
  "startedAt": "2026-01-27T10:00:00.000Z",
  "endedAt": "2026-01-27T10:00:05.000Z",
  "status": "completed",
  "metadata": {
    "source": "openai_agents",
    "agentName": "DemoAgent",
    "modelId": "gpt-4o-2024-11-20",
    "wallTimeMs": 5000,
    "workTimeMs": 7200,
    "totalTokens": 1400,
    "totalCostUsd": 0.018
  },
  "steps": [
    {
      "id": "s1",
      "index": 0,
      "type": "llm_call",
      "name": "plan",
      "startedAt": "2026-01-27T10:00:00.000Z",
      "endedAt": "2026-01-27T10:00:01.000Z",
      "durationMs": 1000,
      "childStepIds": [],
      "metrics": { "tokensTotal": 300, "costUsd": 0.004 },
      "preview": { "title": "LLM: plan", "subtitle": "gpt-4o", "outputPreview": "I'll fetch two sources..." },
      "status": "completed"
    },
    {
      "id": "s2",
      "index": 1,
      "type": "llm_call",
      "name": "call_tools",
      "startedAt": "2026-01-27T10:00:01.000Z",
      "endedAt": "2026-01-27T10:00:01.200Z",
      "durationMs": 200,
      "childStepIds": [],
      "metrics": { "tokensTotal": 120, "costUsd": 0.002 },
      "preview": { "title": "LLM: call tools", "outputPreview": "Calling web_search + database_query" },
      "io": { "emittedToolCallIds": ["tc-001", "tc-002"] },
      "status": "completed"
    },
    {
      "id": "s3",
      "index": 2,
      "type": "tool_call",
      "name": "web_search",
      "toolCallId": "tc-001",
      "startedAt": "2026-01-27T10:00:01.200Z",
      "endedAt": "2026-01-27T10:00:03.200Z",
      "durationMs": 2000,
      "childStepIds": [],
      "metrics": { "costUsd": 0.0 },
      "preview": { "title": "Tool: web_search", "inputPreview": "{\"q\":\"EU AI Act\"}", "outputPreview": "[3 results...]" },
      "status": "completed"
    },
    {
      "id": "s4",
      "index": 3,
      "type": "tool_call",
      "name": "database_query",
      "toolCallId": "tc-002",
      "startedAt": "2026-01-27T10:00:01.500Z",
      "endedAt": "2026-01-27T10:00:02.700Z",
      "durationMs": 1200,
      "childStepIds": [],
      "preview": { "title": "Tool: database_query", "inputPreview": "{\"sql\":\"SELECT...\"}", "outputPreview": "{\"rows\":42}" },
      "status": "completed"
    },
    {
      "id": "s5",
      "index": 4,
      "type": "llm_call",
      "name": "analyze",
      "startedAt": "2026-01-27T10:00:03.200Z",
      "endedAt": "2026-01-27T10:00:04.600Z",
      "durationMs": 1400,
      "childStepIds": [],
      "metrics": { "tokensTotal": 700, "costUsd": 0.012 },
      "preview": { "title": "LLM: analyze", "outputPreview": "Synthesis based on tool outputs..." },
      "io": { "consumedToolCallIds": ["tc-001", "tc-002"] },
      "status": "completed"
    }
  ]
}
```

---

## Appendix B: Replay Strategies (Recorded / Live / Hybrid)

### Recorded
- Reuse recorded outputs where inputs are unchanged.
- Deterministic and fast.
- Invalid if upstream dependencies change.

### Live
- Re-run provider/tool calls from branch point onward.
- Most faithful, but nondeterministic and costs money/time.

### Hybrid (recommended default)
- Use recorded outputs until a dependency changes; then switch to live execution downstream.

---

## Appendix C: Redaction Policy & Safe Export

Default redaction targets:
- keys: `authorization`, `api_key`, `token`, `password`, `cookie`, `secret`
- patterns: `Bearer\s+\S+`, `sk-[A-Za-z0-9]{20,}`, JWT-like strings
- optionally emails/phones

Safe export mode:
- forces redacted responses
- disables raw reveal controls
- copy buttons copy redacted content only
