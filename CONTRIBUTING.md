# Contributing

Thanks for helping make Agent Director better.

## Setup
```bash
pnpm -C ui install
python3 -m venv .venv
source .venv/bin/activate
```

## Development flow
1. Create a branch from `main`.
2. Make focused changes with tests.
3. Run `make verify` (or `make verify-strict` for mutation checks).
4. Open a PR with clear description and screenshots for UI changes.

## Style
- Prefer clear naming and small, composable functions.
- Keep payloads redacted by default.
- Avoid breaking trace compatibility.

## UI updates
- Update Playwright snapshots when needed:
  ```bash
  pnpm -C ui exec playwright test --update-snapshots
  ```

## Tests
- `make verify` (full suite)
- `make verify-strict` (mutation testing)
