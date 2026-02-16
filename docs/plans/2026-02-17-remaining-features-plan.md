# Remaining Issue #6 Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the 6 remaining features from Issue #6: keyboard shortcut hints, multi-language Whisper, dark mode (follow system), statistics summary cards, onboarding improvements, and a Swift keyboard helper for true push-to-talk.

**Architecture:** Feature-by-feature implementation in order of increasing complexity. Each feature is independent and can be tested on its own. All UI features share the same CSS variable system in `src/renderer/src/styles/global.css`. IPC follows the existing `ipcMain.handle` / `contextBridge.exposeInMainWorld` pattern. The Swift keyboard helper is a standalone binary spawned as a child process.

**Tech Stack:** Electron 28, React 18, TypeScript, Vitest, electron-store, Drizzle ORM (SQLite), Swift (CGEvent tap), electron-builder

---

### Task 1: Keyboard Shortcut Hints in Tray Menu

**Files:**
- Modify: `src/main/index.ts:182-238` (updateTrayMenu function)
- Test: `src/shared/types.test.ts` (no new tests needed — this is a visual change to Electron native menus)

**Step 1: Add accelerator labels to tray menu items**

In `src/main/index.ts`, modify the `updateTrayMenu()` function. Add `accelerator` to the Start/Stop Recording item using the current hotkey setting. Electron will display accelerator hints automatically as right-aligned text in the menu.

Replace the tray menu template in `updateTrayMenu()` (lines 187-235):

```typescript
function updateTrayMenu(): void {
  if (!tray) return

  const isRecording = audioCapture?.isRecording ?? false

  const contextMenu = Menu.buildFromTemplate([
    {
      label: isRecording ? 'Stop Recording' : 'Start Recording',
      accelerator: settings.globalHotkey,
      click: async () => {
        if (isRecording) {
          await stopRecording()
        } else {
          await startRecording()
        }
        updateTrayMenu()
      }
    },
    { type: 'separator' },
    {
      label: 'Open Settings',
      accelerator: 'CommandOrControl+,',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createMainWindow()
        }
      }
    },
    {
      label: 'Toggle Widget',
      click: () => {
        if (floatingWidget) {
          if (floatingWidget.isVisible()) {
            floatingWidget.hide()
          } else {
            floatingWidget.show()
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: `Hotkey: ${settings.globalHotkey}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'CommandOrControl+Q',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}
```

**Step 2: Verify tray menu visually**

Run: `npm run dev`
Expected: Tray menu shows keyboard shortcuts right-aligned next to "Start Recording", "Open Settings", and "Quit".

**Step 3: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: add keyboard shortcut hints to tray menu"
```

---

### Task 2: Keyboard Shortcut Hints in Settings Panel

**Files:**
- Modify: `src/renderer/src/components/SettingsPanel.tsx:94-110` (hotkey display section)

**Step 1: Add macOS symbol formatting helper and hint text**

Add a helper function at the top of `SettingsPanel.tsx` (after imports) and enhance the hotkey display:

```typescript
/** Convert Electron hotkey format to macOS symbols */
function formatHotkeySymbols(hotkey: string): string {
  return hotkey
    .replace(/CommandOrControl/gi, '\u2318')
    .replace(/Command/gi, '\u2318')
    .replace(/Control/gi, '\u2303')
    .replace(/Alt/gi, '\u2325')
    .replace(/Shift/gi, '\u21E7')
    .replace(/\+/g, '')
}
```

Then update the Global Hotkey `setting-item` div (around lines 94-110) to show the formatted hint:

```tsx
<div className="setting-item">
  <label>Global Hotkey</label>
  {editingHotkey ? (
    <input
      type="text"
      placeholder="Press keys..."
      onKeyDown={handleHotkeyCapture}
      onBlur={() => setEditingHotkey(false)}
      autoFocus
      readOnly
    />
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <button className="hotkey-display" onClick={() => setEditingHotkey(true)}>
        {settings.globalHotkey}
      </button>
      <span className="setting-hint">
        {formatHotkeySymbols(settings.globalHotkey)} — click to change
      </span>
    </div>
  )}
</div>
```

**Step 2: Verify visually**

Run: `npm run dev`
Expected: Settings shows the hotkey button with macOS symbols below (e.g., "⌘⇧Space — click to change").

**Step 3: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/renderer/src/components/SettingsPanel.tsx
git commit -m "feat: add keyboard shortcut hints with macOS symbols in settings"
```

---

### Task 3: Multi-language Whisper — Types and Settings

**Files:**
- Modify: `src/shared/types.ts:144-168` (AppSettings, DEFAULT_SETTINGS)
- Modify: `src/shared/types.test.ts` (update test for new field)

**Step 1: Update the types test to expect the new field**

Add to `src/shared/types.test.ts` in the `DEFAULT_SETTINGS` describe block:

```typescript
it('should have transcriptionLanguage default', () => {
  expect(DEFAULT_SETTINGS.transcriptionLanguage).toBe('auto')
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/types.test.ts`
Expected: FAIL — `DEFAULT_SETTINGS.transcriptionLanguage` is `undefined`.

**Step 3: Add transcriptionLanguage to types**

In `src/shared/types.ts`, add the language list and update `AppSettings`:

After the `CustomPromptMode` interface (line 142), add:

```typescript
export const WHISPER_LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'tr', name: 'Turkish' },
] as const

export type WhisperLanguage = typeof WHISPER_LANGUAGES[number]['code']
```

Add to `AppSettings` interface (after `customPromptModes`):

```typescript
transcriptionLanguage: WhisperLanguage
```

Add to `DEFAULT_SETTINGS` (after `customPromptModes`):

```typescript
transcriptionLanguage: 'auto'
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/types.test.ts`
Expected: PASS

**Step 5: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS (the new field is optional in `Partial<AppSettings>` for `setSettings` calls).

**Step 6: Commit**

```bash
git add src/shared/types.ts src/shared/types.test.ts
git commit -m "feat: add transcriptionLanguage to AppSettings with language list"
```

---

### Task 4: Multi-language Whisper — ASR Engine Integration

**Files:**
- Modify: `src/main/asr/engine.ts:16-29` (config defaults)
- Modify: `src/main/asr/engine.ts:124-137` (CLI args)
- Modify: `src/main/asr/providers/cloudOpenAIProvider.ts:53-59` (language field)
- Modify: `src/main/asr/providerFactory.ts:19-37` (pass language)
- Modify: `src/main/index.ts:294` (pass language to provider factory)

**Step 1: Update ASREngine to accept language parameter**

In `src/main/asr/engine.ts`, update the constructor and transcribe args to use a dynamic language. The `WhisperConfig` already has a `language` field — we just need to make it configurable from outside.

Add a public method to update language at runtime (after `dispose`):

```typescript
setLanguage(language: string): void {
  this.config.language = language
  // Update initial prompt based on language
  if (language === 'auto') {
    this.config.initialPrompt =
      'The following is a discussion containing both Chinese and English technical terms. Please transcribe verbatim.'
  } else if (language === 'zh') {
    this.config.initialPrompt = '以下是中文語音內容，請逐字轉錄。'
  } else if (language === 'en') {
    this.config.initialPrompt = 'The following is English speech. Please transcribe verbatim.'
  } else {
    this.config.initialPrompt = 'Please transcribe verbatim.'
  }
}
```

**Step 2: Update CloudOpenAIProvider to accept language**

In `src/main/asr/providers/cloudOpenAIProvider.ts`, add a `language` field and setter:

After `private apiKey: string` (line 15), add:

```typescript
private language: string = 'en'
```

Add a method:

```typescript
setLanguage(language: string): void {
  this.language = language === 'auto' ? 'en' : language
}
```

Update the language field in the multipart form data (lines 55-59) to use `this.language` instead of hardcoded `'en'`:

```typescript
// Add language field
formData.push(Buffer.from(
  `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="language"\r\n\r\n` +
  `${this.language}\r\n`
))
```

**Step 3: Update ASRProviderInterface to include setLanguage**

In `src/main/asr/providerFactory.ts`, add to the interface:

```typescript
export interface ASRProviderInterface {
  transcribe(audioBuffer: Float32Array): Promise<string>
  initialize?(): Promise<void>
  dispose?(): Promise<void>
  setLanguage?(language: string): void
  get isLoaded(): boolean
}
```

**Step 4: Update main process to pass language on settings change**

In `src/main/index.ts`, inside the `SET_SETTINGS` handler (around line 446), after updating `settings`, add:

```typescript
// If transcription language changed, update ASR engine
if (newSettings.transcriptionLanguage && asrEngine?.setLanguage) {
  asrEngine.setLanguage(newSettings.transcriptionLanguage)
}
```

Also in `initializeEngines()`, after creating the ASR engine (around line 294), set initial language:

```typescript
if (asrEngine.setLanguage) {
  asrEngine.setLanguage(settings.transcriptionLanguage)
}
```

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 6: Run tests**

Run: `npm test`
Expected: PASS

**Step 7: Commit**

```bash
git add src/main/asr/engine.ts src/main/asr/providers/cloudOpenAIProvider.ts src/main/asr/providerFactory.ts src/main/index.ts
git commit -m "feat: integrate transcription language setting into ASR engines"
```

---

### Task 5: Multi-language Whisper — Settings UI Dropdown

**Files:**
- Modify: `src/renderer/src/components/SettingsPanel.tsx` (add language dropdown)

**Step 1: Add language dropdown to Settings**

In `SettingsPanel.tsx`, add import for `WHISPER_LANGUAGES` at the top:

```typescript
import { DEFAULT_PROMPT_MODES, WHISPER_LANGUAGES } from '@shared/types'
```

Then add the language selector inside the "Speech Recognition Provider" card, right after the provider selection `</div>` (after line 234) and before the cloud-config conditional:

```tsx
<div className="setting-item">
  <label>Transcription Language</label>
  <select
    value={settings.transcriptionLanguage || 'auto'}
    onChange={(e) => onChange({ transcriptionLanguage: e.target.value as any })}
    style={{
      padding: '6px 10px',
      background: 'var(--bg-tertiary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--text-primary)',
      fontSize: '13px',
      fontFamily: 'inherit',
      cursor: 'pointer'
    }}
  >
    {WHISPER_LANGUAGES.map((lang) => (
      <option key={lang.code} value={lang.code}>
        {lang.name}
      </option>
    ))}
  </select>
</div>
```

**Step 2: Verify visually**

Run: `npm run dev`
Expected: Language dropdown appears in the Speech Recognition Provider card, default is "Auto-detect".

**Step 3: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: PASS

**Step 4: Commit**

```bash
git add src/renderer/src/components/SettingsPanel.tsx
git commit -m "feat: add transcription language dropdown to settings UI"
```

---

### Task 6: Dark Mode (Follow System) — IPC and Theme Broadcast

**Files:**
- Modify: `src/shared/types.ts` (add theme IPC channels)
- Modify: `src/main/index.ts` (nativeTheme listener + IPC handler)
- Modify: `src/preload/index.ts` (expose theme API)

**Step 1: Add IPC channels for theme**

In `src/shared/types.ts`, add to `IPC_CHANNELS` (before the closing `} as const`):

```typescript
// Theme
GET_THEME: 'theme:get',
THEME_CHANGED: 'theme:changed',
```

**Step 2: Add theme IPC handler and nativeTheme listener in main process**

In `src/main/index.ts`, add import for `nativeTheme`:

The import is already `import { app, shell, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage } from 'electron'` — add `nativeTheme` to this import.

In `setupIPC()`, add the theme handler:

```typescript
ipcMain.handle(IPC_CHANNELS.GET_THEME, () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
})
```

In the `app.whenReady().then(...)` block, after `registerGlobalShortcut()`, add:

```typescript
// Broadcast theme changes to all renderer windows
nativeTheme.on('updated', () => {
  const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
  broadcastToRenderers(IPC_CHANNELS.THEME_CHANGED, theme)
})
```

**Step 3: Expose theme API in preload**

In `src/preload/index.ts`, add to the `api` object:

```typescript
// Theme
getTheme: (): Promise<'dark' | 'light'> => ipcRenderer.invoke(IPC_CHANNELS.GET_THEME),
onThemeChange: (callback: (theme: 'dark' | 'light') => void): (() => void) => {
  const listener = (_: Electron.IpcRendererEvent, theme: 'dark' | 'light'): void =>
    callback(theme)
  ipcRenderer.on(IPC_CHANNELS.THEME_CHANGED, listener)
  return () => ipcRenderer.removeListener(IPC_CHANNELS.THEME_CHANGED, listener)
},
```

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/types.ts src/main/index.ts src/preload/index.ts
git commit -m "feat: add theme IPC channels and nativeTheme listener for dark mode"
```

---

### Task 7: Dark Mode (Follow System) — CSS Variables and Theme Application

**Files:**
- Modify: `src/renderer/src/styles/global.css:1-36` (add light theme variables)
- Modify: `src/renderer/src/App.tsx` (apply theme on mount)

**Step 1: Add light theme CSS variables**

In `src/renderer/src/styles/global.css`, the current `:root` variables are already dark-themed. We need to:
1. Keep `:root` as dark (it's the default)
2. Add `[data-theme="light"]` overrides

After the existing `:root { ... }` block (after line 36), add:

```css
[data-theme="light"] {
  --bg-primary: #f5f5f7;
  --bg-secondary: #ffffff;
  --bg-tertiary: #e8e8ed;
  --text-primary: #1d1d1f;
  --text-secondary: #6e6e73;
  --accent: #e94560;
  --accent-hover: #d63a54;
  --success: #00a67e;
  --warning: #e6a800;
  --border: #d2d2d7;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);
}
```

Also update `body` background to respect the variable (it already does via `var(--bg-primary)`).

For the light theme, also update hover effects that use hardcoded rgba values. Add after the light theme block:

```css
[data-theme="light"] .sidebar-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

[data-theme="light"] .sidebar-item.active {
  background: rgba(233, 69, 96, 0.08);
}

[data-theme="light"] .history-item:hover {
  border-color: rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.02);
}

[data-theme="light"] .status-orb.ready {
  background: linear-gradient(135deg, #e8e8ed, #f5f5f7);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

[data-theme="light"] .status-orb.ready .status-orb-glow {
  background: #d2d2d7;
}
```

**Step 2: Apply theme in App.tsx**

In `src/renderer/src/App.tsx`, add theme initialization. After the existing `useEffect` blocks, add a new one:

```typescript
// Apply system theme on mount and listen for changes
useEffect(() => {
  const applyTheme = (theme: 'dark' | 'light'): void => {
    document.documentElement.setAttribute('data-theme', theme)
  }

  // Get initial theme
  window.api?.getTheme?.().then(applyTheme).catch(() => {})

  // Listen for theme changes
  const unsubscribe = window.api?.onThemeChange?.(applyTheme)
  return () => unsubscribe?.()
}, [])
```

**Step 3: Verify visually**

Run: `npm run dev`
Expected: App theme matches system appearance. Toggle macOS appearance in System Preferences to verify live switching.

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/src/styles/global.css src/renderer/src/App.tsx
git commit -m "feat: add dark/light mode following system theme with CSS variables"
```

---

### Task 8: Statistics Summary Cards — Database Queries

**Files:**
- Modify: `src/shared/types.ts` (add stats type and IPC channel)
- Modify: `src/main/db/repository.ts` (add getStats function)

**Step 1: Add TranscriptionStats type**

In `src/shared/types.ts`, after the `ASRStatus` interface (around line 49), add:

```typescript
export interface TranscriptionStats {
  totalTranscriptions: number
  totalWords: number
  totalDurationSeconds: number
  averagePerDay: number
}
```

Add to `IPC_CHANNELS`:

```typescript
// Stats
GET_STATS: 'stats:get',
```

**Step 2: Implement getStats in repository**

In `src/main/db/repository.ts`, add the new function. We'll use raw SQL via Drizzle's `db.all()` for the aggregate query since it's simpler:

```typescript
import { sql } from 'drizzle-orm'
```

Add after `deleteTranscription`:

```typescript
export function getStats(): {
  totalTranscriptions: number
  totalWords: number
  totalDurationSeconds: number
  averagePerDay: number
} {
  const db = getDb()

  // Get total count
  const countResult = db.select({ value: sql<number>`count(*)` }).from(schema.history).all()
  const totalTranscriptions = countResult[0]?.value ?? 0

  if (totalTranscriptions === 0) {
    return { totalTranscriptions: 0, totalWords: 0, totalDurationSeconds: 0, averagePerDay: 0 }
  }

  // Get total duration
  const durationResult = db
    .select({ value: sql<number>`coalesce(sum(duration), 0)` })
    .from(schema.history)
    .all()
  const totalDurationSeconds = durationResult[0]?.value ?? 0

  // Get total word count (count words in raw_text)
  const allTexts = db
    .select({ rawText: schema.history.rawText })
    .from(schema.history)
    .all()
  const totalWords = allTexts.reduce((sum, row) => {
    const text = row.rawText || ''
    return sum + text.split(/\s+/).filter(Boolean).length
  }, 0)

  // Calculate average per day
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
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/shared/types.ts src/main/db/repository.ts
git commit -m "feat: add getStats database query and TranscriptionStats type"
```

---

### Task 9: Statistics Summary Cards — IPC and UI

**Files:**
- Modify: `src/main/index.ts` (add stats IPC handler + import)
- Modify: `src/preload/index.ts` (expose getStats)
- Modify: `src/renderer/src/components/TranscriptionHistory.tsx` (render stats cards)
- Modify: `src/renderer/src/styles/global.css` (stats card styles)

**Step 1: Add IPC handler**

In `src/main/index.ts`, update the import from repository:

```typescript
import { saveTranscription, getHistory, deleteTranscription, getHistoryCount, getStats } from './db/repository'
```

In `setupIPC()`, add:

```typescript
ipcMain.handle(IPC_CHANNELS.GET_STATS, () => {
  return getStats()
})
```

**Step 2: Expose in preload**

In `src/preload/index.ts`, add to the `api` object:

```typescript
getStats: () => ipcRenderer.invoke(IPC_CHANNELS.GET_STATS),
```

**Step 3: Add stats cards UI**

In `src/renderer/src/components/TranscriptionHistory.tsx`, add state and load stats on mount. Update the component:

Add import and state:

```typescript
import { useState, useRef, useEffect } from 'react'
```

Inside the component, before the `parentRef`:

```typescript
const [stats, setStats] = useState<{
  totalTranscriptions: number
  totalWords: number
  totalDurationSeconds: number
  averagePerDay: number
} | null>(null)

useEffect(() => {
  window.api?.getStats?.().then(setStats).catch(() => {})
}, [history])
```

Add stats cards in the return JSX, right before the `<div className="history-header-row">`:

```tsx
{stats && stats.totalTranscriptions > 0 && (
  <div className="stats-cards">
    <div className="stat-card">
      <span className="stat-value">{stats.totalTranscriptions}</span>
      <span className="stat-label">Transcriptions</span>
    </div>
    <div className="stat-card">
      <span className="stat-value">{stats.totalWords.toLocaleString()}</span>
      <span className="stat-label">Words</span>
    </div>
    <div className="stat-card">
      <span className="stat-value">
        {stats.totalDurationSeconds >= 3600
          ? `${Math.floor(stats.totalDurationSeconds / 3600)}h ${Math.floor((stats.totalDurationSeconds % 3600) / 60)}m`
          : `${Math.floor(stats.totalDurationSeconds / 60)}m`}
      </span>
      <span className="stat-label">Total Duration</span>
    </div>
    <div className="stat-card">
      <span className="stat-value">{stats.averagePerDay}</span>
      <span className="stat-label">Avg / Day</span>
    </div>
  </div>
)}
```

**Step 4: Add CSS styles**

In `src/renderer/src/styles/global.css`, add before the "Transcription History" section:

```css
/* ========== Stats Cards ========== */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}
```

**Step 5: Verify visually**

Run: `npm run dev`
Expected: 4 stat cards appear above the history list showing Transcriptions, Words, Total Duration, and Avg/Day.

**Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add src/main/index.ts src/preload/index.ts src/renderer/src/components/TranscriptionHistory.tsx src/renderer/src/styles/global.css
git commit -m "feat: add statistics summary cards to transcription history"
```

---

### Task 10: Onboarding Improvements — Accessibility Permission Step

**Files:**
- Modify: `src/main/index.ts` (add permission check IPC)
- Modify: `src/shared/types.ts` (add permission IPC channels)
- Modify: `src/preload/index.ts` (expose permission API)
- Modify: `src/renderer/src/Onboarding.tsx` (add accessibility permission step)

**Step 1: Add IPC channels**

In `src/shared/types.ts`, add to `IPC_CHANNELS`:

```typescript
// Permissions
CHECK_ACCESSIBILITY: 'permissions:check-accessibility',
OPEN_ACCESSIBILITY_SETTINGS: 'permissions:open-accessibility',
```

**Step 2: Add IPC handlers in main process**

In `src/main/index.ts`, add import for `systemPreferences`:

Add `systemPreferences` to the Electron import at line 1.

In `setupIPC()`, add:

```typescript
ipcMain.handle(IPC_CHANNELS.CHECK_ACCESSIBILITY, () => {
  return systemPreferences.isTrustedAccessibilityClient(false)
})

ipcMain.handle(IPC_CHANNELS.OPEN_ACCESSIBILITY_SETTINGS, () => {
  shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
})
```

**Step 3: Expose in preload**

In `src/preload/index.ts`, add:

```typescript
// Permissions
checkAccessibility: (): Promise<boolean> =>
  ipcRenderer.invoke(IPC_CHANNELS.CHECK_ACCESSIBILITY),
openAccessibilitySettings: (): Promise<void> =>
  ipcRenderer.invoke(IPC_CHANNELS.OPEN_ACCESSIBILITY_SETTINGS),
```

**Step 4: Update Onboarding with accessibility step**

In `src/renderer/src/Onboarding.tsx`, replace the `steps` array:

```typescript
const steps = [
  {
    title: 'Welcome to Local Typeless',
    description: 'Privacy-first voice-to-text that runs entirely on your Mac.',
  },
  {
    title: 'Accessibility Permission',
    description: 'Typeless needs accessibility access to inject transcribed text into your apps and to monitor keyboard events for push-to-talk.',
    action: 'check-accessibility',
  },
  {
    title: 'Check whisper.cpp',
    description: 'Typeless uses whisper.cpp for local speech recognition with Metal GPU acceleration.',
    action: 'check-whisper',
  },
  {
    title: 'Download AI Models',
    description: 'We need to download speech recognition and text rewriting models. This is a one-time setup (~2.5 GB).',
    action: 'download-models',
  },
  {
    title: 'Grant Permissions',
    description: 'Typeless needs microphone access for speech recognition.',
    action: 'check-permissions',
  },
  {
    title: 'Ready to Go!',
    description: 'Press Cmd+Shift+Space to start dictating. Your voice will be transcribed and polished by AI.',
    action: 'finish',
  },
]
```

Add accessibility state and polling:

```typescript
const [accessibilityGranted, setAccessibilityGranted] = useState(false)
const [checkingAccessibility, setCheckingAccessibility] = useState(false)

useEffect(() => {
  if (step.action === 'check-accessibility') {
    // Check immediately
    window.api?.checkAccessibility?.().then(setAccessibilityGranted).catch(() => {})

    // Poll every 2 seconds while on this step
    const interval = setInterval(() => {
      window.api?.checkAccessibility?.().then(setAccessibilityGranted).catch(() => {})
    }, 2000)
    return () => clearInterval(interval)
  }
}, [step.action])
```

Add the accessibility UI inside `<div className="onboarding-content">`, after the existing `check-whisper` block:

```tsx
{step.action === 'check-accessibility' && (
  <div className="whisper-check">
    <div className="check-item">
      <span className={`status-dot ${accessibilityGranted ? 'ready' : 'not-ready'}`} />
      <span>{accessibilityGranted ? 'Accessibility access granted' : 'Accessibility access needed'}</span>
    </div>
    {!accessibilityGranted && (
      <>
        <button
          className="onboarding-btn-secondary"
          onClick={() => window.api?.openAccessibilitySettings?.()}
        >
          Open System Preferences
        </button>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
          Find "Typeless" in the list and toggle it on. This page will update automatically.
        </p>
      </>
    )}
    {accessibilityGranted && (
      <div className="check-success">Accessibility permission granted!</div>
    )}
  </div>
)}
```

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 6: Verify visually**

Run: `npm run dev`
Expected: Onboarding now has an accessibility permission step (step 2) with a status dot and "Open System Preferences" button that polls for permission status.

**Step 7: Commit**

```bash
git add src/shared/types.ts src/main/index.ts src/preload/index.ts src/renderer/src/Onboarding.tsx
git commit -m "feat: add accessibility permission step to onboarding flow"
```

---

### Task 11: Swift Keyboard Helper — Build Script and Swift Source

**Files:**
- Create: `native/KeyboardHelper/Package.swift`
- Create: `native/KeyboardHelper/Sources/main.swift`
- Create: `scripts/build-keyboard-helper.sh`

**Step 1: Create Swift Package**

Create `native/KeyboardHelper/Package.swift`:

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "KeyboardHelper",
    platforms: [.macOS(.v12)],
    targets: [
        .executableTarget(
            name: "KeyboardHelper",
            path: "Sources"
        )
    ]
)
```

**Step 2: Create Swift source**

Create `native/KeyboardHelper/Sources/main.swift`:

```swift
import Cocoa
import Foundation

// JSON output for Electron
func sendEvent(_ type: String, keyCode: Int64, flags: [String]) {
    let event: [String: Any] = [
        "type": type,
        "keyCode": keyCode,
        "flags": flags
    ]
    if let data = try? JSONSerialization.data(withJSONObject: event),
       let json = String(data: data, encoding: .utf8) {
        print(json)
        fflush(stdout)
    }
}

func flagsToArray(_ flags: CGEventFlags) -> [String] {
    var result: [String] = []
    if flags.contains(.maskCommand) { result.append("command") }
    if flags.contains(.maskShift) { result.append("shift") }
    if flags.contains(.maskControl) { result.append("control") }
    if flags.contains(.maskAlternate) { result.append("alt") }
    return result
}

// Create event tap for key monitoring
let eventMask: CGEventMask = (1 << CGEventType.keyDown.rawValue)
    | (1 << CGEventType.keyUp.rawValue)
    | (1 << CGEventType.flagsChanged.rawValue)

guard let eventTap = CGEvent.tapCreate(
    tap: .cgSessionEventTap,
    place: .headInsertEventTap,
    options: .listenOnly,
    eventsOfInterest: eventMask,
    callback: { _, type, event, _ -> Unmanaged<CGEvent>? in
        let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
        let flags = flagsToArray(event.flags)

        switch type {
        case .keyDown:
            sendEvent("keyDown", keyCode: keyCode, flags: flags)
        case .keyUp:
            sendEvent("keyUp", keyCode: keyCode, flags: flags)
        case .flagsChanged:
            sendEvent("flagsChanged", keyCode: keyCode, flags: flags)
        default:
            break
        }

        return Unmanaged.passRetained(event)
    },
    userInfo: nil
) else {
    fputs("{\"error\":\"Failed to create event tap. Accessibility permission required.\"}\n", stderr)
    exit(1)
}

let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0)
CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
CGEvent.tapEnable(tap: eventTap, enable: true)

// Signal ready
fputs("{\"status\":\"ready\"}\n", stdout)
fflush(stdout)

CFRunLoopRun()
```

**Step 3: Create build script**

Create `scripts/build-keyboard-helper.sh`:

```bash
#!/bin/bash
# Build universal KeyboardHelper binary for macOS (arm64 + x64)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../native/KeyboardHelper"
OUTPUT_DIR="$SCRIPT_DIR/../resources/bin"

echo "Building KeyboardHelper..."
mkdir -p "$OUTPUT_DIR"

cd "$PROJECT_DIR"

# Build for arm64
swift build -c release --arch arm64 2>&1 | tail -1
ARM64_BIN=".build/arm64-apple-macosx/release/KeyboardHelper"

# Build for x86_64
swift build -c release --arch x86_64 2>&1 | tail -1
X64_BIN=".build/x86_64-apple-macosx/release/KeyboardHelper"

# Create universal binary
lipo -create "$ARM64_BIN" "$X64_BIN" -output "$OUTPUT_DIR/KeyboardHelper"
chmod +x "$OUTPUT_DIR/KeyboardHelper"

echo "Built universal binary: $OUTPUT_DIR/KeyboardHelper"
file "$OUTPUT_DIR/KeyboardHelper"
```

Make it executable:

```bash
chmod +x scripts/build-keyboard-helper.sh
```

**Step 4: Build the helper**

Run: `./scripts/build-keyboard-helper.sh`
Expected: Universal binary created at `resources/bin/KeyboardHelper` — `file` command shows "Mach-O universal binary with 2 architectures: [x86_64:Mach-O 64-bit executable x86_64] [arm64:Mach-O 64-bit executable arm64]"

**Step 5: Commit**

```bash
git add native/KeyboardHelper/Package.swift native/KeyboardHelper/Sources/main.swift scripts/build-keyboard-helper.sh
git commit -m "feat: add Swift KeyboardHelper for native key event monitoring"
```

---

### Task 12: Swift Keyboard Helper — Node.js Wrapper

**Files:**
- Create: `src/main/native/keyboardHelper.ts`

**Step 1: Create the Node.js wrapper**

Create `src/main/native/keyboardHelper.ts`:

```typescript
/**
 * Native Keyboard Helper
 *
 * Spawns the Swift KeyboardHelper binary and reads JSON events from stdout.
 * Provides key-down and key-up events for true push-to-talk.
 */

import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { EventEmitter } from 'events'

export interface KeyEvent {
  type: 'keyDown' | 'keyUp' | 'flagsChanged'
  keyCode: number
  flags: string[]
}

export class KeyboardHelper extends EventEmitter {
  private process: ChildProcess | null = null
  private buffer = ''

  /**
   * Find the KeyboardHelper binary path.
   * Checks resources/bin/ in production, native/ build in development.
   */
  private getBinaryPath(): string | null {
    const paths = [
      // Production: bundled in resources
      join(process.resourcesPath || '', 'bin', 'KeyboardHelper'),
      // Development: built locally
      join(__dirname, '../../../resources/bin/KeyboardHelper'),
    ]

    for (const p of paths) {
      if (existsSync(p)) return p
    }
    return null
  }

  get isRunning(): boolean {
    return this.process !== null
  }

  start(): boolean {
    if (this.process) return true

    const binaryPath = this.getBinaryPath()
    if (!binaryPath) {
      console.warn('[KeyboardHelper] Binary not found, true push-to-talk unavailable')
      return false
    }

    try {
      this.process = spawn(binaryPath, [], {
        stdio: ['ignore', 'pipe', 'pipe']
      })

      this.process.stdout?.on('data', (data: Buffer) => {
        this.buffer += data.toString()
        this.processBuffer()
      })

      this.process.stderr?.on('data', (data: Buffer) => {
        console.error('[KeyboardHelper]', data.toString().trim())
      })

      this.process.on('close', (code) => {
        console.log(`[KeyboardHelper] Process exited with code ${code}`)
        this.process = null
        this.emit('exit', code)
      })

      this.process.on('error', (err) => {
        console.error('[KeyboardHelper] Spawn error:', err)
        this.process = null
      })

      return true
    } catch (err) {
      console.error('[KeyboardHelper] Failed to start:', err)
      return false
    }
  }

  stop(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
    this.buffer = ''
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n')
    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      try {
        const event = JSON.parse(trimmed) as KeyEvent
        if (event.type) {
          this.emit('keyEvent', event)
        }
      } catch {
        // Ignore non-JSON lines (e.g., status messages)
      }
    }
  }
}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/main/native/keyboardHelper.ts
git commit -m "feat: add Node.js wrapper for Swift KeyboardHelper binary"
```

---

### Task 13: Swift Keyboard Helper — Integration with Push-to-Talk

**Files:**
- Modify: `src/main/index.ts` (integrate keyboard helper with push-to-talk)
- Modify: `electron-builder.yml` (bundle binary)

**Step 1: Integrate keyboard helper with push-to-talk in main process**

In `src/main/index.ts`, add import:

```typescript
import { KeyboardHelper, KeyEvent } from './native/keyboardHelper'
```

Add after the engine variables (around line 39):

```typescript
let keyboardHelper: KeyboardHelper | null = null
```

In `initializeEngines()`, after initializing other engines, add:

```typescript
// Start native keyboard helper for true push-to-talk
keyboardHelper = new KeyboardHelper()
if (keyboardHelper.start()) {
  console.log('[Main] KeyboardHelper started for true push-to-talk')

  keyboardHelper.on('keyEvent', (event: KeyEvent) => {
    if (settings.hotkeyMode !== 'push-to-talk') return

    // Parse the current hotkey to match against key events
    const hotkeyParts = settings.globalHotkey.toLowerCase().split('+')
    const requiredFlags = hotkeyParts.filter(p =>
      ['command', 'commandorcontrol', 'control', 'shift', 'alt'].includes(p)
    ).map(f => f === 'commandorcontrol' ? 'command' : f)

    const hasRequiredFlags = requiredFlags.every(f => event.flags.includes(f))

    if (event.type === 'keyUp' && hasRequiredFlags && audioCapture?.isRecording) {
      stopRecording()
    }
  })
} else {
  console.log('[Main] KeyboardHelper not available, using timeout-based push-to-talk')
}
```

Update the push-to-talk timeout in `registerGlobalShortcut()` — keep the 30s timeout as a safety net even with the keyboard helper:

```typescript
// Push-to-talk mode: auto-stop after maxDuration (safety net)
// If keyboard helper is active, key-up event will stop sooner
if (settings.hotkeyMode === 'push-to-talk') {
  setTimeout(async () => {
    if (audioCapture?.isRecording) {
      await stopRecording()
    }
  }, 30000) // 30 second max safety net
}
```

In `app.on('will-quit')`, add cleanup:

```typescript
keyboardHelper?.stop()
```

**Step 2: Bundle the binary in electron-builder**

In `electron-builder.yml`, add to `extraResources`:

```yaml
  - from: resources/bin/
    to: bin/
    filter:
      - "**/*"
```

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Run tests**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/index.ts electron-builder.yml
git commit -m "feat: integrate KeyboardHelper with push-to-talk for true key-up detection"
```

---

### Task 14: Final Verification and Update Issue #6

**Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 2: Run all tests**

Run: `npm test`
Expected: PASS

**Step 3: Build the app**

Run: `npm run build:mac:dir`
Expected: App builds successfully with all new features bundled.

**Step 4: Update Issue #6 on GitHub**

Use `gh issue edit 6` to mark newly completed items:
- [x] Keyboard shortcut hints in tray menu and settings
- [x] Dark/light mode theme toggle (follows system)
- [x] Onboarding flow improvements (accessibility permission guidance)
- [x] Multi-language support for Whisper transcription
- [x] Statistics dashboard (total transcriptions, words, usage time)
- [x] P2: Native Integration (Swift keyboard helper for push-to-talk)

**Step 5: Commit all remaining changes and tag**

```bash
git add -A
git commit -m "chore: final verification of remaining Issue #6 features"
```
