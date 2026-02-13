# Project Context

## Purpose
Build "Local Typeless" - a privacy-first, local speech-to-text rewriting system that:
- Converts speech to text using Whisper ASR
- Rewrites raw transcripts into polished, professional text using local LLMs
- Removes filler words, handles self-corrections, and maintains speaker intent
- Operates entirely offline with no data leaving the device

## Tech Stack
- **Framework**: Electron (cross-platform desktop app)
- **Frontend**: React/Vue (Renderer Process)
- **Backend**: Node.js (Main Process)
- **ASR Engine**: whisper.cpp (C++ with Metal/CUDA acceleration)
- **LLM Engine**: llama.cpp via node-llama-cpp
- **VAD**: Silero VAD (ONNX Runtime)
- **Models**:
  - Whisper Large-v3-Turbo (speech recognition)
  - Qwen 2.5-3B-Instruct (text rewriting, Chinese/English)
  - Llama 3.2-3B-Instruct (English optimization)
- **Text Injection**: robotjs or nut.js

## Project Conventions

### Code Style
- TypeScript for type safety
- ESLint + Prettier for formatting
- Prefer functional components in React
- kebab-case for file names, camelCase for variables

### Architecture Patterns
- **Hybrid Mode**: ASR (Whisper) → LLM (Qwen/Llama) pipeline
- **Dual Process**: Main Process handles AI inference, Renderer handles UI
- **IPC Optimization**: SharedArrayBuffer for audio data, child_process for model execution
- **Zero-copy audio**: Ring buffer for VAD pre-buffering

### Testing Strategy
- Unit tests for prompt engineering logic
- Integration tests for ASR→LLM pipeline
- Manual testing for text injection across applications

### Git Workflow
- Feature branches: `feature/[description]`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`
- PRs require review before merge

## Domain Context
- **Code-switching**: Users mix Chinese and English in speech; system must preserve this
- **Typeless Philosophy**: Output "intent" not "verbatim" - remove fillers, fix grammar, keep meaning
- **Prompt Engineering**: System prompts control rewriting style (email, code, brainstorm modes)
- **Context Injection**: Can read clipboard/window title to enhance model understanding

## Important Constraints
- **Privacy**: All processing must be local; no network calls for inference
- **Hardware**: Target 8GB-16GB RAM devices (MacBook Air, mid-range PCs)
- **Latency**: < 1 second end-to-end for real-time feel
- **Model Size**: LLMs limited to 2B-7B parameters (quantized)

## External Dependencies
- **Hugging Face**: Model downloads (Whisper GGUF, Qwen GGUF, Llama GGUF)
- **whisper.cpp**: C++ Whisper implementation
- **llama.cpp**: C++ LLM runtime
- **Silero VAD**: Voice activity detection model
