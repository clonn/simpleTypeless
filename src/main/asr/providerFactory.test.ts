import { describe, it, expect, vi } from 'vitest'
import { createASRProvider } from './providerFactory'

// Mock Electron
vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/test-asr'
  }
}))

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(() => '')
}))

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn()
}))

describe('createASRProvider', () => {
  it('should create ASREngine for local-whisper provider', () => {
    const provider = createASRProvider('local-whisper')
    expect(provider).toBeDefined()
    expect(provider.isLoaded).toBe(false)
    expect(typeof provider.transcribe).toBe('function')
  })

  it('should create ASREngine for default provider', () => {
    const provider = createASRProvider('local-whisper')
    expect(provider).toBeDefined()
  })

  it('should create CloudOpenAIProvider with API key', () => {
    const provider = createASRProvider('cloud-openai', {
      openaiApiKey: 'sk-test-key'
    })
    expect(provider).toBeDefined()
    expect(typeof provider.transcribe).toBe('function')
  })

  it('should throw when cloud-openai provider has no API key', () => {
    expect(() => createASRProvider('cloud-openai')).toThrow(
      'OpenAI API key required'
    )
    expect(() => createASRProvider('cloud-openai', {})).toThrow(
      'OpenAI API key required'
    )
  })

  it('should create MacOSDictationProvider', () => {
    const provider = createASRProvider('macos-dictation')
    expect(provider).toBeDefined()
    expect(typeof provider.transcribe).toBe('function')
  })

  it('should have initialize and dispose methods on local-whisper provider', () => {
    const provider = createASRProvider('local-whisper')
    expect(typeof provider.initialize).toBe('function')
    expect(typeof provider.dispose).toBe('function')
  })
})
