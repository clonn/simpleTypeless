import { useState, useEffect, useCallback } from 'react'
import { useSnackbar } from 'notistack'
import { useRecordingState } from './hooks/useRecordingState'
import { useModelStatus } from './hooks/useModelStatus'
import { SettingsPanel } from './components/SettingsPanel'
import { UpdateBanner } from './components/UpdateBanner'
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

  // Notify on hotkey conflict
  useEffect(() => {
    if (!window.api?.onHotkeyStatus) return
    const unsubscribe = window.api.onHotkeyStatus((data) => {
      if (!data.registered) {
        enqueueSnackbar(
          `Hotkey "${data.hotkey}" is unavailable. ${data.error || 'Try a different shortcut.'}`,
          { variant: 'warning', autoHideDuration: 8000 }
        )
      }
    })
    return unsubscribe
  }, [])

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
      <aside className="sidebar">
        <div className="sidebar-header">Local Typeless</div>
        <nav className="sidebar-nav">
          <button
            className={`sidebar-item ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            <span className="sidebar-item-icon">{'\u25C9'}</span>
            Status
          </button>
          <button
            className={`sidebar-item ${activeTab === 'models' ? 'active' : ''}`}
            onClick={() => setActiveTab('models')}
          >
            <span className="sidebar-item-icon">{'\u2B21'}</span>
            Models
          </button>
          <button
            className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="sidebar-item-icon">{'\u2699'}</span>
            Settings
          </button>
        </nav>
        <div className="sidebar-status">
          <div className="sidebar-status-row">
            <span
              className={`sidebar-status-dot ${modelStatus.whisper.loaded ? 'ok' : modelStatus.whisper.downloading ? 'loading' : 'error'}`}
            />
            <span>
              ASR{' '}
              {modelStatus.whisper.loaded
                ? 'Ready'
                : modelStatus.whisper.downloading
                  ? 'Loading'
                  : 'Offline'}
            </span>
          </div>
          <div className="sidebar-status-row">
            <span
              className={`sidebar-status-dot ${modelStatus.llm.loaded ? 'ok' : modelStatus.llm.downloading ? 'loading' : 'error'}`}
            />
            <span>
              LLM{' '}
              {modelStatus.llm.loaded
                ? 'Ready'
                : modelStatus.llm.downloading
                  ? 'Loading'
                  : 'Offline'}
            </span>
          </div>
        </div>
      </aside>

      <main className="app-content">
        <UpdateBanner />
        <div key={activeTab} className="view-enter">
          {activeTab === 'status' && (
            <div className="status-view">
              <StatusIndicator
                isRecording={isRecording}
                isProcessing={isProcessing}
                modelStatus={{
                  whisperLoaded: modelStatus.whisper.loaded,
                  llmLoaded: modelStatus.llm.loaded
                }}
                onToggle={handleRecordingToggle}
              />
              <TranscriptionHistory history={history} onHistoryUpdate={setHistory} />
            </div>
          )}
          {activeTab === 'models' && <ModelStatusPanel />}
          {activeTab === 'settings' && (
            <SettingsPanel settings={settings} onChange={handleSettingsChange} />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
