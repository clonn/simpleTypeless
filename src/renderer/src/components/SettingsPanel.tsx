import { useState } from 'react'
import type { AppSettings } from '@shared/types'
import { DEFAULT_PROMPT_MODES } from '@shared/types'
import { MODEL_PROFILES, getProfileById } from '@shared/models'

interface SettingsPanelProps {
  settings: AppSettings | null
  onChange: (settings: Partial<AppSettings>) => void
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps): JSX.Element {
  const [editingHotkey, setEditingHotkey] = useState(false)

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

  return (
    <div className="settings-panel">
      <section className="settings-section">
        <h3>General</h3>

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
      </section>

      <section className="settings-section">
        <h3>Writing Mode</h3>

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
      </section>

      <section className="settings-section">
        <h3>Model Profile</h3>

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
      </section>

      <section className="settings-section">
        <h3>Current Models</h3>

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
      </section>
    </div>
  )
}
