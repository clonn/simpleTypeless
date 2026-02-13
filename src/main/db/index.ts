import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import * as schema from './schema'

let db: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (db) return db

  const dbDir = join(app.getPath('userData'), 'data')
  mkdirSync(dbDir, { recursive: true })

  const dbPath = join(dbDir, 'typeless.db')
  const sqlite = new Database(dbPath)

  // Enable WAL mode for better concurrent performance
  sqlite.pragma('journal_mode = WAL')

  db = drizzle(sqlite, { schema })
  return db
}

export function runMigrations() {
  const database = getDb()
  const migrationsFolder = join(__dirname, '../../drizzle')
  migrate(database, { migrationsFolder })
}

export { schema }
