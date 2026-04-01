#!/usr/bin/env bash

set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
TARGET_DIR="app/files"

usage() {
  cat <<EOF
Usage:
  $SCRIPT_NAME <input-file> [output-name]
  $SCRIPT_NAME --help

Description:
  Encrypts <input-file> with age (passphrase mode) and writes it into $TARGET_DIR.
  If [output-name] is omitted, a UUIDv4-style filename is generated.

Examples:
  $SCRIPT_NAME ./my-archive.zip
  $SCRIPT_NAME ./my-archive.zip 01234567-89ab-4def-8abc-0123456789ab
EOF
}

error() {
  echo "Error: $*" >&2
  echo "Run '$SCRIPT_NAME --help' for usage." >&2
  exit 1
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage
  exit 1
fi

INPUT_FILE="$1"
OUTPUT_NAME="${2:-}"

if [[ ! -f "$INPUT_FILE" ]]; then
  error "Input file '$INPUT_FILE' does not exist or is not a regular file."
fi

if [[ ! -d "$TARGET_DIR" ]]; then
  error "Target directory '$TARGET_DIR' does not exist. Run from repo root."
fi

if ! command -v age >/dev/null 2>&1; then
  error "'age' is required but was not found in PATH."
fi

if [[ -z "$OUTPUT_NAME" ]]; then
  if command -v uuidgen >/dev/null 2>&1; then
    OUTPUT_NAME="$(uuidgen | tr '[:upper:]' '[:lower:]')"
  else
    error "'uuidgen' is required when output-name is not provided."
  fi
fi

DEST_PATH="$TARGET_DIR/$OUTPUT_NAME"

if [[ -e "$DEST_PATH" ]]; then
  error "Destination file '$DEST_PATH' already exists."
fi

echo "Encrypting '$INPUT_FILE' to '$DEST_PATH'..."
age -e -p -o "$DEST_PATH" "$INPUT_FILE"

echo "Encrypted '$INPUT_FILE' -> '$DEST_PATH'"
echo "URL fragment to use: #$OUTPUT_NAME"
