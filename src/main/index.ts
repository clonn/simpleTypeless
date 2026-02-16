import { app, shell, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { IPC_CHANNELS, DEFAULT_SETTINGS, AppSettings, ModelStatus, ModelDownloadState, ASRStatus } from '../shared/types'
import Store from 'electron-store'
import { AudioCapture } from './audio/capture'
import { LLMEngine } from './llm/engine'
import { TextInjector } from './injector/injector'
import { ModelDownloader, MODELS } from './model/downloader'
import { OpusEncoder } from './audio/opusEncoder'
import { runMigrations } from './db/index'
import { saveTranscription, getHistory, deleteTranscription, getHistoryCount } from './db/repository'
import { createASRProvider, ASRProviderInterface } from './asr/providerFactory'
import { initAutoUpdater, checkForUpdates, downloadUpdate, installUpdate } from './updater'

const ALTERNATIVE_HOTKEYS = [
  'CommandOrControl+Shift+Space',
  'CommandOrControl+Shift+S',
  'CommandOrControl+Alt+Space',
  'CommandOrControl+Shift+R'
]

// electron-store v10 ESM types don't resolve properly with moduleResolution: "node"
const store = new Store() as unknown as { get(key: string, defaultValue?: unknown): unknown; set(key: string, value: unknown): void }

let mainWindow: BrowserWindow | null = null
let floatingWidget: BrowserWindow | null = null
let onboardingWindow: BrowserWindow | null = null
let tray: Tray | null = null
let settings: AppSettings = { ...DEFAULT_SETTINGS }

// Core engines
let audioCapture: AudioCapture | null = null
let asrEngine: ASRProviderInterface | null = null
let llmEngine: LLMEngine | null = null
let textInjector: TextInjector | null = null
let modelDownloader: ModelDownloader | null = null
let opusEncoder: OpusEncoder | null = null

function createFloatingWidget(): void {
  const savedWidgetBounds = store.get('widgetBounds') as { x: number; y: number } | undefined

  floatingWidget = new BrowserWindow({
    width: 280,
    height: 56,
    x: savedWidgetBounds?.x ?? 100,
    y: savedWidgetBounds?.y ?? 100,
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

  // Save widget position on move
  floatingWidget.on('moved', () => {
    if (floatingWidget && !floatingWidget.isDestroyed()) {
      const bounds = floatingWidget.getBounds()
      store.set('widgetBounds', { x: bounds.x, y: bounds.y })
    }
  })

  floatingWidget.on('closed', () => {
    floatingWidget = null
  })
}

function createOnboardingWindow(): void {
  if (store.get('onboardingComplete', false)) return

  onboardingWindow = new BrowserWindow({
    width: 600,
    height: 450,
    resizable: false,
    center: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    onboardingWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/onboarding.html`)
  } else {
    onboardingWindow.loadFile(join(__dirname, '../renderer/onboarding.html'))
  }

  onboardingWindow.on('closed', () => {
    onboardingWindow = null
  })
}

function createMainWindow(): void {
  // Restore saved bounds
  const savedBounds = store.get('windowBounds') as { x: number; y: number; width: number; height: number } | undefined

  mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? 860,
    height: savedBounds?.height ?? 600,
    x: savedBounds?.x,
    y: savedBounds?.y,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Save window position/size on move and resize
  const saveBounds = (): void => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      store.set('windowBounds', mainWindow.getBounds())
    }
  }
  mainWindow.on('moved', saveBounds)
  mainWindow.on('resized', saveBounds)

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

  updateTrayMenu()
  tray.setToolTip('Local Typeless')

  // Click on tray icon shows/focuses main window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
      }
    } else {
      createMainWindow()
    }
  })
}

function updateTrayMenu(): void {
  if (!tray) return

  const isRecording = audioCapture?.isRecording ?? false

  const contextMenu = Menu.buildFromTemplate([
    {
      label: isRecording ? 'Stop Recording' : 'Start Recording',
      click: async () => {
        if (isRecording) {
          await stopRecording()
        } else {
          await startRecording()
        }
        updateTrayMenu() // Refresh menu state
      }
    },
    { type: 'separator' },
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
      label: `Hotkey: ${settings.globalHotkey}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}

function registerGlobalShortcut(): void {
  globalShortcut.unregisterAll()

  const hotkeyCallback = async (): Promise<void> => {
    if (audioCapture?.isRecording) {
      await stopRecording()
    } else {
      await startRecording()

      // Push-to-talk mode: auto-stop after maxDuration
      if (settings.hotkeyMode === 'push-to-talk') {
        setTimeout(async () => {
          if (audioCapture?.isRecording) {
            await stopRecording()
          }
        }, 30000) // 30 second max
      }
    }
  }

  const registered = globalShortcut.register(settings.globalHotkey, hotkeyCallback)

  if (registered) {
    broadcastToRenderers(IPC_CHANNELS.HOTKEY_STATUS, {
      registered: true,
      hotkey: settings.globalHotkey
    })
    return
  }

  console.error('Failed to register global shortcut:', settings.globalHotkey)

  // Try alternative hotkeys
  let fallbackHotkey: string | null = null
  for (const alt of ALTERNATIVE_HOTKEYS) {
    if (alt === settings.globalHotkey) continue
    if (globalShortcut.register(alt, hotkeyCallback)) {
      fallbackHotkey = alt
      break
    }
  }

  broadcastToRenderers(IPC_CHANNELS.HOTKEY_STATUS, {
    registered: false,
    hotkey: settings.globalHotkey,
    error: fallbackHotkey
      ? `"${settings.globalHotkey}" unavailable. Using "${fallbackHotkey}" instead.`
      : 'Hotkey is in use by another app. Change it in Settings.',
    fallback: fallbackHotkey ?? undefined
  })
}

async function initializeEngines(): Promise<void> {
  audioCapture = new AudioCapture()
  asrEngine = createASRProvider(settings.asrProvider, settings.cloudApiConfig)
  llmEngine = new LLMEngine()
  textInjector = new TextInjector()
  opusEncoder = new OpusEncoder()

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

    // Start audio encoding in parallel (does not block transcription pipeline)
    const filename = `recording-${Date.now()}`
    const audioPathPromise = opusEncoder?.encode(audioBuffer, filename).catch((err) => {
      console.error('[Main] Audio encoding error:', err)
      return undefined
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

      // Await audio encoding result (should already be done by now)
      await audioPathPromise

      // Save to database first (before broadcast so renderer sees the new record)
      saveTranscription(
        { rawText, rewrittenText, timestamp: Date.now(), duration: audioBuffer.length / 16000 },
        appContext
      )

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
    updateTrayMenu()
  })

  // Initialize engines (load models)
  if (asrEngine.initialize) {
    await asrEngine.initialize()
  }
  await llmEngine.initialize()
}

async function startRecording(): Promise<void> {
  if (!audioCapture) return
  playSound('record-start')
  await audioCapture.start()

  if (settings.showFloatingWidget && floatingWidget) {
    floatingWidget.show()
  }

  updateTrayMenu()
}

async function stopRecording(): Promise<void> {
  if (!audioCapture) return
  playSound('record-end')
  await audioCapture.stop()

  updateTrayMenu()
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

  ipcMain.handle(IPC_CHANNELS.SET_SETTINGS, async (_, newSettings: Partial<AppSettings>) => {
    const previousProvider = settings.asrProvider
    settings = { ...settings, ...newSettings }

    if (newSettings.globalHotkey || newSettings.hotkeyMode) {
      registerGlobalShortcut()
    }

    // If ASR provider changed, recreate the ASR engine
    if (newSettings.asrProvider && newSettings.asrProvider !== previousProvider) {
      console.log('[Main] ASR provider changed, recreating engine...')

      // Dispose old engine
      if (asrEngine?.dispose) {
        await asrEngine.dispose()
      }

      // Create new engine
      try {
        asrEngine = createASRProvider(settings.asrProvider, settings.cloudApiConfig)
        if (asrEngine.initialize) {
          await asrEngine.initialize()
        }
        console.log('[Main] ASR engine recreated successfully')
      } catch (error) {
        console.error('[Main] Failed to create ASR provider:', error)
      }
    }

    // If cloud API config changed for OpenAI provider, recreate
    if (newSettings.cloudApiConfig && settings.asrProvider === 'cloud-openai') {
      console.log('[Main] Cloud API config changed, recreating engine...')

      if (asrEngine?.dispose) {
        await asrEngine.dispose()
      }

      try {
        asrEngine = createASRProvider(settings.asrProvider, settings.cloudApiConfig)
        console.log('[Main] ASR engine recreated with new API key')
      } catch (error) {
        console.error('[Main] Failed to recreate ASR provider:', error)
      }
    }

    return settings
  })

  ipcMain.handle(IPC_CHANNELS.GET_MODEL_STATUS, () => {
    return getModelStatus()
  })

  ipcMain.handle(IPC_CHANNELS.GET_HISTORY, (_, limit?: number, offset?: number) => {
    return getHistory(limit, offset)
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_HISTORY, (_, id: string) => {
    deleteTranscription(id)
  })

  ipcMain.handle(IPC_CHANNELS.GET_HISTORY_COUNT, () => {
    return getHistoryCount()
  })

  ipcMain.handle(IPC_CHANNELS.ONBOARDING_COMPLETE, () => {
    store.set('onboardingComplete', true)
    onboardingWindow?.close()
  })

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_MODEL, async (_, modelType: 'whisper' | 'llm') => {
    if (!modelDownloader) return

    const modelId = modelType === 'whisper'
      ? 'whisper-large-v3-turbo-q5_0'
      : 'qwen2.5-3b-instruct-q4_k_m'

    try {
      await modelDownloader.downloadModel(modelType, modelId)

      // After download, try to initialize the engine
      if (modelType === 'whisper' && asrEngine && asrEngine.initialize) {
        await asrEngine.initialize()
      } else if (modelType === 'llm' && llmEngine) {
        await llmEngine.initialize()
      }
    } catch (error) {
      console.error(`[Main] Failed to download ${modelType} model:`, error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHECK_FOR_UPDATES, () => {
    checkForUpdates()
  })

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_UPDATE, () => {
    downloadUpdate()
  })

  ipcMain.handle(IPC_CHANNELS.INSTALL_UPDATE, () => {
    installUpdate()
  })

  ipcMain.handle(IPC_CHANNELS.ASR_STATUS, async () => {
    try {
      const { ASREngine } = await import('./asr/engine')
      const readiness = ASREngine.checkReady()
      return {
        provider: settings.asrProvider,
        ready: readiness.binaryFound && readiness.modelFound,
        binaryFound: readiness.binaryFound,
        modelFound: readiness.modelFound,
        binaryPath: readiness.binaryPath ?? undefined,
        modelPath: readiness.modelPath
      } satisfies ASRStatus
    } catch (error) {
      return {
        provider: settings.asrProvider,
        ready: false,
        binaryFound: false,
        modelFound: false,
        error: String(error)
      } satisfies ASRStatus
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
        return asrEngine?.initialize?.()
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

  // Run DB migrations first
  runMigrations()

  // Initialize model downloader first
  await initializeModelDownloader()

  setupIPC()
  createTray()
  createOnboardingWindow()
  createFloatingWidget()
  createMainWindow()
  registerGlobalShortcut()

  // Initialize auto-updater (in production only)
  if (!is.dev && mainWindow) {
    initAutoUpdater(mainWindow)
    // Check for updates 5 seconds after launch
    setTimeout(() => checkForUpdates(), 5000)
  }

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
  opusEncoder?.destroy()
})
