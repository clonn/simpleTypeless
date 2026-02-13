# Typeless.app vs project_typeless 對比分析

> 分析日期: 2026-02-13
> Typeless.app 版本: v1.0.0 (Build 1.0.0.79)
> project_typeless 版本: v0.1.0

---

## 1. 技術選型對比表

| 面向 | Typeless.app (Production) | project_typeless (Local) | 備註 |
|------|--------------------------|-------------------------|------|
| **Electron** | v33.4.11 | v28.0.0 | Production 版本新 5 個大版本 |
| **Build Tool** | Vite (ES modules) | electron-vite 2.0.0 + Vite 5.0 | 相同 build 工具鏈 |
| **UI Framework** | React (latest) | React 18.2.0 | 基本一致 |
| **Language** | TypeScript | TypeScript 5.3.0 | 一致 |
| **ASR Engine** | Whisper.cpp (child process) | Whisper.cpp (child process) | 架構一致 |
| **LLM Engine** | Llama.cpp (child process) | Llama.cpp (child process) | 架構一致 |
| **Default ASR Model** | Whisper Large-v3-Turbo (Q5_0) | Whisper Large-v3-Turbo (Q5_0) | 完全一致 |
| **Default LLM Model** | Qwen 2.5-3B-Instruct (Q4_K_M) | Qwen 2.5-3B-Instruct (Q4_K_M) | 完全一致 |
| **Database** | LibSQL + Drizzle ORM + SQLite | 無 | **重大差異** |
| **Audio Encoding** | Opus (FFI via koffi, Worker Thread) | 無 | **重大差異** |
| **Error Tracking** | Sentry + Microsoft Clarity | 無 | Production 才需要 |
| **Auto Update** | electron-updater + generic CDN | 無 | Production 才需要 |
| **Settings Storage** | electron-store | electron-store (implicit) | 一致 |
| **Text Injection** | AppleScript + Accessibility API | AppleScript + Accessibility API | 一致 |
| **VAD** | Silero VAD | Silero VAD | 一致 |
| **Windows** | 4 (Hub, Sidebar, Floating Bar, Onboarding) | 2 (Main, Widget) | Production 更多視窗 |
| **Integrations** | 40+ 平台 | 無 | **重大差異** |
| **Code Signing** | Notarized Developer ID | 無 | Distribution 需要 |
| **Virtual Scrolling** | @tanstack/react-virtual | 無 | 效能優化 |
| **Charts** | echarts | 無 | 數據視覺化 |
| **Notification** | notistack | 無 | UX 優化 |
| **HTTP Client** | undici | (Node.js built-in) | Production 用更高效的 |
| **Encryption** | crypto-js | 無 | 安全需求 |

---

## 2. Typeless 有但 project_typeless 缺少的功能

### 2.1 高優先級（核心功能差異）

#### Database + History 系統
- **Typeless**: 完整的 SQLite database，用 Drizzle ORM 管理 schema，11 次 migration
- **project_typeless**: 僅在 memory 中保留最近 50 筆記錄
- **影響**: 無法持久化歷史、無法跨 session 查詢

#### Opus Audio Encoding
- **Typeless**: 使用 koffi FFI 呼叫 native Opus encoder，在 Worker Thread 中執行
- **project_typeless**: 沒有音訊編碼/壓縮
- **影響**: 無法高效儲存音訊檔案

#### Application Context 追蹤
- **Typeless**: 記錄焦點 app 的完整資訊（name, bundle ID, window title, web URL/domain）
- **project_typeless**: TextInjector 僅做注入，不記錄 context
- **影響**: 無法按 app 分類歷史記錄，無法做整合分析

#### Sidebar Window
- **Typeless**: 獨立的 sidebar 視窗，提供快速存取
- **project_typeless**: 只有 main window 和 floating widget
- **影響**: UX 差異，但非核心阻礙

#### Onboarding 流程
- **Typeless**: 獨立的 onboarding window 引導首次使用
- **project_typeless**: 無 onboarding
- **影響**: 新使用者體驗

### 2.2 中優先級（體驗優化）

#### Virtual Scrolling
- 長列表效能優化（@tanstack/react-virtual）
- 對大量歷史記錄的渲染效能有顯著影響

#### 數據視覺化
- echarts 圖表（使用統計、趨勢分析）
- 增加 app 的專業感和使用洞察

#### Notification System
- notistack toast 通知
- 比 console.log 更好的使用者反饋

#### 音效反饋
- record-start.wav / record-end.wav
- 不看螢幕也能知道錄音狀態

#### 多整合平台支援
- 40+ 平台的 icon 和 context-aware 行為
- 根據不同 app 調整 injection 策略

### 2.3 低優先級（Production 功能）

| 功能 | 說明 |
|------|------|
| Sentry Error Tracking | Production crash reporting |
| Microsoft Clarity | 使用者行為分析 |
| electron-updater | 自動更新 |
| Code Signing | macOS notarization |
| crypto-js | 資料加密 |
| Custom URL Scheme | `typeless://` deep link |

---

## 3. 架構差異分析

### 3.1 Process Model

```
Typeless.app:                        project_typeless:
┌──────────────┐                     ┌──────────────┐
│ Main Process │                     │ Main Process │
│ ├─ Audio     │                     │ ├─ Audio     │
│ ├─ ASR       │                     │ ├─ ASR       │
│ ├─ LLM       │                     │ ├─ LLM       │
│ ├─ Injector  │                     │ ├─ Injector  │
│ ├─ Database  │ ← 差異              │ └─ Downloader│
│ ├─ Downloader│                     └──────────────┘
│ └─ OpusWorker│ ← 差異                     │
└──────────────┘                            │ IPC
       │ IPC                                ▼
       ▼                             ┌──────────────┐
┌──────────────────────────┐        │ 2 Windows    │
│ 4 Windows                │        │ ├─ Main      │
│ ├─ Hub (React)           │        │ └─ Widget    │
│ ├─ Sidebar (React)       │        └──────────────┘
│ ├─ Floating Bar (JS)     │
│ └─ Onboarding (React)    │
└──────────────────────────┘
```

### 3.2 Data Flow 差異

**Typeless.app:**
```
Audio → Opus Encode (Worker) → Store OGG
         ↓
Audio → WAV → Whisper → rawText → LLM → rewrittenText → Inject
                                                ↓
                                         DB write (history)
                                         + app context metadata
```

**project_typeless:**
```
Audio → WAV → Whisper → rawText → LLM → rewrittenText → Inject
                                                ↓
                                         Memory (last 50)
```

### 3.3 Database 設計差異

**Typeless**: 單表設計 `history`，30+ columns，8 composite indexes
- 支援 user_id（多使用者）
- 支援 app context 查詢（按 app/domain 篩選）
- 支援 audio blob 儲存
- Migration-based schema evolution

**project_typeless**: In-memory array
- 最多 50 筆
- 無持久化
- 無查詢能力

---

## 4. 可借鑑的技術方案

### 4.1 立即可用（改動小、價值高）

| 方案 | 說明 | 預估工作量 |
|------|------|-----------|
| **音效反饋** | 加入 record-start/end 音效 | 小（1-2 個 wav 檔 + 2 行 JS） |
| **Application Context** | 在 TextInjector 中收集焦點 app 資訊 | 小（AppleScript 已有能力） |
| **Better Status UI** | 採用 Typeless 的 pulse animation + 顏色系統 | 小（CSS 改動） |

### 4.2 中期改進（架構改動、顯著提升）

| 方案 | 說明 | 預估工作量 |
|------|------|-----------|
| **Database 持久化** | 引入 better-sqlite3 或 LibSQL + Drizzle ORM | 中（schema 設計 + migration） |
| **Virtual Scrolling** | TranscriptionHistory 使用 @tanstack/react-virtual | 小-中 |
| **Notification System** | 引入 notistack 或類似方案 | 小-中 |
| **Opus Encoding** | Worker Thread + koffi FFI 音訊編碼 | 中（需要 native lib） |

### 4.3 長期目標（大型改動、完整功能）

| 方案 | 說明 | 預估工作量 |
|------|------|-----------|
| **多視窗系統** | 加入 Sidebar 和 Onboarding window | 大 |
| **40+ 平台整合** | Context-aware injection + platform detection | 大 |
| **數據視覺化** | 使用統計 dashboard (echarts) | 大 |
| **Auto Update** | electron-updater + CDN | 中-大 |
| **Electron 升級** | v28 → v33+ | 中（可能有 breaking changes） |

---

## 5. Typeless 的設計決策分析

### 5.1 為什麼用單表設計？
- SQLite 對單表查詢有最佳效能
- 所有 history 資料天然是同一 entity
- Composite indexes 處理多維度查詢
- 避免 JOIN 的效能開銷

### 5.2 為什麼 Floating Bar 用 Vanilla JS？
- 極小的 200x60px 視窗
- React 的 bundle size 對此視窗是 overkill
- 更快啟動、更低記憶體
- 只需要簡單的 DOM 操作

### 5.3 為什麼用 koffi FFI 而不是 Node.js addon？
- 不需要 node-gyp build（避免 native compilation 問題）
- 支援多平台 binary distribution
- 直接載入 .dylib/.so/.dll
- Worker Thread 中使用不阻塞 main thread

### 5.4 為什麼音訊編碼用 Opus？
- Opus 是最高效的語音編碼格式
- 比 WAV 小 10-20 倍
- 保留語音品質的同時大幅壓縮
- 適合長期儲存大量語音記錄

### 5.5 為什麼 migration 0003 移除了 cloud path？
- 初始設計考慮雲端同步
- 後來決定保持 local-first 策略
- migration 0002 → 0003 之間只隔 1 天（快速決策修正）

---

## 6. 建議的優先改進路線

### Phase 1: 基礎體驗強化（1-2 weeks）
1. 加入音效反饋（record-start/end.wav）
2. 改進 StatusIndicator 動畫（採用 Typeless 的 pulse + color 系統）
3. 在 TextInjector 中收集 app context

### Phase 2: 資料持久化（2-3 weeks）
4. 引入 better-sqlite3 + Drizzle ORM
5. 設計 history 表 schema（參考 Typeless 但簡化）
6. 實作 TranscriptionHistory 持久化
7. 加入 Virtual Scrolling

### Phase 3: 音訊管線強化（2-3 weeks）
8. 整合 Opus encoding（koffi FFI + Worker Thread）
9. 音訊檔案儲存管理
10. 播放歷史音訊功能

### Phase 4: UI/UX 擴展（3-4 weeks）
11. Sidebar window
12. Onboarding flow
13. Notification system (notistack)
14. 基礎整合平台偵測

### Phase 5: Production 準備（2-3 weeks）
15. Electron 升級至 v33+
16. Code signing + notarization
17. Auto-update 機制
18. Error tracking (Sentry)
