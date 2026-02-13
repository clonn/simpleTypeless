import { app, shell, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { IPC_CHANNELS, DEFAULT_SETTINGS, AppSettings, ModelStatus, ModelDownloadState } from '../shared/types'
import { AudioCapture } from './audio/capture'
import { ASREngine } from './asr/engine'
import { LLMEngine } from './llm/engine'
import { TextInjector } from './injector/injector'
import { ModelDownloader, MODELS } from './model/downloader'

let mainWindow: BrowserWindow | null = null
let floatingWidget: BrowserWindow | null = null
let tray: Tray | null = null
let settings: AppSettings = { ...DEFAULT_SETTINGS }

// Core engines
let audioCapture: AudioCapture | null = null
let asrEngine: ASREngine | null = null
let llmEngine: LLMEngine | null = null
let textInjector: TextInjector | null = null
let modelDownloader: ModelDownloader | null = null

function createFloatingWidget(): void {
  floatingWidget = new BrowserWindow({
    width: 200,
    height: 60,
    x: 100,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  floatingWidget.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    floatingWidget.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/widget.html`)
  } else {
    floatingWidget.loadFile(join(__dirname, '../renderer/widget.html'))
  }

  floatingWidget.on('closed', () => {
    floatingWidget = null
  })
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray(): void {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAADISURBVHgBrZLBDYMwDEVtxABsABvQDdgANqAbwAbNBrABbEA3oBvABrBB2eB8JCRULuWQJ1nO//6xE4eIPIaY0iZXIKYYxpg3aZquvV4v8n3/tq7rSyAIgjVN0xtp2/bO++M4TlDyPP8Kw/AzSZIv0jRN0DRNQJIkgSiKArRt+0HX9QJd1wV4nif+pm3bwLbtIoqiV9u2AWzbLqy6ri/ouj4gDEPIskzQ933geZ4AbdsGhGH4EUXRy7bt4L+x67o+IkmSr3EcT38ArX2M8g3ZB1QAAAAASUVORK5CYII='
  )
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Settings',
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
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setToolTip('Local Typeless')
  tray.setContextMenu(contextMenu)
}

function registerGlobalShortcut(): void {
  globalShortcut.unregisterAll()

  const registered = globalShortcut.register(settings.globalHotkey, async () => {
    if (audioCapture?.isRecording) {
      await stopRecording()
    } else {
      await startRecording()
    }
  })

  if (!registered) {
    console.error('Failed to register global shortcut:', settings.globalHotkey)
  }
}

async function initializeEngines(): Promise<void> {
  audioCapture = new AudioCapture()
  asrEngine = new ASREngine()
  llmEngine = new LLMEngine()
  textInjector = new TextInjector()

  // Set up audio capture callbacks
  audioCapture.onSpeechStart(() => {
    broadcastToRenderers(IPC_CHANNELS.RECORDING_STATE_CHANGED, {
      isRecording: true,
      isProcessing: false,
      vadActive: true
    })
  })

  audioCapture.onSpeechEnd(async (audioBuffer: Float32Array) => {
    broadcastToRenderers(IPC_CHANNELS.RECORDING_STATE_CHANGED, {
      isRecording: false,
      isProcessing: true,
      vadActive: false
    })

    try {
      // Step 1: Transcribe with Whisper
      const rawText = await asrEngine!.transcribe(audioBuffer)
      broadcastToRenderers(IPC_CHANNELS.TRANSCRIPTION_PARTIAL, { rawText })

      // Step 2: Rewrite with LLM
      const rewrittenText = await llmEngine!.rewrite(rawText, settings.promptMode)

      // Step 3: Collect app context before injection
      const appContext = await textInjector!.getAppContext()

      // Step 4: Inject text
      if (settings.autoInject) {
        await textInjector!.inject(rewrittenText)
      }

      broadcastToRenderers(IPC_CHANNELS.TRANSCRIPTION_COMPLETE, {
        rawText,
        rewrittenText,
        timestamp: Date.now(),
        duration: audioBuffer.length / 16000,
        appContext
      })
    } catch (error) {
      console.error('Processing error:', error)
    }

    broadcastToRenderers(IPC_CHANNELS.RECORDING_STATE_CHANGED, {
      isRecording: false,
      isProcessing: false,
      vadActive: false
    })
  })

  // Initialize engines (load models)
  await asrEngine.initialize()
  await llmEngine.initialize()
}

async function startRecording(): Promise<void> {
  if (!audioCapture) return
  playSound('record-start')
  await audioCapture.start()

  if (settings.showFloatingWidget && floatingWidget) {
    floatingWidget.show()
  }
}

async function stopRecording(): Promise<void> {
  if (!audioCapture) return
  playSound('record-end')
  await audioCapture.stop()
}

function broadcastToRenderers(channel: string, data: unknown): void {
  mainWindow?.webContents.send(channel, data)
  floatingWidget?.webContents.send(channel, data)
}

function playSound(soundName: 'record-start' | 'record-end'): void {
  if (!settings.enableSounds) return

  const resourcePath = process.resourcesPath || join(__dirname, '../../resources')
  const soundPath = join(resourcePath, 'sounds', `${soundName}.wav`)
  broadcastToRenderers(IPC_CHANNELS.PLAY_SOUND, soundPath)
}

function getModelStatus(): ModelStatus {
  const whisperModelId = 'whisper-large-v3-turbo-q5_0'
  const llmModelId = 'qwen2.5-3b-instruct-q4_k_m'

  const whisperState = modelDownloader?.getDownloadState('whisper')
  const llmState = modelDownloader?.getDownloadState('llm')

  return {
    whisper: {
      loaded: asrEngine?.isLoaded ?? false,
      downloading: whisperState?.status === 'downloading',
      progress: whisperState?.progress ?? 0,
      modelName: MODELS.whisper[whisperModelId].name,
      modelPath: modelDownloader?.getModelPath('whisper', whisperModelId) ?? '',
      exists: modelDownloader?.modelExists('whisper', whisperModelId) ?? false
    },
    llm: {
      loaded: llmEngine?.isLoaded ?? false,
      downloading: llmState?.status === 'downloading',
      progress: llmState?.progress ?? 0,
      modelName: MODELS.llm[llmModelId].name,
      modelPath: modelDownloader?.getModelPath('llm', llmModelId) ?? '',
      exists: modelDownloader?.modelExists('llm', llmModelId) ?? false
    }
  }
}

function setupIPC(): void {
  ipcMain.handle(IPC_CHANNELS.START_RECORDING, async () => {
    await startRecording()
  })

  ipcMain.handle(IPC_CHANNELS.STOP_RECORDING, async () => {
    await stopRecording()
  })

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return settings
  })

  ipcMain.handle(IPC_CHANNELS.SET_SETTINGS, (_, newSettings: Partial<AppSettings>) => {
    settings = { ...settings, ...newSettings }

    if (newSettings.globalHotkey) {
      registerGlobalShortcut()
    }

    return settings
  })

  ipcMain.handle(IPC_CHANNELS.GET_MODEL_STATUS, () => {
    return getModelStatus()
  })

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_MODEL, async (_, modelType: 'whisper' | 'llm') => {
    if (!modelDownloader) return

    const modelId = modelType === 'whisper'
      ? 'whisper-large-v3-turbo-q5_0'
      : 'qwen2.5-3b-instruct-q4_k_m'

    try {
      await modelDownloader.downloadModel(modelType, modelId)

      // After download, try to initialize the engine
      if (modelType === 'whisper' && asrEngine) {
        await asrEngine.initialize()
      } else if (modelType === 'llm' && llmEngine) {
        await llmEngine.initialize()
      }
    } catch (error) {
      console.error(`[Main] Failed to download ${modelType} model:`, error)
    }
  })
}

async function initializeModelDownloader(): Promise<void> {
  modelDownloader = new ModelDownloader()

  // Set up progress callback to broadcast to renderers
  modelDownloader.onProgress((state: ModelDownloadState) => {
    broadcastToRenderers(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, state)
  })
}

async function autoDownloadModels(): Promise<void> {
  if (!modelDownloader) return

  const whisperModelId = 'whisper-large-v3-turbo-q5_0'
  const llmModelId = 'qwen2.5-3b-instruct-q4_k_m'

  // Check and download Whisper model if missing
  if (!modelDownloader.modelExists('whisper', whisperModelId)) {
    console.log('[Main] Whisper model not found, starting download...')
    modelDownloader.downloadModel('whisper', whisperModelId)
      .then(() => {
        console.log('[Main] Whisper model downloaded, initializing ASR engine...')
        return asrEngine?.initialize()
      })
      .catch((err) => console.error('[Main] Whisper download error:', err))
  }

  // Check and download LLM model if missing
  if (!modelDownloader.modelExists('llm', llmModelId)) {
    console.log('[Main] LLM model not found, starting download...')
    modelDownloader.downloadModel('llm', llmModelId)
      .then(() => {
        console.log('[Main] LLM model downloaded, initializing LLM engine...')
        return llmEngine?.initialize()
      })
      .catch((err) => console.error('[Main] LLM download error:', err))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.cympotek.localtypeless')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize model downloader first
  await initializeModelDownloader()

  setupIPC()
  createTray()
  createFloatingWidget()
  createMainWindow()
  registerGlobalShortcut()

  // Initialize AI engines in background
  initializeEngines().catch(console.error)

  // Auto-download missing models in background
  autoDownloadModels().catch(console.error)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Keep app running in tray on macOS
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  audioCapture?.stop()
})
