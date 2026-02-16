import { useState, useEffect } from 'react'
import type { AppSettings, ASRProvider } from '@shared/types'
import { DEFAULT_PROMPT_MODES } from '@shared/types'
import { MODEL_PROFILES, getProfileById } from '@shared/models'

interface SettingsPanelProps {
  settings: AppSettings | null
  onChange: (settings: Partial<AppSettings>) => void
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps): JSX.Element {
  const [editingHotkey, setEditingHotkey] = useState(false)
  const [testingASR, setTestingASR] = useState(false)
  const [testResult, setTestResult] = useState<string>('')
  const [asrStatus, setAsrStatus] = useState<{
    ready: boolean
    binaryFound: boolean
    modelFound: boolean
  } | null>(null)

  useEffect(() => {
    if (settings?.asrProvider === 'local-whisper') {
      window.api
        ?.getASRStatus?.()
        .then((status: any) => {
          if (status) setAsrStatus(status)
        })
        .catch(() => {})
    }
  }, [settings?.asrProvider])

  if (!settings) {
    return <div className="settings-panel loading">Loading settings...</div>
  }

  const currentProfile = getProfileById(settings.modelProfileId) || MODEL_PROFILES[0]

  const handleHotkeyCapture = (e: React.KeyboardEvent): void => {
    e.preventDefault()

    const parts: string[] = []
    if (e.metaKey) parts.push('Command')
    if (e.ctrlKey) parts.push('Control')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')

    const key = e.key
    if (!['Meta', 'Control', 'Alt', 'Shift'].includes(key)) {
      parts.push(key.toUpperCase())
    }

    if (parts.length > 1) {
      onChange({ globalHotkey: parts.join('+') })
      setEditingHotkey(false)
    }
  }

  const handleProviderChange = (provider: ASRProvider): void => {
    onChange({ asrProvider: provider })
  }

  const handleApiKeyChange = (apiKey: string): void => {
    onChange({
      cloudApiConfig: {
        ...settings.cloudApiConfig,
        openaiApiKey: apiKey
      }
    })
  }

  const handleTestASR = async (): Promise<void> => {
    setTestingASR(true)
    setTestResult('')
    try {
      // Test will trigger a short recording
      await window.api?.startRecording()
      setTimeout(async () => {
        await window.api?.stopRecording()
        setTestingASR(false)
        setTestResult('Test complete. Check transcription history for result.')
      }, 2000)
    } catch (error) {
      console.error('ASR test failed:', error)
      setTestingASR(false)
      setTestResult('Test failed. Please check your ASR configuration.')
    }
  }

  return (
    <div className="settings-panel">
      <div className="card">
        <h3 className="card-title">General</h3>

        <div className="setting-item">
          <label>Global Hotkey</label>
          {editingHotkey ? (
            <input
              type="text"
              placeholder="Press keys..."
              onKeyDown={handleHotkeyCapture}
              onBlur={() => setEditingHotkey(false)}
              autoFocus
              readOnly
            />
          ) : (
            <button className="hotkey-display" onClick={() => setEditingHotkey(true)}>
              {settings.globalHotkey}
            </button>
          )}
        </div>

        <div className="setting-item hotkey-mode-item">
          <label>Hotkey Mode</label>
          <div className="hotkey-mode-selector">
            <button
              className={`mode-button ${settings.hotkeyMode === 'toggle' ? 'active' : ''}`}
              onClick={() => onChange({ hotkeyMode: 'toggle' })}
            >
              Toggle
            </button>
            <button
              className={`mode-button ${settings.hotkeyMode === 'push-to-talk' ? 'active' : ''}`}
              onClick={() => onChange({ hotkeyMode: 'push-to-talk' })}
            >
              Push-to-Talk
            </button>
          </div>
          <span className="setting-hint">
            {settings.hotkeyMode === 'toggle'
              ? 'Press once to start, press again to stop'
              : 'Press to start, press again to stop (auto-stops after 30s)'}
          </span>
        </div>

        <div className="setting-item">
          <label>Auto-inject text</label>
          <input
            type="checkbox"
            checked={settings.autoInject}
            onChange={(e) => onChange({ autoInject: e.target.checked })}
          />
        </div>

        <div className="setting-item">
          <label>Show floating widget</label>
          <input
            type="checkbox"
            checked={settings.showFloatingWidget}
            onChange={(e) => onChange({ showFloatingWidget: e.target.checked })}
          />
        </div>

        <div className="setting-item">
          <label>Enable sounds</label>
          <input
            type="checkbox"
            checked={settings.enableSounds}
            onChange={(e) => onChange({ enableSounds: e.target.checked })}
          />
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Speech Recognition Provider</h3>

        <div className="provider-selection">
          <label className="provider-option">
            <input
              type="radio"
              name="asrProvider"
              value="local-whisper"
              checked={settings.asrProvider === 'local-whisper'}
              onChange={() => handleProviderChange('local-whisper')}
            />
            <div className="provider-info">
              <span className="provider-name">Local Whisper</span>
              <span className="provider-desc">Uses local whisper.cpp model</span>
              {settings.asrProvider === 'local-whisper' && asrStatus && (
                <div className="provider-status">
                  <span
                    className={`status-dot ${asrStatus.binaryFound ? 'ready' : 'not-ready'}`}
                  />
                  <span className="status-text">
                    {asrStatus.binaryFound ? 'whisper-cli found' : 'whisper-cli not found'}
                  </span>
                  {!asrStatus.binaryFound && (
                    <div className="install-hint">
                      Install: <code>brew install whisper-cpp</code>
                    </div>
                  )}
                  <span
                    className={`status-dot ${asrStatus.modelFound ? 'ready' : 'not-ready'}`}
                  />
                  <span className="status-text">
                    {asrStatus.modelFound ? 'Model ready' : 'Model not downloaded'}
                  </span>
                </div>
              )}
            </div>
          </label>

          <label className="provider-option">
            <input
              type="radio"
              name="asrProvider"
              value="macos-dictation"
              checked={settings.asrProvider === 'macos-dictation'}
              onChange={() => handleProviderChange('macos-dictation')}
              disabled={process.platform !== 'darwin'}
            />
            <div className="provider-info">
              <span className="provider-name">macOS Dictation</span>
              <span className="provider-desc">
                {process.platform === 'darwin'
                  ? 'Native macOS speech recognition (placeholder)'
                  : 'Only available on macOS'}
              </span>
            </div>
          </label>

          <label className="provider-option">
            <input
              type="radio"
              name="asrProvider"
              value="cloud-openai"
              checked={settings.asrProvider === 'cloud-openai'}
              onChange={() => handleProviderChange('cloud-openai')}
            />
            <div className="provider-info">
              <span className="provider-name">Cloud (OpenAI)</span>
              <span className="provider-desc">Uses OpenAI Whisper API</span>
            </div>
          </label>
        </div>

        {settings.asrProvider === 'cloud-openai' && (
          <div className="cloud-config">
            <div className="setting-item">
              <label>OpenAI API Key</label>
              <input
                type="password"
                placeholder="sk-..."
                value={settings.cloudApiConfig.openaiApiKey || ''}
                onChange={(e) => handleApiKeyChange(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="test-section">
          <button className="test-button" onClick={handleTestASR} disabled={testingASR}>
            {testingASR ? 'Testing...' : 'Test Recognition'}
          </button>
          <span className="test-hint">
            Click and speak for 2 seconds to test the selected provider
          </span>
          {testResult && <div className="test-result">{testResult}</div>}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Writing Mode</h3>

        <div className="prompt-modes">
          {DEFAULT_PROMPT_MODES.map((mode) => (
            <button
              key={mode.id}
              className={`mode-button ${settings.promptMode === mode.id ? 'active' : ''}`}
              onClick={() => onChange({ promptMode: mode.id })}
            >
              <span className="mode-name">{mode.name}</span>
            </button>
          ))}
        </div>

        <div className="prompt-preview">
          <label>Current prompt:</label>
          <pre>
            {DEFAULT_PROMPT_MODES.find((m) => m.id === settings.promptMode)?.systemPrompt ||
              'Default'}
          </pre>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Custom Writing Modes</h3>

        {(settings.customPromptModes || []).map((mode, index) => (
          <div key={mode.id} className="custom-prompt-item">
            <div className="custom-prompt-header">
              <input
                type="text"
                value={mode.name}
                onChange={(e) => {
                  const updated = [...(settings.customPromptModes || [])]
                  updated[index] = { ...updated[index], name: e.target.value }
                  onChange({ customPromptModes: updated })
                }}
                placeholder="Mode name"
              />
              <button
                className={`mode-button ${settings.promptMode === mode.id ? 'active' : ''}`}
                onClick={() => onChange({ promptMode: mode.id })}
              >
                Use
              </button>
              <button
                className="delete-btn"
                onClick={() => {
                  const updated = (settings.customPromptModes || []).filter((_, i) => i !== index)
                  onChange({ customPromptModes: updated })
                }}
              >
                {'\u2715'}
              </button>
            </div>
            <textarea
              value={mode.systemPrompt}
              onChange={(e) => {
                const updated = [...(settings.customPromptModes || [])]
                updated[index] = { ...updated[index], systemPrompt: e.target.value }
                onChange({ customPromptModes: updated })
              }}
              placeholder="System prompt..."
              rows={4}
            />
          </div>
        ))}

        <button
          className="add-prompt-btn"
          onClick={() => {
            const newMode = {
              id: `custom-${Date.now()}`,
              name: 'New Mode',
              systemPrompt: 'You are a helpful assistant. Rewrite the following speech transcript:\n\nGuidelines:\n- Remove filler words\n- Fix grammar\n- Output only the rewritten text'
            }
            onChange({ customPromptModes: [...(settings.customPromptModes || []), newMode] })
          }}
        >
          + Add Custom Mode
        </button>
      </div>

      <div className="card">
        <h3 className="card-title">Model Profile</h3>

        <div className="profile-selector">
          {MODEL_PROFILES.map((profile) => (
            <div
              key={profile.id}
              className={`profile-card ${settings.modelProfileId === profile.id ? 'active' : ''}`}
              onClick={() => onChange({ modelProfileId: profile.id })}
            >
              <div className="profile-header">
                <span className="profile-name">{profile.name}</span>
                <span className="profile-ram">{profile.minRam}GB+ RAM</span>
              </div>
              <p className="profile-desc">{profile.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Current Models</h3>

        <div className="model-info">
          <div className="model-item">
            <label>ASR</label>
            <span>{currentProfile.whisper.name}</span>
            <span className="model-size">{currentProfile.whisper.size}</span>
          </div>

          <div className="model-item">
            <label>LLM</label>
            <span>{currentProfile.llm.name}</span>
            <span className="model-size">{currentProfile.llm.size}</span>
          </div>
        </div>

        <p className="model-hint">
          Download models from Hugging Face and place them in the models folder:
          <br />
          <code>~/Library/Application Support/local-typeless/models/</code>
        </p>

        <div className="model-downloads">
          <a
            href={currentProfile.whisper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="download-link"
          >
            Download {currentProfile.whisper.file}
          </a>
          <a
            href={currentProfile.llm.url}
            target="_blank"
            rel="noopener noreferrer"
            className="download-link"
          >
            Download {currentProfile.llm.file}
          </a>
        </div>
      </div>
    </div>
  )
}
