import { useState, useEffect } from 'react'
import { useRecordingState } from './hooks/useRecordingState'
import { useModelStatus } from './hooks/useModelStatus'
import { SettingsPanel } from './components/SettingsPanel'
import { TranscriptionHistory } from './components/TranscriptionHistory'
import { StatusIndicator } from './components/StatusIndicator'
import { ModelStatusPanel } from './components/ModelStatusPanel'
import type { TranscriptionResult, AppSettings } from '@shared/types'

function App(): JSX.Element {
  const { isRecording, isProcessing } = useRecordingState()
  const { status: modelStatus } = useModelStatus()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [history, setHistory] = useState<TranscriptionResult[]>([])
  const [activeTab, setActiveTab] = useState<'status' | 'models' | 'settings'>('status')

  useEffect(() => {
    // Load initial settings
    if (!window.api?.getSettings) return
    window.api.getSettings().then(setSettings)

    // Subscribe to transcription events
    if (!window.api?.onTranscriptionComplete) return
    const unsubscribe = window.api.onTranscriptionComplete((result) => {
      setHistory((prev) => [result, ...prev].slice(0, 50)) // Keep last 50
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

            <TranscriptionHistory history={history} />
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
