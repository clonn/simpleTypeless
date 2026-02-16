# Local Whisper.cpp ASR Provider - Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make local whisper.cpp the default, fully functional ASR provider on macOS using Homebrew-installed binary with Metal GPU acceleration and the `large-v3-turbo` model.

**Architecture:** Detect Homebrew `whisper-cli` binary at runtime, validate model existence, provide guided setup in onboarding/settings, and expose provider health status via IPC.

**Tech Stack:** Electron + whisper.cpp (Homebrew) + Metal GPU + ggml-large-v3-turbo-q5_0.bin

---

## Current State

- `ASREngine` exists but looks for a bundled binary in `resources/bin/` which doesn't exist
- `ModelDownloader` can download models from HuggingFace URLs
- Settings panel has provider radio buttons but no status indicators
- `createASRProvider()` factory creates `ASREngine` for `local-whisper`
- Onboarding window exists but doesn't check for whisper.cpp

## Design

### 1. Binary Detection Module

**New file:** `src/main/asr/whisperBinary.ts`

Responsibilities:
- Detect `whisper-cli` via `which whisper-cli` (Homebrew installs to PATH)
- Fallback check: `/opt/homebrew/bin/whisper-cli` (Apple Silicon) and `/usr/local/bin/whisper-cli` (Intel)
- Validate binary works by running `whisper-cli --help`
- Cache result to avoid repeated checks
- Return `{ found: boolean, path: string | null, version?: string }`

### 2. ASREngine Updates

**Modify:** `src/main/asr/engine.ts`

- Replace `getWhisperBinaryPath()` to use detected Homebrew path instead of resources path
- Add `static checkReady()` method returning `{ binaryFound, modelFound, binaryPath, modelPath }`
- Use `whisperBinary.detect()` for binary resolution

### 3. Provider Status IPC

**Modify:** `src/shared/types.ts`
- Add `ASR_STATUS` to `IPC_CHANNELS`
- Add `ASRStatus` interface: `{ provider, ready, binaryFound, modelFound, binaryPath?, modelPath?, error? }`

**Modify:** `src/main/index.ts`
- Add `ASR_STATUS` IPC handler that returns current provider readiness
- Call status check on app startup and after settings changes

### 4. Settings Panel Enhancement

**Modify:** `src/renderer/src/components/SettingsPanel.tsx`
- Add status indicator next to each provider radio button (green dot = ready, red = needs setup)
- For local-whisper: show "Install whisper-cpp" link if binary not found
- Show "Download Model" button if model missing (triggers existing download flow)
- Test button: record 2s, transcribe, show result inline

### 5. Onboarding Update

**Modify:** `src/renderer/src/components/OnboardingWindow.tsx` (or equivalent)
- Add whisper.cpp detection step
- If not found: show install instructions with copy-paste `brew install whisper-cpp`
- If found: show green checkmark, proceed to model download

### 6. CLAUDE.md + Memory Update

- Document default ASR: local whisper.cpp via Homebrew
- Document model: `ggml-large-v3-turbo-q5_0.bin` from HuggingFace
- Note Metal GPU acceleration on Apple Silicon

## Testing

- `whisperBinary.test.ts`: mock `execSync`, test detection on macOS, test fallback paths
- `engine.test.ts`: update existing tests for new binary resolution
- `providerFactory.test.ts`: test provider creation and status checks
- Manual: verify provider switching in settings panel end-to-end

## Data Flow

```
App Start
  -> detectWhisperBinary()
  -> check model exists at ~/Library/Application Support/local-typeless/models/
  -> set ASR status { binaryFound, modelFound }
  -> IPC: renderer requests status
  -> Settings/Onboarding shows status + guided setup
  -> User records audio
  -> ASREngine spawns: whisper-cli -m <model> -f <wav> -l auto
  -> Metal GPU acceleration (automatic on Apple Silicon)
  -> Parse output -> return transcription
```
