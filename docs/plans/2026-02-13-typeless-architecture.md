# Typeless.app 完整架構分析

> 逆向分析日期: 2026-02-13
> 分析版本: Typeless v1.0.0 (Build 1.0.0.79)
> Build 日期: 2026-02-10

---

## 1. App Metadata

| 項目 | 值 |
|------|-----|
| Bundle Identifier | `now.typeless.desktop` |
| Electron 版本 | 33.4.11 |
| 架構 | ARM64 (Apple Silicon native) |
| macOS 最低版本 | 11.0 (Big Sur) |
| Target SDK | macOS 14.5 (Sonoma) |
| Code Signing | Developer ID, Notarized (Team: 947QKAND4W - Simply LLC) |
| App Category | `public.app-category.developer-tools` |
| Custom URL Scheme | `typeless://` |
| 總大小 | ~500 MB |
| app.asar 大小 | 178 MB (13,661 files) |
| Copyright | Copyright © 2026 Typeless |

---

## 2. Multi-Process 架構

Typeless 採用標準 Electron multi-process 模型，共 5 個 process：

```
┌─────────────────────────────────────────────────────┐
│                   Main Process                       │
│  (Typeless binary → Electron Framework)             │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Audio   │ │   ASR    │ │   LLM    │            │
│  │ Capture  │ │ Engine   │ │ Engine   │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Text    │ │  Model   │ │ Database │            │
│  │ Injector │ │Downloader│ │ (Drizzle)│            │
│  └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────────────┐                               │
│  │  Opus Worker     │ (Worker Thread)               │
│  │  (opusWorker.js) │                               │
│  └──────────────────┘                               │
└─────────────────────────────────────────────────────┘
        │ IPC (contextBridge)
        ▼
┌─────────────────────────────────────────────────────┐
│               Renderer Processes                     │
│  ┌───────────┐ ┌──────────┐ ┌────────────────┐     │
│  │ Hub       │ │ Sidebar  │ │ Floating Bar   │     │
│  │ (React)   │ │ (React)  │ │ (vanilla JS)   │     │
│  └───────────┘ └──────────┘ └────────────────┘     │
│  ┌───────────────┐                                  │
│  │ Onboarding    │                                  │
│  │ (React)       │                                  │
│  └───────────────┘                                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Helper Processes (macOS .app bundles)               │
│  • Typeless Helper.app        (General helper)      │
│  • Typeless Helper (GPU).app  (GPU acceleration)    │
│  • Typeless Helper (Renderer).app (Web content)     │
│  • Typeless Helper (Plugin).app   (Extensions)      │
│  All: LSUIElement=true, Bundle ID suffix matching   │
└─────────────────────────────────────────────────────┘
```

---

## 3. 依賴分析

### 3.1 核心 Runtime Dependencies

| Package | Version | 用途 |
|---------|---------|------|
| `@libsql/client` | ^0.15.9 | LibSQL database client（SQLite 的現代 fork） |
| `drizzle-orm` | ^0.44.2 | Type-safe ORM，管理 database schema + migration |
| `sqlite3` | ^5.1.7 | 原生 SQLite binding |
| `koffi` | ^2.11.0 | FFI library，用於呼叫 native Opus encoder |
| `electron-updater` | ^6.3.9 | 自動更新機制 |
| `electron-store` | ^10.0.1 | Persistent key-value 設定儲存 |
| `@sentry/electron` | ^7.5.0 | Error tracking + crash reporting |
| `@microsoft/clarity` | ^1.0.2 | 使用者行為分析 |
| `crypto-js` | ^4.2.0 | 加密/解密工具 |
| `undici` | ^7.16.0 | HTTP client（取代 node-fetch） |
| `node-schedule` | ^2.1.1 | Job scheduling |
| `diff` | ^8.0.2 | 文字差異比對 |
| `js-yaml` | ^4.1.0 | YAML 解析 |
| `plist` | ^3.1.0 | macOS plist 解析 |
| `dotenv` | ^16.5.0 | 環境變數管理 |
| `compare-versions` | ^6.1.1 | 版本號比較 |

### 3.2 UI Dependencies

| Package | Version | 用途 |
|---------|---------|------|
| `react` | latest | UI framework |
| `echarts` | ^6.0.0 | 數據視覺化（圖表） |
| `echarts-for-react` | ^3.0.5 | React echarts wrapper |
| `@floating-ui/react` | ^0.27.16 | Floating UI 定位（tooltips, popovers） |
| `@tanstack/react-virtual` | ^3.13.12 | Virtual scrolling（高效長列表渲染） |
| `notistack` | ^3.0.2 | Notification/toast 系統 |

### 3.3 Native Libraries (app.asar.unpacked)

| Library | 平台 | 用途 |
|---------|------|------|
| `@libsql/darwin-arm64/index.node` | macOS ARM64 | LibSQL native binding |
| `@libsql/darwin-x64/index.node` | macOS x64 | LibSQL native binding |
| `koffi/build/koffi/darwin_arm64/koffi.node` | macOS ARM64 | FFI native binding |
| `koffi/build/koffi/darwin_x64/koffi.node` | macOS x64 | FFI native binding |
| `sqlite3/build/Release/node_sqlite3.node` | Multi-arch | SQLite native binding |
| `libopusenc_unified_macos.dylib` | macOS | Opus 音訊編碼 native library |

---

## 4. IPC 通訊通道

### 4.1 Recording Controls

| Channel | 方向 | 用途 |
|---------|------|------|
| `recording:start` | Renderer → Main | 開始錄音 |
| `recording:stop` | Renderer → Main | 停止錄音 |
| `recording:state-changed` | Main → Renderer (broadcast) | 錄音狀態更新（isRecording, isProcessing, vadActive） |

### 4.2 Transcription Events

| Channel | 方向 | 用途 |
|---------|------|------|
| `transcription:partial` | Main → Renderer | 即時原始轉錄文字 |
| `transcription:complete` | Main → Renderer | 完整結果（含 rewritten text） |

### 4.3 Settings

| Channel | 方向 | 用途 |
|---------|------|------|
| `settings:get` | Renderer → Main | 讀取設定 |
| `settings:set` | Renderer → Main | 寫入設定 |

### 4.4 Model Management

| Channel | 方向 | 用途 |
|---------|------|------|
| `model:status` | Renderer → Main | 查詢 model 狀態 |
| `model:download` | Renderer → Main | 觸發 model 下載 |
| `model:download-progress` | Main → Renderer | 下載進度回報 |
| `model:profiles` | Renderer → Main | 取得 model profile 列表 |
| `model:set-profile` | Renderer → Main | 切換 model profile |

### 4.5 Window Controls

| Channel | 方向 | 用途 |
|---------|------|------|
| `widget:show` | Renderer → Main | 顯示 floating widget |
| `widget:hide` | Renderer → Main | 隱藏 floating widget |
| `settings:show` | Renderer → Main | 開啟設定視窗 |

---

## 5. Database Schema

### 5.1 設計哲學

Typeless 採用**單表設計**（single-table design），所有資料都存在 `history` 表中。使用 Drizzle ORM + LibSQL/SQLite。

### 5.2 `history` 表結構

**核心欄位：**

| Column | Type | 說明 |
|--------|------|------|
| `id` | TEXT (PK, UNIQUE) | 主鍵 |
| `refined_text` | TEXT | AI 處理後的文字 |
| `edited_text` | TEXT | 使用者手動編輯的版本 |
| `edited_text_status` | TEXT (default: 'NOT_EXTRACTED') | 編輯文字擷取狀態 |
| `edited_text_attempts` | INTEGER (default: 0) | 擷取嘗試次數 |
| `audio` | BLOB | 原始音訊資料 |
| `audio_local_path` | TEXT | 本地音訊檔案路徑 |
| `audio_metadata` | TEXT | 音訊 metadata（JSON） |
| `audio_context` | TEXT | 音訊上下文資訊 |
| `duration` | REAL | 音訊時長（秒） |

**語言相關：**

| Column | Type | 說明 |
|--------|------|------|
| `languages` | TEXT | 語言設定 |
| `detected_language` | TEXT | 自動偵測的語言 |

**處理狀態：**

| Column | Type | 說明 |
|--------|------|------|
| `status` | TEXT | 處理狀態 |
| `mode` | TEXT (default: 'voice_transcript') | 錄音模式 |
| `mode_meta` | TEXT | 模式 metadata |
| `app_version` | TEXT (default: '0.0.0') | App 版本號 |
| `hasRevertedAI` | INTEGER | 是否已回復 AI 修改 |

**Accessibility 資料：**

| Column | Type | 說明 |
|--------|------|------|
| `ax_text` | TEXT | Accessibility 純文字 |
| `ax_html` | TEXT | Accessibility HTML |

**Application Context（目標 app 資訊）：**

| Column | Type | 說明 |
|--------|------|------|
| `focused_app` | TEXT | 焦點 app |
| `focused_app_name` | TEXT | App 名稱 |
| `focused_app_bundle_id` | TEXT | Bundle ID |
| `focused_app_window_title` | TEXT | Window title |
| `focused_app_window_web_title` | TEXT | 網頁標題 |
| `focused_app_window_web_domain` | TEXT | 網頁 domain |
| `focused_app_window_web_url` | TEXT | 網頁 URL |

**裝置 & Metadata：**

| Column | Type | 說明 |
|--------|------|------|
| `mic_device` | TEXT | 麥克風裝置名稱 |
| `mic_device_info` | BLOB | 麥克風裝置詳細資訊 |
| `user_id` | TEXT | 使用者 ID |
| `debug_info` | TEXT | Debug 資訊 |
| `client_metadata` | BLOB | Client metadata |
| `created_at` | TEXT | 建立時間 |
| `updated_at` | TEXT | 更新時間 |

### 5.3 Index 策略

```sql
-- 主鍵
CREATE UNIQUE INDEX history_id_unique ON history(id);

-- 使用者查詢（最常用）
CREATE INDEX idx_history_user_created_at ON history(user_id, created_at);
CREATE INDEX idx_history_user_status_created_at ON history(user_id, status, created_at);

-- 狀態篩選
CREATE INDEX idx_history_status ON history(status);
CREATE INDEX idx_history_detected_language ON history(detected_language);

-- Application Context 查詢（複合索引）
CREATE INDEX idx_history_user_app_name_status_created_at
  ON history(user_id, focused_app_name, status, created_at);
CREATE INDEX idx_history_user_app_bundle_id_status_created_at
  ON history(user_id, focused_app_bundle_id, status, created_at);
CREATE INDEX idx_history_user_app_name_web_domain_status_created_at
  ON history(user_id, focused_app_name, focused_app_window_web_domain, status, created_at);
CREATE INDEX idx_history_user_app_bundle_id_web_domain_status_created_at
  ON history(user_id, focused_app_bundle_id, focused_app_window_web_domain, status, created_at);
```

### 5.4 Migration 歷史

| Migration | 日期 | 變更 |
|-----------|------|------|
| 0000 | 2024-12-25 | 初始 schema（18 columns） |
| 0001 | 2024-12-28 | 新增 `debug_info` |
| 0002 | 2024-12-30 | 新增 `audio_local_path`, `audio_cloud_path`, `user_id` |
| 0003 | 2024-12-30 | 移除 `audio_cloud_path`（放棄雲端音訊儲存） |
| 0004 | 2025-01-05 | 新增 `focused_app` |
| 0005 | 2025-01-12 | 新增 `audio_metadata` |
| 0006 | 2025-01-20 | 大規模擴展：6 個 app context columns + 8 個 indexes |
| 0007 | 2025-01-21 | 新增 `mic_device_info` |
| 0008 | 2025-02-24 | 新增 `mode`（default: 'voice_transcript'） |
| 0009 | 2025-07-07 | 新增 `mode_meta` |
| 0010 | 2025-08-04 | 新增 `client_metadata` |

---

## 6. 更新機制

```yaml
# app-update.yml
provider: generic
channel: arm64
url: https://typeless-static.com/desktop-release/
updaterCacheDirName: typeless-updater
```

- 使用 `electron-updater` 搭配 generic provider
- CDN 託管在自家 `typeless-static.com`
- ARM64 和 x64 分別有不同的 update channel
- 更新檔案快取在 `typeless-updater` 目錄

---

## 7. 安全模型

### 7.1 macOS Entitlements

```xml
<!-- build/entitlements.mac.plist -->
com.apple.security.cs.allow-unsigned-executable-memory  ← JIT 需要
com.apple.security.cs.allow-jit                         ← V8 JIT 編譯
com.apple.security.network.client                       ← 網路存取
com.apple.security.device.audio-input                   ← 麥克風
```

### 7.2 Privacy 權限聲明

| 權限 | 描述 |
|------|------|
| NSMicrophoneUsageDescription | 語音指令需要麥克風存取 |
| NSCameraUsageDescription | 相機存取 |
| NSScreenCaptureUsageDescription | 螢幕錄製/分享 |
| NSBluetoothAlwaysUsageDescription | Bluetooth 裝置存取 |

### 7.3 Electron Security

- **Context Isolation**: 啟用（renderer 無法直接存取 Node.js API）
- **Sandbox**: 停用（需要 native module 存取）
- **Node Integration**: 停用
- **Preload Script**: 透過 `contextBridge` 暴露安全 API

### 7.4 App Transport Security

```
允許 localhost (127.0.0.1) 使用 HTTP（開發用）
TLS 最低版本: 1.0（僅限 localhost）
```

---

## 8. Native Integration

### 8.1 Koffi FFI

Typeless 使用 `koffi` (Foreign Function Interface) 呼叫 native macOS library：
- **目標**: `libopusenc_unified_macos.dylib`（Opus 音訊編碼器）
- **架構**: 在 Worker Thread 中執行，避免阻塞 main thread
- **多平台支援**: 包含 Linux/FreeBSD/OpenBSD/Windows 的 build（app.asar.unpacked）

### 8.2 AppleScript Integration

透過 AppleScript 與 macOS Accessibility API 互動：
- 文字注入到當前焦點的 app
- 讀取焦點 app 的名稱、window title
- 檢查和請求 Accessibility 權限

### 8.3 Global Shortcuts

- 預設熱鍵: `CommandOrControl+Shift+Space`
- 透過 Electron `globalShortcut` 模組註冊
- 可在 Settings 中自訂

---

## 9. Build & Distribution

### 9.1 Build 產物

```
dist/
├── main/
│   ├── index.js              (109 KB, minified)
│   └── worker/
│       └── opusWorker.js     (Worker thread)
├── preload/
│   └── index.mjs             (4.3 KB)
└── renderer/
    ├── hub.html
    ├── sidebar.html
    ├── floating-bar.html
    ├── onboarding.html
    └── static/
        ├── js/               (62 code-split chunks)
        ├── css/
        ├── fonts/            (KaTeX, Prompt, SF-Pro)
        ├── svg/
        ├── webp/             (50+ 整合平台 icons)
        └── wav/              (record-start/end sounds)
```

### 9.2 ASAR Integrity

```
ElectronAsarIntegrity: {
  algorithm: SHA256
  hash: 601d7b814d860c9580472b5ed12d0b3261110de735b25ea29b5de3d37e621e2a
}
```

### 9.3 環境需求

- Node.js >= 22
- npm >= 10
- macOS 11.0+

---

## 10. 40+ 整合平台

Typeless 支援與以下平台整合（透過 context-aware 偵測焦點 app）：

**AI 平台**: ChatGPT, Claude, Gemini, Perplexity
**通訊**: Slack, Discord, LinkedIn, Email
**筆記**: Notion, Obsidian, Evernote
**文件**: Google Docs
**程式**: GitHub, Warp, Arc Browser
**專案管理**: Linear, Jira, Monday, Trello, ClickUp
**Email**: Superhuman
