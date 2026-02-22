#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PATCH_FILE="notes/skybridge-express-server-options.patch"
TARGET="node_modules/skybridge/dist/server/express.js"

if [ ! -f "$TARGET" ]; then
  echo "Error: $TARGET not found. Run npm install first."
  exit 1
fi

if [ ! -f "$PATCH_FILE" ]; then
  echo "Error: $PATCH_FILE not found."
  exit 1
fi

# Check if already patched (fixed-string match)
if grep -qF 'express.json({ limit: "10mb" })' "$TARGET"; then
  echo "Patch already applied, skipping."
  exit 0
fi

# Check the original line exists
if ! grep -qF 'app.use(express.json())' "$TARGET"; then
  echo "Error: expected line not found in $TARGET. Skybridge version may have changed."
  exit 1
fi

patch -p1 < "$PATCH_FILE"
echo "Patch applied successfully."
