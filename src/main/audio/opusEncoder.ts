/**
 * Opus Encoder Manager
 *
 * Manages a worker thread that encodes Float32Array audio buffers to disk.
 * Currently produces WAV files; the worker is structured so that Opus encoding
 * can be swapped in later without changing this interface.
 */

import { Worker } from 'worker_threads'
import { join } from 'path'
import { app } from 'electron'
import { mkdirSync } from 'fs'

export class OpusEncoder {
  private worker: Worker | null = null
  private recordingsDir: string

  constructor() {
    this.recordingsDir = join(app.getPath('userData'), 'recordings')
    mkdirSync(this.recordingsDir, { recursive: true })
  }

  /**
   * Encode a Float32Array audio buffer to a WAV file on disk.
   *
   * @param audioBuffer - Raw audio samples in Float32 format ([-1.0, 1.0])
   * @param filename - Base filename (without extension)
   * @returns Absolute path to the written audio file
   */
  async encode(audioBuffer: Float32Array, filename: string): Promise<string> {
    const outputPath = join(this.recordingsDir, `${filename}.ogg`)

    return new Promise((resolve, reject) => {
      // The worker is built as a separate entry point by electron-vite.
      // In the built app, __dirname is dist/main/ and the worker is at dist/main/opusWorker.js
      const workerPath = join(__dirname, 'opusWorker.js')

      this.worker = new Worker(workerPath, {
        workerData: {
          audioBuffer: audioBuffer.buffer,
          outputPath,
          sampleRate: 16000,
          channels: 1
        }
      })

      this.worker.on('message', (msg: { type: string; path?: string; error?: string }) => {
        if (msg.type === 'done') {
          resolve(msg.path ?? outputPath)
        } else if (msg.type === 'error') {
          reject(new Error(msg.error ?? 'Unknown worker error'))
        }
      })

      this.worker.on('error', (err) => {
        reject(err)
      })

      this.worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker exited with code ${code}`))
        }
      })
    })
  }

  /**
   * Terminate any running worker and clean up resources.
   */
  destroy(): void {
    this.worker?.terminate()
    this.worker = null
  }
}
