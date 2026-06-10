#!/usr/bin/env bash

set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${TARGET_DIR:-s3-files}"
FILES_PUBLIC_BASE_URL="${FILES_PUBLIC_BASE_URL:-}"
METADATA_FILE="${METADATA_FILE:-file-metadata.json}"

generate_passphrase() {
  if ! command -v diceware >/dev/null 2>&1; then
    error "'diceware' is required to generate a standardized passphrase."
  fi

  # Standardized Diceware method.
  diceware --num 6 --delimiter "."
}

confirm_passphrase() {
  local passphrase="$1"
  local answer

  while true; do
    # Must go to stderr: this function runs inside $(...) and stdout is captured for the passphrase only.
    echo "Generated passphrase: $passphrase" >&2
    read -r -p "Use this passphrase? [y]es / [n]ew / [q]uit: " answer
    case "${answer,,}" in
      y|yes|"")
        echo "$passphrase"
        return 0
        ;;
      n|no|new)
        passphrase="$(generate_passphrase)"
        ;;
      q|quit)
        error "Aborted by user."
        ;;
      *)
        echo "Please answer y, n, or q." >&2
        ;;
    esac
  done
}

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

upsert_file_metadata() {
  local metadata_file="$1"
  local original_name="$2"
  local encrypted_name="$3"
  local s3_url="$4"
  local crypt_url="$5"

  if ! command -v python3 >/dev/null 2>&1; then
    echo "Warning: python3 not found; skipping metadata update (${metadata_file})." >&2
    return 0
  fi

  python3 "${SCRIPT_DIR}/upsert-file-metadata.py" \
    "$metadata_file" \
    "$original_name" \
    "$encrypted_name" \
    "$s3_url" \
    "$crypt_url"
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
PASSPHRASE="$(confirm_passphrase "$(generate_passphrase)")"
# age -p reads from /dev/tty only (not stdin); there is no env-based passphrase in stock age.
echo "age will prompt twice (input hidden). Paste or type the same passphrase both times." >&2
echo "Do not submit an empty passphrase — age would autogenerate a different one than shown above." >&2
echo "Passphrase to enter: $PASSPHRASE" >&2
age -e -p -o "$DEST_PATH" "$INPUT_FILE"

echo "Encrypted '$INPUT_FILE' -> '$DEST_PATH'"
echo "Passphrase: $PASSPHRASE"
ORIGINAL_NAME="$(basename "$INPUT_FILE")"
if [[ -n "${FILES_PUBLIC_BASE_URL}" ]]; then
  FILE_URL="${FILES_PUBLIC_BASE_URL%/}/${OUTPUT_NAME}"
  ENCODED_GET="$(printf '%s' "$FILE_URL" | openssl base64 -A | tr '+/' '-_' | tr -d '=')"
  upsert_file_metadata "$METADATA_FILE" "$ORIGINAL_NAME" "$OUTPUT_NAME" "$FILE_URL" ""
  echo "URL fragment to use: #get=${ENCODED_GET}"
  echo "Resolved file URL: $FILE_URL"
else
  upsert_file_metadata "$METADATA_FILE" "$ORIGINAL_NAME" "$OUTPUT_NAME" "" ""
  echo "URL fragment to use: #$OUTPUT_NAME"
  echo "Hint: set FILES_PUBLIC_BASE_URL to print #get=<base64-url> fragments for the app."
fi
echo "Metadata updated in: $METADATA_FILE"
