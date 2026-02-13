/**
 * Audio Capture Module with Voice Activity Detection (VAD)
 *
 * Uses the system microphone to capture audio and Silero VAD to detect speech.
 * Implements a ring buffer to preserve pre-speech audio.
 */

// Note: In production, we would use @ricky0123/vad-node
// For now, we provide a mock implementation that can be replaced

type SpeechStartCallback = () => void
type SpeechEndCallback = (audioBuffer: Float32Array) => void

interface VADOptions {
  positiveSpeechThreshold: number
  negativeSpeechThreshold: number
  minSpeechFrames: number
  preSpeechPadFrames: number
  redemptionFrames: number
}

const DEFAULT_VAD_OPTIONS: VADOptions = {
  positiveSpeechThreshold: 0.5,
  negativeSpeechThreshold: 0.35,
  minSpeechFrames: 3,
  preSpeechPadFrames: 10, // ~320ms at 16kHz with 512 frame size
  redemptionFrames: 8 // ~256ms of silence before ending
}

const SAMPLE_RATE = 16000
const FRAME_SIZE = 512 // ~32ms per frame

export class AudioCapture {
  private _isRecording = false
  private speechStartCallback: SpeechStartCallback | null = null
  private speechEndCallback: SpeechEndCallback | null = null
  private vadOptions: VADOptions

  // Ring buffer for pre-speech audio preservation
  private ringBuffer: Float32Array[] = []
  private ringBufferIndex = 0

  // Current speech buffer
  private speechBuffer: Float32Array[] = []
  private isSpeaking = false
  private silenceFrames = 0
  private speechFrames = 0

  // Mock audio stream (in production, use portaudio or Web Audio API)
  private audioStreamInterval: NodeJS.Timeout | null = null

  constructor(options: Partial<VADOptions> = {}) {
    this.vadOptions = { ...DEFAULT_VAD_OPTIONS, ...options }
  }

  get isRecording(): boolean {
    return this._isRecording
  }

  onSpeechStart(callback: SpeechStartCallback): void {
    this.speechStartCallback = callback
  }

  onSpeechEnd(callback: SpeechEndCallback): void {
    this.speechEndCallback = callback
  }

  async start(): Promise<void> {
    if (this._isRecording) return

    this._isRecording = true
    this.resetState()

    // In production, this would initialize portaudio or system audio capture
    // For now, we simulate audio frames coming in
    console.log('[AudioCapture] Started listening...')

    // This is a placeholder - in real implementation, we would:
    // 1. Initialize portaudio with 16kHz, mono, float32
    // 2. Set up a callback for incoming audio frames
    // 3. Process each frame through VAD
    this.startAudioStream()
  }

  async stop(): Promise<void> {
    if (!this._isRecording) return

    this._isRecording = false

    if (this.audioStreamInterval) {
      clearInterval(this.audioStreamInterval)
      this.audioStreamInterval = null
    }

    // If we were in the middle of speech, finalize it
    if (this.isSpeaking && this.speechBuffer.length > 0) {
      this.finalizeSpeech()
    }

    console.log('[AudioCapture] Stopped listening')
  }

  private resetState(): void {
    this.ringBuffer = []
    this.ringBufferIndex = 0
    this.speechBuffer = []
    this.isSpeaking = false
    this.silenceFrames = 0
    this.speechFrames = 0
  }

  private startAudioStream(): void {
    // Placeholder for real audio streaming
    // In production, this would be replaced with actual microphone input

    // Simulate audio frames at 16kHz (32ms per frame = ~31.25 frames/second)
    // This is just for development/testing - real audio comes from portaudio
    this.audioStreamInterval = setInterval(() => {
      if (!this._isRecording) return

      // Generate a mock audio frame (in production, this comes from the microphone)
      const frame = new Float32Array(FRAME_SIZE)

      // Simulate some audio with occasional "speech" (random amplitude spikes)
      // This is purely for testing the VAD logic
      const hasSpeech = Math.random() > 0.7
      for (let i = 0; i < FRAME_SIZE; i++) {
        frame[i] = hasSpeech ? (Math.random() - 0.5) * 0.5 : (Math.random() - 0.5) * 0.01
      }

      this.processAudioFrame(frame)
    }, 32) // 32ms = one frame at 16kHz with 512 samples
  }

  private processAudioFrame(frame: Float32Array): void {
    // Calculate speech probability using VAD
    // In production, this uses Silero VAD ONNX model
    const speechProb = this.calculateSpeechProbability(frame)

    // Update ring buffer
    if (this.ringBuffer.length < this.vadOptions.preSpeechPadFrames) {
      this.ringBuffer.push(frame)
    } else {
      this.ringBuffer[this.ringBufferIndex] = frame
      this.ringBufferIndex = (this.ringBufferIndex + 1) % this.vadOptions.preSpeechPadFrames
    }

    // VAD state machine
    if (!this.isSpeaking) {
      // Not currently in speech
      if (speechProb >= this.vadOptions.positiveSpeechThreshold) {
        this.speechFrames++

        if (this.speechFrames >= this.vadOptions.minSpeechFrames) {
          // Speech confirmed - start recording
          this.isSpeaking = true
          this.silenceFrames = 0

          // Copy ring buffer to speech buffer (pre-speech audio)
          this.speechBuffer = this.getOrderedRingBuffer()

          this.speechStartCallback?.()
        }
      } else {
        this.speechFrames = 0
      }
    } else {
      // Currently in speech
      this.speechBuffer.push(frame)

      if (speechProb < this.vadOptions.negativeSpeechThreshold) {
        this.silenceFrames++

        if (this.silenceFrames >= this.vadOptions.redemptionFrames) {
          // Speech ended
          this.finalizeSpeech()
        }
      } else {
        this.silenceFrames = 0
      }
    }
  }

  private calculateSpeechProbability(frame: Float32Array): number {
    // Placeholder for Silero VAD inference
    // In production, this runs the Silero VAD ONNX model
    // For now, use simple energy-based detection

    let energy = 0
    for (let i = 0; i < frame.length; i++) {
      energy += frame[i] * frame[i]
    }
    energy = Math.sqrt(energy / frame.length)

    // Convert energy to probability-like value
    // Threshold tuned for typical speech levels
    const threshold = 0.02
    return Math.min(energy / threshold, 1.0)
  }

  private getOrderedRingBuffer(): Float32Array[] {
    const ordered: Float32Array[] = []

    // Reorder ring buffer to chronological order
    for (let i = 0; i < this.ringBuffer.length; i++) {
      const idx = (this.ringBufferIndex + i) % this.ringBuffer.length
      ordered.push(this.ringBuffer[idx])
    }

    return ordered
  }

  private finalizeSpeech(): void {
    if (this.speechBuffer.length === 0) {
      this.resetSpeechState()
      return
    }

    // Concatenate all frames into single buffer
    const totalLength = this.speechBuffer.reduce((acc, frame) => acc + frame.length, 0)
    const audioBuffer = new Float32Array(totalLength)

    let offset = 0
    for (const frame of this.speechBuffer) {
      audioBuffer.set(frame, offset)
      offset += frame.length
    }

    // Filter out very short utterances (< 200ms)
    const minSamples = SAMPLE_RATE * 0.2
    if (audioBuffer.length >= minSamples) {
      this.speechEndCallback?.(audioBuffer)
    }

    this.resetSpeechState()
  }

  private resetSpeechState(): void {
    this.speechBuffer = []
    this.isSpeaking = false
    this.silenceFrames = 0
    this.speechFrames = 0
  }
}
