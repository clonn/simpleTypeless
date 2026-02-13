import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, AppSettings, RecordingState, TranscriptionResult, ModelStatus, ModelDownloadState } from '../shared/types'

// Custom APIs for renderer
const api = {
  // Recording controls
  startRecording: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.START_RECORDING),
  stopRecording: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.STOP_RECORDING),

  // Settings
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  setSettings: (settings: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_SETTINGS, settings),

  // Model status and download
  getModelStatus: (): Promise<ModelStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_MODEL_STATUS),
  downloadModel: (modelType: 'whisper' | 'llm'): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_MODEL, modelType),

  // History
  getHistory: (limit?: number, offset?: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_HISTORY, limit, offset),
  deleteHistory: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_HISTORY, id),
  getHistoryCount: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_HISTORY_COUNT),

  // Onboarding
  completeOnboarding: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.ONBOARDING_COMPLETE),

  // Event listeners
  onRecordingStateChanged: (callback: (state: RecordingState) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, state: RecordingState): void =>
      callback(state)
    ipcRenderer.on(IPC_CHANNELS.RECORDING_STATE_CHANGED, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.RECORDING_STATE_CHANGED, listener)
  },

  onTranscriptionPartial: (callback: (data: { rawText: string }) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: { rawText: string }): void =>
      callback(data)
    ipcRenderer.on(IPC_CHANNELS.TRANSCRIPTION_PARTIAL, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TRANSCRIPTION_PARTIAL, listener)
  },

  onTranscriptionComplete: (callback: (result: TranscriptionResult) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, result: TranscriptionResult): void =>
      callback(result)
    ipcRenderer.on(IPC_CHANNELS.TRANSCRIPTION_COMPLETE, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TRANSCRIPTION_COMPLETE, listener)
  },

  onModelDownloadProgress: (callback: (state: ModelDownloadState) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, state: ModelDownloadState): void =>
      callback(state)
    ipcRenderer.on(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, listener)
  }
}

// Listen for sound playback requests from main process
ipcRenderer.on(IPC_CHANNELS.PLAY_SOUND, (_: Electron.IpcRendererEvent, soundPath: string) => {
  try {
    const audio = new Audio(`file://${soundPath}`)
    audio.volume = 0.5
    audio.play().catch((err) => console.error('Failed to play sound:', err))
  } catch (err) {
    console.error('Failed to create Audio element for sound:', err)
  }
})

// Expose in the main world
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}

// Type declarations
export type API = typeof api
