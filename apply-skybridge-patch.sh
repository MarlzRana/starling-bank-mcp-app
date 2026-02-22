#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PATCH_FILE="notes/skybridge-preserve-tool-meta-ui.patch"
TARGET="node_modules/skybridge/dist/server/server.js"

if [ ! -f "$TARGET" ]; then
  echo "Error: $TARGET not found. Run npm install first."
  exit 1
fi

if [ ! -f "$PATCH_FILE" ]; then
  echo "Error: $PATCH_FILE not found."
  exit 1
fi

# Check if already patched (fixed-string match)
if grep -qF '...toolMeta.ui, resourceUri: widgetConfig.uri' "$TARGET"; then
  echo "Patch already applied, skipping."
  exit 0
fi

# Check the original line exists
if ! grep -qF 'toolMeta.ui = { resourceUri: widgetConfig.uri }' "$TARGET"; then
  echo "Error: expected line not found in $TARGET. Skybridge version may have changed."
  exit 1
fi

patch -p1 < "$PATCH_FILE"
echo "Patch applied successfully."
