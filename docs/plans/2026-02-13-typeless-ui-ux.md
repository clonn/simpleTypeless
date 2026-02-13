# Typeless.app UI/UX 架構分析

> 逆向分析日期: 2026-02-13
> 分析版本: Typeless v1.0.0 (Build 1.0.0.79)

---

## 1. 多視窗系統

Typeless 使用 4 個獨立的 BrowserWindow，各有不同用途：

```
┌─────────────────────────────────────────────────────────────────┐
│  macOS Desktop                                                   │
│                                                                  │
│  ┌──────────────────────────────────┐                           │
│  │  Hub Window (主介面)              │    ┌──────────────────┐  │
│  │  800x600, resizable              │    │ Sidebar Window   │  │
│  │  Hidden on startup               │    │ 側邊面板          │  │
│  │  React SPA                       │    │ React SPA        │  │
│  │                                  │    │                  │  │
│  │  ┌─ Tabs ─────────────────────┐ │    │                  │  │
│  │  │ Status │ Models │ Settings │ │    │                  │  │
│  │  └────────────────────────────┘ │    │                  │  │
│  │                                  │    └──────────────────┘  │
│  └──────────────────────────────────┘                           │
│                                                                  │
│  ┌──────────────────────────────────────────┐                   │
│  │  Floating Bar (浮動控制列)                 │                   │
│  │  200x60, frameless, transparent, always-on-top               │
│  │  Vanilla JS (非 React)                    │                   │
│  │  [● Status] [Waveform bars] [Text]        │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                  │
│  ┌──────────────────────────────────┐                           │
│  │  Onboarding Window               │                           │
│  │  首次使用引導流程                  │                           │
│  │  React SPA                       │                           │
│  └──────────────────────────────────┘                           │
│                                                                  │
│  [Tray Icon] ← System Tray Menu                                │
│  ├─ Open Settings                                               │
│  ├─ Toggle Widget                                               │
│  └─ Quit                                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Window 詳細配置

### 2.1 Hub Window（主介面）

| 屬性 | 值 |
|------|-----|
| 尺寸 | 800 x 600 px |
| Resizable | Yes |
| Auto-hide Menu Bar | Yes |
| Show on Startup | No (hidden) |
| Entry Point | `hub.html` |
| Framework | React |
| Preload | `dist/preload/index.mjs` |
| Context Isolation | Enabled |
| Sandbox | Disabled |
| Node Integration | Disabled |

### 2.2 Sidebar Window

| 屬性 | 值 |
|------|-----|
| Entry Point | `sidebar.html` |
| Framework | React |
| 用途 | 側邊面板快速存取 |

### 2.3 Floating Bar Window（浮動控制列）

| 屬性 | 值 |
|------|-----|
| 尺寸 | 200 x 60 px |
| Resizable | No |
| Frameless | Yes (無標題列) |
| Transparent | Yes (透明背景) |
| Always on Top | Yes |
| Visible on All Workspaces | Yes |
| Skip Taskbar | Yes (不在 Dock 顯示) |
| Has Shadow | No |
| Entry Point | `floating-bar.html` |
| Framework | Vanilla JS (非 React) |

### 2.4 Onboarding Window

| 屬性 | 值 |
|------|-----|
| Entry Point | `onboarding.html` |
| Framework | React |
| 用途 | 首次使用引導流程 |

---

## 3. React 組件架構

### 3.1 組件樹

```
App (Root)
│
├── Header
│   ├── Logo / Title
│   └── Tab Bar
│       ├── "Status" tab
│       ├── "Models" tab
│       └── "Settings" tab
│
├── Content Area (根據 active tab 切換)
│   │
│   ├── [Status Tab]
│   │   ├── StatusIndicator
│   │   │   ├── Status Circle (120x120px)
│   │   │   │   ├── 綠色 = Ready
│   │   │   │   ├── 紅色 + pulse animation = Recording
│   │   │   │   └── 黃色 + pulse animation = Processing
│   │   │   ├── Status Text ("Ready" / "Listening..." / "Processing...")
│   │   │   └── Start/Stop Button (disabled if models not loaded)
│   │   │
│   │   └── TranscriptionHistory
│   │       └── List (max 50 items)
│   │           └── TranscriptionItem
│   │               ├── Timestamp + Duration
│   │               ├── Raw Text (原始轉錄)
│   │               ├── Rewritten Text (AI 處理後)
│   │               └── Copy Button
│   │
│   ├── [Models Tab]
│   │   └── ModelStatusPanel
│   │       ├── ASR Model Card
│   │       │   ├── Model Name + Version
│   │       │   ├── Status Badge (Ready/Downloading/Missing)
│   │       │   ├── Download Progress Bar
│   │       │   └── HuggingFace Link
│   │       │
│   │       └── LLM Model Card
│   │           ├── Model Name + Version
│   │           ├── Status Badge
│   │           ├── Download Progress Bar
│   │           └── HuggingFace Link
│   │
│   └── [Settings Tab]
│       └── SettingsPanel
│           ├── General Section
│           │   ├── Global Hotkey (keyboard capture)
│           │   ├── Auto-inject Toggle
│           │   └── Floating Widget Toggle
│           │
│           ├── Writing Mode Section
│           │   ├── General (default)
│           │   ├── Email
│           │   ├── Code/Technical
│           │   └── Notes/Brainstorm
│           │
│           └── Model Profile Section
│               ├── Balanced (16GB, recommended)
│               ├── Lightweight (8GB)
│               ├── English Optimized (12GB)
│               └── Maximum Quality (32GB)
│
└── Footer
    ├── Model Status Indicators (green/red dots)
    └── Hotkey Hint Text
```

### 3.2 Custom Hooks

#### `useRecordingState()`
- 訂閱 `recording:state-changed` IPC 事件
- 回傳 `{ isRecording, isProcessing, vadActive }`
- 自動 cleanup（unmount 時取消訂閱）

#### `useModelStatus()`
- 查詢 model 載入/下載狀態
- 訂閱 `model:download-progress` 事件
- 提供 `refresh()` 方法手動刷新
- 回傳 ASR 和 LLM 的狀態資訊

---

## 4. Preload Bridge API

Preload script 透過 `contextBridge` 暴露以下安全 API 到 renderer：

### 4.1 控制方法（Renderer → Main）

```typescript
window.api = {
  // Recording
  startRecording(): Promise<void>,
  stopRecording(): Promise<void>,

  // Settings
  getSettings(): Promise<AppSettings>,
  setSettings(partial: Partial<AppSettings>): Promise<AppSettings>,

  // Models
  getModelStatus(): Promise<ModelStatus>,
  downloadModel(type: 'whisper' | 'llm'): Promise<void>,

  // Widget
  showWidget(): void,
  hideWidget(): void,
}
```

### 4.2 Event Listeners（Main → Renderer）

```typescript
window.api = {
  // 返回 unsubscribe function
  onRecordingStateChanged(callback: (state) => void): () => void,
  onTranscriptionPartial(callback: (data) => void): () => void,
  onTranscriptionComplete(callback: (result) => void): () => void,
  onModelDownloadProgress(callback: (progress) => void): () => void,
}
```

### 4.3 Preload 額外功能

- **Sentry 初始化**: 在 preload 階段初始化 error tracking
- **Loading UI**: 管理 loading spinner overlay
- **Context Bridge**: 安全的 IPC 通訊橋接

---

## 5. Floating Bar（浮動控制列）細節

### 5.1 為什麼不用 React？

Floating bar 使用 vanilla JavaScript 而非 React，原因可能是：
- 極小的 bundle size（200x60px 視窗不需要 React overhead）
- 更快的啟動速度
- 更低的記憶體佔用

### 5.2 DOM 結構

```html
<div id="widget">
  <div id="status-dot" class="status-ready"></div>
  <div id="waveform">
    <div class="bar"></div>
    <div class="bar"></div>
    <div class="bar"></div>
    <div class="bar"></div>
    <div class="bar"></div>
  </div>
  <div id="status-text">Ready</div>
</div>
```

### 5.3 視覺設計

```css
/* 半透明深色卡片 */
#widget {
  background: rgba(26, 26, 46, 0.9);
  backdrop-filter: blur(10px);          /* 毛玻璃效果 */
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
}

/* Status dot 動畫 */
.status-recording {
  background: #e94560;
  animation: pulse 2s ease-in-out infinite;
}
.status-processing {
  background: #ffc107;
  animation: pulse 2s ease-in-out infinite;
}
.status-ready {
  background: #00d9a5;
}

/* Waveform bars 動畫 */
.bar {
  width: 3px;
  background: #e94560;
  animation: wave 0.5s ease-in-out infinite alternate;
}
```

### 5.4 狀態切換

```
Ready       → 綠色 dot, "Ready" text, bars 隱藏
Recording   → 紅色 pulse dot, "Listening..." text, bars 動畫
Processing  → 黃色 pulse dot, "Processing..." text, bars 隱藏
```

---

## 6. Design System

### 6.1 CSS Variables (Dark Theme)

```css
:root {
  --bg-primary: #1a1a2e;       /* 主背景（深海軍藍） */
  --bg-secondary: #16213e;     /* 次要背景 */
  --bg-tertiary: #0f3460;      /* 第三層背景 */
  --text-primary: #eaeaea;     /* 主要文字 */
  --text-secondary: #a0a0a0;   /* 次要文字 */
  --accent: #e94560;           /* 強調色（紅/粉） */
  --accent-hover: #ff6b6b;     /* 強調色 hover */
  --success: #00d9a5;          /* 成功綠 */
  --warning: #ffc107;          /* 警告黃 */
  --border: #2a2a4a;           /* 邊框色 */
}
```

### 6.2 Typography

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

額外字型資源（Production）：
- KaTeX fonts (數學公式渲染)
- Prompt font family
- SF-Pro (Apple 系統字型)

### 6.3 動畫

| 動畫 | Duration | 用途 |
|------|----------|------|
| `pulse` | 2s ease-in-out | Status circle 錄音/處理中 |
| `wave` | 0.5s ease-in-out alternate | Waveform bars |
| `transition` | 0.2s ease | 一般 hover/focus 過渡 |

### 6.4 設計特徵

- Dark theme（深色主題為主）
- Glass-morphic effects（毛玻璃效果在 floating bar）
- Rounded corners（6-8px 圓角）
- Status-driven colors（顏色隨狀態變化）
- Minimal chrome（最少的視窗裝飾）

---

## 7. 40+ 整合平台 UI 實作

### 7.1 整合方式

Typeless 透過偵測 `focused_app` 的 bundle ID 和 window title 來判斷使用者正在使用的平台，並根據不同平台調整行為：

```
偵測邏輯:
1. 讀取焦點 app 的 Bundle ID (e.g., com.tinyspeck.slackmacgap)
2. 讀取 window title
3. 若為 browser → 額外讀取 web page URL 和 domain
4. 匹配 integration 設定
5. 調整 injection 策略（如 Slack 需要不同的按鍵模擬）
```

### 7.2 支援的平台分類

**AI 助手**:
- ChatGPT (web)
- Claude (web)
- Gemini (web)
- Perplexity (web)

**通訊工具**:
- Slack (native + web)
- Discord (native + web)
- LinkedIn (web)

**筆記 & 文件**:
- Notion (native + web)
- Obsidian (native)
- Evernote (native)
- Google Docs (web)

**專案管理**:
- Linear (native + web)
- Jira (web)
- Monday (web)
- Trello (web)
- ClickUp (web)

**程式開發**:
- GitHub (web)
- Warp (native terminal)
- Arc Browser (native)

**Email**:
- Superhuman (native + web)
- 一般 email clients

### 7.3 整合 UI 資源

Production 版本包含 50+ webp 格式的整合平台 icon：
```
dist/renderer/static/webp/
├── chatgpt.webp
├── claude.webp
├── gemini.webp
├── slack.webp
├── discord.webp
├── notion.webp
├── obsidian.webp
├── ... (50+ icons)
```

### 7.4 ECharts 視覺化

Production 版本使用 `echarts` + `echarts-for-react` 提供數據視覺化：
- 可能用於顯示使用統計
- 按 app/platform 分類的使用頻率圖表
- 轉錄歷史趨勢

---

## 8. Virtual Scrolling

使用 `@tanstack/react-virtual` 實作高效長列表渲染：
- TranscriptionHistory 可能有大量記錄
- Virtual scrolling 只渲染可見區域的 DOM 元素
- 顯著改善大量歷史記錄時的效能

---

## 9. Notification System

使用 `notistack` 提供 toast notification：
- 模型下載完成通知
- 錯誤提示
- 設定變更確認

---

## 10. 音效反饋

```
dist/renderer/static/wav/
├── record-start.wav     ← 開始錄音時播放
└── record-end.wav       ← 停止錄音時播放
```

使用音效提供錄音狀態的聽覺反饋，讓使用者不需看螢幕也知道錄音狀態。

---

## 11. Renderer Build 輸出

Production 版本的 renderer 經過高度 code splitting：

```
dist/renderer/static/js/
├── index.js          (主 entry chunk)
├── index2.js         (第 2 chunk)
├── index3.js
├── ...
└── index61.js        (第 61 chunk，共 62 個)

dist/renderer/static/css/
├── (stylesheets)

dist/renderer/static/fonts/
├── KaTeX_*.woff2     (KaTeX 數學字型)
├── Prompt-*.ttf      (Prompt 字型家族)
└── SF-Pro-*.otf      (Apple SF-Pro)
```

62 個 JS chunks 表示使用了大量的 dynamic import 和 lazy loading。
