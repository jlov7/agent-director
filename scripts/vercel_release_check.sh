#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-${VERCEL_TARGET:-agent-director.vercel.app}}"

if ! command -v vercel >/dev/null 2>&1; then
  echo "ERROR: vercel CLI is required but not found in PATH." >&2
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "ERROR: vercel auth check failed. Run: vercel login" >&2
  exit 1
fi

echo "Inspecting deployment: ${TARGET}"
REPORT="$(vercel inspect "${TARGET}" --logs 2>&1)"

STATUS_LINE="$(printf '%s\n' "${REPORT}" | rg '^status\s+' -m 1 || true)"
if [[ -z "${STATUS_LINE}" ]]; then
  echo "ERROR: Unable to determine deployment status from Vercel output." >&2
  printf '%s\n' "${REPORT}" | tail -n 40 >&2
  exit 1
fi

echo "${STATUS_LINE}"
if printf '%s\n' "${STATUS_LINE}" | rg -q 'Ready'; then
  echo "Vercel deployment check: PASS"
  exit 0
fi

echo "ERROR: Vercel deployment is not Ready." >&2
printf '%s\n' "${REPORT}" | tail -n 60 >&2
exit 1
