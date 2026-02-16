import { useState, useEffect } from 'react'

const steps = [
  {
    title: 'Welcome to Local Typeless',
    description: 'Privacy-first voice-to-text that runs entirely on your Mac.',
  },
  {
    title: 'Accessibility Permission',
    description: 'Typeless needs accessibility access to inject transcribed text into your apps and to monitor keyboard events for push-to-talk.',
    action: 'check-accessibility',
  },
  {
    title: 'Check whisper.cpp',
    description: 'Typeless uses whisper.cpp for local speech recognition with Metal GPU acceleration.',
    action: 'check-whisper',
  },
  {
    title: 'Download AI Models',
    description: 'We need to download speech recognition and text rewriting models. This is a one-time setup (~2.5 GB).',
    action: 'download-models',
  },
  {
    title: 'Grant Permissions',
    description: 'Typeless needs microphone access for speech recognition.',
    action: 'check-permissions',
  },
  {
    title: 'Ready to Go!',
    description: 'Press Cmd+Shift+Space to start dictating. Your voice will be transcribed and polished by AI.',
    action: 'finish',
  },
]

export function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0)
  const [asrStatus, setAsrStatus] = useState<{
    binaryFound: boolean
    modelFound: boolean
  } | null>(null)
  const [accessibilityGranted, setAccessibilityGranted] = useState(false)
  const step = steps[currentStep]

  useEffect(() => {
    if (step.action === 'check-whisper') {
      window.api?.getASRStatus?.().then((status: any) => {
        if (status) setAsrStatus(status)
      }).catch(() => {})
    }
  }, [step.action])

  useEffect(() => {
    if (step.action !== 'check-accessibility') return
    window.api?.checkAccessibility?.().then(setAccessibilityGranted).catch(() => {})
    const interval = setInterval(() => {
      window.api?.checkAccessibility?.().then(setAccessibilityGranted).catch(() => {})
    }, 2000)
    return () => clearInterval(interval)
  }, [step.action])

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Close onboarding
      await window.api?.completeOnboarding()
    }
  }

  const refreshWhisperStatus = () => {
    window.api?.getASRStatus?.().then((status: any) => {
      if (status) setAsrStatus(status)
    }).catch(() => {})
  }

  return (
    <div className="onboarding">
      <div className="onboarding-progress">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`onboarding-dot ${i === currentStep ? 'active' : i < currentStep ? 'completed' : ''}`}
          />
        ))}
      </div>
      <div className="onboarding-content">
        <h1>{step.title}</h1>
        <p>{step.description}</p>

        {step.action === 'check-whisper' && asrStatus && (
          <div className="whisper-check">
            <div className="check-item">
              <span className={`status-dot ${asrStatus.binaryFound ? 'ready' : 'not-ready'}`} />
              <span>{asrStatus.binaryFound ? 'whisper-cli found' : 'whisper-cli not found'}</span>
            </div>
            {!asrStatus.binaryFound && (
              <div className="install-hint">
                Install with Homebrew: <code>brew install whisper-cpp</code>
              </div>
            )}
            <div className="check-item">
              <span className={`status-dot ${asrStatus.modelFound ? 'ready' : 'not-ready'}`} />
              <span>{asrStatus.modelFound ? 'Model ready' : 'Model will be downloaded in the next step'}</span>
            </div>
            {!asrStatus.binaryFound && (
              <button className="onboarding-btn-secondary" onClick={refreshWhisperStatus}>
                Re-check
              </button>
            )}
            {asrStatus.binaryFound && asrStatus.modelFound && (
              <div className="check-success">All set! whisper.cpp is ready.</div>
            )}
          </div>
        )}

        {step.action === 'check-accessibility' && (
          <div className="whisper-check">
            <div className="check-item">
              <span className={`status-dot ${accessibilityGranted ? 'ready' : 'not-ready'}`} />
              <span>{accessibilityGranted ? 'Accessibility access granted' : 'Accessibility access needed'}</span>
            </div>
            {!accessibilityGranted && (
              <>
                <button
                  className="onboarding-btn-secondary"
                  onClick={() => window.api?.openAccessibilitySettings?.()}
                >
                  Open System Preferences
                </button>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Find &quot;Typeless&quot; in the list and toggle it on. This page will update automatically.
                </p>
              </>
            )}
            {accessibilityGranted && (
              <div className="check-success">Accessibility permission granted!</div>
            )}
          </div>
        )}
      </div>
      <button className="onboarding-btn" onClick={handleNext}>
        {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
      </button>
    </div>
  )
}
