import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioCapture } from './capture'

describe('AudioCapture', () => {
  let capture: AudioCapture

  beforeEach(() => {
    capture = new AudioCapture()
  })

  afterEach(async () => {
    await capture.stop()
  })

  describe('isRecording state', () => {
    it('should start with isRecording = false', () => {
      expect(capture.isRecording).toBe(false)
    })

    it('should set isRecording to true when started', async () => {
      await capture.start()
      expect(capture.isRecording).toBe(true)
    })

    it('should set isRecording to false when stopped', async () => {
      await capture.start()
      await capture.stop()
      expect(capture.isRecording).toBe(false)
    })

    it('should not change state if start is called twice', async () => {
      await capture.start()
      await capture.start()
      expect(capture.isRecording).toBe(true)
    })

    it('should not change state if stop is called twice', async () => {
      await capture.start()
      await capture.stop()
      await capture.stop()
      expect(capture.isRecording).toBe(false)
    })
  })

  describe('calculateSpeechProbability', () => {
    it('should return low probability for silence', async () => {
      const silenceFrame = new Float32Array(512).fill(0)
      await capture.start()

      // Access private method through reflection for testing
      const probability = (capture as any).calculateSpeechProbability(silenceFrame)

      expect(probability).toBeLessThan(0.3)
    })

    it('should return high probability for loud audio', async () => {
      const loudFrame = new Float32Array(512).fill(0.5)
      await capture.start()

      const probability = (capture as any).calculateSpeechProbability(loudFrame)

      expect(probability).toBeGreaterThan(0.5)
    })

    it('should return probability between 0 and 1', async () => {
      const randomFrame = new Float32Array(512)
      for (let i = 0; i < 512; i++) {
        randomFrame[i] = Math.random() - 0.5
      }
      await capture.start()

      const probability = (capture as any).calculateSpeechProbability(randomFrame)

      expect(probability).toBeGreaterThanOrEqual(0)
      expect(probability).toBeLessThanOrEqual(1)
    })
  })

  describe('VAD state machine', () => {
    it('should not trigger speech for silence frames', (done) => {
      const speechStartCallback = vi.fn()
      capture.onSpeechStart(speechStartCallback)

      capture.start()

      // Simulate several silence frames
      for (let i = 0; i < 10; i++) {
        const silenceFrame = new Float32Array(512).fill(0)
        ;(capture as any).processAudioFrame(silenceFrame)
      }

      setTimeout(() => {
        expect(speechStartCallback).not.toHaveBeenCalled()
        done()
      }, 100)
    })

    it('should trigger speech detection after minSpeechFrames of loud audio', (done) => {
      const speechStartCallback = vi.fn()
      capture.onSpeechStart(speechStartCallback)

      const vadOptions = {
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.35,
        minSpeechFrames: 3,
        preSpeechPadFrames: 10,
        redemptionFrames: 8
      }

      capture = new AudioCapture(vadOptions)
      capture.onSpeechStart(speechStartCallback)
      capture.start()

      // Simulate minSpeechFrames (3) of loud audio
      for (let i = 0; i < 3; i++) {
        const loudFrame = new Float32Array(512).fill(0.5)
        ;(capture as any).processAudioFrame(loudFrame)
      }

      setTimeout(() => {
        expect(speechStartCallback).toHaveBeenCalledTimes(1)
        done()
      }, 100)
    })

    it('should trigger speech end after redemptionFrames of silence', (done) => {
      const speechStartCallback = vi.fn()
      const speechEndCallback = vi.fn()

      const vadOptions = {
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.35,
        minSpeechFrames: 3,
        preSpeechPadFrames: 10,
        redemptionFrames: 8
      }

      capture = new AudioCapture(vadOptions)
      capture.onSpeechStart(speechStartCallback)
      capture.onSpeechEnd(speechEndCallback)
      capture.start()

      // Start speech
      for (let i = 0; i < 3; i++) {
        const loudFrame = new Float32Array(512).fill(0.5)
        ;(capture as any).processAudioFrame(loudFrame)
      }

      // Add some speech frames
      for (let i = 0; i < 5; i++) {
        const loudFrame = new Float32Array(512).fill(0.5)
        ;(capture as any).processAudioFrame(loudFrame)
      }

      // End with redemptionFrames (8) of silence
      for (let i = 0; i < 8; i++) {
        const silenceFrame = new Float32Array(512).fill(0)
        ;(capture as any).processAudioFrame(silenceFrame)
      }

      setTimeout(() => {
        expect(speechEndCallback).toHaveBeenCalledTimes(1)
        expect(speechEndCallback).toHaveBeenCalledWith(expect.any(Float32Array))
        done()
      }, 100)
    })

    it('should not end speech if loud audio interrupts silence', (done) => {
      const speechEndCallback = vi.fn()

      const vadOptions = {
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.35,
        minSpeechFrames: 3,
        preSpeechPadFrames: 10,
        redemptionFrames: 8
      }

      capture = new AudioCapture(vadOptions)
      capture.onSpeechEnd(speechEndCallback)
      capture.start()

      // Start speech
      for (let i = 0; i < 3; i++) {
        const loudFrame = new Float32Array(512).fill(0.5)
        ;(capture as any).processAudioFrame(loudFrame)
      }

      // Add some silence (but not enough)
      for (let i = 0; i < 5; i++) {
        const silenceFrame = new Float32Array(512).fill(0)
        ;(capture as any).processAudioFrame(silenceFrame)
      }

      // Interrupt with loud audio
      const loudFrame = new Float32Array(512).fill(0.5)
      ;(capture as any).processAudioFrame(loudFrame)

      setTimeout(() => {
        expect(speechEndCallback).not.toHaveBeenCalled()
        done()
      }, 100)
    })
  })

  describe('finalizeSpeech', () => {
    it('should concatenate frames correctly', (done) => {
      const speechEndCallback = vi.fn()

      const vadOptions = {
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.35,
        minSpeechFrames: 3,
        preSpeechPadFrames: 10,
        redemptionFrames: 8
      }

      capture = new AudioCapture(vadOptions)
      capture.onSpeechEnd(speechEndCallback)
      capture.start()

      // Start speech
      for (let i = 0; i < 3; i++) {
        const loudFrame = new Float32Array(512).fill(0.5)
        ;(capture as any).processAudioFrame(loudFrame)
      }

      // Add more speech frames
      for (let i = 0; i < 10; i++) {
        const loudFrame = new Float32Array(512).fill(0.3)
        ;(capture as any).processAudioFrame(loudFrame)
      }

      // End speech
      for (let i = 0; i < 8; i++) {
        const silenceFrame = new Float32Array(512).fill(0)
        ;(capture as any).processAudioFrame(silenceFrame)
      }

      setTimeout(() => {
        expect(speechEndCallback).toHaveBeenCalled()
        const audioBuffer = speechEndCallback.mock.calls[0][0]
        // Should have pre-speech pad + speech frames + silence frames
        // Pre-speech: 10 frames, speech start: 3 frames, speech: 10 frames, silence: 8 frames
        expect(audioBuffer.length).toBeGreaterThan(512 * 10)
        done()
      }, 100)
    })

    it('should filter out short utterances less than 200ms', (done) => {
      const speechEndCallback = vi.fn()

      const vadOptions = {
        positiveSpeechThreshold: 0.5,
        negativeSpeechThreshold: 0.35,
        minSpeechFrames: 3,
        preSpeechPadFrames: 2, // Small pre-speech
        redemptionFrames: 8
      }

      capture = new AudioCapture(vadOptions)
      capture.onSpeechEnd(speechEndCallback)
      capture.start()

      // Very short speech (less than 200ms = 3200 samples at 16kHz)
      for (let i = 0; i < 3; i++) {
        const loudFrame = new Float32Array(512).fill(0.5)
        ;(capture as any).processAudioFrame(loudFrame)
      }

      // End immediately
      for (let i = 0; i < 8; i++) {
        const silenceFrame = new Float32Array(512).fill(0)
        ;(capture as any).processAudioFrame(silenceFrame)
      }

      setTimeout(() => {
        // Should be filtered out (too short)
        expect(speechEndCallback).not.toHaveBeenCalled()
        done()
      }, 100)
    })
  })

  describe('ring buffer ordering', () => {
    it('should preserve chronological order in ring buffer', () => {
      capture.start()

      const frames = []
      // Add more frames than buffer size to test wrap-around
      for (let i = 0; i < 15; i++) {
        const frame = new Float32Array(512).fill(i)
        frames.push(frame)
        ;(capture as any).processAudioFrame(frame)
      }

      const orderedBuffer = (capture as any).getOrderedRingBuffer()

      // With preSpeechPadFrames = 10, we should have the last 10 frames
      expect(orderedBuffer.length).toBe(10)

      // Verify chronological order (frames 5-14)
      for (let i = 0; i < 10; i++) {
        expect(orderedBuffer[i][0]).toBe(5 + i)
      }
    })
  })
})
