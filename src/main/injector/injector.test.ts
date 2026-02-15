import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TextInjector } from './injector'

// Use vi.hoisted to avoid mock hoisting issues
const { mockExec } = vi.hoisted(() => {
  const mockExec = vi.fn((_cmd: string) => {
    return Promise.resolve({ stdout: '', stderr: '' })
  })
  return { mockExec }
})

// Mock child_process - exec is promisified in the module, so mock it as async
vi.mock('child_process', () => ({
  exec: mockExec
}))

// promisify should return the function as-is since we mock exec as async already
vi.mock('util', () => ({
  promisify: (fn: any) => fn
}))

describe('TextInjector', () => {
  let injector: TextInjector

  beforeEach(() => {
    vi.clearAllMocks()
    injector = new TextInjector()
  })

  describe('escapeForAppleScript', () => {
    it('should escape backslashes', async () => {
      const text = 'test\\path\\to\\file'
      await injector.inject(text)

      const capturedCommand = mockExec.mock.calls[0][0]
      expect(capturedCommand).toContain('test\\\\path\\\\to\\\\file')
    })

    it('should escape double quotes', async () => {
      const text = 'say "hello"'
      await injector.inject(text)

      const capturedCommand = mockExec.mock.calls[0][0]
      expect(capturedCommand).toContain('\\"hello\\"')
    })

    it('should escape newlines', async () => {
      const text = 'line1\nline2'
      await injector.inject(text)

      const capturedCommand = mockExec.mock.calls[0][0]
      expect(capturedCommand).toContain('\\n')
    })

    it('should escape tabs', async () => {
      const text = 'col1\tcol2'
      await injector.inject(text)

      const capturedCommand = mockExec.mock.calls[0][0]
      expect(capturedCommand).toContain('\\t')
    })

    it('should handle empty string', async () => {
      await injector.inject('')
      expect(mockExec).not.toHaveBeenCalled()
    })

    it('should handle multiple special characters', async () => {
      const text = 'test\\path "file"\nline2\ttab'
      await injector.inject(text)

      const capturedCommand = mockExec.mock.calls[0][0]
      expect(capturedCommand).toContain('test\\\\path')
      expect(capturedCommand).toContain('\\"file\\"')
      expect(capturedCommand).toContain('\\n')
      expect(capturedCommand).toContain('\\t')
    })
  })

  describe('inject', () => {
    it('should call appropriate method based on config', async () => {
      const text = 'Hello World'
      await injector.inject(text)

      expect(mockExec).toHaveBeenCalled()
      const command = mockExec.mock.calls[0][0]
      expect(command).toContain('osascript')
      expect(command).toContain('Hello World')
    })

    it('should not inject empty text', async () => {
      await injector.inject('')
      expect(mockExec).not.toHaveBeenCalled()
    })

    it('should not inject whitespace-only text', async () => {
      await injector.inject('   ')
      expect(mockExec).not.toHaveBeenCalled()
    })

    it('should use accessibility API by default', async () => {
      const text = 'Test'
      await injector.inject(text)

      const command = mockExec.mock.calls[0][0]
      expect(command).toContain('System Events')
    })

    it('should use keyboard simulation when configured', async () => {
      injector = new TextInjector({ useAccessibilityAPI: false })
      const text = 'Test'
      await injector.inject(text)

      const command = mockExec.mock.calls[0][0]
      expect(command).toContain('keystroke')
    })

    it('should use clipboard for long text', async () => {
      injector = new TextInjector({ useAccessibilityAPI: false })
      const longText = 'a'.repeat(150)
      await injector.inject(longText)

      const command = mockExec.mock.calls[0][0]
      expect(command).toContain('clipboard')
      expect(command).toContain('keystroke "v" using command down')
    })
  })

  describe('checkAccessibilityPermission', () => {
    it('should return true when permission is granted', async () => {
      mockExec.mockResolvedValueOnce({ stdout: 'true\n', stderr: '' })

      const hasPermission = await injector.checkAccessibilityPermission()
      expect(hasPermission).toBe(true)
    })

    it('should return false when permission is denied', async () => {
      mockExec.mockResolvedValueOnce({ stdout: 'false\n', stderr: '' })

      const hasPermission = await injector.checkAccessibilityPermission()
      expect(hasPermission).toBe(false)
    })

    it('should return false on error', async () => {
      mockExec.mockRejectedValueOnce(new Error('AppleScript error'))

      const hasPermission = await injector.checkAccessibilityPermission()
      expect(hasPermission).toBe(false)
    })
  })

  describe('getActiveApplicationName', () => {
    it('should return application name', async () => {
      mockExec.mockResolvedValueOnce({ stdout: 'Safari\n', stderr: '' })

      const appName = await injector.getActiveApplicationName()
      expect(appName).toBe('Safari')
    })

    it('should return empty string on error', async () => {
      mockExec.mockRejectedValueOnce(new Error('Error'))

      const appName = await injector.getActiveApplicationName()
      expect(appName).toBe('')
    })
  })

  describe('getActiveWindowTitle', () => {
    it('should return window title', async () => {
      mockExec.mockResolvedValueOnce({ stdout: 'Google - Safari\n', stderr: '' })

      const title = await injector.getActiveWindowTitle()
      expect(title).toBe('Google - Safari')
    })

    it('should return empty string on error', async () => {
      mockExec.mockRejectedValueOnce(new Error('Error'))

      const title = await injector.getActiveWindowTitle()
      expect(title).toBe('')
    })
  })

  describe('requestAccessibilityPermission', () => {
    it('should open system preferences', async () => {
      await injector.requestAccessibilityPermission()

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('x-apple.systempreferences')
      )
    })
  })
})
