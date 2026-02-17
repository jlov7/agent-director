# Gameplay Observability + Analytics

This runbook defines the release baseline for runtime observability and product telemetry dashboards.

## Endpoints

- `GET /api/gameplay/observability/summary`
- `GET /api/gameplay/analytics/funnels`

## Observability Summary

`/api/gameplay/observability/summary` returns:

- `total_sessions`
- `running_sessions`
- `avg_latency_ms`
- `p95_latency_ms`
- `failure_rate_pct`
- `challenge_completion_rate_pct`
- `alerts[]` with severity, threshold, and current value

### Alert thresholds

- `failure_rate_pct >= 8` -> high
- `p95_latency_ms >= 1500` -> medium
- `challenge_completion_rate_pct < 20` with enough volume -> medium

## Funnel Dashboard

`/api/gameplay/analytics/funnels` returns:

- Funnel stages:
  - `session_start`
  - `first_objective_progress`
  - `first_mission_outcome`
  - `run_outcome`
  - `win_outcome`
- Drop-off counters between funnel stages
- Retention dashboard:
  - `d1_pct`
  - `d7_pct`
  - `d30_pct`

## UI Surface

Gameplay mode includes an **Observability + Funnel Analytics** card showing:

- Current metrics and active alerts
- Funnel stage counts and drop-off context
- D1/D7/D30 retention percentages
