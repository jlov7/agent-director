# Executable Demo Docs

This directory contains Showboat-backed executable markdown demos.

## What this is for

- Human-readable release proof documents.
- Re-runnable command/output records for reviewers.
- A lightweight CI gate for documentation drift on critical demo narratives.

## Commands

From repository root:

```bash
./scripts/build_showboat_release_proof.sh
./scripts/verify_showboat_demos.sh
```

## Rodney + screenshots workflow

For fresh screenshots in a demo doc:

1. Capture with Rodney.
2. Add image references with Showboat.
3. Re-run verification.

Example:

```bash
rodney start --show
rodney open http://127.0.0.1:5173
rodney screenshot docs/screenshots/showboat-fresh.png
rodney stop
showboat image docs/demos/release-proof.md '![Fresh UI capture](docs/screenshots/showboat-fresh.png)'
./scripts/verify_showboat_demos.sh
```
