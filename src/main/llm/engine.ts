/**
 * LLM Engine - Text Rewriting with Local Language Models
 *
 * Uses node-llama-cpp for local LLM inference.
 * Supports Qwen 2.5-3B for Chinese/English text rewriting.
 */

import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { app } from 'electron'
import { existsSync } from 'fs'
import { DEFAULT_PROMPT_MODES, PromptMode } from '../../shared/types'

interface LLMConfig {
  modelPath: string
  contextSize: number
  threads: number
  gpuLayers: number
}

const DEFAULT_CONFIG: LLMConfig = {
  modelPath: '',
  contextSize: 2048,
  threads: 4,
  gpuLayers: -1 // Auto-detect GPU layers (use all available on Apple Silicon)
}

export class LLMEngine {
  private config: LLMConfig
  private _isLoaded = false
  private promptModes: Map<string, PromptMode> = new Map()
  private llamaProcess: ChildProcess | null = null

  constructor(config: Partial<LLMConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Set default model path
    if (!this.config.modelPath) {
      this.config.modelPath = join(
        app.getPath('userData'),
        'models',
        'qwen2.5-3b-instruct-q4_k_m.gguf'
      )
    }

    // Initialize prompt modes
    for (const mode of DEFAULT_PROMPT_MODES) {
      this.promptModes.set(mode.id, mode)
    }
  }

  get isLoaded(): boolean {
    return this._isLoaded
  }

  async initialize(): Promise<void> {
    // Check if model exists
    if (!existsSync(this.config.modelPath)) {
      console.warn('[LLM] Model not found at:', this.config.modelPath)
      console.warn('[LLM] Please download the LLM model first')
      return
    }

    // Warm up the model
    try {
      await this.warmUp()
      this._isLoaded = true
      console.log('[LLM] LLM model loaded successfully')
    } catch (error) {
      console.error('[LLM] Failed to initialize LLM:', error)
    }
  }

  private async warmUp(): Promise<void> {
    // Run a short inference to load the model into memory
    await this.rewrite('Hello', 'default')
  }

  async rewrite(rawText: string, promptModeId: string): Promise<string> {
    if (!rawText.trim()) {
      return ''
    }

    const promptMode = this.promptModes.get(promptModeId) || this.promptModes.get('default')!

    if (!existsSync(this.config.modelPath)) {
      // Use mock rewriting for development
      return this.mockRewrite(rawText)
    }

    return this.runInference(rawText, promptMode.systemPrompt)
  }

  private async runInference(userInput: string, systemPrompt: string): Promise<string> {
    return new Promise((resolve, _reject) => {
      const llamaBinary = this.getLlamaBinaryPath()

      if (!existsSync(llamaBinary)) {
        // Use mock if binary not available
        resolve(this.mockRewrite(userInput))
        return
      }

      // Build the prompt in ChatML format (for Qwen models)
      const fullPrompt = this.buildPrompt(systemPrompt, userInput)

      // Build llama.cpp command arguments
      const args = [
        '-m',
        this.config.modelPath,
        '-c',
        this.config.contextSize.toString(),
        '-t',
        this.config.threads.toString(),
        '-ngl',
        this.config.gpuLayers.toString(),
        '--no-display-prompt',
        '-p',
        fullPrompt
      ]

      let output = ''
      let errorOutput = ''

      this.llamaProcess = spawn(llamaBinary, args)

      this.llamaProcess.stdout?.on('data', (data) => {
        output += data.toString()
      })

      this.llamaProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString()
      })

      this.llamaProcess.on('close', (code) => {
        if (code === 0) {
          const result = this.parseOutput(output)
          resolve(result)
        } else {
          console.error('[LLM] Llama error:', errorOutput)
          // Fall back to mock on error
          resolve(this.mockRewrite(userInput))
        }
        this.llamaProcess = null
      })

      this.llamaProcess.on('error', (error) => {
        console.error('[LLM] Process error:', error)
        resolve(this.mockRewrite(userInput))
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.llamaProcess) {
          this.llamaProcess.kill()
          resolve(this.mockRewrite(userInput))
        }
      }, 30000)
    })
  }

  private getLlamaBinaryPath(): string {
    const resourcePath = process.resourcesPath || join(__dirname, '../../resources')

    if (process.platform === 'darwin') {
      const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
      return join(resourcePath, 'bin', `llama-${arch}`)
    }

    return join(resourcePath, 'bin', 'llama')
  }

  private buildPrompt(systemPrompt: string, userInput: string): string {
    // ChatML format for Qwen models
    return `<|im_start|>system
${systemPrompt}
<|im_end|>
<|im_start|>user
${userInput}
<|im_end|>
<|im_start|>assistant
`
  }

  private parseOutput(output: string): string {
    // Remove any special tokens from output
    let result = output
      .replace(/<\|im_start\|>/g, '')
      .replace(/<\|im_end\|>/g, '')
      .replace(/<\|endoftext\|>/g, '')
      .trim()

    // Remove the assistant prefix if present
    if (result.startsWith('assistant')) {
      result = result.substring('assistant'.length).trim()
    }

    return result
  }

  private mockRewrite(rawText: string): string {
    // Mock rewriting for development when model is not available
    // Simulates filler word removal and basic cleanup

    let result = rawText

    // Remove common filler words
    const fillers = [
      'um',
      'uh',
      'like',
      'you know',
      'actually',
      'basically',
      '那個',
      '就是',
      '嗯',
      '呃',
      '然後'
    ]

    for (const filler of fillers) {
      // Use \b for ASCII fillers, plain match for CJK fillers
      const isCJK = /[\u4e00-\u9fff]/.test(filler)
      const regex = isCJK
        ? new RegExp(filler, 'g')
        : new RegExp(`\\b${filler}\\b`, 'gi')
      result = result.replace(regex, '')
    }

    // Clean up multiple spaces
    result = result.replace(/\s+/g, ' ').trim()

    // Add spacing between Chinese and English
    result = result.replace(/([\u4e00-\u9fff])([a-zA-Z])/g, '$1 $2')
    result = result.replace(/([a-zA-Z])([\u4e00-\u9fff])/g, '$1 $2')

    // Capitalize first letter
    if (result.length > 0) {
      result = result.charAt(0).toUpperCase() + result.slice(1)
    }

    return result || rawText // Return original if empty after processing
  }

  addPromptMode(mode: PromptMode): void {
    this.promptModes.set(mode.id, mode)
  }

  getPromptModes(): PromptMode[] {
    return Array.from(this.promptModes.values())
  }

  async dispose(): Promise<void> {
    if (this.llamaProcess) {
      this.llamaProcess.kill()
      this.llamaProcess = null
    }
    this._isLoaded = false
  }
}
