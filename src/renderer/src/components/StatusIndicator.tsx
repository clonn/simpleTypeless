interface StatusIndicatorProps {
  isRecording: boolean
  isProcessing: boolean
  modelStatus: {
    whisperLoaded: boolean
    llmLoaded: boolean
  }
  onToggle: () => void
}

export function StatusIndicator({
  isRecording,
  isProcessing,
  modelStatus,
  onToggle
}: StatusIndicatorProps): JSX.Element {
  const getStatusText = (): string => {
    if (isProcessing) return 'Processing...'
    if (isRecording) return 'Listening...'
    return 'Ready'
  }

  const getStatusClass = (): string => {
    if (isProcessing) return 'processing'
    if (isRecording) return 'recording'
    return 'ready'
  }

  const getAnimationClass = (): string => {
    if (isProcessing) return 'status-circle-processing'
    if (isRecording) return 'status-circle-recording'
    return 'status-circle-ready'
  }

  const modelsReady = modelStatus.whisperLoaded && modelStatus.llmLoaded

  return (
    <div className="status-indicator">
      <div className={`status-circle ${getStatusClass()} ${getAnimationClass()}`}>
        <div className="pulse" />
      </div>

      <div className="status-text">
        <h2>{getStatusText()}</h2>
        {!modelsReady && (
          <p className="model-warning">Models not loaded. Download required models to start.</p>
        )}
      </div>

      <button className="record-button" onClick={onToggle} disabled={!modelsReady || isProcessing}>
        {isRecording ? 'Stop' : 'Start'} Recording
      </button>
    </div>
  )
}
