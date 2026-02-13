# Typeless-Inspired Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the key features and patterns from Typeless.app that are missing in project_typeless, organized by phase from highest to lowest impact.

**Architecture:** Five-phase improvement plan: (1) core experience polish, (2) database persistence with Drizzle ORM + better-sqlite3, (3) Opus audio encoding via Worker Thread, (4) UI/UX expansion with sidebar and onboarding windows, (5) production hardening. Each phase builds on the previous and can be shipped independently.

**Tech Stack:** Electron 28+, React 18, TypeScript, better-sqlite3, Drizzle ORM, koffi (FFI), Opus encoder, @tanstack/react-virtual, notistack

---

## Phase 1: Core Experience Polish

### Task 1: Add Audio Feedback (record-start/end sounds)

**Files:**
- Create: `resources/sounds/record-start.wav`
- Create: `resources/sounds/record-end.wav`
- Modify: `src/main/index.ts:206-218` (startRecording/stopRecording)
- Modify: `src/shared/types.ts` (add sound setting)

**Step 1: Create or source WAV sound files**

Place short notification sounds in `resources/sounds/`:
- `record-start.wav` — a short "ding" or "boop" (< 100ms)
- `record-end.wav` — a short "click" or descending tone (< 100ms)

You can generate them with a tool like `sox` or download royalty-free clips.

```bash
# Generate simple tones with sox (if available)
# Or download from freesound.org
mkdir -p resources/sounds
```

**Step 2: Add sound playback to main process**

In `src/main/index.ts`, add a helper function and play sounds in startRecording/stopRecording:

```typescript
import { join } from 'path'

function playSound(name: 'record-start' | 'record-end'): void {
  const soundPath = join(__dirname, '../../resources/sounds', `${name}.wav`)
  // Play via renderer to use Web Audio API
  mainWindow?.webContents.send('play-sound', soundPath)
  floatingWidget?.webContents.send('play-sound', soundPath)
}
```

Update `startRecording()`:
```typescript
async function startRecording(): Promise<void> {
  if (!audioCapture) return
  playSound('record-start')
  await audioCapture.start()
  // ...existing code
}
```

Update `stopRecording()`:
```typescript
async function stopRecording(): Promise<void> {
  if (!audioCapture) return
  playSound('record-end')
  await audioCapture.stop()
}
```

**Step 3: Add sound playback to preload and renderer**

In `src/preload/index.ts`, add listener:
```typescript
ipcRenderer.on('play-sound', (_event, soundPath: string) => {
  const audio = new Audio(`file://${soundPath}`)
  audio.volume = 0.5
  audio.play().catch(() => {}) // ignore errors silently
})
```

**Step 4: Add setting to disable sounds**

In `src/shared/types.ts`, add to `AppSettings`:
```typescript
enableSounds: boolean  // default: true
```

Update `DEFAULT_SETTINGS`:
```typescript
enableSounds: true
```

Guard `playSound()` with settings check:
```typescript
function playSound(name: 'record-start' | 'record-end'): void {
  if (!settings.enableSounds) return
  // ...existing
}
```

**Step 5: Commit**

```bash
git add resources/sounds/ src/main/index.ts src/shared/types.ts src/preload/index.ts
git commit -m "feat: add audio feedback sounds for recording start/stop"
```

---

### Task 2: Collect Application Context on Text Injection

**Files:**
- Modify: `src/main/injector/injector.ts` (add context collection)
- Modify: `src/shared/types.ts` (add AppContext type)
- Modify: `src/main/index.ts:164-199` (pass context to transcription result)

**Step 1: Define AppContext type**

In `src/shared/types.ts`, add:

```typescript
export interface AppContext {
  appName: string
  bundleId: string
  windowTitle: string
  webTitle?: string
  webDomain?: string
  webUrl?: string
}
```

Add `appContext` to `TranscriptionResult`:
```typescript
export interface TranscriptionResult {
  rawText: string
  rewrittenText: string
  timestamp: number
  duration: number
  appContext?: AppContext  // NEW
}
```

**Step 2: Add context collection to TextInjector**

In `src/main/injector/injector.ts`, add method:

```typescript
async getAppContext(): Promise<AppContext> {
  const appName = await this.getActiveApplicationName()
  const windowTitle = await this.getActiveWindowTitle()

  // Get bundle ID via AppleScript
  let bundleId = ''
  try {
    const { stdout } = await execAsync(
      `osascript -e 'tell application "System Events" to get bundle identifier of first process whose frontmost is true'`
    )
    bundleId = stdout.trim()
  } catch { /* ignore */ }

  // Detect web content for browsers
  const browserBundleIds = [
    'com.apple.Safari',
    'com.google.Chrome',
    'company.thebrowser.Browser', // Arc
    'org.mozilla.firefox'
  ]

  let webTitle: string | undefined
  let webDomain: string | undefined
  let webUrl: string | undefined

  if (browserBundleIds.includes(bundleId)) {
    try {
      // Try to get URL from browser via AppleScript
      const browserName = appName
      const { stdout: urlOut } = await execAsync(
        `osascript -e 'tell application "${browserName}" to get URL of active tab of front window'`
      )
      webUrl = urlOut.trim()
      if (webUrl) {
        const url = new URL(webUrl)
        webDomain = url.hostname
      }
      const { stdout: titleOut } = await execAsync(
        `osascript -e 'tell application "${browserName}" to get name of active tab of front window'`
      )
      webTitle = titleOut.trim()
    } catch { /* ignore - not all browsers support this */ }
  }

  return { appName, bundleId, windowTitle, webTitle, webDomain, webUrl }
}
```

**Step 3: Integrate context into pipeline**

In `src/main/index.ts`, in the `onSpeechEnd` callback (around line 171):

```typescript
// Before injection, collect context
const appContext = await textInjector!.getAppContext()

// Step 3: Inject text
if (settings.autoInject) {
  await textInjector!.inject(rewrittenText)
}

broadcastToRenderers(IPC_CHANNELS.TRANSCRIPTION_COMPLETE, {
  rawText,
  rewrittenText,
  timestamp: Date.now(),
  duration: audioBuffer.length / 16000,
  appContext  // NEW
})
```

**Step 4: Commit**

```bash
git add src/shared/types.ts src/main/injector/injector.ts src/main/index.ts
git commit -m "feat: collect application context (app name, bundle ID, web URL) on injection"
```

---

### Task 3: Improve StatusIndicator with Typeless-Style Animations

**Files:**
- Modify: `src/renderer/src/styles/global.css` (enhanced animations)
- Modify: `src/renderer/src/components/StatusIndicator.tsx` (refined states)

**Step 1: Add enhanced CSS animations**

Add to `global.css`:

```css
/* Enhanced pulse animation matching Typeless */
@keyframes pulse-recording {
  0% { box-shadow: 0 0 0 0 rgba(233, 69, 96, 0.7); }
  50% { box-shadow: 0 0 0 20px rgba(233, 69, 96, 0); }
  100% { box-shadow: 0 0 0 0 rgba(233, 69, 96, 0); }
}

@keyframes pulse-processing {
  0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
  50% { box-shadow: 0 0 0 20px rgba(255, 193, 7, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
}

.status-circle-recording {
  background: var(--accent);
  animation: pulse-recording 2s ease-in-out infinite;
}

.status-circle-processing {
  background: var(--warning);
  animation: pulse-processing 2s ease-in-out infinite;
}

.status-circle-ready {
  background: var(--success);
  transition: background 0.3s ease;
}
```

**Step 2: Update StatusIndicator component**

Update `StatusIndicator.tsx` to use the new CSS classes:

```tsx
const circleClass = state.isRecording
  ? 'status-circle status-circle-recording'
  : state.isProcessing
    ? 'status-circle status-circle-processing'
    : 'status-circle status-circle-ready'
```

**Step 3: Commit**

```bash
git add src/renderer/src/styles/global.css src/renderer/src/components/StatusIndicator.tsx
git commit -m "feat: enhance status indicator with Typeless-style pulse animations"
```

---

## Phase 2: Database Persistence

### Task 4: Install better-sqlite3 + Drizzle ORM

**Files:**
- Modify: `package.json` (add dependencies)
- Create: `src/main/db/schema.ts` (Drizzle schema)
- Create: `src/main/db/index.ts` (DB connection)

**Step 1: Install dependencies**

```bash
cd /Users/caesarchi/workspace/cympotek/project_typeless
npm install better-sqlite3 drizzle-orm
npm install -D drizzle-kit @types/better-sqlite3
```

**Step 2: Create database schema**

Create `src/main/db/schema.ts`:

```typescript
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
```

**Step 3: Create database connection**

Create `src/main/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3'
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

export { schema }
```

**Step 4: Create Drizzle config**

Create `drizzle.config.ts` in project root:

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/main/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
})
```

**Step 5: Generate initial migration**

```bash
npx drizzle-kit generate
```

**Step 6: Add migration runner**

Add to `src/main/db/index.ts`:

```typescript
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { join } from 'path'

export function runMigrations() {
  const database = getDb()
  const migrationsFolder = join(__dirname, '../../drizzle')
  migrate(database, { migrationsFolder })
}
```

**Step 7: Commit**

```bash
git add package.json package-lock.json src/main/db/ drizzle.config.ts drizzle/
git commit -m "feat: add better-sqlite3 + Drizzle ORM with history schema"
```

---

### Task 5: Integrate Database into Pipeline

**Files:**
- Modify: `src/main/index.ts` (save transcriptions to DB)
- Create: `src/main/db/repository.ts` (data access layer)
- Modify: `src/shared/types.ts` (add IPC channels for history)
- Modify: `src/preload/index.ts` (expose history API)

**Step 1: Create repository layer**

Create `src/main/db/repository.ts`:

```typescript
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

  db.insert(schema.history).values({
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
    updatedAt: now,
  }).run()

  return id
}

export function getHistory(limit = 50, offset = 0) {
  const db = getDb()
  return db.select()
    .from(schema.history)
    .orderBy(desc(schema.history.createdAt))
    .limit(limit)
    .offset(offset)
    .all()
}

export function getHistoryCount(): number {
  const db = getDb()
  const result = db.select({ count: schema.history.id })
    .from(schema.history)
    .all()
  return result.length
}

export function deleteTranscription(id: string): void {
  const db = getDb()
  db.delete(schema.history)
    .where(eq(schema.history.id, id))
    .run()
}
```

**Step 2: Add IPC channels for history**

In `src/shared/types.ts`, add to `IPC_CHANNELS`:

```typescript
GET_HISTORY: 'history:get',
DELETE_HISTORY: 'history:delete',
GET_HISTORY_COUNT: 'history:count',
```

**Step 3: Wire up IPC handlers**

In `src/main/index.ts`, add to `setupIPC()`:

```typescript
import { runMigrations } from './db/index'
import { saveTranscription, getHistory, deleteTranscription, getHistoryCount } from './db/repository'

// In setupIPC():
ipcMain.handle(IPC_CHANNELS.GET_HISTORY, (_, limit?: number, offset?: number) => {
  return getHistory(limit, offset)
})

ipcMain.handle(IPC_CHANNELS.DELETE_HISTORY, (_, id: string) => {
  deleteTranscription(id)
})

ipcMain.handle(IPC_CHANNELS.GET_HISTORY_COUNT, () => {
  return getHistoryCount()
})
```

In the `onSpeechEnd` callback, after broadcasting TRANSCRIPTION_COMPLETE:

```typescript
// Save to database
saveTranscription(
  { rawText, rewrittenText, timestamp: Date.now(), duration: audioBuffer.length / 16000 },
  appContext
)
```

Call `runMigrations()` in `app.whenReady()`:

```typescript
app.whenReady().then(async () => {
  // Run DB migrations first
  runMigrations()
  // ...existing code
})
```

**Step 4: Expose history API in preload**

In `src/preload/index.ts`, add:

```typescript
getHistory: (limit?: number, offset?: number) =>
  ipcRenderer.invoke(IPC_CHANNELS.GET_HISTORY, limit, offset),
deleteHistory: (id: string) =>
  ipcRenderer.invoke(IPC_CHANNELS.DELETE_HISTORY, id),
getHistoryCount: () =>
  ipcRenderer.invoke(IPC_CHANNELS.GET_HISTORY_COUNT),
```

**Step 5: Commit**

```bash
git add src/main/db/ src/main/index.ts src/shared/types.ts src/preload/index.ts
git commit -m "feat: integrate database persistence for transcription history"
```

---

### Task 6: Update TranscriptionHistory to Use Database

**Files:**
- Modify: `src/renderer/src/App.tsx` (load from DB instead of in-memory)
- Modify: `src/renderer/src/components/TranscriptionHistory.tsx` (pagination + DB)

**Step 1: Update App.tsx to load from database**

Replace in-memory history with DB queries:

```typescript
// Replace useState for history:
const [history, setHistory] = useState<any[]>([])

// Load history on mount
useEffect(() => {
  window.api.getHistory(50).then(setHistory)
}, [])

// On new transcription, reload from DB
useEffect(() => {
  const unsub = window.api.onTranscriptionComplete(() => {
    window.api.getHistory(50).then(setHistory)
  })
  return unsub
}, [])
```

**Step 2: Add delete button to TranscriptionHistory**

```tsx
<button
  className="delete-btn"
  onClick={async () => {
    await window.api.deleteHistory(item.id)
    const updated = await window.api.getHistory(50)
    onHistoryUpdate(updated)
  }}
  title="Delete"
>
  ✕
</button>
```

**Step 3: Commit**

```bash
git add src/renderer/src/App.tsx src/renderer/src/components/TranscriptionHistory.tsx
git commit -m "feat: load transcription history from database with delete support"
```

---

## Phase 3: Notification System + Virtual Scrolling

### Task 7: Add notistack Notification System

**Files:**
- Modify: `package.json` (add notistack)
- Modify: `src/renderer/src/main.tsx` (wrap with SnackbarProvider)
- Modify: `src/renderer/src/App.tsx` (use notifications)

**Step 1: Install notistack**

```bash
npm install notistack
```

**Step 2: Wrap app with SnackbarProvider**

In `src/renderer/src/main.tsx`:

```tsx
import { SnackbarProvider } from 'notistack'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      autoHideDuration={3000}
    >
      <App />
    </SnackbarProvider>
  </React.StrictMode>
)
```

**Step 3: Use notifications for key events**

In `App.tsx`, add notifications for:
- Model download complete
- Transcription complete (with copy action)
- Errors

```tsx
import { useSnackbar } from 'notistack'

function App() {
  const { enqueueSnackbar } = useSnackbar()

  useEffect(() => {
    const unsub = window.api.onTranscriptionComplete((result) => {
      enqueueSnackbar('Transcription complete', { variant: 'success' })
      // ...existing code
    })
    return unsub
  }, [])

  // Model download progress
  useEffect(() => {
    const unsub = window.api.onModelDownloadProgress((state) => {
      if (state.status === 'complete') {
        enqueueSnackbar(`${state.modelType} model downloaded`, { variant: 'success' })
      } else if (state.status === 'error') {
        enqueueSnackbar(`Download failed: ${state.error}`, { variant: 'error' })
      }
    })
    return unsub
  }, [])
}
```

**Step 4: Commit**

```bash
git add package.json package-lock.json src/renderer/src/main.tsx src/renderer/src/App.tsx
git commit -m "feat: add notistack notification system for key events"
```

---

### Task 8: Add Virtual Scrolling to TranscriptionHistory

**Files:**
- Modify: `package.json` (add @tanstack/react-virtual — already in deps)
- Modify: `src/renderer/src/components/TranscriptionHistory.tsx`

**Step 1: Implement virtual scrolling**

Update `TranscriptionHistory.tsx`:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

export function TranscriptionHistory({ history }: { history: any[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: history.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // estimated item height
    overscan: 5,
  })

  if (history.length === 0) {
    return <div className="history-empty">No transcriptions yet</div>
  }

  return (
    <div
      ref={parentRef}
      className="history-container"
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
              {/* existing item rendering */}
              <div className="history-item">
                <div className="history-meta">
                  <span>{new Date(item.createdAt || item.timestamp).toLocaleString()}</span>
                  {item.duration && <span>{item.duration.toFixed(1)}s</span>}
                </div>
                <div className="history-raw">{item.rawText}</div>
                <div className="history-rewritten">{item.refinedText || item.rewrittenText}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/src/components/TranscriptionHistory.tsx
git commit -m "feat: add virtual scrolling to transcription history for performance"
```

---

## Phase 4: Opus Audio Encoding (Worker Thread + FFI)

### Task 9: Set Up Opus Worker Thread

**Files:**
- Create: `src/main/audio/opusWorker.ts` (Worker Thread for encoding)
- Create: `src/main/audio/opusEncoder.ts` (Manager that communicates with worker)
- Modify: `src/main/index.ts` (integrate Opus encoding into pipeline)

**Step 1: Create Opus encoder wrapper**

Create `src/main/audio/opusEncoder.ts`:

```typescript
import { Worker } from 'worker_threads'
import { join } from 'path'
import { app } from 'electron'
import { mkdirSync } from 'fs'

export class OpusEncoder {
  private worker: Worker | null = null
  private recordingsDir: string

  constructor() {
    this.recordingsDir = join(app.getPath('userData'), 'recordings')
    mkdirSync(this.recordingsDir, { recursive: true })
  }

  async encode(audioBuffer: Float32Array, filename: string): Promise<string> {
    const outputPath = join(this.recordingsDir, `${filename}.ogg`)

    return new Promise((resolve, reject) => {
      const workerPath = join(__dirname, 'worker/opusWorker.js')

      this.worker = new Worker(workerPath, {
        workerData: {
          audioBuffer: audioBuffer.buffer,
          outputPath,
          sampleRate: 16000,
          channels: 1,
        }
      })

      this.worker.on('message', (msg) => {
        if (msg.type === 'done') {
          resolve(outputPath)
        } else if (msg.type === 'error') {
          reject(new Error(msg.error))
        }
      })

      this.worker.on('error', reject)
    })
  }

  destroy(): void {
    this.worker?.terminate()
    this.worker = null
  }
}
```

**Step 2: Create Worker Thread**

Create `src/main/audio/opusWorker.ts`:

```typescript
import { parentPort, workerData } from 'worker_threads'
import { writeFileSync } from 'fs'

// For now, save as WAV. Opus FFI integration is a future enhancement
// that requires compiling libopusenc for the target platform.
// This worker thread pattern is set up to swap in Opus later.
const { audioBuffer, outputPath, sampleRate, channels } = workerData

try {
  const buffer = Buffer.from(audioBuffer)
  const float32 = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4)

  // Convert Float32 to 16-bit PCM
  const pcmData = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
  }

  // Write WAV file (Opus integration requires native library)
  const wavHeader = Buffer.alloc(44)
  const dataLength = pcmData.byteLength
  const fileLength = dataLength + 36

  wavHeader.write('RIFF', 0)
  wavHeader.writeUInt32LE(fileLength, 4)
  wavHeader.write('WAVE', 8)
  wavHeader.write('fmt ', 12)
  wavHeader.writeUInt32LE(16, 16) // chunk size
  wavHeader.writeUInt16LE(1, 20) // PCM format
  wavHeader.writeUInt16LE(channels, 22)
  wavHeader.writeUInt32LE(sampleRate, 24)
  wavHeader.writeUInt32LE(sampleRate * channels * 2, 28) // byte rate
  wavHeader.writeUInt16LE(channels * 2, 32) // block align
  wavHeader.writeUInt16LE(16, 34) // bits per sample
  wavHeader.write('data', 36)
  wavHeader.writeUInt32LE(dataLength, 40)

  const wavPath = outputPath.replace('.ogg', '.wav')
  writeFileSync(wavPath, Buffer.concat([wavHeader, Buffer.from(pcmData.buffer)]))

  parentPort?.postMessage({ type: 'done', path: wavPath })
} catch (error: any) {
  parentPort?.postMessage({ type: 'error', error: error.message })
}
```

**Step 3: Integrate into pipeline**

In `src/main/index.ts`, add Opus encoding as parallel step:

```typescript
import { OpusEncoder } from './audio/opusEncoder'

let opusEncoder: OpusEncoder | null = null

// In initializeEngines():
opusEncoder = new OpusEncoder()

// In onSpeechEnd callback, add parallel encoding:
const filename = `recording-${Date.now()}`
const audioPathPromise = opusEncoder?.encode(audioBuffer, filename)

// After saving transcription to DB, update with audio path:
const audioPath = await audioPathPromise
// Can update DB record with audioPath if needed
```

**Step 4: Commit**

```bash
git add src/main/audio/opusEncoder.ts src/main/audio/opusWorker.ts src/main/index.ts
git commit -m "feat: add Worker Thread audio encoding pipeline (WAV, Opus-ready)"
```

---

## Phase 5: UI/UX Expansion

### Task 10: Add Onboarding Window

**Files:**
- Create: `src/renderer/onboarding.html`
- Create: `src/renderer/src/Onboarding.tsx`
- Modify: `src/main/index.ts` (create onboarding window)
- Modify: `electron.vite.config.ts` (add build entry)
- Modify: `src/shared/types.ts` (add onboarding IPC)

**Step 1: Create onboarding HTML entry**

Create `src/renderer/onboarding.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Welcome to Local Typeless</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/onboarding-entry.tsx"></script>
  </body>
</html>
```

Create `src/renderer/src/onboarding-entry.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Onboarding } from './Onboarding'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Onboarding />
  </React.StrictMode>
)
```

**Step 2: Create Onboarding component**

Create `src/renderer/src/Onboarding.tsx`:

```tsx
import { useState } from 'react'

const steps = [
  {
    title: 'Welcome to Local Typeless',
    description: 'Privacy-first voice-to-text that runs entirely on your Mac.',
  },
  {
    title: 'Download AI Models',
    description: 'We need to download speech recognition and text rewriting models. This is a one-time setup (~2.5 GB).',
    action: 'download-models',
  },
  {
    title: 'Grant Permissions',
    description: 'Typeless needs microphone access for speech recognition and accessibility access for text injection.',
    action: 'check-permissions',
  },
  {
    title: 'Ready to Go!',
    description: 'Press Cmd+Shift+Space to start dictating. Your voice will be transcribed and polished by AI.',
    action: 'finish',
  },
]

export function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0)
  const step = steps[currentStep]

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Close onboarding
      window.api.completeOnboarding()
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding-progress">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`onboarding-dot ${i === currentStep ? 'active' : i < currentStep ? 'completed' : ''}`}
          />
        ))}
      </div>
      <div className="onboarding-content">
        <h1>{step.title}</h1>
        <p>{step.description}</p>
      </div>
      <button className="onboarding-btn" onClick={handleNext}>
        {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
      </button>
    </div>
  )
}
```

**Step 3: Add onboarding window creation**

In `src/main/index.ts`:

```typescript
import Store from 'electron-store'

const store = new Store()

function createOnboardingWindow(): void {
  if (store.get('onboardingComplete', false)) return

  const onboarding = new BrowserWindow({
    width: 600,
    height: 450,
    resizable: false,
    center: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    onboarding.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/onboarding.html`)
  } else {
    onboarding.loadFile(join(__dirname, '../renderer/onboarding.html'))
  }
}
```

Add IPC handler:
```typescript
ipcMain.handle('onboarding:complete', () => {
  store.set('onboardingComplete', true)
})
```

**Step 4: Add build entry in electron.vite.config.ts**

```typescript
// In renderer build config, add rollupOptions:
build: {
  rollupOptions: {
    input: {
      index: resolve(__dirname, 'src/renderer/index.html'),
      widget: resolve(__dirname, 'src/renderer/widget.html'),
      onboarding: resolve(__dirname, 'src/renderer/onboarding.html'),
    }
  }
}
```

**Step 5: Commit**

```bash
git add src/renderer/onboarding.html src/renderer/src/onboarding-entry.tsx src/renderer/src/Onboarding.tsx src/main/index.ts electron.vite.config.ts src/shared/types.ts
git commit -m "feat: add onboarding window for first-run experience"
```

---

### Task 11: Add Onboarding CSS

**Files:**
- Modify: `src/renderer/src/styles/global.css`

**Step 1: Add onboarding styles**

```css
/* Onboarding */
.onboarding {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 40px;
  text-align: center;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.onboarding-progress {
  display: flex;
  gap: 8px;
  margin-bottom: 40px;
}

.onboarding-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border);
  transition: background 0.3s ease;
}

.onboarding-dot.active {
  background: var(--accent);
  transform: scale(1.2);
}

.onboarding-dot.completed {
  background: var(--success);
}

.onboarding-content h1 {
  font-size: 28px;
  margin-bottom: 16px;
}

.onboarding-content p {
  font-size: 16px;
  color: var(--text-secondary);
  max-width: 400px;
  line-height: 1.6;
}

.onboarding-btn {
  margin-top: 40px;
  padding: 12px 32px;
  font-size: 16px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.onboarding-btn:hover {
  background: var(--accent-hover);
}
```

**Step 2: Commit**

```bash
git add src/renderer/src/styles/global.css
git commit -m "feat: add onboarding window styles"
```

---

## Phase Summary

| Phase | Tasks | 主要功能 |
|-------|-------|---------|
| Phase 1 | Task 1-3 | 音效反饋、App Context 收集、動畫改進 |
| Phase 2 | Task 4-6 | better-sqlite3 + Drizzle ORM、歷史持久化 |
| Phase 3 | Task 7-8 | notistack 通知、Virtual Scrolling |
| Phase 4 | Task 9 | Worker Thread 音訊編碼（Opus-ready） |
| Phase 5 | Task 10-11 | Onboarding 視窗 |

## Dependencies Between Tasks

```
Task 1 (sounds) ─────────────────── independent
Task 2 (app context) ───────────── independent
Task 3 (animations) ────────────── independent
Task 4 (DB setup) ──┐
Task 5 (DB pipeline) ◀─┘
Task 6 (DB in UI) ◀── Task 5
Task 7 (notifications) ─────────── independent
Task 8 (virtual scroll) ────────── independent (but better after Task 6)
Task 9 (opus worker) ──────────── independent
Task 10-11 (onboarding) ────────── independent
```

Tasks 1, 2, 3, 7, 8, 9, 10 can all be parallelized. Tasks 4→5→6 must be sequential.
