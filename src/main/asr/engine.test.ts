import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ASREngine } from './engine'

// Mock Electron
vi.mock('electron', () => ({
  app: {
    getPath: (type: string) => {
      if (type === 'userData') return '/tmp/test-asr'
      if (type === 'temp') return '/tmp'
      return '/tmp/test-asr'
    }
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

// Use vi.hoisted to avoid mock hoisting issues
const { mockExistsSync, mockWriteFileSync, mockUnlinkSync } = vi.hoisted(() => {
  return {
    mockExistsSync: vi.fn(() => false),
    mockWriteFileSync: vi.fn(),
    mockUnlinkSync: vi.fn()
  }
})

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  writeFileSync: mockWriteFileSync,
  unlinkSync: mockUnlinkSync
}))

describe('ASREngine', () => {
  let engine: ASREngine

  beforeEach(() => {
    vi.clearAllMocks()
    engine = new ASREngine()
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

  describe('mockTranscribe', () => {
    it('should return one of the mock phrases', async () => {
      const mockPhrases = [
        '這是一個 test 的 transcription',
        'Hello, this is a mock transcription for testing',
        '我想要 create 一個新的 feature',
        'The deadline 是明天，我們需要 finish 這個 project',
        'Um, I think we should, uh, probably refactor this code'
      ]

      const audioBuffer = new Float32Array(16000) // 1 second of audio
      const result = await engine.transcribe(audioBuffer)

      expect(result).toBeTruthy()
      expect(mockPhrases.some((phrase) => phrase === result)).toBe(true)
    })
  })

  describe('writeWavFile', () => {
    it('should create WAV file with correct header structure', async () => {
      // Model exists (enters WAV path), but binary doesn't (falls back to mock)
      mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(false)

      const audioBuffer = new Float32Array(1000)
      for (let i = 0; i < 1000; i++) {
        audioBuffer[i] = Math.sin(i / 100) * 0.5
      }

      await engine.transcribe(audioBuffer)

      expect(mockWriteFileSync).toHaveBeenCalled()
      const [path, buffer] = mockWriteFileSync.mock.calls[0]
      expect(path).toContain('.wav')
      expect(buffer).toBeInstanceOf(Buffer)

      // Verify WAV header
      const wavBuffer = buffer as Buffer
      expect(wavBuffer.toString('ascii', 0, 4)).toBe('RIFF')
      expect(wavBuffer.toString('ascii', 8, 12)).toBe('WAVE')
      expect(wavBuffer.toString('ascii', 12, 16)).toBe('fmt ')
      expect(wavBuffer.toString('ascii', 36, 40)).toBe('data')

      // Verify format: PCM (1)
      expect(wavBuffer.readUInt16LE(20)).toBe(1)

      // Verify channels: Mono (1)
      expect(wavBuffer.readUInt16LE(22)).toBe(1)

      // Verify sample rate: 16000
      expect(wavBuffer.readUInt32LE(24)).toBe(16000)

      // Verify bits per sample: 16
      expect(wavBuffer.readUInt16LE(34)).toBe(16)
    })

    it('should handle empty audio buffer', async () => {
      mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(false)
      const audioBuffer = new Float32Array(0)
      await engine.transcribe(audioBuffer)
      expect(mockWriteFileSync).toHaveBeenCalled()
    })

    it('should clamp audio samples to [-1, 1] range', async () => {
      mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(false)
      const audioBuffer = new Float32Array([2.0, -2.0, 0.5, -0.5])
      await engine.transcribe(audioBuffer)

      const [, buffer] = mockWriteFileSync.mock.calls[0]
      const wavBuffer = buffer as Buffer

      // Read samples from data section (after 44-byte header)
      const sample1 = wavBuffer.readInt16LE(44)
      const sample2 = wavBuffer.readInt16LE(46)

      // 2.0 should be clamped to 1.0 -> 32767
      expect(sample1).toBe(32767)
      // -2.0 should be clamped to -1.0 -> -32767
      expect(sample2).toBe(-32767)
    })
  })

  describe('parseWhisperOutput', () => {
    it('should parse timestamp format correctly', async () => {
      const { spawn } = await import('child_process')
      const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>

      const mockProcess = {
        stdout: {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(Buffer.from('[00:00:00.000 --> 00:00:02.000]  Hello world'))
            }
          })
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn((event, handler) => {
          if (event === 'close') {
            setTimeout(() => handler(0), 0)
          }
        }),
        kill: vi.fn()
      }

      mockSpawn.mockReturnValue(mockProcess)
      mockExistsSync.mockReturnValue(true)

      const audioBuffer = new Float32Array(1000)
      const result = await engine.transcribe(audioBuffer)

      expect(result).toBe('Hello world')
    })

    it('should handle plain text lines', async () => {
      const { spawn } = await import('child_process')
      const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>

      const mockProcess = {
        stdout: {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(Buffer.from('Plain text line\nAnother line'))
            }
          })
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn((event, handler) => {
          if (event === 'close') {
            setTimeout(() => handler(0), 0)
          }
        }),
        kill: vi.fn()
      }

      mockSpawn.mockReturnValue(mockProcess)
      mockExistsSync.mockReturnValue(true)

      const audioBuffer = new Float32Array(1000)
      const result = await engine.transcribe(audioBuffer)

      expect(result).toContain('Plain text line')
      expect(result).toContain('Another line')
    })

    it('should handle mixed format output', async () => {
      const { spawn } = await import('child_process')
      const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>

      const mockProcess = {
        stdout: {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(
                Buffer.from(
                  '[00:00:00.000 --> 00:00:02.000]  First part\nPlain text\n[00:00:02.000 --> 00:00:04.000]  Second part'
                )
              )
            }
          })
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn((event, handler) => {
          if (event === 'close') {
            setTimeout(() => handler(0), 0)
          }
        }),
        kill: vi.fn()
      }

      mockSpawn.mockReturnValue(mockProcess)
      mockExistsSync.mockReturnValue(true)

      const audioBuffer = new Float32Array(1000)
      const result = await engine.transcribe(audioBuffer)

      expect(result).toContain('First part')
      expect(result).toContain('Plain text')
      expect(result).toContain('Second part')
    })

    it('should handle empty output', async () => {
      const { spawn } = await import('child_process')
      const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>

      const mockProcess = {
        stdout: {
          on: vi.fn((event, handler) => {
            if (event === 'data') {
              handler(Buffer.from(''))
            }
          })
        },
        stderr: {
          on: vi.fn()
        },
        on: vi.fn((event, handler) => {
          if (event === 'close') {
            setTimeout(() => handler(0), 0)
          }
        }),
        kill: vi.fn()
      }

      mockSpawn.mockReturnValue(mockProcess)
      mockExistsSync.mockReturnValue(true)

      const audioBuffer = new Float32Array(1000)
      const result = await engine.transcribe(audioBuffer)

      expect(result).toBe('')
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
