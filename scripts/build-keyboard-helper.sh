#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../native/KeyboardHelper"
OUTPUT_DIR="$SCRIPT_DIR/../resources/bin"

echo "Building KeyboardHelper..."
mkdir -p "$OUTPUT_DIR"

cd "$PROJECT_DIR"

swift build -c release --arch arm64 2>&1 | tail -1
ARM64_BIN=".build/arm64-apple-macosx/release/KeyboardHelper"

swift build -c release --arch x86_64 2>&1 | tail -1
X64_BIN=".build/x86_64-apple-macosx/release/KeyboardHelper"

lipo -create "$ARM64_BIN" "$X64_BIN" -output "$OUTPUT_DIR/KeyboardHelper"
chmod +x "$OUTPUT_DIR/KeyboardHelper"

echo "Built universal binary: $OUTPUT_DIR/KeyboardHelper"
file "$OUTPUT_DIR/KeyboardHelper"
