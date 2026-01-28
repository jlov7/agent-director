#!/usr/bin/env bash
set -euo pipefail

if [[ ! -d ui/node_modules ]]; then
  echo "ui/node_modules is missing. Run: pnpm -C ui install" >&2
  exit 1
fi

echo "Running Playwright UX review (traces + video)"
pnpm -C ui test:e2e:review

echo "Running Lighthouse CI budgets"
pnpm -C ui lhci

if [[ -n "${PERCY_TOKEN:-}" ]]; then
  echo "Running Percy visual diff suite"
  pnpm -C ui percy:playwright
else
  echo "Skipping Percy (PERCY_TOKEN not set)."
fi
