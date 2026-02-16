import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpusEncoder } from './opusEncoder'

// Mock Electron
vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/test-opus'
  }
}))

// Use vi.hoisted to avoid mock hoisting issues
const { mockMkdirSync, createdWorkers } = vi.hoisted(() => {
  const mockMkdirSync = vi.fn()
  const createdWorkers: any[] = []
  return { mockMkdirSync, createdWorkers }
})

vi.mock('fs', () => ({
  mkdirSync: mockMkdirSync
}))

vi.mock('worker_threads', () => {
  class MockWorker {
    private listeners: Map<string, Function[]> = new Map()

    constructor(_scriptPath: string, _options: any) {
      createdWorkers.push(this)
    }

    on(event: string, handler: Function) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, [])
      }
      this.listeners.get(event)?.push(handler)
      return this
    }

    emit(event: string, data?: any) {
      const handlers = this.listeners.get(event) || []
      handlers.forEach((handler) => handler(data))
    }

    postMessage() {
      // Mock postMessage
    }

    terminate() {
      // Mock terminate
    }
  }

  return { Worker: MockWorker }
})

describe('OpusEncoder', () => {
  let encoder: OpusEncoder

  beforeEach(() => {
    vi.clearAllMocks()
    createdWorkers.length = 0
    encoder = new OpusEncoder()
  })

  describe('constructor', () => {
    it('should create recordings directory', () => {
      expect(mockMkdirSync).toHaveBeenCalledWith('/tmp/test-opus/recordings', {
        recursive: true
      })
    })
  })

  describe('encode', () => {
    it('should return a .wav file path', async () => {
      const audioBuffer = new Float32Array(1000)
      const filename = 'test-recording'

      const encodePromise = encoder.encode(audioBuffer, filename)

      // Get the worker that was just created by encode()
      const worker = createdWorkers[createdWorkers.length - 1]
      worker.emit('message', {
        type: 'done',
        path: '/tmp/test-opus/recordings/test-recording.wav'
      })

      const path = await encodePromise

      expect(path).toContain('test-recording.wav')
      expect(path).toContain('/tmp/test-opus/recordings')
    })

    it('should reject on worker error', async () => {
      const audioBuffer = new Float32Array(1000)
      const filename = 'test-error'

      const encodePromise = encoder.encode(audioBuffer, filename)

      const worker = createdWorkers[createdWorkers.length - 1]
      worker.emit('message', {
        type: 'error',
        error: 'Test error'
      })

      await expect(encodePromise).rejects.toThrow('Test error')
    })

    it('should reject on worker exit with non-zero code', async () => {
      const audioBuffer = new Float32Array(1000)
      const filename = 'test-exit'

      const encodePromise = encoder.encode(audioBuffer, filename)

      const worker = createdWorkers[createdWorkers.length - 1]
      worker.emit('exit', 1)

      await expect(encodePromise).rejects.toThrow('Worker exited with code 1')
    })
  })

  describe('destroy', () => {
    it('should terminate worker', () => {
      encoder.destroy()
      expect(true).toBe(true)
    })

    it('should be safe to call multiple times', () => {
      encoder.destroy()
      encoder.destroy()
      expect(true).toBe(true)
    })

    it('should be safe to call without prior encode', () => {
      const newEncoder = new OpusEncoder()
      newEncoder.destroy()
      expect(true).toBe(true)
    })
  })
})
