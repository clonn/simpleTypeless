import { eq, desc, sql } from 'drizzle-orm'
import { getDb, schema } from './index'
import { randomUUID } from 'crypto'
import type { AppContext, TranscriptionResult } from '../../shared/types'

export function saveTranscription(
  result: TranscriptionResult,
  appContext?: AppContext
): string {
  const db = getDb()
  const id = randomUUID()
  const now = new Date().toISOString()

  db.insert(schema.history)
    .values({
      id,
      rawText: result.rawText,
      refinedText: result.rewrittenText,
      duration: result.duration,
      status: 'completed',
      mode: 'voice_transcript',
      focusedAppName: appContext?.appName,
      focusedAppBundleId: appContext?.bundleId,
      focusedAppWindowTitle: appContext?.windowTitle,
      focusedAppWebDomain: appContext?.webDomain,
      focusedAppWebUrl: appContext?.webUrl,
      createdAt: now,
      updatedAt: now
    })
    .run()

  return id
}

export function getHistory(limit = 50, offset = 0) {
  const db = getDb()
  return db
    .select()
    .from(schema.history)
    .orderBy(desc(schema.history.createdAt))
    .limit(limit)
    .offset(offset)
    .all()
}

export function getHistoryCount(): number {
  const db = getDb()
  const result = db.select({ value: schema.history.id }).from(schema.history).all()
  return result.length // TODO: Use SQL count() aggregate when drizzle-orm count import is available
}

export function deleteTranscription(id: string): void {
  const db = getDb()
  db.delete(schema.history).where(eq(schema.history.id, id)).run()
}

export function getStats(): {
  totalTranscriptions: number
  totalWords: number
  totalDurationSeconds: number
  averagePerDay: number
} {
  const db = getDb()

  const countResult = db.select({ value: sql<number>`count(*)` }).from(schema.history).all()
  const totalTranscriptions = countResult[0]?.value ?? 0

  if (totalTranscriptions === 0) {
    return { totalTranscriptions: 0, totalWords: 0, totalDurationSeconds: 0, averagePerDay: 0 }
  }

  const durationResult = db
    .select({ value: sql<number>`coalesce(sum(duration), 0)` })
    .from(schema.history)
    .all()
  const totalDurationSeconds = durationResult[0]?.value ?? 0

  const allTexts = db
    .select({ rawText: schema.history.rawText })
    .from(schema.history)
    .all()
  const totalWords = allTexts.reduce((sum, row) => {
    const text = row.rawText || ''
    return sum + text.split(/\s+/).filter(Boolean).length
  }, 0)

  const dateRange = db
    .select({
      minDate: sql<string>`min(created_at)`,
      maxDate: sql<string>`max(created_at)`
    })
    .from(schema.history)
    .all()

  let averagePerDay = totalTranscriptions
  if (dateRange[0]?.minDate) {
    const firstDate = new Date(dateRange[0].minDate).getTime()
    const now = Date.now()
    const days = Math.max(1, Math.ceil((now - firstDate) / (1000 * 60 * 60 * 24)))
    averagePerDay = Math.round((totalTranscriptions / days) * 10) / 10
  }

  return { totalTranscriptions, totalWords, totalDurationSeconds, averagePerDay }
}
