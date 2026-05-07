# Observability + Analytics

This runbook defines the release baseline for runtime observability and product telemetry dashboards.

## Endpoints

- `POST /api/telemetry/events`
- `GET /api/traces`
- `GET /api/eval-cases`
- `GET /api/eval-runs/{run_id}`

## Observability Summary

Release observability should summarize:

- imported trace count
- failed trace count
- eval case count
- latest eval run status
- `avg_latency_ms`
- `p95_latency_ms`
- `failure_rate_pct`
- `alerts[]` with severity, threshold, and current value

### Alert thresholds

- `failure_rate_pct >= 8` -> high
- `p95_latency_ms >= 1500` -> medium
- latest eval run failed -> high

## Funnel Dashboard

Product telemetry should track:

- Funnel stages:
  - `trace_imported`
  - `trace_opened`
  - `diagnose_started`
  - `eval_case_created`
  - `eval_run_completed`
- Drop-off counters between funnel stages
- Retention dashboard:
  - `d1_pct`
  - `d7_pct`
  - `d30_pct`

## UI Surface

Agent Director should expose release evidence showing:

- Current metrics and active alerts
- Funnel stage counts and drop-off context
- D1/D7/D30 retention percentages

Private experimental gameplay analytics are not part of the public v1 observability surface and require `AGENT_DIRECTOR_ENABLE_GAMEPLAY=1`.
