# Demo Traces

The `demo/traces` directory ships canned traces used by the UI fallback and tests.

## Quick demo
1. Start the server (`python3 server/main.py`).
2. Start the UI (`pnpm -C ui dev`).
3. Use the demo trace to show Cinema playback, Flow morph, and Compare overlays.

## Adding new traces
- Drop a `*.summary.json` in `demo/traces`.
- Add optional step detail payloads under `demo/traces/steps/<trace_id>/<step_id>.details.json`.
