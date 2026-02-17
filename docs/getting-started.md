# Getting Started

This guide gets you from clone to a working local instance quickly.

## Prerequisites

- Python 3.12+
- Node.js 20+
- pnpm 9/10

## 1) Clone and install

```bash
git clone https://github.com/jlov7/agent-director.git
cd agent-director
pnpm -C ui install
```

## 2) Start the API server

```bash
python3 server/main.py
```

Default API address: `http://127.0.0.1:8787`

Optional custom data directory:

```bash
AGENT_DIRECTOR_DATA_DIR=/path/to/data python3 server/main.py
```

## 3) Start the UI

```bash
pnpm -C ui dev
```

Default UI address: `http://127.0.0.1:5173`

The UI targets `http://127.0.0.1:8787` by default and falls back to embedded demo data if the API is unavailable.

## 4) Run verification

```bash
make verify
```

Stricter checks:

```bash
make verify-strict
```

Release evidence:

```bash
make doctor
make scorecard
```

## 5) Optional: run with MCP

```bash
pip install "mcp[cli]"
python3 -m server.mcp_server
```

Useful env vars:

- `AGENT_DIRECTOR_MCP_TRANSPORT=stdio`
- `AGENT_DIRECTOR_UI_URL=http://127.0.0.1:5173`
