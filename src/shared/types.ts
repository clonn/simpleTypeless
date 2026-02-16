// Shared types between main and renderer processes

export interface AppContext {
  appName: string
  bundleId: string
  windowTitle: string
  webTitle?: string
  webDomain?: string
  webUrl?: string
}

export interface TranscriptionResult {
  rawText: string
  rewrittenText: string
  timestamp: number
  duration: number
  appContext?: AppContext
}

export interface RecordingState {
  isRecording: boolean
  isProcessing: boolean
  vadActive: boolean
}

export interface ModelConfig {
  whisperModel: string
  llmModel: string
  whisperModelPath: string
  llmModelPath: string
}

export type ASRProvider = 'local-whisper' | 'macos-dictation' | 'cloud-openai'

export interface CloudAPIConfig {
  openaiApiKey?: string
}

export interface ASRStatus {
  provider: ASRProvider
  ready: boolean
  binaryFound: boolean
  modelFound: boolean
  binaryPath?: string
  modelPath?: string
  error?: string
}

export interface ModelDownloadState {
  modelType: 'whisper' | 'llm'
  modelName: string
  status: 'pending' | 'downloading' | 'completed' | 'error'
  progress: number // 0-100
  downloadedBytes: number
  totalBytes: number
  error?: string
}

export interface ModelStatus {
  whisper: {
    loaded: boolean
    downloading: boolean
    progress: number
    modelName: string
    modelPath: string
    exists: boolean
  }
  llm: {
    loaded: boolean
    downloading: boolean
    progress: number
    modelName: string
    modelPath: string
    exists: boolean
  }
}

export interface PromptMode {
  id: string
  name: string
  systemPrompt: string
}

export const DEFAULT_PROMPT_MODES: PromptMode[] = [
  {
    id: 'default',
    name: 'General',
    systemPrompt: `You are a professional text editor. Your task is to rewrite speech transcripts into polished, professional text.

Guidelines:
- Remove filler words (um, uh, 那個, 就是, you know, like)
- Handle self-corrections: keep only the final intent
- Preserve code-switching between Chinese and English
- Add proper spacing between Chinese and English text
- Fix grammar while preserving original meaning
- Output only the rewritten text, no explanations`
  },
  {
    id: 'email',
    name: 'Email',
    systemPrompt: `You are a professional email editor. Rewrite speech transcripts into formal business emails.

Guidelines:
- Remove all filler words and speech artifacts
- Use professional, polite tone
- Structure content appropriately for email format
- Fix grammar and improve clarity
- Output only the rewritten email body, no explanations`
  },
  {
    id: 'code',
    name: 'Code/Technical',
    systemPrompt: `You are a technical documentation editor. Rewrite speech as code logic or technical descriptions.

Guidelines:
- Convert spoken variable names to proper case (snake_case, camelCase)
- Preserve technical terminology in English
- Use precise technical language
- Format code references appropriately
- Output only the rewritten text, no explanations`
  },
  {
    id: 'notes',
    name: 'Notes/Brainstorm',
    systemPrompt: `You are a note-taking assistant. Preserve the user's stream of consciousness while cleaning up speech.

Guidelines:
- Keep the casual, exploratory tone
- Use bullet points for distinct ideas
- Only fix obvious errors
- Preserve the thinking process
- Output only the formatted notes, no explanations`
  }
]

export interface AppSettings {
  globalHotkey: string
  promptMode: string
  autoInject: boolean
  showFloatingWidget: boolean
  modelProfileId: string
  enableSounds: boolean
  asrProvider: ASRProvider
  cloudApiConfig: CloudAPIConfig
}

export const DEFAULT_SETTINGS: AppSettings = {
  globalHotkey: 'CommandOrControl+Shift+Space',
  promptMode: 'default',
  autoInject: true,
  showFloatingWidget: true,
  modelProfileId: 'balanced',
  enableSounds: true,
  asrProvider: 'local-whisper',
  cloudApiConfig: {}
}

// IPC Channel names
export const IPC_CHANNELS = {
  // Recording controls
  START_RECORDING: 'recording:start',
  STOP_RECORDING: 'recording:stop',
  RECORDING_STATE_CHANGED: 'recording:state-changed',

  // Transcription events
  TRANSCRIPTION_PARTIAL: 'transcription:partial',
  TRANSCRIPTION_COMPLETE: 'transcription:complete',

  // Settings
  GET_SETTINGS: 'settings:get',
  SET_SETTINGS: 'settings:set',

  // Model management
  GET_MODEL_STATUS: 'model:status',
  DOWNLOAD_MODEL: 'model:download',
  MODEL_DOWNLOAD_PROGRESS: 'model:download-progress',

  // Window controls
  SHOW_WIDGET: 'widget:show',
  HIDE_WIDGET: 'widget:hide',
  SHOW_SETTINGS: 'settings:show',

  // Model profiles
  GET_MODEL_PROFILES: 'model:profiles',
  SET_MODEL_PROFILE: 'model:set-profile',

  // Audio feedback
  PLAY_SOUND: 'sound:play',

  // History
  GET_HISTORY: 'history:get',
  DELETE_HISTORY: 'history:delete',
  GET_HISTORY_COUNT: 'history:count',

  // Onboarding
  ONBOARDING_COMPLETE: 'onboarding:complete',

  // ASR Testing
  TEST_ASR: 'asr:test',

  // ASR Status
  ASR_STATUS: 'asr:status',

  // Updates
  UPDATE_STATUS: 'update:status',
  CHECK_FOR_UPDATES: 'update:check',
  DOWNLOAD_UPDATE: 'update:download',
  INSTALL_UPDATE: 'update:install'
} as const
