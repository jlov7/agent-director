# Mission + Event Authoring Workflow

Last updated: 2026-02-17

## Objective

Provide an internal, repeatable workflow for creating and validating mission and LiveOps challenge content before release.

## Authoring Flow

1. Draft mission or challenge JSON payload.
2. Validate schema and value bounds using `scripts/content_authoring.py`.
3. Review for balance impact (difficulty, reward, challenge completion implications).
4. Stage in non-production environment and run gameplay smoke checks.
5. Publish only after validation and verification pass.

## Validation Commands

```bash
python3 scripts/content_authoring.py validate-mission <mission.json>
python3 scripts/content_authoring.py validate-liveops <challenge.json>
python3 scripts/content_authoring.py validate-share <scenario-share.json>
```

## Validation Rules (v1)

### Mission payload

- Required: `id`, `title`, `depth`, `hazards`, `reward_tokens`, `reward_materials`, `blueprint`
- `depth` must be `1..10`
- `hazards` must be a non-empty string array
- Rewards must be non-negative and bounded by balance review policy

### LiveOps challenge payload

- Required: `id`, `title`, `goal`, `reward`
- `goal >= 1`
- `reward >= 1`

### Scenario share payload

- Required: pack `name` and non-empty `scenarios[]`
- Each scenario must include `name`, `strategy`, and object `modifications`
- Validator emits warnings for potentially sensitive keys (token/secret/auth/password variants)

## Verification Evidence

- `server/tests/test_content_authoring.py`
- `make verify`
