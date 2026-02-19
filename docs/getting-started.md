# Getting Started

This guide gets you from clone to a working local instance quickly.

## Prerequisites

- Python `3.12+`
- Node.js `20+`
- `pnpm`

## Quick Path (Local Full Stack)

### 1) Install UI dependencies

```bash
pnpm -C ui install
```

### 2) Start the API server

```bash
python3 server/main.py
```

Default API address: `http://127.0.0.1:8787`

Optional custom data directory:

```bash
AGENT_DIRECTOR_DATA_DIR=/path/to/data python3 server/main.py
```

### 3) Start the UI

```bash
pnpm -C ui dev
```

Default UI address: `http://127.0.0.1:5173`

The UI targets `http://127.0.0.1:8787` by default and falls back to embedded demo data if the API is unavailable.

### 4) Run quality gates

```bash
make verify
make doctor
make scorecard
```

## Fast Demo Path (No backend changes)

If you only need a deterministic demo build:

```bash
pnpm -C ui install
VITE_FORCE_DEMO=1 VITE_HIDE_BUILD_DATE=1 pnpm -C ui dev
```

## Optional: Run in MCP Mode

```bash
pip install "mcp[cli]"
python3 -m server.mcp_server
```

Useful environment variables:

- `AGENT_DIRECTOR_MCP_TRANSPORT=stdio`
- `AGENT_DIRECTOR_UI_URL=http://127.0.0.1:5173`

## First 5-Minute Walkthrough

1. Load latest trace in Cinema mode.
2. Press Play and inspect a slow step.
3. Toggle Flow mode and enable I/O edges.
4. Replay from a selected step.
5. Open Compare mode and export summary.

Narration script: [`demo-script.md`](demo-script.md)

## Troubleshooting

- **UI shows demo data unexpectedly**
  - Confirm API is running at `http://127.0.0.1:8787`.
  - Ensure `VITE_FORCE_DEMO` is not set to `1` unless intentional.

- **UI cannot reach API**
  - Check server process/port availability.
  - Set `VITE_API_BASE` when API is hosted elsewhere.

- **Replay details fail**
  - Ensure trace data exists in `AGENT_DIRECTOR_DATA_DIR`.
  - Confirm directory is writable.

## Next Steps

- Architecture deep dive: [`architecture.md`](architecture.md)
- Endpoint details: [`api-reference.md`](api-reference.md)
- UX interaction model: [`ux.md`](ux.md)
- User journeys: [`user-journeys.md`](user-journeys.md)
