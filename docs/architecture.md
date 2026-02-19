# Architecture

This document explains how Agent Director ingests traces, serves safe data contracts, and powers the cinematic UI experience.

## 1) System Topology

![Trace fusion](illustrations/trace-fusion.svg)

```mermaid
flowchart LR
  subgraph Source["Trace Sources"]
    S1["Agent runtime"]
    S2["Imported trace files"]
  end

  subgraph Server["Server Layer"]
    I["Ingestion + validation"]
    DB[("SQLite trace index")]
    FS[("JSON payload store")]
    API["HTTP + SSE API"]
    MCP["MCP server"]
    R["Replay + diff engine"]
    SAFE["Redaction + safe export"]
  end

  subgraph UI["React Frontend"]
    U1["Cinema / Flow / Compare / Matrix"]
    U2["Inspector + Insight Strip"]
    U3["Collaboration + Operations rails"]
  end

  Source --> I
  I --> DB
  I --> FS
  DB --> API
  FS --> API
  DB --> MCP
  FS --> MCP
  DB --> R --> API
  FS --> SAFE --> API
  API --> UI
```

## 2) Data Model (Summary vs Detail)

```mermaid
classDiagram
  class TraceSummary {
    id
    startedAt
    endedAt
    metadata
    steps[]
    replay
  }

  class StepSummary {
    id
    type
    name
    startedAt
    endedAt
    durationMs
    preview
    toolCallId
  }

  class StepDetails {
    data
    redaction
    fieldsRedacted[]
  }

  class ReplayProvenance {
    parentTraceId
    branchPoint
    strategy
  }

  TraceSummary "1" --> "many" StepSummary
  StepSummary "1" --> "1" StepDetails
  TraceSummary "0..1" --> "1" ReplayProvenance
```

## 3) Request Flow (Runtime Sequence)

```mermaid
sequenceDiagram
  autonumber
  participant User
  participant UI as React UI
  participant API as Server API
  participant Store as Trace Store
  participant Replay as Replay Engine

  User->>UI: Open latest trace
  UI->>API: GET /api/traces?latest=1
  API->>Store: Load trace summary
  Store-->>API: Summary
  API-->>UI: TraceSummary

  User->>UI: Select step
  UI->>API: GET /api/traces/{trace_id}/steps/{step_id}
  API->>Store: Load step details
  Store-->>API: Raw detail payload
  API->>API: Apply redaction policy
  API-->>UI: StepDetails (safe)

  User->>UI: Replay from step
  UI->>API: POST /api/traces/{trace_id}/replay
  API->>Replay: Execute replay strategy
  Replay->>Store: Persist replay trace + provenance
  API-->>UI: Replay trace summary
```

## 4) Playback Pipeline

```mermaid
flowchart LR
  A["TraceSummary"] --> B["Interval builder\n(lanes + positions)"]
  B --> C["Timeline renderer + playhead"]
  C --> D["Inspector detail fetch"]
  D --> E["Insight updates"]
```

## 5) Replay + Compare Pipeline

![Director's Cut](illustrations/directors-cut.svg)

```mermaid
flowchart LR
  A["Select step"] --> B["Pick strategy\nrecorded/live/hybrid"]
  B --> C["Invalidate dependent steps"]
  C --> D["Persist replay branch"]
  D --> E["Compare alignment\n(id -> toolCallId -> timestamp)"]
  E --> F["Render diff + export"]
```

## 6) Safety Pipeline

```mermaid
flowchart LR
  A["Raw payload"] --> B["Redaction engine"]
  B --> C["fieldsRedacted metadata"]
  C --> D["Scoped reveal by path"]
  D --> E["Safe export enforcement"]
```

## 7) Scalability and Reliability Controls

- Windowed rendering for large traces.
- Lazy loading for step details.
- Matrix replay job status model with cancellation support.
- Async action rail and retry queue for long-running operations.
- Deterministic quality gates (`make verify`, `make doctor`, `make scorecard`).

## 8) Primary Source Files

- Server entrypoint: `server/main.py`
- MCP entrypoint: `server/mcp_server.py`
- UI shell: `ui/src/App.tsx`
- Frontend API client: `ui/src/lib/api.ts`

## 9) Related Docs

- Setup and run: [`getting-started.md`](getting-started.md)
- Endpoints: [`api-reference.md`](api-reference.md)
- UX model: [`ux.md`](ux.md)
- Technical overview: [`technical-guide.md`](technical-guide.md)
