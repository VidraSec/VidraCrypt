#!/usr/bin/env bash
set -euo pipefail

WORKER_NAME="${WORKER_NAME:-vidracrypt}"
ASSETS_DIR="${ASSETS_DIR:-./app}"
COMPAT_DATE="${COMPAT_DATE:-$(date +%F)}"

if ! command -v wrangler >/dev/null 2>&1; then
  echo "Error: wrangler is not installed or not in PATH." >&2
  exit 1
fi

wrangler deploy \
  --name "$WORKER_NAME" \
  --compatibility-date "$COMPAT_DATE" \
  --assets "$ASSETS_DIR"
