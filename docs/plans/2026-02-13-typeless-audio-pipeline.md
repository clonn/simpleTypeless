# Typeless.app 音訊處理管線分析

> 逆向分析日期: 2026-02-13
> 分析版本: Typeless v1.0.0 (Build 1.0.0.79)

---

## 1. Pipeline 總覽

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Audio      │    │    Opus      │    │    ASR       │    │    LLM       │    │    Text      │
│   Capture    │───▶│   Encoding   │───▶│   Engine     │───▶│   Engine     │───▶│   Injection  │
│              │    │  (Worker)    │    │  (Whisper)   │    │  (Qwen)      │    │ (AppleScript)│
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
  Microphone         FFI → native       child process        child process       Accessibility
  16kHz mono         libopusenc         whisper.cpp          llama.cpp           API / Clipboard
```

---

## 2. Stage 1: Audio Capture

### 2.1 錄音參數

| 參數 | 值 | 說明 |
|------|-----|------|
| Sample Rate | 16,000 Hz | Whisper 模型原生支援 |
| Bit Depth | 16-bit | 標準 PCM |
| Channels | 1 (Mono) | 語音辨識只需 mono |
| Frame Size | 512 samples | 約 32ms per frame |
| 輸入源 | System microphone | 透過 Electron desktopCapturer |

### 2.2 Voice Activity Detection (VAD)

使用 **Silero VAD** 進行語音活動偵測：

```
VAD 參數配置:
┌─────────────────────────────┬─────────┬──────────────────────┐
│ Parameter                   │ Default │ 說明                  │
├─────────────────────────────┼─────────┼──────────────────────┤
│ positiveSpeechThreshold     │ 0.5     │ 判定為語音的閾值       │
│ negativeSpeechThreshold     │ 0.35    │ 判定為靜音的閾值       │
│ minSpeechFrames             │ 3       │ 最少語音幀數才觸發     │
│ preSpeechPadFrames          │ 10      │ 保留語音前的幀數(~320ms)│
│ redemptionFrames            │ 8       │ 靜音容忍幀數(~256ms)   │
└─────────────────────────────┴─────────┴──────────────────────┘
```

### 2.3 Ring Buffer 機制

為了捕捉語音開頭，使用 ring buffer 保留語音開始前的音訊：

```
時間軸:
───────[silent]──────[SPEECH START]──────[speech]──────[SPEECH END]──────

Ring Buffer (10 frames ≈ 320ms):
         ◀─ preSpeechPadFrames ─▶
[frame][frame][frame]...[frame]│[speech starts here]

當 VAD 偵測到語音:
1. 從 ring buffer 取出前 10 frames（包含語音前的 audio）
2. 開始累積後續的語音 frames
3. 當靜音超過 8 frames (redemptionFrames ≈ 256ms)，觸發 speechEnd
4. 合併所有 frames → audioBuffer
```

### 2.4 Callback 流程

```typescript
// AudioCapture callbacks
onSpeechStart() → 通知 renderer 顯示錄音狀態
onSpeechEnd(audioBuffer: Float32Array) → 傳送完整音訊給 pipeline
```

---

## 3. Stage 2: Opus Encoding (Worker Thread)

### 3.1 架構

Opus 編碼在獨立的 **Worker Thread** 中執行，避免阻塞 main thread：

```
Main Thread                    Worker Thread (opusWorker.js)
┌─────────────┐               ┌──────────────────────────┐
│ audioBuffer  │──postMessage─▶│ koffi FFI                │
│ (Float32Array│               │   ↓                      │
│  16kHz mono) │               │ libopusenc_unified_macos  │
│              │               │   .dylib                 │
│              │◀─postMessage──│ ↓                        │
│ encodedAudio │               │ OGG/Opus output          │
└─────────────┘               └──────────────────────────┘
```

### 3.2 FFI (Foreign Function Interface)

- **Library**: `koffi` npm package
- **Native Library**: `libopusenc_unified_macos.dylib`
- **呼叫方式**: koffi 直接呼叫 C 函數，無需 Node.js addon build

```
koffi.load('libopusenc_unified_macos.dylib')
  → ope_encoder_create_pull()  // 建立 encoder
  → ope_encoder_write_float()  // 寫入 PCM data
  → ope_encoder_drain()        // 完成編碼
  → ope_encoder_destroy()      // 釋放資源
```

### 3.3 編碼參數

| 參數 | 值 |
|------|-----|
| 格式 | OGG/Opus |
| Sample Rate | 16,000 Hz |
| Channels | 1 (Mono) |
| Bitrate | VBR (Variable Bit Rate) |
| Application | VOIP (語音最佳化) |

### 3.4 多平台 Binary 支援

```
koffi/build/koffi/
├── darwin_arm64/koffi.node    ← macOS Apple Silicon
├── darwin_x64/koffi.node      ← macOS Intel
├── linux_arm64/koffi.node
├── linux_x64/koffi.node
├── win32_arm64/koffi.node
└── win32_x64/koffi.node
```

---

## 4. Stage 3: ASR Engine (Whisper.cpp)

### 4.1 架構

ASR 使用 **whisper.cpp** 作為推理引擎，以 child process 方式執行：

```
Main Process
│
├── 寫入 WAV 暫存檔 → /tmp/typeless-audio-XXXXX.wav
│
├── spawn('whisper-arm64', [
│     '--model', modelPath,
│     '--file', wavPath,
│     '--threads', '4',
│     '--language', 'auto',
│     '--prompt', bilingualPrompt
│   ])
│
├── 讀取 stdout → raw transcript text
│
└── 刪除暫存 WAV 檔
```

### 4.2 Model 規格

| Model Profile | Model | Size | 量化 | RAM 需求 |
|---------------|-------|------|------|----------|
| Balanced (推薦) | Whisper Large-v3-Turbo | 1.5 GB | Q5_0 | 16 GB |
| Lightweight | Whisper Medium | 500 MB | Q5_0 | 8 GB |
| English Optimized | Distil-Whisper Large-v3 | 800 MB | - | 12 GB |
| Maximum Quality | Whisper Large-v3 | 1.8 GB | Q5_0 | 32 GB |

### 4.3 Bilingual Support

預設 prompt 指導 Whisper 處理中英混合語音：

```
"The following is a discussion containing both Chinese and English
technical terms. Please transcribe verbatim."
```

- Language 設為 `auto`，讓 Whisper 自動偵測
- 支援 code-switching（中英切換）

### 4.4 WAV 編碼

音訊以 WAV 格式寫入暫存檔再傳給 whisper.cpp：

```
WAV Header:
├── Sample Rate: 16000 Hz
├── Bit Depth: 16-bit
├── Channels: 1 (Mono)
├── Format: PCM
└── Byte Order: Little Endian
```

### 4.5 架構偵測

根據 CPU 架構選擇對應的 binary：

```
process.arch === 'arm64'
  ? 'whisper-arm64'    // Apple Silicon
  : 'whisper-x64'      // Intel
```

### 4.6 初始化 Warm-up

首次載入時執行一次 warm-up inference，預熱模型以減少首次使用延遲。

---

## 5. Stage 4: LLM Engine (Llama.cpp + Qwen)

### 5.1 架構

LLM 使用 **llama.cpp** 執行 Qwen 2.5 模型：

```
Main Process
│
├── 建構 ChatML prompt
│
├── spawn('llama-arm64', [
│     '--model', modelPath,
│     '--ctx-size', '2048',
│     '--n-gpu-layers', '-1',    // 全部在 GPU
│     '--prompt', chatMLPrompt
│   ])
│
├── 讀取 stdout → rewritten text
│
└── 返回處理後的文字
```

### 5.2 Model 規格

| Model Profile | Model | Size | 量化 | RAM 需求 |
|---------------|-------|------|------|----------|
| Balanced (推薦) | Qwen 2.5-3B-Instruct | 2.0 GB | Q4_K_M | 16 GB |
| Lightweight | Gemma 2-2B-IT | 1.5 GB | Q4_K_M | 8 GB |
| English Optimized | Llama 3.2-3B-Instruct | 2.0 GB | - | 12 GB |
| Maximum Quality | Qwen 2.5-7B-Instruct | 4.5 GB | Q4_K_M | 32 GB |

### 5.3 ChatML Prompt Format

Qwen 模型使用 ChatML 格式：

```
<|im_start|>system
{system_prompt}
<|im_end|>
<|im_start|>user
{raw_transcript}
<|im_end|>
<|im_start|>assistant
```

### 5.4 四種 Prompt Mode

#### Mode 1: General（預設）
- 移除贅詞（um, uh, 那個, 就是...）
- 修正文法
- 保留 code-switching（中英切換不翻譯）
- 標點符號校正

#### Mode 2: Email
- 格式化為正式商業 email
- 加入 greeting 和 closing
- 適當斷段

#### Mode 3: Code/Technical
- 正確化技術術語
- 變數/函數名稱使用 proper casing
- 程式碼相關內容特殊處理

#### Mode 4: Notes/Brainstorm
- 保留思考過程
- Bullet point 列表
- 不過度修飾

### 5.5 推理參數

| 參數 | 值 | 說明 |
|------|-----|------|
| Context Size | 2048 tokens | 最大 context 長度 |
| GPU Layers | -1 (all) | Apple Silicon 使用全 GPU |
| Temperature | (未知，需要進一步分析) | |
| Threads | Auto | 根據 CPU 核心數 |

### 5.6 Mock Fallback

開發模式下的 mock 實作：
- 移除常見贅詞（um, uh, like, 那個, 就是, 嗯...）
- 自動在中英文之間加空格
- 首字母大寫

---

## 6. Stage 5: Text Injection

### 6.1 注入策略

```
Text Injection 決策樹:

文字長度 > 100 字元?
├── YES → Clipboard 策略
│         1. 備份當前 clipboard
│         2. 將文字寫入 clipboard
│         3. 模擬 Cmd+V 貼上
│         4. 還原 clipboard
│
└── NO  → Direct 策略
          1. 透過 AppleScript 使用 System Events
          2. 直接模擬按鍵輸入
          3. Fallback: keyboard simulation
```

### 6.2 AppleScript Integration

```applescript
-- 主要注入方法
tell application "System Events"
    keystroke theText
end tell

-- 讀取焦點 app 資訊
tell application "System Events"
    set frontApp to name of first process whose frontmost is true
    set windowTitle to name of first window of first process whose frontmost is true
end tell

-- Clipboard 注入（長文字）
set the clipboard to theText
tell application "System Events"
    keystroke "v" using command down
end tell
```

### 6.3 Accessibility 權限

- 首次使用時檢查 Accessibility 權限
- 若未授權，彈出系統對話框請求權限
- 權限路徑: System Settings → Privacy & Security → Accessibility

### 6.4 Application Context 收集

注入前收集目標 app 的資訊：
- App 名稱（如 "Slack", "Google Chrome"）
- Bundle ID（如 "com.tinyspeck.slackmacgap"）
- Window title
- 若為 browser，額外收集 web page title, domain, URL

這些資訊被存入 database 的 `focused_app_*` 欄位，用於分析使用情境和整合平台。

---

## 7. Model Download & Management

### 7.1 下載源

| 模型 | URL Pattern |
|------|-------------|
| Whisper | `huggingface.co/ggerganov/whisper.cpp/resolve/main/{filename}` |
| Qwen | `huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/{filename}` |

### 7.2 儲存位置

```
~/Library/Application Support/Typeless/models/
├── whisper-large-v3-turbo-q5_0.bin     (547 MB)
├── qwen2.5-3b-instruct-q4_k_m.gguf    (2.1 GB)
└── ... (其他 profile 的 model)
```

### 7.3 下載流程

```
1. 檢查 model 是否已存在
   - 若檔案存在且大小 > 預期大小的 99% → 跳過下載
   - 否則開始下載

2. HTTP GET request to HuggingFace
   - 處理 301/302 redirects
   - 使用 AbortController 支援取消

3. Streaming 下載
   - 逐 chunk 寫入檔案
   - 計算進度百分比
   - 透過 IPC broadcast 進度給 renderer

4. 下載完成
   - 驗證檔案完整性（大小比對）
   - 更新 model status → "ready"
```

### 7.4 Auto-Download on Startup

App 啟動時自動檢查並下載缺少的模型：

```
App Start
  ↓
Check whisper model exists?
  ├── NO → Background download + progress broadcast
  └── YES → Mark as ready
  ↓
Check LLM model exists?
  ├── NO → Background download + progress broadcast
  └── YES → Mark as ready
  ↓
Both ready? → Initialize engines
```

---

## 8. 完整 Pipeline 時序

```
Time ──────────────────────────────────────────────────────▶

User: 按下 Cmd+Shift+Space
  │
  ▼
[AudioCapture.start()]
  │ VAD 開始偵測
  │ Ring buffer 持續寫入
  │
  ▼ (VAD 偵測到語音)
[onSpeechStart]
  │ → IPC broadcast: recording:state-changed {isRecording: true}
  │ → Renderer 顯示錄音動畫
  │ → Audio frames 累積
  │
  ▼ (VAD 偵測到靜音 >256ms)
[onSpeechEnd(audioBuffer)]
  │ → IPC broadcast: recording:state-changed {isProcessing: true}
  │
  ├──▶ [Opus Encoding] (Worker Thread, 並行)
  │     → OGG file for storage
  │
  ├──▶ [WAV Encoding]
  │     → WAV temp file for Whisper
  │
  ▼
[ASREngine.transcribe(wavPath)]
  │ → spawn whisper.cpp child process
  │ → Wait for stdout
  │ → rawText = "我想要 create 一個新的 feature"
  │
  ▼
[IPC broadcast: transcription:partial {rawText}]
  │ → Renderer 顯示原始轉錄
  │
  ▼
[LLMEngine.rewrite(rawText, promptMode)]
  │ → Construct ChatML prompt
  │ → spawn llama.cpp child process
  │ → Wait for stdout
  │ → rewrittenText = "我想要 create 一個新的 feature。"
  │
  ▼
[TextInjector.inject(rewrittenText)]
  │ → 判斷注入策略 (direct vs clipboard)
  │ → AppleScript 注入到焦點 app
  │
  ▼
[IPC broadcast: transcription:complete {result}]
  │ → Renderer 更新歷史記錄
  │ → Database 寫入 history record
  │
  ▼
[IPC broadcast: recording:state-changed {isRecording: false, isProcessing: false}]
  │ → Renderer 恢復待機狀態
  │
  ▼ Done
```

---

## 9. 效能考量

### 9.1 Memory Management
- LLM 引擎在閒置 10 分鐘後自動 unload
- Whisper 模型保持常駐（較小且常用）

### 9.2 GPU Acceleration
- Apple Silicon: 使用 Metal GPU（n-gpu-layers = -1）
- Intel Mac: CPU-only 模式

### 9.3 Thread Management
- Main thread: IPC + 協調
- Worker thread: Opus encoding
- Child process 1: Whisper.cpp inference
- Child process 2: Llama.cpp inference

### 9.4 Audio Optimization
- 16kHz 而非 44.1kHz/48kHz（減少資料量）
- Mono 而非 stereo（語音不需要立體聲）
- Ring buffer 避免語音開頭被截斷
- VAD hysteresis 避免頻繁觸發
