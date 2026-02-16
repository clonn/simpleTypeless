# Local Typeless

A local-first, privacy-focused speech-to-text desktop app built with Electron. Records audio, transcribes via local Whisper models, rewrites text with a local LLM, and injects the result into your active application.

## Prerequisites

- **Node.js** 18+ (bundled with Electron 28)
- **npm** 9+
- **macOS** (primary target; other platforms experimental)
- **whisper-cpp** (for local ASR): `brew install whisper-cpp`

## Install

```bash
npm install
```

## Development

```bash
# Start in dev mode with hot-reload
npm run dev
```

This launches the Electron app with the renderer dev server. Changes to renderer code hot-reload automatically; main process changes require a restart.

## Build

```bash
# Production build (outputs to out/)
npm run build

# Preview the production build
npm start
```

## Type Checking

```bash
# Check all TypeScript
npm run typecheck

# Check main/preload only
npm run typecheck:node

# Check renderer only
npm run typecheck:web
```

## Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## Project Structure

```
src/
  main/           # Electron main process
    asr/          # Speech recognition (Whisper engine, provider factory)
    audio/        # Audio capture, Opus encoding
    llm/          # Local LLM text rewriting
    model/        # Model downloading and management
    injector/     # Text injection into active apps
    db/           # SQLite database (transcription history)
  preload/        # Electron preload bridge (IPC)
  renderer/       # React UI
    src/
      components/ # StatusIndicator, SettingsPanel, ModelStatusPanel, TranscriptionHistory
      hooks/      # useModelStatus, useNotification
      styles/     # global.css (design tokens, sidebar layout)
    widget.html   # Floating status widget (glass morphism)
  shared/         # Shared types, model profiles
```

## Models

On first launch, download the required models and place them in:

```
~/Library/Application Support/local-typeless/models/
```

The app will prompt you to download models if they're missing. Model profiles (lightweight, balanced, quality) are configurable in Settings.

## ASR Providers

- **Local Whisper** (default) - Uses `whisper-cli` from Homebrew with local GGUF models
- **macOS Dictation** - Native macOS speech recognition (placeholder)
- **Cloud OpenAI** - OpenAI Whisper API (requires API key)

## Tech Stack

- Electron 28 + electron-vite 2.0
- React 18 + TypeScript 5.3
- Vitest for testing
- better-sqlite3 for local storage
- @tanstack/react-virtual for virtualized lists
