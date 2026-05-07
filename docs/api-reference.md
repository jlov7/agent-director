# API Reference (HTTP + SSE)

Base URL (default): `http://127.0.0.1:8787`

This is an implementation-level reference for the current server in `server/main.py`.

## Health

- `GET /api/health`
- `GET /api/openapi.json`

## Traces

- `GET /api/traces`
- `GET /api/traces?latest=1`
- `POST /api/traces/import`
- `GET /api/traces/{trace_id}`
- `GET /api/traces/{trace_id}/investigate`
- `GET /api/traces/{trace_id}/comments`
- `GET /api/traces/{trace_id}/steps/{step_id}`
- `POST /api/traces/{trace_id}/replay`
- `POST /api/traces/{trace_id}/query`
- `POST /api/traces/{trace_id}/comments`
- `POST /api/compare`
- `POST /api/replays/merge`

`POST /api/traces/import` accepts:

```json
{
  "source": "agent_director | openai_agents | otel_genai | openinference",
  "payload": {},
  "options": {}
}
```

Imported traces are normalized into existing trace/step contracts. Provenance fields include provider trace ID, provider span ID, provider parent span ID, framework/source, model/provider metadata, token/cost details, and importer warnings when available.

## Eval Loop

- `GET /api/eval-cases`
- `POST /api/eval-cases/from-trace`
- `POST /api/eval-runs`
- `GET /api/eval-runs/{run_id}`

Eval cases can be created from failed or interesting trace steps. Eval runs are deterministic checks against current trace state and return per-case scores plus pass/fail counts.

`POST /api/eval-cases/from-trace` accepts optional deterministic evaluator adapters:

```json
{
  "trace_id": "trace-id",
  "step_id": "step-id",
  "name": "Timeout regression",
  "evaluators": [
    {
      "type": "text_contains",
      "step_id": "step-id",
      "field": "error",
      "expected": "timeout"
    },
    {
      "type": "semantic_similarity",
      "step_id": "step-id",
      "field": "data.analysis",
      "expected": "timeout caused retrieval retry collapse",
      "minScore": 0.4
    }
  ]
}
```

Supported evaluator fields are `error`, `name`, `preview.inputPreview`, `preview.outputPreview`, and `data.*` paths from step details.

## Replay Jobs (Matrix)

- `POST /api/replay-jobs`
- `GET /api/replay-jobs/{job_id}`
- `GET /api/replay-jobs/{job_id}/matrix`
- `GET /api/replay-jobs/{job_id}/dead-letters`
- `POST /api/replay-jobs/{job_id}/cancel`
- `GET /api/replay-dead-letters`

Replay payloads include truth metadata. `recorded_replay` means an existing trace was copied without new execution, `counterfactual_simulation` means deterministic analysis was generated without running the live agent runtime, and `executed_replay` is reserved for future actual re-execution.

## Extensions

- `GET /api/extensions`
- `POST /api/extensions/{extension_id}/run`

## Telemetry + Governance

- `POST /api/telemetry/events`
- `GET /api/admin/governance/retention`
- `POST /api/admin/governance/retention`
- `POST /api/admin/governance/retention/apply`
- `GET /api/admin/audit-events`
- `POST /api/admin/traces/{trace_id}/delete`

## Streaming (SSE)

- `GET /api/stream/traces/latest`

## Private Experimental Surfaces

Gameplay APIs are not part of the public v1 interface. They remain disabled by default and require `AGENT_DIRECTOR_ENABLE_GAMEPLAY=1` in private development environments.

## Common Response Semantics

- `200` success
- `201` created
- `202` accepted (async replay jobs)
- `400` validation error
- `404` not found
- `409` conflict (version mismatch)
- `413` payload too large
- `415` unsupported media type
- `429` throttled
- `500` internal server error

## Request Constraints

- Max request body size is enforced server-side.
- JSON content type is required for non-empty POST bodies.
- API rate limiting is enforced with `Retry-After` on `429`.
- Optional request auth/tenant headers: `X-API-Key`, `X-Tenant-Id`, `X-Actor-Id`.
- Optional idempotency header on selected write paths: `Idempotency-Key`.
