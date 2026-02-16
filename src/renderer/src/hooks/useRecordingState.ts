import { useState, useEffect } from 'react'
import type { RecordingState } from '@shared/types'

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
