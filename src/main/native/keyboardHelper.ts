/**
 * Native Keyboard Helper
 *
 * Spawns the Swift KeyboardHelper binary and reads JSON events from stdout.
 * Provides key-down and key-up events for true push-to-talk.
 */

import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { EventEmitter } from 'events'

export interface KeyEvent {
  type: 'keyDown' | 'keyUp' | 'flagsChanged'
  keyCode: number
  flags: string[]
}

export class KeyboardHelper extends EventEmitter {
  private process: ChildProcess | null = null
  private buffer = ''

  private getBinaryPath(): string | null {
    const paths = [
      join(process.resourcesPath || '', 'bin', 'KeyboardHelper'),
      join(__dirname, '../../../resources/bin/KeyboardHelper')
    ]

    for (const p of paths) {
      if (existsSync(p)) return p
    }
    return null
  }

  get isRunning(): boolean {
    return this.process !== null
  }

  start(): boolean {
    if (this.process) return true

    const binaryPath = this.getBinaryPath()
    if (!binaryPath) {
      console.warn('[KeyboardHelper] Binary not found, true push-to-talk unavailable')
      return false
    }

    try {
      this.process = spawn(binaryPath, [], {
        stdio: ['ignore', 'pipe', 'pipe']
      })

      this.process.stdout?.on('data', (data: Buffer) => {
        this.buffer += data.toString()
        this.processBuffer()
      })

      this.process.stderr?.on('data', (data: Buffer) => {
        console.error('[KeyboardHelper]', data.toString().trim())
      })

      this.process.on('close', (code) => {
        console.log(`[KeyboardHelper] Process exited with code ${code}`)
        this.process = null
        this.emit('exit', code)
      })

      this.process.on('error', (err) => {
        console.error('[KeyboardHelper] Spawn error:', err)
        this.process = null
      })

      return true
    } catch (err) {
      console.error('[KeyboardHelper] Failed to start:', err)
      return false
    }
  }

  stop(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
    this.buffer = ''
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      try {
        const event = JSON.parse(trimmed) as KeyEvent
        if (event.type) {
          this.emit('keyEvent', event)
        }
      } catch {
        // Ignore non-JSON lines
      }
    }
  }
}
