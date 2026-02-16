# UI Polish & UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Local Typeless from prototype-quality UI to a polished, professional application matching Typeless.app visual standards.

**Architecture:** Sidebar navigation replaces tab bar. Glass-morphism floating widget. Consistent CSS variable system. Card-based settings. Smooth transitions.

**Tech Stack:** React 18, CSS custom properties, electron-vite, TypeScript

---

### Task 1: CSS Foundation - Design Tokens & Sidebar Styles

**Files:**
- Modify: `src/renderer/src/styles/global.css`

**Step 1: Add new CSS design tokens**

Add after the existing `:root` variables (line 7-18):

```css
:root {
  /* existing vars... */

  /* Spacing */
  --sidebar-width: 180px;
  --sidebar-collapsed: 56px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s ease;
  --transition-slow: 0.35s ease;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

**Step 2: Replace app layout with sidebar layout**

Replace `.app`, `.app-header`, `.tab-bar`, `.tab`, `.app-content`, `.app-footer` with:

```css
/* Sidebar Layout */
.app {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 20px 16px 16px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 8px;
  flex: 1;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
  background: transparent;
  font-size: 13px;
  font-family: inherit;
  width: 100%;
  text-align: left;
}

.sidebar-item:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.05);
}

.sidebar-item.active {
  color: var(--text-primary);
  background: rgba(233, 69, 96, 0.12);
  border-left: 3px solid var(--accent);
  padding-left: 9px;
}

.sidebar-item-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.sidebar-status {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}

.sidebar-status-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sidebar-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sidebar-status-dot.ok { background: var(--success); }
.sidebar-status-dot.loading { background: var(--warning); }
.sidebar-status-dot.error { background: var(--accent); }

/* Main Content */
.app-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  min-width: 0;
}

.view-enter {
  animation: viewFadeIn var(--transition-normal) ease-out;
}

@keyframes viewFadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Step 3: Add card container styles for settings**

```css
/* Card containers */
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}
```

**Step 4: Add model card CSS classes** (replacing inline styles)

```css
/* Model Cards */
.model-card {
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  margin-bottom: 12px;
  transition: border-color var(--transition-fast);
}

.model-card:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

.model-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.model-card-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

.model-card-status {
  font-size: 12px;
  font-weight: 500;
}

.model-card-status.ready { color: #22c55e; }
.model-card-status.downloading { color: #eab308; }
.model-card-status.exists { color: #3b82f6; }
.model-card-status.missing { color: #ef4444; }

.model-card-name {
  font-size: 12px;
  color: var(--text-secondary);
  word-break: break-all;
  margin: 0 0 12px 0;
}

.model-card-progress {
  width: 100%;
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
}

.model-card-progress-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.model-card-download-btn {
  width: 100%;
  padding: 8px 16px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  transition: all var(--transition-fast);
}

.model-card-download-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
```

**Step 5: Remove old `.app-header`, `.tab-bar`, `.tab`, `.app-footer` styles**

Delete the old header/tab/footer CSS rules (lines 34-95 approximately).

**Step 6: Verify build**

Run: `npm run build`
Expected: Clean build (CSS changes only, no TS errors)

**Step 7: Commit**

```bash
git add src/renderer/src/styles/global.css
git commit -m "style: add sidebar layout, design tokens, and model card CSS classes"
```

---

### Task 2: App.tsx - Sidebar Navigation

**Files:**
- Modify: `src/renderer/src/App.tsx`

**Step 1: Replace header/tab bar with sidebar**

Replace the entire return JSX in `App.tsx` with:

```tsx
return (
  <div className="app">
    <aside className="sidebar">
      <div className="sidebar-header">Local Typeless</div>
      <nav className="sidebar-nav">
        <button
          className={`sidebar-item ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          <span className="sidebar-item-icon">&#9673;</span>
          Status
        </button>
        <button
          className={`sidebar-item ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => setActiveTab('models')}
        >
          <span className="sidebar-item-icon">&#9881;</span>
          Models
        </button>
        <button
          className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="sidebar-item-icon">&#9881;</span>
          Settings
        </button>
      </nav>
      <div className="sidebar-status">
        <div className="sidebar-status-row">
          <span className={`sidebar-status-dot ${modelStatus.whisper.loaded ? 'ok' : modelStatus.whisper.downloading ? 'loading' : 'error'}`} />
          <span>ASR {modelStatus.whisper.loaded ? 'Ready' : modelStatus.whisper.downloading ? 'Loading' : 'Offline'}</span>
        </div>
        <div className="sidebar-status-row">
          <span className={`sidebar-status-dot ${modelStatus.llm.loaded ? 'ok' : modelStatus.llm.downloading ? 'loading' : 'error'}`} />
          <span>LLM {modelStatus.llm.loaded ? 'Ready' : modelStatus.llm.downloading ? 'Loading' : 'Offline'}</span>
        </div>
      </div>
    </aside>

    <main className="app-content">
      <div key={activeTab} className="view-enter">
        {activeTab === 'status' && (
          <div className="status-view">
            <StatusIndicator
              isRecording={isRecording}
              isProcessing={isProcessing}
              modelStatus={{ whisperLoaded: modelStatus.whisper.loaded, llmLoaded: modelStatus.llm.loaded }}
              onToggle={handleRecordingToggle}
            />
            <TranscriptionHistory history={history} onHistoryUpdate={setHistory} />
          </div>
        )}
        {activeTab === 'models' && <ModelStatusPanel />}
        {activeTab === 'settings' && (
          <SettingsPanel settings={settings} onChange={handleSettingsChange} />
        )}
      </div>
    </main>
  </div>
)
```

**Step 2: Update main window dimensions in src/main/index.ts**

Find `createMainWindow` function and update width from 800 to 860 to accommodate the sidebar.

**Step 3: Verify**

Run: `npm run typecheck && npm run build`
Expected: Clean

**Step 4: Commit**

```bash
git add src/renderer/src/App.tsx src/main/index.ts
git commit -m "feat: replace tab bar with sidebar navigation layout"
```

---

### Task 3: ModelStatusPanel - Replace Inline Styles

**Files:**
- Modify: `src/renderer/src/components/ModelStatusPanel.tsx`

**Step 1: Replace ModelCard inline styles with CSS classes**

Replace the ModelCard component JSX:

```tsx
function ModelCard({
  title,
  modelName,
  loaded,
  exists,
  downloading,
  progress,
  onDownload
}: ModelCardProps) {
  const getStatusClass = () => {
    if (loaded) return 'ready'
    if (downloading) return 'downloading'
    if (exists) return 'exists'
    return 'missing'
  }

  const getStatusText = () => {
    if (loaded) return 'Ready'
    if (downloading) return `Downloading ${progress}%`
    if (exists) return 'Downloaded (not loaded)'
    return 'Not downloaded'
  }

  return (
    <div className="model-card">
      <div className="model-card-header">
        <h3 className="model-card-title">{title}</h3>
        <span className={`model-card-status ${getStatusClass()}`}>
          {getStatusText()}
        </span>
      </div>

      <p className="model-card-name">
        {modelName || 'No model configured'}
      </p>

      {downloading && (
        <div className="model-card-progress">
          <div
            className="model-card-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {!exists && !downloading && (
        <button className="model-card-download-btn" onClick={onDownload}>
          Download Model
        </button>
      )}
    </div>
  )
}
```

**Step 2: Replace ModelStatusPanel inline styles**

```tsx
export function ModelStatusPanel() {
  const { status, loading, downloadModel } = useModelStatus()

  if (loading) {
    return <div className="card" style={{ color: 'var(--text-secondary)' }}>Loading model status...</div>
  }

  return (
    <div>
      <h2 className="card-title" style={{ marginBottom: '16px' }}>AI Models</h2>

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
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '16px' }}>
          Models will be downloaded automatically on first launch.
        </p>
      )}
    </div>
  )
}
```

**Step 3: Verify**

Run: `npm run typecheck && npm run build`
Expected: Clean

**Step 4: Commit**

```bash
git add src/renderer/src/components/ModelStatusPanel.tsx
git commit -m "refactor: replace ModelStatusPanel inline styles with CSS classes"
```

---

### Task 4: Settings Panel - Card Layout

**Files:**
- Modify: `src/renderer/src/components/SettingsPanel.tsx`

**Step 1: Wrap each `<section className="settings-section">` in a `<div className="card">`**

Replace every:
```tsx
<section className="settings-section">
  <h3>Section Title</h3>
  ...
</section>
```

With:
```tsx
<div className="card">
  <h3 className="card-title">Section Title</h3>
  ...
</div>
```

Remove the old `settings-section` wrapper - use `card` instead.

**Step 2: Verify**

Run: `npm run typecheck && npm run build`
Expected: Clean

**Step 3: Commit**

```bash
git add src/renderer/src/components/SettingsPanel.tsx
git commit -m "style: use card layout for settings panel sections"
```

---

### Task 5: StatusIndicator - Visual Refinement

**Files:**
- Modify: `src/renderer/src/components/StatusIndicator.tsx`
- Modify: `src/renderer/src/styles/global.css`

**Step 1: Add refined status indicator CSS**

Add to `global.css`:

```css
/* Refined Status Indicator */
.status-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px;
  gap: 20px;
}

.status-orb {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all var(--transition-normal);
}

.status-orb-glow {
  position: absolute;
  width: 140%;
  height: 140%;
  border-radius: 50%;
  filter: blur(20px);
  opacity: 0.3;
  transition: all var(--transition-normal);
}

.status-orb.ready {
  background: linear-gradient(135deg, #2a2a4a, #1a1a2e);
  box-shadow: inset 0 2px 4px rgba(255,255,255,0.05);
}

.status-orb.ready .status-orb-glow {
  background: var(--bg-tertiary);
}

.status-orb.recording {
  background: linear-gradient(135deg, #e94560, #ff6b6b);
  animation: pulse-recording 2s ease-in-out infinite;
}

.status-orb.recording .status-orb-glow {
  background: var(--accent);
  opacity: 0.4;
  animation: glowPulse 2s ease-in-out infinite;
}

.status-orb.processing {
  background: linear-gradient(135deg, #ffc107, #ffd93d);
  animation: pulse-processing 1.5s ease-in-out infinite;
}

.status-orb.processing .status-orb-glow {
  background: var(--warning);
  opacity: 0.35;
}

@keyframes glowPulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.15); opacity: 0.5; }
}

.status-orb-icon {
  font-size: 32px;
  z-index: 1;
  color: rgba(255,255,255,0.9);
}

.status-label {
  text-align: center;
}

.status-label h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.status-label p {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.record-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 28px;
  font-size: 14px;
  font-weight: 600;
  background: var(--accent);
  border: none;
  border-radius: 24px;
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
}

.record-btn:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.record-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.record-btn-icon {
  font-size: 16px;
}
```

**Step 2: Update StatusIndicator.tsx**

```tsx
export function StatusIndicator({
  isRecording,
  isProcessing,
  modelStatus,
  onToggle
}: StatusIndicatorProps): JSX.Element {
  const getStatusText = (): string => {
    if (isProcessing) return 'Processing...'
    if (isRecording) return 'Listening...'
    return 'Ready'
  }

  const getStatusClass = (): string => {
    if (isProcessing) return 'processing'
    if (isRecording) return 'recording'
    return 'ready'
  }

  const modelsReady = modelStatus.whisperLoaded && modelStatus.llmLoaded

  return (
    <div className="status-indicator">
      <div className={`status-orb ${getStatusClass()}`}>
        <div className="status-orb-glow" />
        <span className="status-orb-icon">
          {isProcessing ? '\u23F3' : isRecording ? '\uD83C\uDFA4' : '\uD83C\uDF99\uFE0F'}
        </span>
      </div>

      <div className="status-label">
        <h2>{getStatusText()}</h2>
        {!modelsReady && (
          <p className="model-warning">Models not loaded. Download required models to start.</p>
        )}
      </div>

      <button className="record-btn" onClick={onToggle} disabled={!modelsReady || isProcessing}>
        <span className="record-btn-icon">{isRecording ? '\u23F9' : '\u25CF'}</span>
        {isRecording ? 'Stop' : 'Start'} Recording
      </button>
    </div>
  )
}
```

**Step 3: Remove old `.status-circle*` and `.record-button` CSS rules**

Delete the old status circle CSS classes from global.css.

**Step 4: Verify**

Run: `npm run typecheck && npm run build`
Expected: Clean

**Step 5: Commit**

```bash
git add src/renderer/src/components/StatusIndicator.tsx src/renderer/src/styles/global.css
git commit -m "style: refine StatusIndicator with orb glow and pill button"
```

---

### Task 6: TranscriptionHistory - Polish

**Files:**
- Modify: `src/renderer/src/components/TranscriptionHistory.tsx`
- Modify: `src/renderer/src/styles/global.css`

**Step 1: Add relative time formatter**

Replace the `formatTime` function:

```tsx
function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return new Date(timestamp).toLocaleDateString()
}
```

**Step 2: Add hover styles for history items**

Add to `global.css`:

```css
.history-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  transition: all var(--transition-fast);
}

.history-item:hover {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(22, 33, 62, 0.8);
}

.history-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.history-item:hover .history-actions {
  opacity: 1;
}
```

**Step 3: Better empty state**

Update the empty state JSX:

```tsx
if (history.length === 0) {
  return (
    <div className="transcription-history empty">
      <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>&#127908;</div>
      <p>No transcriptions yet</p>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
        Press the hotkey to start recording
      </p>
    </div>
  )
}
```

**Step 4: Verify**

Run: `npm run typecheck && npm run build`
Expected: Clean

**Step 5: Commit**

```bash
git add src/renderer/src/components/TranscriptionHistory.tsx src/renderer/src/styles/global.css
git commit -m "style: polish TranscriptionHistory with relative time and hover effects"
```

---

### Task 7: Floating Widget Redesign

**Files:**
- Modify: `src/renderer/widget.html`
- Modify: `src/main/index.ts`

**Step 1: Update widget dimensions in main process**

In `src/main/index.ts`, find `createFloatingWidget` function and change:
- width: 200 -> 280
- height: 60 -> 56

**Step 2: Redesign widget HTML/CSS**

Replace the entire `widget.html` content:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Local Typeless Widget</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: transparent;
        overflow: hidden;
        -webkit-app-region: drag;
      }

      .widget {
        width: 280px;
        height: 56px;
        background: rgba(22, 22, 38, 0.85);
        border-radius: 14px;
        display: flex;
        align-items: center;
        padding: 0 16px;
        gap: 10px;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05);
      }

      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #3a3a5a;
        transition: all 0.3s ease;
        flex-shrink: 0;
      }

      .status-dot.recording {
        background: #e94560;
        box-shadow: 0 0 8px rgba(233, 69, 96, 0.6);
        animation: dotPulse 1.5s ease-in-out infinite;
      }

      .status-dot.processing {
        background: #ffc107;
        box-shadow: 0 0 8px rgba(255, 193, 7, 0.5);
        animation: dotPulse 0.8s ease-in-out infinite;
      }

      @keyframes dotPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.3); }
      }

      .status-text {
        flex: 1;
        font-size: 12px;
        color: rgba(234, 234, 234, 0.9);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        letter-spacing: 0.2px;
      }

      .waveform {
        display: none;
        align-items: center;
        gap: 2px;
        height: 24px;
        flex-shrink: 0;
      }

      .widget.recording .waveform { display: flex; }

      .waveform .bar {
        width: 3px;
        background: #e94560;
        border-radius: 1.5px;
        animation: wave 0.6s ease-in-out infinite;
        opacity: 0.8;
      }

      .waveform .bar:nth-child(1) { animation-delay: 0s; height: 8px; }
      .waveform .bar:nth-child(2) { animation-delay: 0.08s; height: 12px; }
      .waveform .bar:nth-child(3) { animation-delay: 0.16s; height: 16px; }
      .waveform .bar:nth-child(4) { animation-delay: 0.24s; height: 20px; }
      .waveform .bar:nth-child(5) { animation-delay: 0.32s; height: 16px; }
      .waveform .bar:nth-child(6) { animation-delay: 0.40s; height: 12px; }
      .waveform .bar:nth-child(7) { animation-delay: 0.48s; height: 8px; }
      .waveform .bar:nth-child(8) { animation-delay: 0.56s; height: 6px; }

      @keyframes wave {
        0%, 100% { transform: scaleY(0.4); }
        50% { transform: scaleY(1); }
      }
    </style>
  </head>
  <body>
    <div id="widget" class="widget">
      <div id="status-dot" class="status-dot"></div>
      <span id="status-text" class="status-text">Ready</span>
      <div class="waveform">
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
      </div>
    </div>

    <script>
      const widget = document.getElementById('widget')
      const statusDot = document.getElementById('status-dot')
      const statusText = document.getElementById('status-text')

      window.api?.onRecordingStateChanged?.((state) => {
        widget.classList.remove('recording', 'processing')

        if (state.isProcessing) {
          widget.classList.add('processing')
          statusDot.classList.remove('recording')
          statusDot.classList.add('processing')
          statusText.textContent = 'Processing...'
        } else if (state.isRecording) {
          widget.classList.add('recording')
          statusDot.classList.remove('processing')
          statusDot.classList.add('recording')
          statusText.textContent = 'Listening...'
        } else {
          statusDot.classList.remove('recording', 'processing')
          statusText.textContent = 'Ready'
        }
      })

      window.api?.onTranscriptionPartial?.((data) => {
        if (data.rawText) {
          statusText.textContent = data.rawText.slice(-40)
        }
      })
    </script>
  </body>
</html>
```

**Step 3: Verify**

Run: `npm run build`
Expected: Clean build

**Step 4: Commit**

```bash
git add src/renderer/widget.html src/main/index.ts
git commit -m "style: redesign floating widget with glass morphism and 8-bar waveform"
```

---

### Task 8: Final Cleanup & Verification

**Files:**
- Modify: `src/renderer/src/styles/global.css` (remove dead CSS)

**Step 1: Remove orphaned CSS rules**

Remove these old rules that are no longer referenced:
- `.app-header`, `.app-header h1`
- `.tab-bar`, `.tab`, `.tab:hover`, `.tab.active`
- `.app-footer`
- `.status-circle`, `.status-circle.ready`, `.status-circle.recording`, `.status-circle.processing`
- `.status-circle .pulse`, `.status-circle.recording .pulse`
- Old `.status-circle-recording`, `.status-circle-processing`, `.status-circle-ready`
- `.record-button`, `.record-button:hover`, `.record-button:disabled`

**Step 2: Run full verification**

Run: `npm run typecheck`
Expected: Clean

Run: `npm run test`
Expected: All 153+ tests pass

Run: `npm run build`
Expected: Clean build

**Step 3: Commit**

```bash
git add src/renderer/src/styles/global.css
git commit -m "chore: remove orphaned CSS rules from UI redesign"
```
