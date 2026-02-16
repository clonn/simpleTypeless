# DMG Build + GitHub Release Pipeline Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a macOS DMG and publish it to GitHub Releases via CI, with auto-updater integration.

**Architecture:** electron-vite builds the app, electron-builder packages it into a universal DMG (arm64 + x64), GitHub Actions automates the release on tag push. electron-updater already connects to GitHub Releases for in-app updates.

**Tech Stack:** electron-builder 24.x, GitHub Actions (macos-latest), electron-updater, iconutil

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Code signing | Unsigned for now | No Apple Developer certificate yet; add signing later |
| Release trigger | GitHub Actions on tag push | Automated, reproducible, feeds electron-updater |
| Architecture | Universal (arm64 + x64) | Single DMG for all Mac users |
| Config format | electron-builder.yml | Standard convention, clean separation from package.json |

## Components

### 1. App Icon
- Generate placeholder `build/icon.icns` using iconutil
- 1024x1024 source, scaled to required sizes (16, 32, 128, 256, 512)
- Replace with real artwork later

### 2. electron-builder.yml
- appId: `com.cympotek.typeless`
- productName: `Typeless`
- Mac target: DMG, universal
- Entitlements: `build/entitlements.mac.plist` (audio, JIT, apple-events)
- hardenedRuntime: true
- Publish: GitHub provider, owner `clonn`, repo `simpleTypeless`
- extraResources: `resources/sounds/`, `resources/models/`
- Native modules: `better-sqlite3`, `koffi` rebuilt for both archs

### 3. Package.json Scripts
- `build:mac` - electron-vite build + electron-builder --mac --universal
- `build:mac:dir` - unpacked build for quick testing
- `release` - build + publish to GitHub Releases

### 4. GitHub Actions Workflow
- Trigger: tag push matching `v*`
- Runner: macos-latest
- Steps: checkout, node 22, npm ci, typecheck, test, vite build, electron-builder publish
- Uses `GITHUB_TOKEN` for release upload

### 5. Pre-release Validation
1. `npm run build:mac:dir` - unpacked app launches
2. `npm run build:mac` - DMG mounts, app runs
3. Native modules work (SQLite history, audio recording)
4. Auto-updater connects to GitHub Releases

### 6. Versioning
- `npm version patch|minor|major` to bump + tag
- `git push --follow-tags` triggers CI release
