#!/usr/bin/env bash
set -euo pipefail
unset NO_COLOR || true

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACT_DIR="${ROOT_DIR}/artifacts/visual-verification"
TEST_RESULTS_DIR="${ROOT_DIR}/ui/test-results"

mkdir -p "${ARTIFACT_DIR}"

GIT_SHA="$(git -C "${ROOT_DIR}" rev-parse --short HEAD)"
export VITE_GIT_SHA="${GIT_SHA}"

echo "VISUAL_VERIFICATION_COMMIT_SHA=${GIT_SHA}"
echo "VISUAL_VERIFICATION_ARTIFACT_DIR=${ARTIFACT_DIR}"

echo "Running deterministic visual verification suite..."
set +e
pnpm -C "${ROOT_DIR}/ui" exec playwright test tests/e2e/visual-verification.spec.ts --config playwright.review.config.ts
STATUS=$?
set -e

INDEX_PATH="$(node "${ROOT_DIR}/scripts/visual_artifact_index.mjs")"
echo "VISUAL_VERIFICATION_INDEX=${INDEX_PATH}"
VIEWER_PATH="$(node "${ROOT_DIR}/scripts/visual_artifact_viewer.mjs")"
echo "VISUAL_VERIFICATION_VIEWER=${VIEWER_PATH}"

if [[ ${STATUS} -ne 0 ]]; then
  echo "VISUAL_VERIFICATION_STATUS=FAIL"
  echo "Known artifacts:"
  find "${TEST_RESULTS_DIR}" -type f \( -name '*-diff.png' -o -name '*actual.png' -o -name '*expected.png' -o -name 'visual-debug.json' \) | sort || true
  find "${ARTIFACT_DIR}" -type f | sort || true
  [[ -f "${ARTIFACT_DIR}/index.md" ]] && cat "${ARTIFACT_DIR}/index.md"
  exit ${STATUS}
fi

echo "VISUAL_VERIFICATION_STATUS=PASS"
echo "Watermark proof files:"
find "${ARTIFACT_DIR}" -type f -name '*watermark-proof.json' | sort

echo "Watermark proof values:"
find "${ARTIFACT_DIR}" -type f -name '*watermark-proof.json' -print0 | xargs -0 -I {} sh -c 'echo "--- {}"; cat "{}"'
