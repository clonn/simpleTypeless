/**
 * macOS Dictation Provider
 *
 * Uses macOS native speech recognition (NSSpeechRecognizer).
 * Currently a placeholder implementation - real implementation would require Swift bridge.
 */

export class MacOSDictationProvider {
  get isLoaded(): boolean {
    return process.platform === 'darwin'
  }

  async transcribe(_audioBuffer: Float32Array): Promise<string> {
    // TODO: Implement macOS NSSpeechRecognizer integration
    // This would require:
    // 1. Write audio to temp WAV file
    // 2. Call Swift subprocess or native bridge
    // 3. Use NSSpeechRecognizer API
    // 4. Return transcribed text

    // For now, return a placeholder message
    throw new Error(
      'macOS Dictation provider is not yet implemented. ' +
      'This requires system setup and Swift integration. ' +
      'Please use Local Whisper or Cloud OpenAI instead.'
    )
  }
}
