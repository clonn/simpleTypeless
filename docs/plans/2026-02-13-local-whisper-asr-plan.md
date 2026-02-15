# Local Whisper.cpp ASR - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make local whisper.cpp fully functional on macOS with Homebrew binary and large-v3-turbo model.

**Architecture:** Runtime binary detection + model validation + status IPC + UI indicators

**Tech Stack:** Electron, whisper.cpp (Homebrew), TypeScript, Vitest

---

### Task 1: Whisper Binary Detection Module

**Files:**
- Create: `src/main/asr/whisperBinary.ts`
- Test: `src/main/asr/whisperBinary.test.ts`

**Implementation:**
- Export `detectWhisperBinary()` function
- Try `execSync('which whisper-cli')` first
- Fallback to `/opt/homebrew/bin/whisper-cli` then `/usr/local/bin/whisper-cli`
- Check `existsSync()` on each path
- Validate by running the binary with `--help` flag
- Cache result in module-level variable
- Export `clearCache()` for re-detection after install
- Return `{ found: boolean, path: string | null }`

**Test:**
- Mock `execSync` and `existsSync`
- Test: finds via `which`
- Test: fallback to `/opt/homebrew/bin/`
- Test: not found returns `{ found: false, path: null }`
- Test: cache works (second call doesn't re-exec)
- Test: `clearCache()` forces re-detection

---

### Task 2: Update ASREngine to Use Detected Binary

**Files:**
- Modify: `src/main/asr/engine.ts`
- Update: `src/main/asr/engine.test.ts`

**Implementation:**
- Import `detectWhisperBinary` from `./whisperBinary`
- Replace `getWhisperBinaryPath()` to call `detectWhisperBinary()` and use returned path
- Add static `checkReady()` method:
  ```typescript
  static checkReady(): { binaryFound: boolean; modelFound: boolean; binaryPath: string | null; modelPath: string }
  ```
- `checkReady()` calls `detectWhisperBinary()` and `existsSync(modelPath)`

**Test:**
- Update existing tests to mock `whisperBinary` module
- Add test for `checkReady()` returning correct status

---

### Task 3: ASR Status IPC and Types

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts` (if needed)

**Implementation:**
- Add to `IPC_CHANNELS`: `ASR_STATUS: 'asr:status'`
- Add interface:
  ```typescript
  export interface ASRStatus {
    provider: ASRProvider
    ready: boolean
    binaryFound: boolean
    modelFound: boolean
    binaryPath?: string
    modelPath?: string
    error?: string
  }
  ```
- In `index.ts`, add IPC handler for `ASR_STATUS` that calls `ASREngine.checkReady()` and returns status
- Expose in preload if needed for renderer access

---

### Task 4: Settings Panel Status Indicators

**Files:**
- Modify: `src/renderer/src/components/SettingsPanel.tsx`
- Modify: `src/renderer/src/styles/global.css`

**Implementation:**
- Add `useEffect` to fetch ASR status on mount and when provider changes
- Show status dot next to "Local Whisper" radio: green (ready) / red (not ready)
- If binary not found: show "Install: `brew install whisper-cpp`" message with copy button
- If model not found: show "Download Model" button (triggers existing download)
- Update test button to show transcription result inline
- Add CSS for `.status-dot`, `.install-hint`, `.test-result`

---

### Task 5: Update Onboarding for Whisper Setup

**Files:**
- Modify: `src/renderer/src/components/OnboardingWindow.tsx` (or equivalent onboarding component)

**Implementation:**
- Add whisper.cpp detection step in onboarding flow
- Show status: binary found / not found
- If not found: display install command with explanation
- If found + model missing: trigger model download
- If both ready: show success, proceed to next step

---

### Task 6: Update CLAUDE.md and Tests

**Files:**
- Modify: `CLAUDE.md`
- Create: `src/main/asr/providerFactory.test.ts`
- Run all tests

**Implementation:**
- Add to CLAUDE.md: default ASR is local whisper.cpp via Homebrew, model is large-v3-turbo
- Write providerFactory test covering provider creation for each type
- Run full test suite and typecheck
- Commit and push
