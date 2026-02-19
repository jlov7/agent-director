#!/usr/bin/env bash
set -euo pipefail
unset NO_COLOR || true

usage() {
  cat <<'EOF'
Usage:
  ./scripts/release_safety_ops.sh preflight
  ./scripts/release_safety_ops.sh canary
  ./scripts/release_safety_ops.sh rollback <deployment-url-or-id>
  ./scripts/release_safety_ops.sh kill-switch <on|off|status>

Notes:
  - Requires authenticated Vercel CLI for canary/rollback/kill-switch.
  - kill-switch toggles VITE_GLOBAL_KILL_SWITCH in Vercel production env, then redeploys prod.
EOF
}

require_vercel() {
  if ! command -v vercel >/dev/null 2>&1; then
    echo "Vercel CLI is not installed. Install with: npm i -g vercel" >&2
    exit 1
  fi
}

cmd="${1:-}"

case "$cmd" in
  preflight)
    make verify
    make doctor
    make scorecard
    make vercel-check
    ;;
  canary)
    require_vercel
    echo "Creating canary deployment..."
    deployment_url="$(vercel deploy -y)"
    echo "Canary deployment: $deployment_url"
    vercel inspect "$deployment_url" --logs || true
    ;;
  rollback)
    require_vercel
    target="${2:-}"
    if [[ -z "$target" ]]; then
      echo "Missing deployment URL or ID for rollback." >&2
      usage
      exit 1
    fi
    echo "Rolling back deployment: $target"
    vercel rollback "$target"
    vercel inspect "$target" --logs || true
    ;;
  kill-switch)
    require_vercel
    action="${2:-}"
    case "$action" in
      on)
        vercel env rm VITE_GLOBAL_KILL_SWITCH production --yes >/dev/null 2>&1 || true
        printf '1\n' | vercel env add VITE_GLOBAL_KILL_SWITCH production >/dev/null
        vercel deploy --prod -y
        echo "Kill switch enabled (VITE_GLOBAL_KILL_SWITCH=1) and production redeployed."
        ;;
      off)
        vercel env rm VITE_GLOBAL_KILL_SWITCH production --yes >/dev/null 2>&1 || true
        vercel deploy --prod -y
        echo "Kill switch disabled and production redeployed."
        ;;
      status)
        if vercel env ls | rg -q "VITE_GLOBAL_KILL_SWITCH"; then
          echo "Kill switch env var is configured in Vercel."
        else
          echo "Kill switch env var is not configured in Vercel."
        fi
        ;;
      *)
        echo "Unknown kill-switch action: $action" >&2
        usage
        exit 1
        ;;
    esac
    ;;
  *)
    usage
    exit 1
    ;;
esac
