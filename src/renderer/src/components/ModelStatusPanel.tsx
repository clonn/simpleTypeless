import { useModelStatus } from '../hooks/useModelStatus'

interface ModelCardProps {
  title: string
  modelName: string
  loaded: boolean
  exists: boolean
  downloading: boolean
  progress: number
  onDownload: () => void
}

function ModelCard({
  title,
  modelName,
  loaded,
  exists,
  downloading,
  progress,
  onDownload
}: ModelCardProps) {
  const getStatusClass = () => {
    if (loaded) return 'ready'
    if (downloading) return 'downloading'
    if (exists) return 'exists'
    return 'missing'
  }

  const getStatusText = () => {
    if (loaded) return 'Ready'
    if (downloading) return `Downloading ${progress}%`
    if (exists) return 'Downloaded (not loaded)'
    return 'Not downloaded'
  }

  return (
    <div className="model-card">
      <div className="model-card-header">
        <h3 className="model-card-title">{title}</h3>
        <span className={`model-card-status ${getStatusClass()}`}>{getStatusText()}</span>
      </div>

      <p className="model-card-name">{modelName || 'No model configured'}</p>

      {downloading && (
        <div className="model-card-progress">
          <div className="model-card-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {!exists && !downloading && (
        <button className="model-card-download-btn" onClick={onDownload}>
          Download Model
        </button>
      )}
    </div>
  )
}

export function ModelStatusPanel() {
  const { status, loading, downloadModel } = useModelStatus()

  if (loading) {
    return (
      <div className="card" style={{ color: 'var(--text-secondary)' }}>
        Loading model status...
      </div>
    )
  }

  return (
    <div>
      <h2 className="card-title" style={{ marginBottom: '16px' }}>
        AI Models
      </h2>

      <ModelCard
        title="Speech Recognition (Whisper)"
        modelName={status.whisper.modelName}
        loaded={status.whisper.loaded}
        exists={status.whisper.exists}
        downloading={status.whisper.downloading}
        progress={status.whisper.progress}
        onDownload={() => downloadModel('whisper')}
      />

      <ModelCard
        title="Text Rewriting (LLM)"
        modelName={status.llm.modelName}
        loaded={status.llm.loaded}
        exists={status.llm.exists}
        downloading={status.llm.downloading}
        progress={status.llm.progress}
        onDownload={() => downloadModel('llm')}
      />

      {(!status.whisper.exists || !status.llm.exists) && (
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginTop: '16px'
          }}
        >
          Models will be downloaded automatically on first launch.
        </p>
      )}
    </div>
  )
}
