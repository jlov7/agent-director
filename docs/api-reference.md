# API Reference (HTTP + SSE)

Base URL (default): `http://127.0.0.1:8787`

This is an implementation-level reference for the current server in `server/main.py`.

## Health

- `GET /api/health`

## Traces

- `GET /api/traces`
- `GET /api/traces?latest=1`
- `GET /api/traces/{trace_id}`
- `GET /api/traces/{trace_id}/investigate`
- `GET /api/traces/{trace_id}/comments`
- `GET /api/traces/{trace_id}/steps/{step_id}`
- `POST /api/traces/{trace_id}/replay`
- `POST /api/traces/{trace_id}/query`
- `POST /api/traces/{trace_id}/comments`
- `POST /api/compare`
- `POST /api/replays/merge`

## Replay Jobs (Matrix)

- `POST /api/replay-jobs`
- `GET /api/replay-jobs/{job_id}`
- `GET /api/replay-jobs/{job_id}/matrix`
- `POST /api/replay-jobs/{job_id}/cancel`

## Gameplay

### Sessions

- `GET /api/gameplay/sessions`
- `GET /api/gameplay/sessions/{session_id}`
- `POST /api/gameplay/sessions`
- `POST /api/gameplay/sessions/{session_id}/join`
- `POST /api/gameplay/sessions/{session_id}/leave`
- `POST /api/gameplay/sessions/{session_id}/reconnect`
- `POST /api/gameplay/sessions/{session_id}/action`

### Profiles

- `GET /api/gameplay/profiles/{player_id}`
- `POST /api/gameplay/profiles/{player_id}/skills/unlock`
- `POST /api/gameplay/profiles/{player_id}/loadout/equip`

### Social

- `GET /api/gameplay/friends/{player_id}`
- `POST /api/gameplay/friends/invite`
- `POST /api/gameplay/friends/accept`

### Guilds

- `POST /api/gameplay/guilds`
- `GET /api/gameplay/guilds/{guild_id}`
- `POST /api/gameplay/guilds/{guild_id}/join`
- `POST /api/gameplay/guilds/{guild_id}/events`
- `POST /api/gameplay/guilds/{guild_id}/events/{event_id}/complete`

### LiveOps + Analytics

- `GET /api/gameplay/liveops/current`
- `POST /api/gameplay/liveops/advance-week`
- `GET /api/gameplay/observability/summary`
- `GET /api/gameplay/analytics/funnels`

## Extensions

- `GET /api/extensions`
- `POST /api/extensions/{extension_id}/run`

## Streaming (SSE)

- `GET /api/stream/traces/latest`
- `GET /api/stream/gameplay/{session_id}`

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
