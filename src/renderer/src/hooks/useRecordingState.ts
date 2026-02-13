import { useState, useEffect } from 'react'
import type { RecordingState, ModelStatus, ModelDownloadState, AppSettings, TranscriptionResult } from '@shared/types'

declare global {
  interface Window {
    api?: {
      // Recording controls
      startRecording: () => Promise<void>
      stopRecording: () => Promise<void>
      // Settings
      getSettings: () => Promise<AppSettings>
      setSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
      // Model status and download
      getModelStatus: () => Promise<ModelStatus>
      downloadModel: (modelType: 'whisper' | 'llm') => Promise<void>
      // Event listeners
      onRecordingStateChanged: (callback: (state: RecordingState) => void) => () => void
      onTranscriptionPartial: (callback: (data: { rawText: string }) => void) => () => void
      onTranscriptionComplete: (callback: (result: TranscriptionResult) => void) => () => void
      onModelDownloadProgress: (callback: (state: ModelDownloadState) => void) => () => void
    }
  }
}

export function useRecordingState(): RecordingState {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    vadActive: false
  })

  useEffect(() => {
    if (!window.api?.onRecordingStateChanged) {
      console.warn('[useRecordingState] window.api not available')
      return
    }
    const unsubscribe = window.api.onRecordingStateChanged(setState)
    return unsubscribe
  }, [])

  return state
}
