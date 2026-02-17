# Launch Security Hardening Checklist

Last updated: 2026-02-17

## Objective

Run a final abuse/authz/rate-limit/secret-handling hardening pass before public launch.

## Abuse + Availability Controls

- Per-IP rate limiting enforced at API boundary.
- Request-size guardrails and malformed header handling enabled.
- POST JSON media type enforcement (`415` on mismatch).
- Defensive payload parsing with explicit failure semantics.

## Authorization + Session Integrity

- Gameplay actions require session membership (`player_id` in session roster).
- Conflict-safe optimistic versioning rejects stale writes (`409`).
- Role and cooldown checks prevent illegal ability execution.
- Safety/reporting actions persist actor and target identities.

## Secret Handling + Data Safety

- Redaction-first detail rendering with explicit reveal paths.
- Safe export forces redacted mode and blocks raw reveal paths.
- Redaction audit events persisted for sensitive access traceability.
- `500` responses return fixed generic errors (no internal leakage).

## Verification Commands

```bash
python3 -m unittest discover -s server/tests
pnpm -C ui test
make verify
make doctor
```

## Evidence Pointers

- `server/main.py`
- `server/mcp/schema.py`
- `server/tests/test_api.py`
- `server/tests/test_gameplay_api.py`
- `server/tests/test_redaction.py`
