import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

// History items can come from the DB (with refinedText/createdAt/id)
// or from in-memory TranscriptionResult (with rewrittenText/timestamp).
// This interface covers both shapes.
interface HistoryItem {
  id?: string
  rawText: string
  rewrittenText?: string
  refinedText?: string | null
  timestamp?: number
  createdAt?: string | null
  duration: number
}

interface TranscriptionHistoryProps {
  history: HistoryItem[]
  onHistoryUpdate?: (updated: HistoryItem[]) => void
}

/** Get the display text (refined or rewritten) for an item */
function getDisplayText(item: HistoryItem): string {
  return item.refinedText ?? item.rewrittenText ?? ''
}

/** Get a timestamp value suitable for formatting */
function getTimestamp(item: HistoryItem): number {
  if (item.timestamp) return item.timestamp
  if (item.createdAt) return new Date(item.createdAt).getTime()
  return Date.now()
}

export function TranscriptionHistory({
  history,
  onHistoryUpdate
}: TranscriptionHistoryProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: history.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5
  })

  if (history.length === 0) {
    return (
      <div className="transcription-history empty">
        <p>No transcriptions yet. Press the hotkey to start recording.</p>
      </div>
    )
  }

  const handleDelete = async (item: HistoryItem): Promise<void> => {
    if (!item.id || !window.api?.deleteHistory) return
    await window.api.deleteHistory(item.id)
    if (onHistoryUpdate && window.api?.getHistory) {
      const updated = await window.api.getHistory(50)
      onHistoryUpdate(updated)
    }
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
            position: 'relative'
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = history[virtualItem.index]
            const displayText = getDisplayText(item)
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`
                }}
                ref={virtualizer.measureElement}
                data-index={virtualItem.index}
              >
                <div className="history-item">
                  <div className="history-header">
                    <span className="timestamp">{formatTime(getTimestamp(item))}</span>
                    <span className="duration">
                      {item.duration != null ? item.duration.toFixed(1) : '0.0'}s
                    </span>
                  </div>

                  <div className="history-content">
                    <div className="raw-text">
                      <label>Raw:</label>
                      <span>{item.rawText}</span>
                    </div>
                    <div className="rewritten-text">
                      <label>Rewritten:</label>
                      <span>{displayText}</span>
                    </div>
                  </div>

                  <div className="history-actions">
                    <button
                      className="copy-button"
                      onClick={() => navigator.clipboard.writeText(displayText)}
                    >
                      Copy
                    </button>
                    {item.id && (
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(item)}
                        title="Delete"
                      >
                        ✕
                      </button>
                    )}
                  </div>
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
