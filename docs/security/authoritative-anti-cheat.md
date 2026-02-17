# Authoritative Anti-Cheat Hardening

Last updated: 2026-02-17

## Objective

Keep gameplay state server-authoritative and reject client-side attempts to forge progression, rewards, or session state.

## Trust Boundary

- Client/UI is advisory only.
- Session truth is owned by `server/gameplay/store.py`.
- Actions are applied only through `POST /api/gameplay/sessions/{id}/action`.
- Every action must include a valid `player_id` already in the session.

## Enforced Validation Controls

- Optimistic concurrency via `expected_version` prevents race-condition desync and stale writes.
- Session join limit enforces 2-5 players and role allowlist.
- Ability cooldown and role checks prevent illegal action execution.
- Reward claims enforce cadence and requirement checks server-side.
- Request-size caps, content-type enforcement, and per-IP throttling are active API boundaries.
- Strict ID validation in MCP and API schema blocks path-like identifiers.

## Security Guardrails Already Shipped

- Rate limiting + `Retry-After` responses (`429`) for abusive request patterns.
- Payload limits (`413`) and malformed `Content-Length` hard failures (`400`).
- Redaction-first step detail fetch with safe-export mode and reveal-path policy checks.
- Sanitized internal error responses (`500` returns fixed message).

## Verification Evidence

- `server/tests/test_gameplay_api.py`
- `server/tests/test_api.py`
- `server/tests/test_mcp_contracts.py`
- `make verify`, `make doctor`, `make scorecard`
