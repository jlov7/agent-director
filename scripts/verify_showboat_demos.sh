#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEMO_DIR="${ROOT_DIR}/docs/demos"

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
  echo "Install showboat (or uv) to verify executable demo docs." >&2
  exit 1
}

SHOWBOAT_CMD="$(resolve_showboat)"

if [[ ! -d "${DEMO_DIR}" ]]; then
  echo "No demos directory found at ${DEMO_DIR}; nothing to verify."
  exit 0
fi

DEMO_FILES="$(find "${DEMO_DIR}" -maxdepth 1 -type f -name '*.md' | sort)"

if [[ -z "${DEMO_FILES}" ]]; then
  echo "No Showboat markdown docs found in ${DEMO_DIR}."
  exit 0
fi

cd "${ROOT_DIR}"
while IFS= read -r demo_file; do
  if ! grep -q '^<!-- showboat-id:' "${demo_file}"; then
    echo "Skipping ${demo_file#${ROOT_DIR}/} (not a Showboat document)"
    continue
  fi
  rel_path="${demo_file#${ROOT_DIR}/}"
  echo "Verifying ${rel_path}"
  # shellcheck disable=SC2086
  ${SHOWBOAT_CMD} --workdir "${ROOT_DIR}" verify "${rel_path}"
done <<< "${DEMO_FILES}"

echo "All Showboat demo docs verified."
