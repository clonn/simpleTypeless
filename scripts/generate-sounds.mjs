/**
 * Generate simple sine-wave WAV files for record-start and record-end sounds.
 *
 * record-start: short ascending tone (440Hz -> 880Hz over 150ms)
 * record-end:   short descending tone (880Hz -> 440Hz over 150ms)
 *
 * Both are 16-bit mono PCM WAV at 44100 Hz sample rate.
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SAMPLE_RATE = 44100
const DURATION_MS = 150
const BIT_DEPTH = 16
const NUM_CHANNELS = 1

function generateTone(startFreq, endFreq, durationMs, volume = 0.4) {
  const numSamples = Math.floor(SAMPLE_RATE * durationMs / 1000)
  const samples = new Int16Array(numSamples)
  const maxAmplitude = Math.pow(2, BIT_DEPTH - 1) - 1

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE
    const progress = i / numSamples

    // Linear frequency sweep
    const freq = startFreq + (endFreq - startFreq) * progress

    // Apply a fade-in/fade-out envelope to avoid clicks
    let envelope = 1.0
    const fadeLength = 0.01 // 10ms fade
    const fadeSamples = Math.floor(SAMPLE_RATE * fadeLength)
    if (i < fadeSamples) {
      envelope = i / fadeSamples
    } else if (i > numSamples - fadeSamples) {
      envelope = (numSamples - i) / fadeSamples
    }

    const sample = Math.sin(2 * Math.PI * freq * t) * volume * envelope
    samples[i] = Math.round(sample * maxAmplitude)
  }

  return samples
}

function createWavBuffer(samples) {
  const bytesPerSample = BIT_DEPTH / 8
  const dataSize = samples.length * bytesPerSample
  const headerSize = 44
  const fileSize = headerSize + dataSize

  const buffer = Buffer.alloc(fileSize)
  let offset = 0

  // RIFF header
  buffer.write('RIFF', offset); offset += 4
  buffer.writeUInt32LE(fileSize - 8, offset); offset += 4
  buffer.write('WAVE', offset); offset += 4

  // fmt sub-chunk
  buffer.write('fmt ', offset); offset += 4
  buffer.writeUInt32LE(16, offset); offset += 4           // Sub-chunk size (16 for PCM)
  buffer.writeUInt16LE(1, offset); offset += 2            // Audio format (1 = PCM)
  buffer.writeUInt16LE(NUM_CHANNELS, offset); offset += 2 // Number of channels
  buffer.writeUInt32LE(SAMPLE_RATE, offset); offset += 4  // Sample rate
  buffer.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * bytesPerSample, offset); offset += 4 // Byte rate
  buffer.writeUInt16LE(NUM_CHANNELS * bytesPerSample, offset); offset += 2 // Block align
  buffer.writeUInt16LE(BIT_DEPTH, offset); offset += 2    // Bits per sample

  // data sub-chunk
  buffer.write('data', offset); offset += 4
  buffer.writeUInt32LE(dataSize, offset); offset += 4

  // Write sample data
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], offset)
    offset += 2
  }

  return buffer
}

// Generate ascending tone for record-start (440Hz -> 880Hz)
const startSamples = generateTone(440, 880, DURATION_MS)
const startWav = createWavBuffer(startSamples)
const startPath = join(__dirname, '..', 'resources', 'sounds', 'record-start.wav')
writeFileSync(startPath, startWav)
console.log(`Created: ${startPath} (${startWav.length} bytes, ${DURATION_MS}ms)`)

// Generate descending tone for record-end (880Hz -> 440Hz)
const endSamples = generateTone(880, 440, DURATION_MS)
const endWav = createWavBuffer(endSamples)
const endPath = join(__dirname, '..', 'resources', 'sounds', 'record-end.wav')
writeFileSync(endPath, endWav)
console.log(`Created: ${endPath} (${endWav.length} bytes, ${DURATION_MS}ms)`)
