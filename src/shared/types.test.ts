import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, DEFAULT_PROMPT_MODES, IPC_CHANNELS } from './types'

describe('types', () => {
  describe('DEFAULT_SETTINGS', () => {
    it('should have all required fields', () => {
      expect(DEFAULT_SETTINGS).toHaveProperty('globalHotkey')
      expect(DEFAULT_SETTINGS).toHaveProperty('hotkeyMode')
      expect(DEFAULT_SETTINGS).toHaveProperty('promptMode')
      expect(DEFAULT_SETTINGS).toHaveProperty('autoInject')
      expect(DEFAULT_SETTINGS).toHaveProperty('showFloatingWidget')
      expect(DEFAULT_SETTINGS).toHaveProperty('modelProfileId')
      expect(DEFAULT_SETTINGS).toHaveProperty('enableSounds')
    })

    it('should have correct types', () => {
      expect(typeof DEFAULT_SETTINGS.globalHotkey).toBe('string')
      expect(typeof DEFAULT_SETTINGS.hotkeyMode).toBe('string')
      expect(typeof DEFAULT_SETTINGS.promptMode).toBe('string')
      expect(typeof DEFAULT_SETTINGS.autoInject).toBe('boolean')
      expect(typeof DEFAULT_SETTINGS.showFloatingWidget).toBe('boolean')
      expect(typeof DEFAULT_SETTINGS.modelProfileId).toBe('string')
      expect(typeof DEFAULT_SETTINGS.enableSounds).toBe('boolean')
    })

    it('should have valid default values', () => {
      expect(DEFAULT_SETTINGS.globalHotkey).toBe('CommandOrControl+Shift+Space')
      expect(DEFAULT_SETTINGS.promptMode).toBe('default')
      expect(DEFAULT_SETTINGS.autoInject).toBe(true)
      expect(DEFAULT_SETTINGS.showFloatingWidget).toBe(true)
      expect(DEFAULT_SETTINGS.modelProfileId).toBe('balanced')
      expect(DEFAULT_SETTINGS.enableSounds).toBe(true)
    })

    it('should have hotkeyMode default', () => {
      expect(DEFAULT_SETTINGS.hotkeyMode).toBe('toggle')
    })

    it('should have customPromptModes default as empty array', () => {
      expect(DEFAULT_SETTINGS.customPromptModes).toEqual([])
    })

    it('should have transcriptionLanguage default', () => {
      expect(DEFAULT_SETTINGS.transcriptionLanguage).toBe('auto')
    })

    it('should have valid hotkey format', () => {
      const hotkey = DEFAULT_SETTINGS.globalHotkey
      expect(hotkey).toMatch(/^[A-Za-z+]+$/)
    })
  })

  describe('DEFAULT_PROMPT_MODES', () => {
    it('should have 4 modes', () => {
      expect(DEFAULT_PROMPT_MODES).toHaveLength(4)
    })

    it('should have correct structure for each mode', () => {
      for (const mode of DEFAULT_PROMPT_MODES) {
        expect(mode).toHaveProperty('id')
        expect(mode).toHaveProperty('name')
        expect(mode).toHaveProperty('systemPrompt')
        expect(typeof mode.id).toBe('string')
        expect(typeof mode.name).toBe('string')
        expect(typeof mode.systemPrompt).toBe('string')
      }
    })

    it('should have default mode', () => {
      const defaultMode = DEFAULT_PROMPT_MODES.find((m) => m.id === 'default')
      expect(defaultMode).toBeDefined()
      expect(defaultMode?.name).toBe('General')
      expect(defaultMode?.systemPrompt).toContain('filler words')
    })

    it('should have email mode', () => {
      const emailMode = DEFAULT_PROMPT_MODES.find((m) => m.id === 'email')
      expect(emailMode).toBeDefined()
      expect(emailMode?.name).toBe('Email')
      expect(emailMode?.systemPrompt).toContain('business emails')
    })

    it('should have code mode', () => {
      const codeMode = DEFAULT_PROMPT_MODES.find((m) => m.id === 'code')
      expect(codeMode).toBeDefined()
      expect(codeMode?.name).toBe('Code/Technical')
      expect(codeMode?.systemPrompt).toContain('technical')
    })

    it('should have notes mode', () => {
      const notesMode = DEFAULT_PROMPT_MODES.find((m) => m.id === 'notes')
      expect(notesMode).toBeDefined()
      expect(notesMode?.name).toBe('Notes/Brainstorm')
      expect(notesMode?.systemPrompt).toContain('bullet points')
    })

    it('should have unique ids', () => {
      const ids = DEFAULT_PROMPT_MODES.map((m) => m.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have non-empty system prompts', () => {
      for (const mode of DEFAULT_PROMPT_MODES) {
        expect(mode.systemPrompt.length).toBeGreaterThan(0)
        expect(mode.systemPrompt.trim()).toBe(mode.systemPrompt)
      }
    })
  })

  describe('IPC_CHANNELS', () => {
    it('should have all required channels', () => {
      expect(IPC_CHANNELS).toHaveProperty('START_RECORDING')
      expect(IPC_CHANNELS).toHaveProperty('STOP_RECORDING')
      expect(IPC_CHANNELS).toHaveProperty('RECORDING_STATE_CHANGED')
      expect(IPC_CHANNELS).toHaveProperty('TRANSCRIPTION_PARTIAL')
      expect(IPC_CHANNELS).toHaveProperty('TRANSCRIPTION_COMPLETE')
      expect(IPC_CHANNELS).toHaveProperty('GET_SETTINGS')
      expect(IPC_CHANNELS).toHaveProperty('SET_SETTINGS')
      expect(IPC_CHANNELS).toHaveProperty('GET_MODEL_STATUS')
      expect(IPC_CHANNELS).toHaveProperty('DOWNLOAD_MODEL')
      expect(IPC_CHANNELS).toHaveProperty('MODEL_DOWNLOAD_PROGRESS')
      expect(IPC_CHANNELS).toHaveProperty('SHOW_WIDGET')
      expect(IPC_CHANNELS).toHaveProperty('HIDE_WIDGET')
      expect(IPC_CHANNELS).toHaveProperty('SHOW_SETTINGS')
      expect(IPC_CHANNELS).toHaveProperty('GET_MODEL_PROFILES')
      expect(IPC_CHANNELS).toHaveProperty('SET_MODEL_PROFILE')
      expect(IPC_CHANNELS).toHaveProperty('PLAY_SOUND')
      expect(IPC_CHANNELS).toHaveProperty('GET_HISTORY')
      expect(IPC_CHANNELS).toHaveProperty('DELETE_HISTORY')
      expect(IPC_CHANNELS).toHaveProperty('GET_HISTORY_COUNT')
      expect(IPC_CHANNELS).toHaveProperty('ONBOARDING_COMPLETE')
    })

    it('should have valid string values', () => {
      for (const [key, value] of Object.entries(IPC_CHANNELS)) {
        expect(typeof value).toBe('string')
        expect(value.length).toBeGreaterThan(0)
        expect(value).not.toContain(' ')
      }
    })

    it('should have correct recording channels', () => {
      expect(IPC_CHANNELS.START_RECORDING).toBe('recording:start')
      expect(IPC_CHANNELS.STOP_RECORDING).toBe('recording:stop')
      expect(IPC_CHANNELS.RECORDING_STATE_CHANGED).toBe('recording:state-changed')
    })

    it('should have correct transcription channels', () => {
      expect(IPC_CHANNELS.TRANSCRIPTION_PARTIAL).toBe('transcription:partial')
      expect(IPC_CHANNELS.TRANSCRIPTION_COMPLETE).toBe('transcription:complete')
    })

    it('should have correct settings channels', () => {
      expect(IPC_CHANNELS.GET_SETTINGS).toBe('settings:get')
      expect(IPC_CHANNELS.SET_SETTINGS).toBe('settings:set')
      expect(IPC_CHANNELS.SHOW_SETTINGS).toBe('settings:show')
    })

    it('should have correct model channels', () => {
      expect(IPC_CHANNELS.GET_MODEL_STATUS).toBe('model:status')
      expect(IPC_CHANNELS.DOWNLOAD_MODEL).toBe('model:download')
      expect(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS).toBe('model:download-progress')
      expect(IPC_CHANNELS.GET_MODEL_PROFILES).toBe('model:profiles')
      expect(IPC_CHANNELS.SET_MODEL_PROFILE).toBe('model:set-profile')
    })

    it('should have correct widget channels', () => {
      expect(IPC_CHANNELS.SHOW_WIDGET).toBe('widget:show')
      expect(IPC_CHANNELS.HIDE_WIDGET).toBe('widget:hide')
    })

    it('should have correct history channels', () => {
      expect(IPC_CHANNELS.GET_HISTORY).toBe('history:get')
      expect(IPC_CHANNELS.DELETE_HISTORY).toBe('history:delete')
      expect(IPC_CHANNELS.GET_HISTORY_COUNT).toBe('history:count')
    })

    it('should have channel format namespace:action', () => {
      for (const value of Object.values(IPC_CHANNELS)) {
        expect(value).toMatch(/^[a-z]+:[a-z-]+$/)
      }
    })

    it('should have unique channel values', () => {
      const values = Object.values(IPC_CHANNELS)
      const uniqueValues = new Set(values)
      expect(uniqueValues.size).toBe(values.length)
    })
  })
})
