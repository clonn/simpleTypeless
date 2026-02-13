/**
 * Model Profiles Configuration
 *
 * Defines available model combinations for different hardware/use cases.
 */

export interface ModelProfile {
  id: string
  name: string
  description: string
  whisper: {
    name: string
    file: string
    size: string
    url: string
  }
  llm: {
    name: string
    file: string
    size: string
    url: string
  }
  minRam: number // GB
  recommended: boolean
}

export const MODEL_PROFILES: ModelProfile[] = [
  {
    id: 'balanced',
    name: 'Balanced (Recommended)',
    description: 'Best accuracy/speed tradeoff for 16GB RAM. Excellent Chinese/English support.',
    whisper: {
      name: 'Whisper Large-v3-Turbo',
      file: 'whisper-large-v3-turbo-q5_0.bin',
      size: '1.5 GB',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin'
    },
    llm: {
      name: 'Qwen 2.5-3B-Instruct',
      file: 'qwen2.5-3b-instruct-q4_k_m.gguf',
      size: '2.0 GB',
      url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf'
    },
    minRam: 16,
    recommended: true
  },
  {
    id: 'lightweight',
    name: 'Lightweight',
    description: 'For 8GB RAM devices. Good for English, adequate for Chinese.',
    whisper: {
      name: 'Whisper Medium',
      file: 'whisper-medium-q5_0.bin',
      size: '500 MB',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q5_0.bin'
    },
    llm: {
      name: 'Gemma 2-2B-IT',
      file: 'gemma-2-2b-it-q4_k_m.gguf',
      size: '1.5 GB',
      url: 'https://huggingface.co/lmstudio-community/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf'
    },
    minRam: 8,
    recommended: false
  },
  {
    id: 'english-optimized',
    name: 'English Optimized',
    description: 'Best for pure English workflows. Fast and natural output.',
    whisper: {
      name: 'Distil-Whisper Large-v3',
      file: 'distil-whisper-large-v3.bin',
      size: '800 MB',
      url: 'https://huggingface.co/distil-whisper/distil-large-v3-ggml/resolve/main/ggml-distil-large-v3.bin'
    },
    llm: {
      name: 'Llama 3.2-3B-Instruct',
      file: 'llama-3.2-3b-instruct-q4_k_m.gguf',
      size: '2.0 GB',
      url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf'
    },
    minRam: 12,
    recommended: false
  },
  {
    id: 'maximum-quality',
    name: 'Maximum Quality',
    description: 'Highest accuracy for 32GB+ RAM. Best for complex content.',
    whisper: {
      name: 'Whisper Large-v3',
      file: 'whisper-large-v3-q5_0.bin',
      size: '1.8 GB',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-q5_0.bin'
    },
    llm: {
      name: 'Qwen 2.5-7B-Instruct',
      file: 'qwen2.5-7b-instruct-q4_k_m.gguf',
      size: '4.5 GB',
      url: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf'
    },
    minRam: 32,
    recommended: false
  }
]

export function getProfileById(id: string): ModelProfile | undefined {
  return MODEL_PROFILES.find((p) => p.id === id)
}

export function getRecommendedProfile(): ModelProfile {
  return MODEL_PROFILES.find((p) => p.recommended) || MODEL_PROFILES[0]
}

export function getProfilesForRam(ramGb: number): ModelProfile[] {
  return MODEL_PROFILES.filter((p) => p.minRam <= ramGb)
}
