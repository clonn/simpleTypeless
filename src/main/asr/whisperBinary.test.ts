import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExecSyncOptions } from 'child_process';

// Mock variables must be hoisted to be used in mock factories
const mocks = vi.hoisted(() => ({
  execSync: vi.fn(),
  existsSync: vi.fn()
}));

// Mock child_process and fs modules
vi.mock('child_process', () => ({
  execSync: mocks.execSync
}));

vi.mock('fs', () => ({
  existsSync: mocks.existsSync
}));

describe('whisperBinary', () => {
  let detectWhisperBinary: () => import('./whisperBinary').WhisperBinaryResult;
  let clearBinaryCache: () => void;

  beforeEach(async () => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Reset module registry to clear cache between tests
    vi.resetModules();

    // Import fresh module instance
    const module = await import('./whisperBinary');
    detectWhisperBinary = module.detectWhisperBinary;
    clearBinaryCache = module.clearBinaryCache;
  });

  it('finds binary via which whisper-cli', () => {
    const binaryPath = '/opt/homebrew/bin/whisper-cli';

    mocks.execSync.mockReturnValue(`${binaryPath}\n`);
    mocks.existsSync.mockReturnValue(true);

    const result = detectWhisperBinary();

    expect(result).toEqual({
      found: true,
      path: binaryPath
    });

    expect(mocks.execSync).toHaveBeenCalledWith('which whisper-cli', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    expect(mocks.existsSync).toHaveBeenCalledWith(binaryPath);
  });

  it('falls back to /opt/homebrew/bin/whisper-cli when which fails', () => {
    const homebrewPath = '/opt/homebrew/bin/whisper-cli';

    mocks.execSync.mockImplementation(() => {
      throw new Error('Command failed: which whisper-cli');
    });

    mocks.existsSync.mockImplementation((path: string) => {
      return path === homebrewPath;
    });

    const result = detectWhisperBinary();

    expect(result).toEqual({
      found: true,
      path: homebrewPath
    });

    expect(mocks.execSync).toHaveBeenCalled();
    expect(mocks.existsSync).toHaveBeenCalledWith(homebrewPath);
  });

  it('falls back to /usr/local/bin/whisper-cli when Apple Silicon path does not exist', () => {
    const intelPath = '/usr/local/bin/whisper-cli';

    mocks.execSync.mockImplementation(() => {
      throw new Error('Command failed: which whisper-cli');
    });

    mocks.existsSync.mockImplementation((path: string) => {
      return path === intelPath;
    });

    const result = detectWhisperBinary();

    expect(result).toEqual({
      found: true,
      path: intelPath
    });

    expect(mocks.execSync).toHaveBeenCalled();
    expect(mocks.existsSync).toHaveBeenCalledWith('/opt/homebrew/bin/whisper-cli');
    expect(mocks.existsSync).toHaveBeenCalledWith(intelPath);
  });

  it('returns not found when binary does not exist anywhere', () => {
    mocks.execSync.mockImplementation(() => {
      throw new Error('Command failed: which whisper-cli');
    });

    mocks.existsSync.mockReturnValue(false);

    const result = detectWhisperBinary();

    expect(result).toEqual({
      found: false,
      path: null
    });

    expect(mocks.execSync).toHaveBeenCalled();
    expect(mocks.existsSync).toHaveBeenCalledWith('/opt/homebrew/bin/whisper-cli');
    expect(mocks.existsSync).toHaveBeenCalledWith('/usr/local/bin/whisper-cli');
  });

  it('caches result so second call does not re-execute detection', () => {
    const binaryPath = '/opt/homebrew/bin/whisper-cli';

    mocks.execSync.mockReturnValue(`${binaryPath}\n`);
    mocks.existsSync.mockReturnValue(true);

    // First call
    const result1 = detectWhisperBinary();

    expect(result1).toEqual({
      found: true,
      path: binaryPath
    });

    expect(mocks.execSync).toHaveBeenCalledTimes(1);

    // Second call should use cache
    const result2 = detectWhisperBinary();

    expect(result2).toEqual({
      found: true,
      path: binaryPath
    });

    // execSync should not be called again
    expect(mocks.execSync).toHaveBeenCalledTimes(1);
  });

  it('clearBinaryCache forces re-detection', () => {
    const binaryPath = '/opt/homebrew/bin/whisper-cli';

    mocks.execSync.mockReturnValue(`${binaryPath}\n`);
    mocks.existsSync.mockReturnValue(true);

    // First call
    const result1 = detectWhisperBinary();

    expect(result1).toEqual({
      found: true,
      path: binaryPath
    });

    expect(mocks.execSync).toHaveBeenCalledTimes(1);

    // Clear cache
    clearBinaryCache();

    // Next call should re-execute detection
    const result2 = detectWhisperBinary();

    expect(result2).toEqual({
      found: true,
      path: binaryPath
    });

    // execSync should be called again
    expect(mocks.execSync).toHaveBeenCalledTimes(2);
  });

  it('handles which returning empty path', () => {
    const homebrewPath = '/opt/homebrew/bin/whisper-cli';

    mocks.execSync.mockReturnValue('   \n');

    mocks.existsSync.mockImplementation((path: string) => {
      return path === homebrewPath;
    });

    const result = detectWhisperBinary();

    expect(result).toEqual({
      found: true,
      path: homebrewPath
    });

    expect(mocks.existsSync).toHaveBeenCalledWith(homebrewPath);
  });

  it('handles which returning path that does not exist on disk', () => {
    const whichPath = '/some/nonexistent/path/whisper-cli';
    const homebrewPath = '/opt/homebrew/bin/whisper-cli';

    mocks.execSync.mockReturnValue(`${whichPath}\n`);

    mocks.existsSync.mockImplementation((path: string) => {
      if (path === whichPath) return false;
      if (path === homebrewPath) return true;
      return false;
    });

    const result = detectWhisperBinary();

    expect(result).toEqual({
      found: true,
      path: homebrewPath
    });

    expect(mocks.existsSync).toHaveBeenCalledWith(whichPath);
    expect(mocks.existsSync).toHaveBeenCalledWith(homebrewPath);
  });
});
