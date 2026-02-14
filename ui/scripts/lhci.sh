#!/usr/bin/env bash
set -euo pipefail

# Prefer system Chrome for Lighthouse; Playwright Chromium can trigger NO_FCP flake in CI/desktop.
unset CHROME_PATH || true

MAX_ATTEMPTS=3
attempt=1
while [[ "$attempt" -le "$MAX_ATTEMPTS" ]]; do
  rm -rf .lighthouseci
  set +e
  OUTPUT=$(pnpm exec lhci autorun --config lighthouserc.json 2>&1)
  STATUS=$?
  set -e

  printf '%s\n' "$OUTPUT"
  if [[ "$STATUS" -eq 0 ]]; then
    exit 0
  fi

  if [[ "$OUTPUT" == *"NO_FCP"* ]] && [[ "$attempt" -lt "$MAX_ATTEMPTS" ]]; then
    echo "LHCI transient NO_FCP on attempt ${attempt}/${MAX_ATTEMPTS}; retrying..."
    attempt=$((attempt + 1))
    sleep 2
    continue
  fi

  exit "$STATUS"
done
