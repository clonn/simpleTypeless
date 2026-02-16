/**
 * Cloud OpenAI Whisper Provider
 *
 * Uses OpenAI's Whisper API for cloud-based speech recognition.
 */

import { request } from 'undici'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

const SAMPLE_RATE = 16000

export class CloudOpenAIProvider {
  private apiKey: string
  private language: string = 'en'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  setLanguage(language: string): void {
    this.language = language === 'auto' ? 'en' : language
  }

  get isLoaded(): boolean {
    return !!this.apiKey
  }

  async transcribe(audioBuffer: Float32Array): Promise<string> {
    // Convert Float32Array to WAV buffer
    const wavBuffer = this.convertToWav(audioBuffer)

    // Write to temporary file (OpenAI API expects file upload)
    const tempWavPath = join(app.getPath('temp'), `openai_whisper_${Date.now()}.wav`)
    writeFileSync(tempWavPath, wavBuffer)

    try {
      // Create multipart form data manually
      const boundary = `----WebKitFormBoundary${Date.now()}`
      const formData: Buffer[] = []

      // Add file field
      formData.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n` +
        `Content-Type: audio/wav\r\n\r\n`
      ))
      formData.push(wavBuffer)
      formData.push(Buffer.from('\r\n'))

      // Add model field
      formData.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="model"\r\n\r\n` +
        `whisper-1\r\n`
      ))

      // Add language field
      formData.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="language"\r\n\r\n` +
        `${this.language}\r\n`
      ))

      // Close boundary
      formData.push(Buffer.from(`--${boundary}--\r\n`))

      const body = Buffer.concat(formData)

      // Call OpenAI API
      const response = await request('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body
      })

      if (response.statusCode !== 200) {
        const errorText = await response.body.text()
        throw new Error(`OpenAI API error (${response.statusCode}): ${errorText}`)
      }

      const result = await response.body.json() as { text: string }
      return result.text

    } finally {
      // Clean up temp file
      try {
        unlinkSync(tempWavPath)
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private convertToWav(audioBuffer: Float32Array): Buffer {
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

    return buffer
  }
}
