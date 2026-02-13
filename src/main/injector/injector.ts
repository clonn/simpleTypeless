/**
 * Text Injector - macOS Text Injection
 *
 * Injects text into the currently focused application using:
 * 1. Primary: macOS Accessibility API
 * 2. Fallback: Keyboard simulation via AppleScript
 */

import { exec } from 'child_process'
import { promisify } from 'util'

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

    const escapedText = text.replace(/"/g, '\\"').replace(/\\/g, '\\\\')

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
}
