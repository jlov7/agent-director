#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-${SMOKE_TARGET:-http://127.0.0.1:8787}}"
API_KEY="${SMOKE_API_KEY:-}"
TENANT_ID="${SMOKE_TENANT_ID:-public}"
ACTOR_ID="${SMOKE_ACTOR_ID:-release-smoke}"

if [[ "${TARGET}" != http*://* ]]; then
  TARGET="https://${TARGET}"
fi

TARGET="${TARGET%/}"

HEADER_ARGS=(
  -H "X-Tenant-Id: ${TENANT_ID}"
  -H "X-Actor-Id: ${ACTOR_ID}"
)

if [[ -n "${API_KEY}" ]]; then
  HEADER_ARGS+=(-H "X-API-Key: ${API_KEY}")
fi

echo "Running post-deploy smoke checks against ${TARGET}"

health="$(curl -fsSL "${HEADER_ARGS[@]}" "${TARGET}/api/health")"
echo "health=${health}"

openapi="$(curl -fsSL "${HEADER_ARGS[@]}" "${TARGET}/api/openapi.json" | jq -r '.openapi')"
echo "openapi=${openapi}"

latest="$(curl -fsSL "${HEADER_ARGS[@]}" "${TARGET}/api/traces?latest=1" | jq -r '.trace.id // \"none\"')"
echo "latest_trace=${latest}"

echo "post-deploy smoke: PASS"
