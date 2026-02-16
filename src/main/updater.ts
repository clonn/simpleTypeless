import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../shared/types'

let mainWindow: BrowserWindow | null = null

export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window

  // Configure auto-updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Log events
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version)
    broadcastUpdate('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : ''
    })
  })

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] No updates available')
    broadcastUpdate('update-not-available', {})
  })

  autoUpdater.on('download-progress', (progress) => {
    broadcastUpdate('update-download-progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version)
    broadcastUpdate('update-downloaded', { version: info.version })
  })

  autoUpdater.on('error', (error) => {
    console.error('[Updater] Error:', error.message)
  })
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[Updater] Check failed:', err.message)
  })
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch((err) => {
    console.error('[Updater] Download failed:', err.message)
  })
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall(false, true)
}

function broadcastUpdate(event: string, data: Record<string, unknown>): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_CHANNELS.UPDATE_STATUS, { event, ...data })
  }
}
