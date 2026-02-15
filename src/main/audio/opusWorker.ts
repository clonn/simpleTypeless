/**
 * Worker Thread for Audio Encoding
 *
 * Currently encodes audio as WAV (16-bit PCM).
 * The worker thread pattern is set up so that Opus FFI encoding
 * can be swapped in later when libopusenc is compiled for the target platform.
 *
 * Receives: Float32Array audio buffer via workerData (transferred as ArrayBuffer)
 * Produces: WAV file on disk, posts back { type: 'done', path } or { type: 'error', error }
 */

import { parentPort, workerData } from 'worker_threads'
import { writeFileSync } from 'fs'

const { audioBuffer, outputPath, sampleRate, channels } = workerData as {
  audioBuffer: ArrayBuffer
  outputPath: string
  sampleRate: number
  channels: number
}

try {
  const buffer = Buffer.from(audioBuffer)
  const float32 = new Float32Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength / Float32Array.BYTES_PER_ELEMENT
  )

  // Convert Float32 [-1.0, 1.0] to 16-bit PCM
  const pcmData = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }

  // Build WAV header (44 bytes) + PCM data
  const wavHeader = Buffer.alloc(44)
  const dataLength = pcmData.byteLength
  const fileLength = dataLength + 36

  wavHeader.write('RIFF', 0)
  wavHeader.writeUInt32LE(fileLength, 4)
  wavHeader.write('WAVE', 8)
  wavHeader.write('fmt ', 12)
  wavHeader.writeUInt32LE(16, 16) // fmt chunk size
  wavHeader.writeUInt16LE(1, 20) // PCM format
  wavHeader.writeUInt16LE(channels, 22)
  wavHeader.writeUInt32LE(sampleRate, 24)
  wavHeader.writeUInt32LE(sampleRate * channels * 2, 28) // byte rate
  wavHeader.writeUInt16LE(channels * 2, 32) // block align
  wavHeader.writeUInt16LE(16, 34) // bits per sample
  wavHeader.write('data', 36)
  wavHeader.writeUInt32LE(dataLength, 40)

  writeFileSync(outputPath, Buffer.concat([wavHeader, Buffer.from(pcmData.buffer)]))

  parentPort?.postMessage({ type: 'done', path: outputPath })
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  parentPort?.postMessage({ type: 'error', error: message })
}
