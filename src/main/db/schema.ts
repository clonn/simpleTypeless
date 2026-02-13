import { sqliteTable, text, real, integer, blob, index, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const history = sqliteTable('history', {
  id: text('id').primaryKey().notNull(),
  refinedText: text('refined_text'),
  rawText: text('raw_text'),
  editedText: text('edited_text'),
  audio: blob('audio'),
  audioLocalPath: text('audio_local_path'),
  duration: real('duration'),
  status: text('status'),
  mode: text('mode').notNull().default('voice_transcript'),
  appVersion: text('app_version').notNull().default('0.1.0'),
  // Language
  detectedLanguage: text('detected_language'),
  // Application context
  focusedAppName: text('focused_app_name'),
  focusedAppBundleId: text('focused_app_bundle_id'),
  focusedAppWindowTitle: text('focused_app_window_title'),
  focusedAppWebDomain: text('focused_app_window_web_domain'),
  focusedAppWebUrl: text('focused_app_window_web_url'),
  // Device
  micDevice: text('mic_device'),
  // Timestamps
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
}, (table) => [
  uniqueIndex('history_id_unique').on(table.id),
  index('idx_history_status').on(table.status),
  index('idx_history_created_at').on(table.createdAt),
  index('idx_history_app_name_created_at').on(table.focusedAppName, table.createdAt),
  index('idx_history_detected_language').on(table.detectedLanguage),
])
