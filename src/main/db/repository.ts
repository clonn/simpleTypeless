import { eq, desc } from 'drizzle-orm'
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
  const result = db.select({ count: schema.history.id }).from(schema.history).all()
  return result.length
}

export function deleteTranscription(id: string): void {
  const db = getDb()
  db.delete(schema.history).where(eq(schema.history.id, id)).run()
}
