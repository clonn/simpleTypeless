/**
 * ASR Provider Factory
 *
 * Creates the appropriate ASR provider based on user settings.
 */

import { ASRProvider, CloudAPIConfig } from '../../shared/types'
import { ASREngine } from './engine'
import { CloudOpenAIProvider } from './providers/cloudOpenAIProvider'
import { MacOSDictationProvider } from './providers/macOSDictationProvider'

export interface ASRProviderInterface {
  transcribe(audioBuffer: Float32Array): Promise<string>
  initialize?(): Promise<void>
  dispose?(): Promise<void>
  setLanguage?(language: string): void
  get isLoaded(): boolean
}

export function createASRProvider(
  provider: ASRProvider,
  cloudConfig?: CloudAPIConfig
): ASRProviderInterface {
  switch (provider) {
    case 'cloud-openai':
      if (!cloudConfig?.openaiApiKey) {
        throw new Error('OpenAI API key required for Cloud OpenAI provider')
      }
      return new CloudOpenAIProvider(cloudConfig.openaiApiKey)

    case 'macos-dictation':
      return new MacOSDictationProvider()

    case 'local-whisper':
    default:
      return new ASREngine()
  }
}
