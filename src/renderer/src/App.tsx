import { useState, useEffect, useCallback } from 'react'
import { useSnackbar } from 'notistack'
import { useRecordingState } from './hooks/useRecordingState'
import { useModelStatus } from './hooks/useModelStatus'
import { SettingsPanel } from './components/SettingsPanel'
import { TranscriptionHistory } from './components/TranscriptionHistory'
import { StatusIndicator } from './components/StatusIndicator'
import { ModelStatusPanel } from './components/ModelStatusPanel'
import type { AppSettings } from '@shared/types'

function App(): JSX.Element {
  const { isRecording, isProcessing } = useRecordingState()
  const { status: modelStatus } = useModelStatus()
  const { enqueueSnackbar } = useSnackbar()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [history, setHistory] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'status' | 'models' | 'settings'>('status')

  const loadHistory = useCallback(async () => {
    if (!window.api?.getHistory) return
    const items = await window.api.getHistory(50)
    setHistory(items)
  }, [])

  // Load history from database on mount
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    // Load initial settings
    if (!window.api?.getSettings) return
    window.api.getSettings().then(setSettings)

    // Subscribe to transcription events — reload history from DB on new transcription
    if (!window.api?.onTranscriptionComplete) return
    const unsubscribe = window.api.onTranscriptionComplete(() => {
      loadHistory()
      enqueueSnackbar('Transcription complete', { variant: 'success' })
    })

    return unsubscribe
  }, [loadHistory])

  // Notify on model download completion or errors
  useEffect(() => {
    if (!window.api?.onModelDownloadProgress) return

    const unsubscribe = window.api.onModelDownloadProgress((state) => {
      if (state.status === 'completed') {
        enqueueSnackbar(`${state.modelType} model downloaded`, { variant: 'success' })
      } else if (state.status === 'error') {
        enqueueSnackbar(`Download failed: ${state.error}`, { variant: 'error' })
      }
    })

    return unsubscribe
  }, [])

  const handleSettingsChange = async (newSettings: Partial<AppSettings>): Promise<void> => {
    if (!window.api?.setSettings) return
    const updated = await window.api.setSettings(newSettings)
    setSettings(updated)
  }

  const handleRecordingToggle = async (): Promise<void> => {
    if (!window.api) return
    if (isRecording) {
      await window.api.stopRecording()
    } else {
      await window.api.startRecording()
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Local Typeless</h1>
        <div className="tab-bar">
          <button
            className={`tab ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            Status
          </button>
          <button
            className={`tab ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            Models
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>
      </header>

      <main className="app-content">
        {activeTab === 'status' && (
          <div className="status-view">
            <StatusIndicator
              isRecording={isRecording}
              isProcessing={isProcessing}
              modelStatus={{ whisperLoaded: modelStatus.whisper.loaded, llmLoaded: modelStatus.llm.loaded }}
              onToggle={handleRecordingToggle}
            />

            <TranscriptionHistory history={history} onHistoryUpdate={setHistory} />
          </div>
        )}
        {activeTab === 'models' && <ModelStatusPanel />}
        {activeTab === 'settings' && (
          <SettingsPanel settings={settings} onChange={handleSettingsChange} />
        )}
      </main>

      <footer className="app-footer">
        <span className="model-status">
          ASR: {modelStatus.whisper.loaded ? '✓' : modelStatus.whisper.downloading ? '↓' : '○'} | LLM:{' '}
          {modelStatus.llm.loaded ? '✓' : modelStatus.llm.downloading ? '↓' : '○'}
        </span>
        <span className="shortcut-hint">
          Press {settings?.globalHotkey || 'Ctrl+Shift+Space'} to toggle recording
        </span>
      </footer>
    </div>
  )
}

export default App
