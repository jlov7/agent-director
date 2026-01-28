# Architecture

## System overview
```mermaid
flowchart LR
  subgraph Host
    UI[React UI\nCinema / Flow / Compare]
  end
  subgraph API
    HTTP[HTTP API]
    MCP[MCP Tools]
  end
  subgraph Store
    DB[(SQLite)]
    FS[(JSON payloads)]
  end

  UI --> HTTP --> DB
  UI --> HTTP --> FS
  MCP --> DB
  MCP --> FS
```

## Data model (summary vs details)
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
  }

  TraceSummary "1" --> "many" StepSummary
  StepSummary "1" --> "1" StepDetails
```

## Playback pipeline
```mermaid
flowchart LR
  A[TraceSummary] --> B[buildIntervals\n(lanes + % positions)]
  B --> C[Timeline + playhead]
  C --> D[Inspector fetch\nget_step_details]
```

## Replay + diff pipeline
```mermaid
flowchart LR
  A[Select step] --> B[Replay strategy\nrecorded/live/hybrid]
  B --> C[Invalidate dependent steps]
  C --> D[New TraceSummary\nparentTraceId + branchPoint]
  D --> E[Diff alignment\nID → toolCallId → timestamp]
  E --> F[Compare view + export]
```

## Safety pipeline
```mermaid
flowchart LR
  A[StepDetails raw] --> B[Redaction engine]
  B --> C[Fields redacted list]
  C --> D[Reveal-by-path]
  D --> E[Safe export enforced]
```
