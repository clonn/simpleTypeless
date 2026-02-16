import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LLMEngine } from './engine'
import { DEFAULT_PROMPT_MODES } from '../../shared/types'

// Mock Electron
vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/test-app'
  }
}))

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: {
      on: vi.fn()
    },
    stderr: {
      on: vi.fn()
    },
    on: vi.fn(),
    kill: vi.fn()
  }))
}))

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false) // Default: model doesn't exist, triggers mock mode
}))

describe('LLMEngine', () => {
  let engine: LLMEngine

  beforeEach(() => {
    engine = new LLMEngine()
  })

  afterEach(async () => {
    await engine.dispose()
  })

  describe('isLoaded state', () => {
    it('should start with isLoaded = false', () => {
      expect(engine.isLoaded).toBe(false)
    })

    it('should remain false after initialize when model is missing', async () => {
      await engine.initialize()
      expect(engine.isLoaded).toBe(false)
    })
  })

  describe('mockRewrite', () => {
    it('should remove filler words (um, uh, like)', async () => {
      const input = 'um I think uh we should like do this'
      const result = await engine.rewrite(input, 'default')
      expect(result).not.toContain('um')
      expect(result).not.toContain('uh')
      expect(result).not.toContain('like')
    })

    it('should remove Chinese filler words (那個, 就是)', async () => {
      const input = '那個我想就是這樣'
      const result = await engine.rewrite(input, 'default')
      expect(result).not.toContain('那個')
      expect(result).not.toContain('就是')
    })

    it('should add spacing between Chinese and English', async () => {
      const input = '這是test字串'
      const result = await engine.rewrite(input, 'default')
      expect(result).toContain('這是 test 字串')
    })

    it('should capitalize first letter', async () => {
      const input = 'hello world'
      const result = await engine.rewrite(input, 'default')
      expect(result.charAt(0)).toBe('H')
    })

    it('should handle empty string', async () => {
      const result = await engine.rewrite('', 'default')
      expect(result).toBe('')
    })

    it('should handle whitespace-only string', async () => {
      const result = await engine.rewrite('   ', 'default')
      expect(result).toBe('')
    })

    it('should clean up multiple spaces', async () => {
      const input = 'hello    world    test'
      const result = await engine.rewrite(input, 'default')
      expect(result).not.toContain('  ')
    })

    it('should return original if result is empty after processing', async () => {
      const input = 'um uh like'
      const result = await engine.rewrite(input, 'default')
      // After removing all fillers, should return original
      expect(result).toBe(input)
    })
  })

  describe('getPromptModes', () => {
    it('should return default prompt modes', () => {
      const modes = engine.getPromptModes()
      expect(modes.length).toBe(DEFAULT_PROMPT_MODES.length)
      expect(modes[0].id).toBe('default')
    })

    it('should return array with all mode ids', () => {
      const modes = engine.getPromptModes()
      const ids = modes.map((m) => m.id)
      expect(ids).toContain('default')
      expect(ids).toContain('email')
      expect(ids).toContain('code')
      expect(ids).toContain('notes')
    })
  })

  describe('addPromptMode', () => {
    it('should add a new prompt mode', () => {
      const customMode = {
        id: 'custom',
        name: 'Custom Mode',
        systemPrompt: 'Custom prompt'
      }
      engine.addPromptMode(customMode)
      const modes = engine.getPromptModes()
      expect(modes.find((m) => m.id === 'custom')).toEqual(customMode)
    })

    it('should override existing mode with same id', () => {
      const overrideMode = {
        id: 'default',
        name: 'Override Default',
        systemPrompt: 'Override prompt'
      }
      engine.addPromptMode(overrideMode)
      const modes = engine.getPromptModes()
      const defaultMode = modes.find((m) => m.id === 'default')
      expect(defaultMode?.name).toBe('Override Default')
    })
  })

  describe('rewrite', () => {
    it('should use mock rewrite when model does not exist', async () => {
      const input = 'um hello world'
      const result = await engine.rewrite(input, 'default')
      expect(result).toBeTruthy()
      expect(result).not.toContain('um')
    })

    it('should handle invalid promptModeId by falling back to default', async () => {
      const input = 'test input'
      const result = await engine.rewrite(input, 'invalid-mode-id')
      expect(result).toBeTruthy()
    })
  })

  describe('dispose', () => {
    it('should set isLoaded to false', async () => {
      await engine.dispose()
      expect(engine.isLoaded).toBe(false)
    })

    it('should be safe to call multiple times', async () => {
      await engine.dispose()
      await engine.dispose()
      expect(engine.isLoaded).toBe(false)
    })
  })
})
