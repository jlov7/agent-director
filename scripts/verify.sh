#!/usr/bin/env bash
set -euo pipefail
unset NO_COLOR || true

STRICT=0
if [[ "${1:-}" == "--strict" ]]; then
  STRICT=1
fi

python3 -m compileall server
python3 -m unittest discover -s server/tests
python3 scripts/ai_eval.py

if [[ ! -d ui/node_modules ]]; then
  echo "ui/node_modules is missing. Run: pnpm -C ui install" >&2
  exit 1
fi

pnpm -C ui lint
pnpm -C ui design:lint
pnpm -C ui typecheck
pnpm -C ui build
pnpm -C ui test
pnpm -C ui test:e2e

if [[ "$STRICT" -eq 1 ]]; then
  python3 scripts/mutation_check.py
fi
