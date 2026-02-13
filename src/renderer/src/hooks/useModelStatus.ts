import { useState, useEffect, useCallback } from 'react'
import type { ModelStatus, ModelDownloadState } from '@shared/types'

const DEFAULT_MODEL_STATUS: ModelStatus = {
  whisper: {
    loaded: false,
    downloading: false,
    progress: 0,
    modelName: '',
    modelPath: '',
    exists: false
  },
  llm: {
    loaded: false,
    downloading: false,
    progress: 0,
    modelName: '',
    modelPath: '',
    exists: false
  }
}

export function useModelStatus() {
  const [status, setStatus] = useState<ModelStatus>(DEFAULT_MODEL_STATUS)
  const [loading, setLoading] = useState(true)

  // Fetch initial status
  const refreshStatus = useCallback(async () => {
    if (!window.api?.getModelStatus) return

    try {
      const modelStatus = await window.api.getModelStatus()
      setStatus(modelStatus)
    } catch (error) {
      console.error('[useModelStatus] Failed to get model status:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Download model
  const downloadModel = useCallback(async (modelType: 'whisper' | 'llm') => {
    if (!window.api?.downloadModel) return

    try {
      await window.api.downloadModel(modelType)
    } catch (error) {
      console.error(`[useModelStatus] Failed to download ${modelType} model:`, error)
    }
  }, [])

  useEffect(() => {
    refreshStatus()

    // Listen for download progress updates
    if (!window.api?.onModelDownloadProgress) return

    const unsubscribe = window.api.onModelDownloadProgress((state: ModelDownloadState) => {
      setStatus((prev) => ({
        ...prev,
        [state.modelType]: {
          ...prev[state.modelType],
          downloading: state.status === 'downloading',
          progress: state.progress,
          exists: state.status === 'completed' ? true : prev[state.modelType].exists
        }
      }))

      // Refresh full status when download completes
      if (state.status === 'completed' || state.status === 'error') {
        refreshStatus()
      }
    })

    return unsubscribe
  }, [refreshStatus])

  return { status, loading, refreshStatus, downloadModel }
}
