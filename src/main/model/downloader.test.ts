import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModelDownloader, MODELS } from './downloader'

// Mock Electron
vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/test-models'
  }
}))

// Use vi.hoisted to avoid mock hoisting issues
const { mockExistsSync, mockMkdirSync, mockStatSync, mockCreateWriteStream } = vi.hoisted(() => {
  return {
    mockExistsSync: vi.fn(() => false),
    mockMkdirSync: vi.fn(),
    mockStatSync: vi.fn(() => ({ size: 0 })),
    mockCreateWriteStream: vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn()
    }))
  }
})

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  statSync: mockStatSync,
  createWriteStream: mockCreateWriteStream
}))

// Mock https
vi.mock('https', () => ({
  get: vi.fn()
}))

describe('ModelDownloader', () => {
  let downloader: ModelDownloader

  beforeEach(() => {
    vi.clearAllMocks()
    downloader = new ModelDownloader()
  })

  describe('constructor', () => {
    it('should create models directory', () => {
      expect(mockMkdirSync).toHaveBeenCalledWith('/tmp/test-models/models', { recursive: true })
    })
  })

  describe('MODELS constant', () => {
    it('should have whisper models', () => {
      expect(MODELS.whisper).toBeDefined()
      expect(MODELS.whisper['whisper-large-v3-turbo-q5_0']).toBeDefined()
    })

    it('should have llm models', () => {
      expect(MODELS.llm).toBeDefined()
      expect(MODELS.llm['qwen2.5-3b-instruct-q4_k_m']).toBeDefined()
    })

    it('should have correct structure for whisper model', () => {
      const model = MODELS.whisper['whisper-large-v3-turbo-q5_0']
      expect(model).toHaveProperty('name')
      expect(model).toHaveProperty('url')
      expect(model).toHaveProperty('filename')
      expect(model).toHaveProperty('size')
      expect(typeof model.size).toBe('number')
    })

    it('should have correct structure for llm model', () => {
      const model = MODELS.llm['qwen2.5-3b-instruct-q4_k_m']
      expect(model).toHaveProperty('name')
      expect(model).toHaveProperty('url')
      expect(model).toHaveProperty('filename')
      expect(model).toHaveProperty('size')
      expect(typeof model.size).toBe('number')
    })
  })

  describe('getModelPath', () => {
    it('should return correct path for whisper model', () => {
      const path = downloader.getModelPath('whisper', 'whisper-large-v3-turbo-q5_0')
      expect(path).toContain('/tmp/test-models')
      expect(path).toContain('whisper-large-v3-turbo-q5_0.bin')
    })

    it('should return correct path for llm model', () => {
      const path = downloader.getModelPath('llm', 'qwen2.5-3b-instruct-q4_k_m')
      expect(path).toContain('/tmp/test-models')
      expect(path).toContain('qwen2.5-3b-instruct-q4_k_m.gguf')
    })

    it('should throw error for invalid model id', () => {
      expect(() => {
        downloader.getModelPath('whisper', 'invalid-model')
      }).toThrow('Unknown model: whisper/invalid-model')
    })

    it('should throw error for invalid model type and id', () => {
      expect(() => {
        downloader.getModelPath('llm', 'non-existent')
      }).toThrow('Unknown model: llm/non-existent')
    })
  })

  describe('modelExists', () => {
    it('should return false when model does not exist', () => {
      mockExistsSync.mockReturnValue(false)
      const exists = downloader.modelExists('whisper', 'whisper-large-v3-turbo-q5_0')
      expect(exists).toBe(false)
    })

    it('should return true when model exists', () => {
      mockExistsSync.mockReturnValue(true)
      const exists = downloader.modelExists('whisper', 'whisper-large-v3-turbo-q5_0')
      expect(exists).toBe(true)
    })

    it('should return false for invalid model id', () => {
      const exists = downloader.modelExists('whisper', 'invalid-model')
      expect(exists).toBe(false)
    })
  })

  describe('getDownloadState', () => {
    it('should return null initially', () => {
      const state = downloader.getDownloadState('whisper')
      expect(state).toBeNull()
    })

    it('should return null for llm initially', () => {
      const state = downloader.getDownloadState('llm')
      expect(state).toBeNull()
    })
  })

  describe('onProgress', () => {
    it('should register progress callback', () => {
      const callback = vi.fn()
      downloader.onProgress(callback)
      expect(callback).toBeDefined()
    })
  })

  describe('cancelDownload', () => {
    it('should not crash when no download is active', () => {
      expect(() => {
        downloader.cancelDownload('whisper')
      }).not.toThrow()
    })

    it('should not crash for llm when no download is active', () => {
      expect(() => {
        downloader.cancelDownload('llm')
      }).not.toThrow()
    })
  })

  describe('getModelsDir', () => {
    it('should return models directory path', () => {
      const dir = downloader.getModelsDir()
      expect(dir).toBe('/tmp/test-models/models')
    })
  })

  describe('getModelSize', () => {
    it('should return 0 when model does not exist', () => {
      mockExistsSync.mockReturnValue(false)
      const size = downloader.getModelSize('whisper', 'whisper-large-v3-turbo-q5_0')
      expect(size).toBe(0)
    })

    it('should return file size when model exists', () => {
      mockExistsSync.mockReturnValue(true)
      mockStatSync.mockReturnValue({ size: 547 * 1024 * 1024 })
      const size = downloader.getModelSize('whisper', 'whisper-large-v3-turbo-q5_0')
      expect(size).toBe(547 * 1024 * 1024)
    })

    it('should return 0 for invalid model id', () => {
      const size = downloader.getModelSize('whisper', 'invalid-model')
      expect(size).toBe(0)
    })
  })
})
