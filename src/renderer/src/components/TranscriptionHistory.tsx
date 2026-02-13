import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { TranscriptionResult } from '@shared/types'

interface TranscriptionHistoryProps {
  history: TranscriptionResult[]
}

export function TranscriptionHistory({ history }: TranscriptionHistoryProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: history.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

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
      <div
        ref={parentRef}
        className="history-list"
        style={{ height: '400px', overflow: 'auto' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = history[virtualItem.index]
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                ref={virtualizer.measureElement}
                data-index={virtualItem.index}
              >
                <div className="history-item">
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
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}
