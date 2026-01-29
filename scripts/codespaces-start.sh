#!/usr/bin/env bash
set -euo pipefail

if ! pgrep -f "server/main.py" >/dev/null 2>&1; then
  nohup python3 server/main.py > /tmp/agent-director-api.log 2>&1 &
fi

if ! pgrep -f "pnpm -C ui dev" >/dev/null 2>&1; then
  nohup pnpm -C ui dev --host 0.0.0.0 --port 5173 > /tmp/agent-director-ui.log 2>&1 &
fi
