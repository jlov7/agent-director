#!/usr/bin/env bash
set -euo pipefail

CHROME_PATH=$(node -e "process.stdout.write(require('playwright-core').chromium.executablePath())")
export CHROME_PATH

pnpm exec lhci autorun --config lighthouserc.json
