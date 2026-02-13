# Change: Initialize Local Typeless macOS Application

## Why
We need to scaffold the foundational Electron application for "Local Typeless" - a privacy-first, local speech-to-text rewriting system for macOS. This establishes the core architecture including audio capture, ASR integration, LLM text rewriting, and system text injection.

## What Changes
- Initialize Electron + React + TypeScript project structure
- Implement audio capture layer with Silero VAD
- Integrate whisper.cpp for local ASR (Whisper Large-v3-Turbo)
- Integrate node-llama-cpp for LLM text rewriting (Qwen 2.5-3B)
- Build minimal floating widget UI
- Implement macOS text injection via Accessibility API
- Configure model download and management

## Impact
- Affected specs: `core` (new capability)
- Affected code: New project scaffolding
- New dependencies: electron, whisper.cpp, node-llama-cpp, @ricky0123/vad-node
