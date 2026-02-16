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

  const modelsReady = modelStatus.whisperLoaded && modelStatus.llmLoaded

  return (
    <div className="status-indicator">
      <div className={`status-orb ${getStatusClass()}`}>
        <div className="status-orb-glow" />
        <span className="status-orb-icon">
          {isProcessing ? '\u23F3' : isRecording ? '\uD83C\uDFA4' : '\uD83C\uDF99\uFE0F'}
        </span>
      </div>

      <div className="status-label">
        <h2>{getStatusText()}</h2>
        {!modelsReady && (
          <p className="model-warning">Models not loaded. Download required models to start.</p>
        )}
      </div>

      <button className="record-btn" onClick={onToggle} disabled={!modelsReady || isProcessing}>
        <span className="record-btn-icon">{isRecording ? '\u23F9' : '\u25CF'}</span>
        {isRecording ? 'Stop' : 'Start'} Recording
      </button>
    </div>
  )
}
