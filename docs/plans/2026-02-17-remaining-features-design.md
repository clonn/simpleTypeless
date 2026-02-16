# Remaining Issue #6 Features — Design Document

**Date:** 2026-02-17
**Scope:** P2 (Native Integration), P5 (UX Polish remaining), P6 (Advanced Features remaining)
**Reference:** https://github.com/clonn/simpleTypeless/issues/6

---

## Decisions

| Decision | Choice |
|----------|--------|
| Dark mode approach | Follow system (nativeTheme) |
| Statistics dashboard | Simple summary cards |
| Native integration depth | Swift helper binary (child process) |
| Implementation order | Feature-by-feature (A) |

---

## Feature 1: Keyboard Shortcut Hints

**Goal:** Show keyboard shortcut information in tray menu and settings panel.

**Tray menu:** Add `accelerator` labels to menu items (Electron renders as right-aligned hints). Map hotkey format from `CommandOrControl+Shift+Space` to display format `⌘⇧Space`.

**Settings panel:** Below the hotkey capture button, display the current hotkey with macOS symbols. Add a small info text explaining available modifier keys.

**Files to modify:**
- `src/main/index.ts` — add `accelerator` to tray menu template items
- `src/renderer/src/components/SettingsPanel.tsx` — add hint display below hotkey editor

---

## Feature 2: Multi-language Whisper Support

**Goal:** Let users choose the transcription language instead of hardcoded auto-detect.

**Languages:** auto (default), en, zh, ja, ko, es, fr, de, pt, ru, ar, hi, it, nl, pl, th, vi, id, tr

**Implementation:**
- Add `transcriptionLanguage` to settings type and electron-store
- Settings UI: language dropdown between ASR provider and hotkey sections
- Local Whisper: pass `--language <code>` flag (replace current hardcoded 'auto')
- Cloud OpenAI: set `language` field in multipart form data
- Update initial prompt based on language (remove bilingual prompt when single language selected)

**Files to modify:**
- `src/shared/types.ts` — add `transcriptionLanguage` to `AppSettings`
- `src/main/asr/engine.ts` — use language setting in CLI args
- `src/main/asr/cloudOpenAIProvider.ts` — use language in API call
- `src/renderer/src/components/SettingsPanel.tsx` — add dropdown
- `src/main/index.ts` — initialize default setting

---

## Feature 3: Dark Mode (Follow System)

**Goal:** Automatically match macOS light/dark appearance.

**Architecture:**
1. Main process: listen to `nativeTheme.on('updated')`, broadcast theme to all renderer windows
2. Preload: expose `onThemeChange` callback and `getTheme()` invoke
3. Renderer: set `data-theme="dark|light"` on `<html>`, CSS variables handle all color switching
4. CSS: define `:root` (light) and `[data-theme="dark"]` color palettes

**Color scheme:**
- Light: white backgrounds, dark text, subtle shadows
- Dark: #1a1a2e backgrounds, light text, softer shadows, adjusted glassmorphism opacity

**Widget:** Already semi-transparent — adjust backdrop-filter and text colors via CSS variables.

**Files to modify:**
- `src/main/index.ts` — nativeTheme listener, IPC handler
- `src/preload/index.ts` — expose theme API
- `src/shared/types.ts` — theme IPC channel
- `src/renderer/src/global.css` — CSS custom properties for both themes
- `src/renderer/src/App.tsx` or root — apply `data-theme` attribute
- Widget HTML files may need variable adjustments

---

## Feature 4: Statistics Summary Cards

**Goal:** Show usage statistics at the top of the transcription history panel.

**Metrics (4 cards):**
1. Total Transcriptions (count)
2. Total Words (sum of word counts from rawText)
3. Total Duration (sum of duration field, formatted as hours/minutes)
4. Average Per Day (transcriptions per day since first use)

**Implementation:**
- New DB queries in repository: `getStats()` returning all 4 metrics in one call
- New IPC channel: `stats:get` → returns stats object
- UI: 4 horizontal cards above the history list in `TranscriptionHistory.tsx`
- Refresh stats when history panel mounts

**Files to modify:**
- `src/main/db/repository.ts` — add `getStats()` method with SQL aggregates
- `src/shared/types.ts` — `TranscriptionStats` type, IPC channel
- `src/main/index.ts` — IPC handler for stats
- `src/preload/index.ts` — expose `getStats()`
- `src/renderer/src/components/TranscriptionHistory.tsx` — render cards

---

## Feature 5: Onboarding Improvements

**Goal:** Guide users through macOS accessibility permission setup during onboarding.

**Flow:**
1. Welcome step (existing)
2. **New: Accessibility permission step** — explain why it's needed, button to open System Preferences, live check if permission is granted
3. Microphone permission step (existing or new)
4. Completion

**Permission check:** Use `systemPreferences.isTrustedAccessibilityClient(false)` to check without prompting. Button opens `x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility`.

**Files to modify:**
- `src/main/index.ts` — IPC handler for permission check
- `src/preload/index.ts` — expose permission API
- `src/renderer/src/pages/onboarding.tsx` — add accessibility permission step

---

## Feature 6: Swift Keyboard Helper

**Goal:** Native keyboard monitoring with true key-up detection for push-to-talk.

**Architecture:**
- Swift Package Manager project in `native/KeyboardHelper/`
- Uses `CGEvent.tapCreate()` for global key event monitoring
- Outputs JSON lines to stdout: `{"type":"keyDown","keyCode":49,"flags":["command"]}`
- Electron spawns as child process, reads stdout line by line
- Requires accessibility permission (same as Feature 5)

**Event types:** `keyDown`, `keyUp`, `flagsChanged`

**Integration with push-to-talk:**
- Current: hotkey press starts recording, 30s timeout auto-stops
- New: hotkey key-down starts, key-up stops immediately (true push-to-talk)
- Fallback: if Swift helper unavailable, keep current timeout behavior

**Build:** Pre-compile universal binary (`swift build -c release --arch arm64 --arch x86_64`), bundle in `resources/bin/`. Add build script to `scripts/`.

**Files to create:**
- `native/KeyboardHelper/Package.swift`
- `native/KeyboardHelper/Sources/main.swift`
- `scripts/build-keyboard-helper.sh`
- `src/main/native/keyboardHelper.ts` — Node.js wrapper

**Files to modify:**
- `src/main/audio/capture.ts` — use key-up events for push-to-talk
- `electron-builder.yml` — bundle the binary in extraResources
