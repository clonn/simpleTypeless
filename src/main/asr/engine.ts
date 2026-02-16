/**
 * ASR Engine - Whisper.cpp Integration
 *
 * Uses whisper.cpp for local speech-to-text transcription.
 * Supports Whisper Large-v3-Turbo for best accuracy with Chinese/English code-switching.
 */

import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { app } from 'electron'
import { existsSync, writeFileSync, unlinkSync } from 'fs'
import { detectWhisperBinary } from './whisperBinary'

const SAMPLE_RATE = 16000

interface WhisperConfig {
  modelPath: string
  language: string
  initialPrompt: string
  threads: number
}

const DEFAULT_CONFIG: WhisperConfig = {
  modelPath: '',
  language: 'auto', // Auto-detect for code-switching
  initialPrompt:
    'The following is a discussion containing both Chinese and English technical terms. Please transcribe verbatim.',
  threads: 4
}

export class ASREngine {
  private config: WhisperConfig
  private _isLoaded = false
  private whisperProcess: ChildProcess | null = null

  constructor(config: Partial<WhisperConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Set default model path
    if (!this.config.modelPath) {
      this.config.modelPath = join(
        app.getPath('userData'),
        'models',
        'whisper-large-v3-turbo-q5_0.bin'
      )
    }
  }

  get isLoaded(): boolean {
    return this._isLoaded
  }

  static checkReady(): {
    binaryFound: boolean
    modelFound: boolean
    binaryPath: string | null
    modelPath: string
  } {
    const detection = detectWhisperBinary()
    const modelPath = join(
      app.getPath('userData'),
      'models',
      'whisper-large-v3-turbo-q5_0.bin'
    )
    return {
      binaryFound: detection.found,
      modelFound: existsSync(modelPath),
      binaryPath: detection.path,
      modelPath
    }
  }

  async initialize(): Promise<void> {
    // Check if model exists
    if (!existsSync(this.config.modelPath)) {
      console.warn('[ASR] Model not found at:', this.config.modelPath)
      console.warn('[ASR] Please download the Whisper model first')
      return
    }

    // Warm up the model by running a short inference
    try {
      await this.warmUp()
      this._isLoaded = true
      console.log('[ASR] Whisper model loaded successfully')
    } catch (error) {
      console.error('[ASR] Failed to initialize Whisper:', error)
    }
  }

  private async warmUp(): Promise<void> {
    // Create a short silence buffer for warm-up
    const silenceBuffer = new Float32Array(SAMPLE_RATE) // 1 second of silence
    await this.transcribe(silenceBuffer)
  }

  async transcribe(audioBuffer: Float32Array): Promise<string> {
    if (!existsSync(this.config.modelPath)) {
      // Return mock transcription for development
      return this.mockTranscribe()
    }

    return new Promise((resolve, reject) => {
      // Write audio to temporary WAV file
      const tempWavPath = join(app.getPath('temp'), `whisper_${Date.now()}.wav`)

      try {
        this.writeWavFile(tempWavPath, audioBuffer)
      } catch (error) {
        reject(new Error(`Failed to write temp audio file: ${error}`))
        return
      }

      // Get whisper.cpp binary path
      const whisperBinary = this.getWhisperBinaryPath()

      if (!existsSync(whisperBinary)) {
        // Use mock transcription if binary not available
        unlinkSync(tempWavPath)
        resolve(this.mockTranscribe())
        return
      }

      // Build whisper.cpp command arguments
      const args = [
        '-m',
        this.config.modelPath,
        '-f',
        tempWavPath,
        '-l',
        this.config.language,
        '-t',
        this.config.threads.toString(),
        '--no-timestamps',
        '--prompt',
        this.config.initialPrompt
      ]

      let output = ''
      let errorOutput = ''

      this.whisperProcess = spawn(whisperBinary, args)

      this.whisperProcess.stdout?.on('data', (data) => {
        output += data.toString()
      })

      this.whisperProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString()
      })

      this.whisperProcess.on('close', (code) => {
        // Clean up temp file
        try {
          unlinkSync(tempWavPath)
        } catch {
          // Ignore cleanup errors
        }

        if (code === 0) {
          // Parse output - whisper.cpp outputs text with timestamps
          const text = this.parseWhisperOutput(output)
          resolve(text)
        } else {
          console.error('[ASR] Whisper error:', errorOutput)
          reject(new Error(`Whisper process exited with code ${code}`))
        }

        this.whisperProcess = null
      })

      this.whisperProcess.on('error', (error) => {
        try {
          unlinkSync(tempWavPath)
        } catch {
          // Ignore cleanup errors
        }
        reject(error)
      })
    })
  }

  private getWhisperBinaryPath(): string {
    const detection = detectWhisperBinary()
    if (detection.found && detection.path) {
      return detection.path
    }
    // Fallback to old resource-based path for bundled binary
    const resourcePath = process.resourcesPath || join(__dirname, '../../resources')
    if (process.platform === 'darwin') {
      const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
      return join(resourcePath, 'bin', `whisper-${arch}`)
    }
    return join(resourcePath, 'bin', 'whisper')
  }

  private writeWavFile(path: string, audioBuffer: Float32Array): void {
    // Convert Float32Array to 16-bit PCM WAV
    const numSamples = audioBuffer.length
    const bytesPerSample = 2
    const dataSize = numSamples * bytesPerSample
    const headerSize = 44
    const fileSize = headerSize + dataSize

    const buffer = Buffer.alloc(fileSize)

    // WAV header
    buffer.write('RIFF', 0)
    buffer.writeUInt32LE(fileSize - 8, 4)
    buffer.write('WAVE', 8)
    buffer.write('fmt ', 12)
    buffer.writeUInt32LE(16, 16) // fmt chunk size
    buffer.writeUInt16LE(1, 20) // PCM format
    buffer.writeUInt16LE(1, 22) // Mono
    buffer.writeUInt32LE(SAMPLE_RATE, 24)
    buffer.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28) // Byte rate
    buffer.writeUInt16LE(bytesPerSample, 32) // Block align
    buffer.writeUInt16LE(16, 34) // Bits per sample
    buffer.write('data', 36)
    buffer.writeUInt32LE(dataSize, 40)

    // Convert float32 to int16 and write samples
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer[i]))
      const int16Sample = Math.floor(sample * 32767)
      buffer.writeInt16LE(int16Sample, headerSize + i * bytesPerSample)
    }

    writeFileSync(path, buffer)
  }

  private parseWhisperOutput(output: string): string {
    // Whisper output format: [00:00:00.000 --> 00:00:02.000]  Text here
    // We want just the text without timestamps
    const lines = output.split('\n')
    const textParts: string[] = []

    for (const line of lines) {
      // Remove timestamp prefixes
      const match = line.match(/\[\d+:\d+:\d+\.\d+\s*-->\s*\d+:\d+:\d+\.\d+\]\s*(.*)/)
      if (match) {
        textParts.push(match[1].trim())
      } else {
        // Plain text line
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('[')) {
          textParts.push(trimmed)
        }
      }
    }

    return textParts.join(' ').trim()
  }

  private mockTranscribe(): string {
    // Mock transcription for development when model is not available
    const mockPhrases = [
      '這是一個 test 的 transcription',
      'Hello, this is a mock transcription for testing',
      '我想要 create 一個新的 feature',
      'The deadline 是明天，我們需要 finish 這個 project',
      'Um, I think we should, uh, probably refactor this code'
    ]

    return mockPhrases[Math.floor(Math.random() * mockPhrases.length)]
  }

  setLanguage(language: string): void {
    this.config.language = language
    if (language === 'auto') {
      this.config.initialPrompt =
        'The following is a discussion containing both Chinese and English technical terms. Please transcribe verbatim.'
    } else if (language === 'zh') {
      this.config.initialPrompt = '以下是中文語音內容，請逐字轉錄。'
    } else if (language === 'en') {
      this.config.initialPrompt = 'The following is English speech. Please transcribe verbatim.'
    } else {
      this.config.initialPrompt = 'Please transcribe verbatim.'
    }
  }

  async dispose(): Promise<void> {
    if (this.whisperProcess) {
      this.whisperProcess.kill()
      this.whisperProcess = null
    }
    this._isLoaded = false
  }
}
