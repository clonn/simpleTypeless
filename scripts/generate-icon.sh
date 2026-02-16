#!/bin/bash
# Generate macOS .icns from a 1024x1024 PNG source
# Usage: ./scripts/generate-icon.sh [source.png]
set -e

SOURCE="${1:-build/icon.png}"
ICONSET_DIR="build/Typeless.iconset"

if [ ! -f "$SOURCE" ]; then
  echo "Error: Source PNG not found: $SOURCE"
  echo "Please provide a 1024x1024 PNG as the first argument."
  exit 1
fi

echo "Creating iconset from $SOURCE..."
mkdir -p "$ICONSET_DIR"

sips -z 16 16     "$SOURCE" --out "${ICONSET_DIR}/icon_16x16.png"      > /dev/null 2>&1
sips -z 32 32     "$SOURCE" --out "${ICONSET_DIR}/icon_16x16@2x.png"   > /dev/null 2>&1
sips -z 32 32     "$SOURCE" --out "${ICONSET_DIR}/icon_32x32.png"      > /dev/null 2>&1
sips -z 64 64     "$SOURCE" --out "${ICONSET_DIR}/icon_32x32@2x.png"   > /dev/null 2>&1
sips -z 128 128   "$SOURCE" --out "${ICONSET_DIR}/icon_128x128.png"    > /dev/null 2>&1
sips -z 256 256   "$SOURCE" --out "${ICONSET_DIR}/icon_128x128@2x.png" > /dev/null 2>&1
sips -z 256 256   "$SOURCE" --out "${ICONSET_DIR}/icon_256x256.png"    > /dev/null 2>&1
sips -z 512 512   "$SOURCE" --out "${ICONSET_DIR}/icon_256x256@2x.png" > /dev/null 2>&1
sips -z 512 512   "$SOURCE" --out "${ICONSET_DIR}/icon_512x512.png"    > /dev/null 2>&1
sips -z 1024 1024 "$SOURCE" --out "${ICONSET_DIR}/icon_512x512@2x.png" > /dev/null 2>&1

iconutil -c icns "$ICONSET_DIR" -o build/icon.icns
echo "Created build/icon.icns"

rm -rf "$ICONSET_DIR"
