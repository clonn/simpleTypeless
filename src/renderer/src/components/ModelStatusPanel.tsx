import { useModelStatus } from '../hooks/useModelStatus'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

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
  const getStatusColor = () => {
    if (loaded) return '#22c55e' // green
    if (downloading) return '#eab308' // yellow
    if (exists) return '#3b82f6' // blue
    return '#ef4444' // red
  }

  const getStatusText = () => {
    if (loaded) return 'Ready'
    if (downloading) return `Downloading ${progress}%`
    if (exists) return 'Downloaded (not loaded)'
    return 'Not downloaded'
  }

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: '#1a1a2e',
        border: '1px solid #2a2a4a',
        marginBottom: '12px'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{title}</h3>
        <span
          style={{
            fontSize: '12px',
            color: getStatusColor(),
            fontWeight: 500
          }}
        >
          {getStatusText()}
        </span>
      </div>

      <p
        style={{
          margin: '0 0 12px 0',
          fontSize: '12px',
          color: '#888',
          wordBreak: 'break-all'
        }}
      >
        {modelName || 'No model configured'}
      </p>

      {downloading && (
        <div
          style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#2a2a4a',
            borderRadius: '3px',
            overflow: 'hidden',
            marginBottom: '12px'
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#3b82f6',
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      )}

      {!exists && !downloading && (
        <button
          onClick={onDownload}
          style={{
            width: '100%',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500
          }}
        >
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
      <div style={{ padding: '16px', color: '#888' }}>
        Loading model status...
      </div>
    )
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2
        style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: 600,
          color: '#fff'
        }}
      >
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
            margin: '16px 0 0 0',
            fontSize: '12px',
            color: '#888',
            textAlign: 'center'
          }}
        >
          Models will be downloaded automatically on first launch.
        </p>
      )}
    </div>
  )
}
