# Technical Design: Local Typeless macOS App

## Context
Building a privacy-first local speech-to-text rewriting system for macOS. Must work entirely offline with no data leaving the device. Target hardware: Apple Silicon Macs with 8-16GB RAM.

## Goals / Non-Goals
**Goals:**
- Real-time speech-to-text with <1s latency
- Intelligent text rewriting (remove fillers, fix grammar)
- Support Chinese/English code-switching
- Minimal memory footprint (share GPU between models)

**Non-Goals:**
- Windows/Linux support (future work)
- Cloud fallback mode
- Custom model training

## Decisions

### Architecture: Hybrid ASR + LLM Pipeline
- **Decision**: Two-stage pipeline - Whisper for transcription, LLM for rewriting
- **Rationale**: Specialized models outperform single end-to-end models; allows independent optimization
- **Alternative**: End-to-end speech-to-polished-text model (not mature enough)

### Framework: Electron + Vite + React
- **Decision**: Use electron-vite for build tooling
- **Rationale**: Best balance of ecosystem support and development speed for cross-platform desktop
- **Alternative**: Tauri (smaller footprint but less native module support)

### ASR: whisper.cpp with Metal acceleration
- **Decision**: Use whisper.cpp compiled with Metal support for Apple Silicon
- **Rationale**: 6x faster than Python Whisper, native GPU acceleration on Mac
- **Model**: Whisper Large-v3-Turbo (q5_0) - best accuracy/speed tradeoff

### LLM: node-llama-cpp with Qwen 2.5-3B
- **Decision**: Use node-llama-cpp for LLM inference
- **Rationale**: Native bindings, good Metal support, handles GGUF models
- **Model**: Qwen 2.5-3B-Instruct (q4_k_m) - excellent Chinese/English, ~2GB RAM

### VAD: Silero VAD via ONNX Runtime
- **Decision**: Use @ricky0123/vad-node for voice activity detection
- **Rationale**: Proven accuracy, low latency, minimal overhead
- **Config**: 500ms ring buffer, 0.5 positive threshold

### Text Injection: Accessibility API + Keyboard Simulation
- **Decision**: Primary: macOS Accessibility API; Fallback: nut.js
- **Rationale**: Accessibility API is more reliable but requires permissions

### Process Architecture
```
Main Process (Node.js)
├── Audio Capture (portaudio)
├── VAD (Silero)
├── Whisper Worker (child_process)
├── LLM Worker (child_process)
└── Text Injector

Renderer Process (React)
├── Floating Widget UI
├── Settings Panel
└── IPC Bridge
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| High memory usage | Use quantized models, unload when idle |
| Accessibility permissions | Clear onboarding flow, fallback to keyboard sim |
| Model download size (~4GB) | Progressive download, show progress |
| Apple Silicon only optimization | Provide x64 fallback (slower) |

## File Structure
```
project_typeless/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts
│   │   ├── audio/      # Audio capture + VAD
│   │   ├── asr/        # Whisper integration
│   │   ├── llm/        # LLM integration
│   │   └── injector/   # Text injection
│   ├── renderer/       # React UI
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── hooks/
│   └── shared/         # Shared types/utils
├── resources/
│   └── models/         # Downloaded models
├── electron.vite.config.ts
└── package.json
```

## Open Questions
- Should we support custom prompts from users?
- Window title context injection - how deep to integrate?
