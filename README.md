# Agent Director

```
    _    ____ _____ _   _ _____
   / \  / ___| ____| \ | |_   _|
  / _ \| |  _|  _| |  \| | | |
 / ___ \ |_| | |___| |\  | | |
/_/   \_\____|_____|_| \_| |_|

    ____  ___ ____  _____ ____ _____ ___  ____
   |  _ \|_ _|  _ \| ____/ ___|_   _/ _ \|  _ \
   | | | || || |_) |  _|| |     | || | | | |_) |
   | |_| || ||  _ <| |__| |___  | || |_| |  _ <
   |____/|___|_| \_\_____\____| |_| \___/|_| \_\
```

**Watch your agent think. Then direct it.**

Agent Director is a cinematic, chat-native trace debugger for AI agents. It turns agent runs into an interactive film strip and semantic graph, with replay + diff for “what-if” experimentation.

## Highlights
- Timestamp-accurate playback with overlap lanes (no summed-duration artifacts)
- Flow mode with Structure / Sequence / I/O binding layers + morph transitions
- Lazy-loaded step details with redaction-by-default and safe export enforcement
- Director’s Cut replay with deterministic invalidation + provenance
- Counterfactual replay matrix with causal ranking across scenarios
- Compare mode with stable alignment, ghost overlays, and diff export
- Matrix presets, scenario import/export, and redacted matrix exports
- Insight Strip with critical path, concurrency heatmap, and IO/timing warnings
- Story Mode autopilot, quick actions dock, and command palette for instant demos
- Explain mode contextual overlays + guided tour for zero-guess onboarding
- Director briefing hero with the 3‑act flow and instant Tour / Story entry points
- CI + strict verification gates with mutation testing

## Quick demo (90 seconds)
1. Start the guided tour (from the intro overlay or Guide button), or hit Story mode to auto-run.
2. Pause at any point and take over manually.
3. Load the latest run and hit Play to show timeline playback.
4. Click a slow step to open the inspector and reveal redacted payloads.
5. Toggle Flow to morph into the graph, then enable I/O edges.
6. Replay from a tool step (Hybrid) and switch to Compare.
7. Switch to Matrix to run multiple replays and compare outcomes.
8. Export the diff summary and highlight the ghost overlay.

## Onboarding stack
- **Intro overlay** frames the three‑act journey (Observe → Inspect → Direct).
- **Director briefing** offers Tour, Story, and Explain entry points.
- **Guided tour** walks the interface end‑to‑end.
- **Explain mode** provides just‑in‑time help for every control.

## Screenshots + Demo
![Cinema mode](docs/screenshots/cinema.png)
![Flow mode](docs/screenshots/flow.png)
![Compare mode](docs/screenshots/compare.png)

![Demo](docs/demo.gif)

## Live demo
- Vercel (primary demo): https://agent-director.vercel.app
- GitHub Pages (static demo; requires public repo or Pro/Team/Enterprise for private): https://jlov7.github.io/agent-director/
- Codespaces (instant live preview; private-friendly): https://github.com/codespaces/new?hide_repo_select=true&repo=jlov7/agent-director

## Concept art
![Trace fusion](docs/illustrations/trace-fusion.svg)
![Director's Cut](docs/illustrations/directors-cut.svg)
![Insight Strip](docs/illustrations/insight-strip.svg)

## Architecture at a glance
```mermaid
flowchart LR
  A[Trace ingestion] --> B[Trace store\nSQLite + JSON payloads]
  B --> C[HTTP/MCP APIs\nshow_trace + get_step_details]
  C --> D[React UI\nCinema / Flow / Compare]
  D --> E[Replay + Diff\nDirector's Cut]
```

## Why it feels different
- **Cinematic by default:** time is real, lanes are honest, and playback is smooth.
- **Graph is meaningful:** edges reflect structure, sequence, and I/O binding.
- **You can actually edit runs:** replay strategy is explicit and diffable.
- **Safe sharing:** redaction-by-default with explicit reveal and safe export.
- **Scenario governance:** presets, validation, and redacted exports for matrix runs.

## Quickstart

### Server (HTTP API for the UI)
```bash
python3 server/main.py
```

By default the server initializes a local data directory at `~/.agent-director` and bootstraps the demo trace if the store is empty. You can override the data directory:

```bash
AGENT_DIRECTOR_DATA_DIR=/path/to/store python3 server/main.py
```

### UI (React)
```bash
pnpm -C ui install
pnpm -C ui dev
```

The UI tries to load from `http://127.0.0.1:8787` by default. If the API is unavailable it will fall back to an embedded demo trace.

### MCP Server (optional)
If you're running inside an MCP host, you can start the MCP server entrypoint:

```bash
pip install "mcp[cli]"
python3 -m server.mcp_server
```

Set `AGENT_DIRECTOR_MCP_TRANSPORT` to `stdio` if your host requires stdio.
Set `AGENT_DIRECTOR_UI_URL` to the UI entrypoint that the host should load (defaults to `http://127.0.0.1:5173`).

## Environment variables
- `AGENT_DIRECTOR_DATA_DIR` — overrides the server data directory (default: `~/.agent-director`).
- `AGENT_DIRECTOR_SAFE_EXPORT=1` — forces safe export on the server (raw payloads disabled).
- `AGENT_DIRECTOR_MCP_TRANSPORT` — MCP transport (`streamable-http` default, `stdio` for stdio hosts).
- `AGENT_DIRECTOR_UI_URL` — UI URL for MCP hosts.
- `VITE_API_BASE` — UI API base URL (default: `http://127.0.0.1:8787`).
- `VITE_FORCE_DEMO=1` — always use the embedded demo trace (ignores API).
- `VITE_SKIP_INTRO=1` — skip the intro overlay.
- `VITE_HIDE_BUILD_DATE=1` — hide the build date in the header.

## Troubleshooting
- **UI shows demo data when you expect real traces.** Ensure the API is running at `http://127.0.0.1:8787` or set `VITE_API_BASE` to your API URL. Confirm `VITE_FORCE_DEMO` is not set to `1` for the UI build.
- **UI cannot reach the API.** Verify the server is running and port `8787` is free. If hosting the API elsewhere, set `VITE_API_BASE` and rebuild the UI.
- **Replay or step details return errors.** Confirm traces exist in `AGENT_DIRECTOR_DATA_DIR` and the directory is writable. If safe export is required, set `AGENT_DIRECTOR_SAFE_EXPORT=1` and restart the server.
- **Matrix run stays in running state.** Validate the anchor step exists in the trace and scenarios count is ≤ 25. Cancel and rerun after trimming scenarios.
- **Matrix run fails immediately.** Check for invalid scenario JSON or duplicate scenario names, then rerun.
- **Matrix export looks redacted.** Disable Safe export in the toolbar if you need raw values (only when sharing is not required).
- **MCP host opens a blank UI.** Set `AGENT_DIRECTOR_UI_URL` to the UI address the host can reach. If the host requires stdio, set `AGENT_DIRECTOR_MCP_TRANSPORT=stdio`.

## Testing

Run the full verification suite:

```bash
make verify
```

For stricter checks (includes mutation checks):

```bash
make verify-strict
```

For deep UX review (traces + Lighthouse + optional Percy):

```bash
make verify-ux
```

### Test Coverage

| Category | Tests | Coverage |
|----------|-------|----------|
| Unit (Vitest) | 206 | Components, hooks, API, utilities |
| E2E (Playwright) | 40+ | Onboarding, keyboard, inspector, flow |
| Visual | 3 | Cinema, Flow, Compare snapshots |
| Accessibility | 1 | Axe violations scan |

See `TESTING.md` for details.

## Docs (story + diagrams)
- `docs/index.md` — documentation hub
- `docs/story.md` — product narrative + positioning
- `docs/architecture.md` — system design + diagrams
- `docs/ux.md` — interaction model + magic moments
- `docs/hosting.md` — live demo hosting options
- `docs/brand.md` — logo + voice guidelines
- `docs/visual-system.md` — color, motion, and layout rules
- `docs/pitch-deck.pdf` — ready-to-present deck
- `docs/executive-summary.pdf` — one-page summary
- `docs/demo-script.md` — 90s live demo script

## Project hygiene
- `CONTRIBUTING.md` — dev flow + tests
- `SECURITY.md` — responsible disclosure

## Maintenance

Clean up old traces and export snapshots:

```bash
python3 scripts/store_maintenance.py cleanup --keep 20
python3 scripts/store_maintenance.py snapshot --output ./agent-director-snapshot.zip
```

---

If you want the logo swapped for a vector mark or full brand kit, say the word.
