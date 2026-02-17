# Contributing

Thanks for helping improve Agent Director.

## Project principles

- Keep changes focused and reviewable.
- Preserve redaction-first defaults and safe-export behavior.
- Avoid breaking trace, replay, and API compatibility without explicit migration notes.

## Local setup

```bash
pnpm -C ui install
```

Run the API:

```bash
python3 server/main.py
```

Run the UI:

```bash
pnpm -C ui dev
```

## Development flow

1. Branch from `main`.
2. Implement changes with tests.
3. Run verification:
   - `make verify`
   - `make verify-strict` for stricter gates when needed
4. Update docs/screenshots if behavior or UX changed.
5. Open a PR with:
   - clear summary
   - risk notes
   - verification evidence
   - screenshots for visible UI changes

## UI snapshot updates

If UI visuals changed intentionally:

```bash
pnpm -C ui exec playwright test --update-snapshots
```

## Quality gate commands

- `make verify`
- `make verify-strict`
- `make doctor`
- `make scorecard`
