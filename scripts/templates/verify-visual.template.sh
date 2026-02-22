#!/usr/bin/env bash
set -euo pipefail
unset NO_COLOR || true

# Portable template for deterministic visual verification in Codex projects.
# Replace defaults or set env vars in CI.
ROOT_DIR="${ROOT_DIR:-$(pwd)}"
UI_DIR="${UI_DIR:-${ROOT_DIR}/ui}"
VISUAL_SPEC="${VISUAL_SPEC:-tests/e2e/visual-verification.spec.ts}"
PLAYWRIGHT_CONFIG="${PLAYWRIGHT_CONFIG:-playwright.review.config.ts}"
ARTIFACT_DIR="${ARTIFACT_DIR:-${ROOT_DIR}/artifacts/visual-verification}"
INDEX_SCRIPT="${INDEX_SCRIPT:-${ROOT_DIR}/scripts/visual_artifact_index.mjs}"

mkdir -p "${ARTIFACT_DIR}"
GIT_SHA="$(git -C "${ROOT_DIR}" rev-parse --short HEAD)"
export VITE_GIT_SHA="${GIT_SHA}"

echo "VISUAL_VERIFICATION_COMMIT_SHA=${GIT_SHA}"
echo "VISUAL_VERIFICATION_ARTIFACT_DIR=${ARTIFACT_DIR}"

set +e
pnpm -C "${UI_DIR}" exec playwright test "${VISUAL_SPEC}" --config "${PLAYWRIGHT_CONFIG}"
STATUS=$?
set -e

if [[ -f "${INDEX_SCRIPT}" ]]; then
  INDEX_PATH="$(node "${INDEX_SCRIPT}")"
  echo "VISUAL_VERIFICATION_INDEX=${INDEX_PATH}"
fi

if [[ ${STATUS} -ne 0 ]]; then
  echo "VISUAL_VERIFICATION_STATUS=FAIL"
  exit "${STATUS}"
fi

echo "VISUAL_VERIFICATION_STATUS=PASS"
