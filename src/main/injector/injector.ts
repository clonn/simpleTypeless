/**
 * Text Injector - macOS Text Injection
 *
 * Injects text into the currently focused application using:
 * 1. Primary: macOS Accessibility API
 * 2. Fallback: Keyboard simulation via AppleScript
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { AppContext } from '../../shared/types'

const execAsync = promisify(exec)

interface InjectorConfig {
  useAccessibilityAPI: boolean
  typingDelay: number // ms between keystrokes for simulation
}

const DEFAULT_CONFIG: InjectorConfig = {
  useAccessibilityAPI: true,
  typingDelay: 10
}

export class TextInjector {
  private config: InjectorConfig

  constructor(config: Partial<InjectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async inject(text: string): Promise<void> {
    if (!text.trim()) return

    try {
      if (this.config.useAccessibilityAPI) {
        await this.injectViaAccessibility(text)
      } else {
        await this.injectViaKeyboardSimulation(text)
      }
    } catch (error) {
      console.error('[Injector] Primary injection failed, trying fallback:', error)
      await this.injectViaKeyboardSimulation(text)
    }
  }

  private async injectViaAccessibility(text: string): Promise<void> {
    // Use AppleScript to set the value of the focused text field
    // This is more reliable than keystroke simulation for long text

    const escapedText = this.escapeForAppleScript(text)

    const script = `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        tell process frontApp
          set focused to focused of window 1
          if focused is true then
            keystroke "${escapedText}"
          end if
        end tell
      end tell
    `

    await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`)
  }

  private async injectViaKeyboardSimulation(text: string): Promise<void> {
    // Fallback: Use AppleScript keystroke command
    // This simulates typing character by character

    const escapedText = this.escapeForAppleScript(text)

    // For longer text, use clipboard paste instead of keystroke
    if (text.length > 100) {
      await this.injectViaClipboard(text)
      return
    }

    const script = `
      tell application "System Events"
        keystroke "${escapedText}"
      end tell
    `

    await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`)
  }

  private async injectViaClipboard(text: string): Promise<void> {
    // For longer text, use clipboard paste
    // This is faster and more reliable for large amounts of text

    const escapedText = this.escapeForAppleScript(text)

    // Save current clipboard, set new content, paste, restore
    const script = `
      set oldClipboard to the clipboard
      set the clipboard to "${escapedText}"
      tell application "System Events"
        keystroke "v" using command down
      end tell
      delay 0.1
      set the clipboard to oldClipboard
    `

    await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`)
  }

  private escapeForAppleScript(text: string): string {
    // Escape special characters for AppleScript string
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
  }

  async checkAccessibilityPermission(): Promise<boolean> {
    // Check if the app has accessibility permissions
    // This is required for System Events to work

    try {
      const script = `
        tell application "System Events"
          return UI elements enabled
        end tell
      `

      const { stdout } = await execAsync(`osascript -e '${script}'`)
      return stdout.trim() === 'true'
    } catch {
      return false
    }
  }

  async requestAccessibilityPermission(): Promise<void> {
    // Open System Preferences to accessibility settings
    await execAsync(
      'open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"'
    )
  }

  async getActiveApplicationName(): Promise<string> {
    try {
      const script = `
        tell application "System Events"
          return name of first application process whose frontmost is true
        end tell
      `

      const { stdout } = await execAsync(`osascript -e '${script}'`)
      return stdout.trim()
    } catch {
      return ''
    }
  }

  async getActiveWindowTitle(): Promise<string> {
    try {
      const script = `
        tell application "System Events"
          tell (first application process whose frontmost is true)
            return name of front window
          end tell
        end tell
      `

      const { stdout } = await execAsync(`osascript -e '${script}'`)
      return stdout.trim()
    } catch {
      return ''
    }
  }

  async getAppContext(): Promise<AppContext> {
    const BROWSER_BUNDLE_IDS = [
      'com.apple.Safari',
      'com.google.Chrome',
      'company.thebrowser.Browser',
      'org.mozilla.firefox'
    ]

    const [appName, windowTitle, bundleId] = await Promise.all([
      this.getActiveApplicationName(),
      this.getActiveWindowTitle(),
      this.getActiveBundleId()
    ])

    const context: AppContext = {
      appName,
      bundleId,
      windowTitle
    }

    if (BROWSER_BUNDLE_IDS.includes(bundleId)) {
      const webInfo = await this.getBrowserWebInfo(bundleId, appName)
      if (webInfo) {
        context.webTitle = webInfo.title
        context.webUrl = webInfo.url
        if (webInfo.url) {
          try {
            const url = new URL(webInfo.url)
            context.webDomain = url.hostname
          } catch {
            // URL parsing failed, leave webDomain undefined
          }
        }
      }
    }

    return context
  }

  private async getActiveBundleId(): Promise<string> {
    try {
      const script = `tell application "System Events" to get bundle identifier of first process whose frontmost is true`
      const { stdout } = await execAsync(`osascript -e '${script}'`)
      return stdout.trim()
    } catch {
      return ''
    }
  }

  private async getBrowserWebInfo(
    bundleId: string,
    appName: string
  ): Promise<{ title: string; url: string } | null> {
    try {
      let script: string

      switch (bundleId) {
        case 'com.apple.Safari':
          script = `
            tell application "Safari"
              set docTitle to name of current tab of front window
              set docURL to URL of current tab of front window
              return docTitle & "\\n" & docURL
            end tell
          `
          break

        case 'com.google.Chrome':
          script = `
            tell application "Google Chrome"
              set docTitle to title of active tab of front window
              set docURL to URL of active tab of front window
              return docTitle & "\\n" & docURL
            end tell
          `
          break

        case 'company.thebrowser.Browser':
          // Arc browser uses the same AppleScript interface as Chrome
          script = `
            tell application "${appName}"
              set docTitle to title of active tab of front window
              set docURL to URL of active tab of front window
              return docTitle & "\\n" & docURL
            end tell
          `
          break

        case 'org.mozilla.firefox':
          // Firefox has limited AppleScript support; window title contains page title
          script = `
            tell application "Firefox"
              set docTitle to name of front window
              return docTitle & "\\n"
            end tell
          `
          break

        default:
          return null
      }

      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`)
      const lines = stdout.trim().split('\n')
      return {
        title: lines[0] || '',
        url: lines[1] || ''
      }
    } catch {
      return null
    }
  }
}
