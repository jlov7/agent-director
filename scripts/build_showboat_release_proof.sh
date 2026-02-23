#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC_REL_PATH="${1:-docs/demos/release-proof.md}"

resolve_showboat() {
  if command -v showboat >/dev/null 2>&1; then
    echo "showboat"
    return 0
  fi
  if command -v uvx >/dev/null 2>&1; then
    echo "uvx --from showboat showboat"
    return 0
  fi
  echo "ERROR: showboat not found and uvx is unavailable." >&2
  echo "Install showboat or uv first." >&2
  exit 1
}

SHOWBOAT_CMD="$(resolve_showboat)"

mkdir -p "${ROOT_DIR}/$(dirname "${DOC_REL_PATH}")"
cd "${ROOT_DIR}"
rm -f "${DOC_REL_PATH}"

run_showboat() {
  # shellcheck disable=SC2086
  ${SHOWBOAT_CMD} --workdir "${ROOT_DIR}" "$@"
}

run_showboat init "${DOC_REL_PATH}" "Agent Director Release Proof (Showboat)"
run_showboat note "${DOC_REL_PATH}" "This executable document captures reproducible release-proof checks for Agent Director. Use it as human-readable evidence that verification entry points and core documentation contracts exist and stay stable."
run_showboat note "${DOC_REL_PATH}" "All commands below are deterministic, local, and CI-friendly."
run_showboat exec "${DOC_REL_PATH}" bash "test -x scripts/verify-frontend.sh && echo verify_frontend_gate_ready"
run_showboat exec "${DOC_REL_PATH}" bash "test -x scripts/verify-visual.sh && echo verify_visual_gate_ready"
run_showboat exec "${DOC_REL_PATH}" bash "test -f docs/visual-verification-protocol.md && echo visual_verification_protocol_present"
run_showboat exec "${DOC_REL_PATH}" bash "jq -r '.scripts[\"verify:frontend\"], .scripts[\"verify:visual\"]' package.json"
run_showboat exec "${DOC_REL_PATH}" bash "grep -q '^## Quickstart (5 Minutes)$' README.md && grep -q '^## Testing$' README.md && grep -q '^## Deployment notes$' README.md && grep -q '^## Executable Demo Docs (Showboat)$' README.md && echo readme_sections_present"

echo "Showboat release proof generated: ${DOC_REL_PATH}"
