import { app } from 'electron'
import { join } from 'path'
import { createWriteStream, existsSync, mkdirSync, statSync } from 'fs'
import { get } from 'https'
import { IncomingMessage } from 'http'
import { ModelDownloadState } from '../../shared/types'

export interface ModelInfo {
  name: string
  url: string
  filename: string
  size: number // approximate size in bytes
}

// Model registry with download URLs
export const MODELS = {
  whisper: {
    'whisper-large-v3-turbo-q5_0': {
      name: 'Whisper Large v3 Turbo (Q5_0)',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin',
      filename: 'whisper-large-v3-turbo-q5_0.bin',
      size: 547 * 1024 * 1024 // ~547MB
    }
  },
  llm: {
    'qwen2.5-3b-instruct-q4_k_m': {
      name: 'Qwen 2.5 3B Instruct (Q4_K_M)',
      url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
      filename: 'qwen2.5-3b-instruct-q4_k_m.gguf',
      size: 2.1 * 1024 * 1024 * 1024 // ~2.1GB
    }
  }
} as const

export type WhisperModelId = keyof typeof MODELS.whisper
export type LLMModelId = keyof typeof MODELS.llm

export class ModelDownloader {
  private modelsDir: string
  private activeDownloads: Map<string, { controller: AbortController }> = new Map()
  private downloadStates: Map<string, ModelDownloadState> = new Map()
  private onProgressCallback?: (state: ModelDownloadState) => void

  constructor() {
    this.modelsDir = join(app.getPath('userData'), 'models')
    this.ensureModelsDir()
  }

  private ensureModelsDir(): void {
    if (!existsSync(this.modelsDir)) {
      mkdirSync(this.modelsDir, { recursive: true })
    }
  }

  onProgress(callback: (state: ModelDownloadState) => void): void {
    this.onProgressCallback = callback
  }

  getModelsDir(): string {
    return this.modelsDir
  }

  getModelPath(modelType: 'whisper' | 'llm', modelId: string): string {
    const models = modelType === 'whisper' ? MODELS.whisper : MODELS.llm
    const model = models[modelId as keyof typeof models]
    if (!model) {
      throw new Error(`Unknown model: ${modelType}/${modelId}`)
    }
    return join(this.modelsDir, model.filename)
  }

  modelExists(modelType: 'whisper' | 'llm', modelId: string): boolean {
    try {
      const path = this.getModelPath(modelType, modelId)
      return existsSync(path)
    } catch {
      return false
    }
  }

  getModelSize(modelType: 'whisper' | 'llm', modelId: string): number {
    try {
      const path = this.getModelPath(modelType, modelId)
      if (existsSync(path)) {
        return statSync(path).size
      }
      return 0
    } catch {
      return 0
    }
  }

  getDownloadState(modelType: 'whisper' | 'llm'): ModelDownloadState | null {
    return this.downloadStates.get(modelType) || null
  }

  private emitProgress(state: ModelDownloadState): void {
    this.downloadStates.set(state.modelType, state)
    this.onProgressCallback?.(state)
  }

  async downloadModel(
    modelType: 'whisper' | 'llm',
    modelId: string
  ): Promise<void> {
    const models = modelType === 'whisper' ? MODELS.whisper : MODELS.llm
    const model = models[modelId as keyof typeof models]

    if (!model) {
      throw new Error(`Unknown model: ${modelType}/${modelId}`)
    }

    const destPath = join(this.modelsDir, model.filename)

    // Check if already exists
    if (existsSync(destPath)) {
      const stats = statSync(destPath)
      // If file seems complete (within 1% of expected size), skip download
      if (stats.size >= model.size * 0.99) {
        this.emitProgress({
          modelType,
          modelName: model.name,
          status: 'completed',
          progress: 100,
          downloadedBytes: stats.size,
          totalBytes: stats.size
        })
        return
      }
    }

    // Check if already downloading
    if (this.activeDownloads.has(modelType)) {
      console.log(`[Downloader] ${modelType} download already in progress`)
      return
    }

    const controller = new AbortController()
    this.activeDownloads.set(modelType, { controller })

    this.emitProgress({
      modelType,
      modelName: model.name,
      status: 'downloading',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: model.size
    })

    try {
      await this.downloadFile(model.url, destPath, modelType, model.name, model.size)

      this.emitProgress({
        modelType,
        modelName: model.name,
        status: 'completed',
        progress: 100,
        downloadedBytes: model.size,
        totalBytes: model.size
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.emitProgress({
        modelType,
        modelName: model.name,
        status: 'error',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: model.size,
        error: errorMessage
      })
      throw error
    } finally {
      this.activeDownloads.delete(modelType)
    }
  }

  private downloadFile(
    url: string,
    destPath: string,
    modelType: 'whisper' | 'llm',
    modelName: string,
    expectedSize: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const handleResponse = (response: IncomingMessage): void => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location
          if (redirectUrl) {
            this.downloadFile(redirectUrl, destPath, modelType, modelName, expectedSize)
              .then(resolve)
              .catch(reject)
            return
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
          return
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10) || expectedSize
        let downloadedBytes = 0

        const file = createWriteStream(destPath)

        response.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length
          const progress = Math.round((downloadedBytes / totalBytes) * 100)

          this.emitProgress({
            modelType,
            modelName,
            status: 'downloading',
            progress,
            downloadedBytes,
            totalBytes
          })
        })

        response.pipe(file)

        file.on('finish', () => {
          file.close()
          resolve()
        })

        file.on('error', (err) => {
          file.close()
          reject(err)
        })

        response.on('error', reject)
      }

      const request = get(url, handleResponse)
      request.on('error', reject)
    })
  }

  cancelDownload(modelType: 'whisper' | 'llm'): void {
    const download = this.activeDownloads.get(modelType)
    if (download) {
      download.controller.abort()
      this.activeDownloads.delete(modelType)
    }
  }
}
