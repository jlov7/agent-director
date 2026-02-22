#!/usr/bin/env bash
set -euo pipefail
unset NO_COLOR || true

echo "FRONTEND_VERIFY_STATUS=START"

pnpm -C ui lint
pnpm -C ui typecheck
pnpm -C ui test
pnpm -C ui test:e2e
pnpm -C ui lhci
pnpm verify:visual
pnpm -C ui test:e2e:visual-matrix

echo "FRONTEND_VERIFY_STATUS=PASS"
