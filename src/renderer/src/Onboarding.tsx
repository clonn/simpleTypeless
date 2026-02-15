import { useState } from 'react'

const steps = [
  {
    title: 'Welcome to Local Typeless',
    description: 'Privacy-first voice-to-text that runs entirely on your Mac.',
  },
  {
    title: 'Download AI Models',
    description: 'We need to download speech recognition and text rewriting models. This is a one-time setup (~2.5 GB).',
    action: 'download-models',
  },
  {
    title: 'Grant Permissions',
    description: 'Typeless needs microphone access for speech recognition and accessibility access for text injection.',
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
  const step = steps[currentStep]

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Close onboarding
      await window.api?.completeOnboarding()
    }
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
      </div>
      <button className="onboarding-btn" onClick={handleNext}>
        {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
      </button>
    </div>
  )
}
