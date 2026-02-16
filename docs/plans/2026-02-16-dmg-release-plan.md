# DMG Build + GitHub Release Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a macOS universal DMG and publish it to GitHub Releases via CI, with auto-updater integration.

**Architecture:** electron-vite compiles TypeScript to `out/`, electron-builder packages `out/` into a signed app bundle and DMG. GitHub Actions workflow triggers on `v*` tag push, runs tests, builds universal DMG, and uploads to GitHub Releases. The existing `electron-updater` in `src/main/updater.ts` already consumes GitHub Releases as its update feed.

**Tech Stack:** electron-builder 24.13.3 (already installed), GitHub Actions (macos-latest), electron-updater (already wired), iconutil (macOS built-in)

---

### Task 1: Generate Placeholder App Icon

**Files:**
- Create: `scripts/generate-icon.sh`
- Create: `build/icon.icns` (generated binary)
- Create: `build/icon.png` (1024x1024 source)

**Step 1: Create the icon generation script**

Create `scripts/generate-icon.sh`:

```bash
#!/bin/bash
# Generate macOS .icns from a 1024x1024 PNG source
# Usage: ./scripts/generate-icon.sh [source.png]

set -e

SOURCE="${1:-build/icon.png}"
ICONSET_DIR="build/Typeless.iconset"

if [ ! -f "$SOURCE" ]; then
  echo "Source PNG not found: $SOURCE"
  echo "Generating a placeholder 1024x1024 icon..."

  # Generate a simple gradient placeholder using sips and built-in tools
  # Create a 1024x1024 solid color PNG as placeholder
  python3 -c "
import struct, zlib

def create_png(width, height, r, g, b):
    def make_chunk(chunk_type, data):
        chunk = chunk_type + data
        return struct.pack('>I', len(data)) + chunk + struct.pack('>I', zlib.crc32(chunk) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = make_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))

    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # filter byte
        for x in range(width):
            # Gradient: darker at edges, lighter at center
            dx = abs(x - width/2) / (width/2)
            dy = abs(y - height/2) / (height/2)
            d = 1.0 - (dx*dx + dy*dy) * 0.5
            d = max(0.0, min(1.0, d))
            raw_data += struct.pack('BBB', int(r*d), int(g*d), int(b*d))

    idat = make_chunk(b'IDAT', zlib.compress(raw_data))
    iend = make_chunk(b'IEND', b'')

    return header + ihdr + idat + iend

# Blue-purple gradient (Typeless brand placeholder)
png_data = create_png(1024, 1024, 100, 120, 255)
with open('$SOURCE', 'wb') as f:
    f.write(png_data)
print('Created placeholder icon: $SOURCE')
"
fi

echo "Creating iconset from $SOURCE..."
mkdir -p "$ICONSET_DIR"

# Generate all required sizes
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

# Convert to .icns
iconutil -c icns "$ICONSET_DIR" -o build/icon.icns
echo "Created build/icon.icns"

# Cleanup
rm -rf "$ICONSET_DIR"
```

**Step 2: Run the script to generate the icon**

Run: `chmod +x scripts/generate-icon.sh && bash scripts/generate-icon.sh`
Expected: `build/icon.icns` created, `build/icon.png` created as placeholder

**Step 3: Verify the icon exists**

Run: `file build/icon.icns`
Expected: Output contains "Mac OS X icon"

**Step 4: Commit**

```bash
git add scripts/generate-icon.sh build/icon.icns build/icon.png
git commit -m "build: add placeholder app icon and generation script"
```

---

### Task 2: Create electron-builder Configuration

**Files:**
- Create: `electron-builder.yml`

**Step 1: Create `electron-builder.yml`**

```yaml
appId: com.cympotek.typeless
productName: Typeless
copyright: Copyright © 2024-2026 Cympotek

directories:
  buildResources: build
  output: dist

files:
  - out/**/*
  - "!out/**/*.map"

extraResources:
  - from: resources/sounds/
    to: sounds/
    filter:
      - "**/*"
  - from: resources/models/
    to: models/
    filter:
      - "**/*.gitkeep"

mac:
  category: public.app-category.productivity
  icon: build/icon.icns
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  target:
    - target: dmg
      arch:
        - universal
    - target: zip
      arch:
        - universal

dmg:
  artifactName: "${productName}-${version}-universal.${ext}"
  title: "${productName} ${version}"

publish:
  provider: github
  owner: clonn
  repo: simpleTypeless
  releaseType: release
```

**Step 2: Verify the config parses correctly**

Run: `node -e "const yaml = require('js-yaml'); const fs = require('fs'); console.log(JSON.stringify(yaml.load(fs.readFileSync('electron-builder.yml','utf8')),null,2))"`
Expected: Valid JSON output of the config, no parse errors

**Step 3: Commit**

```bash
git add electron-builder.yml
git commit -m "build: add electron-builder configuration for macOS DMG"
```

---

### Task 3: Add Build Scripts to package.json

**Files:**
- Modify: `package.json:15-23` (scripts section)
- Modify: `package.json:6` (description)
- Modify: `package.json:7` (author)

**Step 1: Update package.json metadata and scripts**

Update `package.json` with these changes:

1. Change `"description"` from `"Electron Vite React boilerplate."` to `"Voice-to-text transcription app with AI rewriting"`
2. Change `"author"` from `""` to `"Cympotek"`
3. Add these scripts (keep existing ones):
   - `"build:mac:dir": "electron-vite build && electron-builder --mac --dir"`
   - `"build:mac": "electron-vite build && electron-builder --mac --universal"`
   - `"release": "electron-vite build && electron-builder --mac --universal --publish always"`

**Step 2: Verify scripts are valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

**Step 3: Verify vite build still works**

Run: `npm run build`
Expected: Clean build with no errors, output in `out/` directory

**Step 4: Commit**

```bash
git add package.json
git commit -m "build: add macOS build and release scripts"
```

---

### Task 4: Test Local Unpacked Build

**Files:**
- No new files

**Step 1: Run the unpacked build**

Run: `npm run build:mac:dir`
Expected: Build succeeds. Output appears in `dist/mac-universal/` or `dist/mac-arm64/` containing `Typeless.app`

**Step 2: Verify the app bundle exists**

Run: `ls -la dist/mac*/Typeless.app/Contents/`
Expected: Directory listing shows `MacOS/`, `Resources/`, `Info.plist`, `Frameworks/`

**Step 3: Verify extraResources are bundled**

Run: `ls dist/mac*/Typeless.app/Contents/Resources/sounds/`
Expected: `record-start.wav` and `record-end.wav` present

**Step 4: Verify the app launches**

Run: `open dist/mac*/Typeless.app`
Expected: App launches (may show permission dialogs for microphone). Close it manually after verifying it opens.

**Step 5: Commit (if any config tweaks were needed)**

If any changes were made to fix build issues:
```bash
git add -A
git commit -m "fix: adjust build config for successful macOS packaging"
```

---

### Task 5: Build DMG

**Files:**
- No new files (DMG is a build artifact in `dist/`)

**Step 1: Build the DMG**

Run: `npm run build:mac`
Expected: Build succeeds. A `.dmg` file appears in `dist/` directory. Look for `Typeless-1.0.0-universal.dmg`.

**Step 2: Verify the DMG exists**

Run: `ls -lh dist/*.dmg`
Expected: One DMG file, size typically 80-200MB for an Electron app with native modules

**Step 3: Mount and verify the DMG**

Run: `hdiutil attach dist/Typeless-1.0.0-universal.dmg`
Expected: DMG mounts, shows volume with Typeless.app and Applications symlink

**Step 4: Verify the app from DMG launches**

Run: `open /Volumes/Typeless*/Typeless.app`
Expected: App launches from the mounted DMG

**Step 5: Unmount the DMG**

Run: `hdiutil detach /Volumes/Typeless*`
Expected: Volume unmounted cleanly

**Step 6: Commit (if any config tweaks were needed)**

If any changes were made to fix DMG issues:
```bash
git add -A
git commit -m "fix: adjust DMG build configuration"
```

---

### Task 6: Create GitHub Actions Release Workflow

**Files:**
- Create: `.github/workflows/release.yml`

**Step 1: Create the workflow file**

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-mac:
    runs-on: macos-latest
    permissions:
      contents: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Run tests
        run: npm test

      - name: Build app
        run: npx electron-vite build

      - name: Build and publish DMG
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx electron-builder --mac --universal --publish always

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: typeless-mac-universal
          path: |
            dist/*.dmg
            dist/*.zip
            dist/*.blockmap
            dist/latest-mac.yml
          retention-days: 30
```

**Step 2: Verify the YAML is valid**

Run: `node -e "const yaml = require('js-yaml'); const fs = require('fs'); yaml.load(fs.readFileSync('.github/workflows/release.yml','utf8')); console.log('Valid YAML')"`
Expected: `Valid YAML`

**Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add GitHub Actions release workflow for macOS DMG"
```

---

### Task 7: Run Full Test Suite and Typecheck

**Files:**
- No new files

This is the final validation before pushing.

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: Clean exit, no errors

**Step 2: Run all tests**

Run: `npm test`
Expected: All 155 tests pass

**Step 3: Run vite build**

Run: `npm run build`
Expected: Clean build

**Step 4: Verify git status is clean**

Run: `git status`
Expected: Clean working tree (all changes committed)

**Step 5: Push to main**

```bash
git push origin main
```

---

### Task 8: Create First Release

**Files:**
- No new files

**Step 1: Tag the release**

Run: `npm version patch -m "release: v%s"`
This bumps `package.json` version from `1.0.0` to `1.0.1` and creates git tag `v1.0.1`.

Note: We use `patch` to leave `1.0.0` as the unreleased version and make `1.0.1` the first actual release.

**Step 2: Push the tag**

Run: `git push origin main --follow-tags`
Expected: Pushes the commit and tag to GitHub. This triggers the GitHub Actions workflow.

**Step 3: Monitor the GitHub Actions run**

Run: `gh run list --limit 1`
Expected: Shows a running workflow triggered by the `v1.0.1` tag

**Step 4: Wait for completion and check the release**

Run: `gh run watch` (watches the most recent run)
Expected: Workflow completes successfully

Then verify:
Run: `gh release view v1.0.1`
Expected: Release page with DMG, ZIP, blockmap, and latest-mac.yml assets

---

## Notes

- **Native modules (better-sqlite3, koffi):** electron-builder handles rebuilding these for the target architecture automatically. If universal build fails due to native modules, fall back to `--arch arm64` only and file a separate issue.
- **Unsigned app warning:** Since we're not code signing, macOS Gatekeeper will show a warning. Users must right-click > Open the first time. Document this in README.
- **Auto-updater:** The `latest-mac.yml` file uploaded alongside the DMG is what `electron-updater` reads to detect new versions. The existing `src/main/updater.ts` should work with no changes.
- **Future:** Add code signing when Apple Developer certificate is available. Add `afterSign` hook for notarization.
