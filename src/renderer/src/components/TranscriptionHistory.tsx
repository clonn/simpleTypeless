import type { TranscriptionResult } from '@shared/types'

interface TranscriptionHistoryProps {
  history: TranscriptionResult[]
}

export function TranscriptionHistory({ history }: TranscriptionHistoryProps): JSX.Element {
  if (history.length === 0) {
    return (
      <div className="transcription-history empty">
        <p>No transcriptions yet. Press the hotkey to start recording.</p>
      </div>
    )
  }

  return (
    <div className="transcription-history">
      <h3>Recent Transcriptions</h3>
      <div className="history-list">
        {history.map((item, index) => (
          <div key={item.timestamp} className="history-item">
            <div className="history-header">
              <span className="timestamp">{formatTime(item.timestamp)}</span>
              <span className="duration">{item.duration.toFixed(1)}s</span>
            </div>

            <div className="history-content">
              <div className="raw-text">
                <label>Raw:</label>
                <span>{item.rawText}</span>
              </div>
              <div className="rewritten-text">
                <label>Rewritten:</label>
                <span>{item.rewrittenText}</span>
              </div>
            </div>

            <button
              className="copy-button"
              onClick={() => navigator.clipboard.writeText(item.rewrittenText)}
            >
              Copy
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}
