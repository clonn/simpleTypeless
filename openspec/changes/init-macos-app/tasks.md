# Implementation Tasks

## 1. Project Scaffolding
- [x] 1.1 Initialize Electron + Vite + React + TypeScript project
- [x] 1.2 Configure ESLint and Prettier
- [x] 1.3 Set up project structure (main/renderer separation)
- [x] 1.4 Configure build scripts for macOS (arm64 + x64)

## 2. Audio Capture Layer
- [x] 2.1 Implement microphone audio capture in main process
- [x] 2.2 Integrate Silero VAD for speech detection
- [x] 2.3 Implement ring buffer for pre-speech audio preservation
- [x] 2.4 Set up IPC for audio state communication

## 3. ASR Integration (Whisper)
- [x] 3.1 Set up whisper.cpp Node.js bindings
- [x] 3.2 Implement Whisper model loading and inference
- [x] 3.3 Configure for Chinese/English code-switching
- [x] 3.4 Add streaming output for real-time feedback

## 4. LLM Integration (Text Rewriting)
- [x] 4.1 Set up node-llama-cpp for local LLM inference
- [x] 4.2 Implement prompt engineering for Typeless rewriting
- [x] 4.3 Add context-aware prompt switching (email/code/notes modes)
- [x] 4.4 Configure model loading with warm-up

## 5. User Interface
- [x] 5.1 Create floating widget component (recording status)
- [x] 5.2 Implement waveform visualization
- [x] 5.3 Build settings panel (model selection, shortcuts)
- [x] 5.4 Add system tray integration

## 6. Text Injection (macOS)
- [x] 6.1 Implement macOS Accessibility API integration
- [x] 6.2 Add keyboard simulation fallback (AppleScript)
- [x] 6.3 Configure global hotkey for activation

## 7. Model Management
- [x] 7.1 Implement model download UI (placeholder)
- [x] 7.2 Add model storage and path configuration
- [x] 7.3 Support multiple model profiles
