import { execSync } from 'child_process';
import { existsSync } from 'fs';

/**
 * Result of whisper binary detection
 */
export interface WhisperBinaryResult {
  found: boolean;
  path: string | null;
}

/**
 * Cached binary detection result
 */
let cachedResult: WhisperBinaryResult | null = null;

/**
 * Homebrew installation paths to check as fallbacks
 */
const HOMEBREW_PATHS = [
  '/opt/homebrew/bin/whisper-cli', // Apple Silicon
  '/usr/local/bin/whisper-cli'     // Intel Mac
];

/**
 * Detects the whisper-cli binary installed via Homebrew on macOS.
 *
 * Detection strategy:
 * 1. Try `which whisper-cli` to find binary in PATH
 * 2. Check /opt/homebrew/bin/whisper-cli (Apple Silicon)
 * 3. Check /usr/local/bin/whisper-cli (Intel Mac)
 * 4. Return not found if all attempts fail
 *
 * Results are cached to avoid repeated system calls.
 *
 * @returns Detection result with found status and binary path
 */
export function detectWhisperBinary(): WhisperBinaryResult {
  // Return cached result if available
  if (cachedResult !== null) {
    return cachedResult;
  }

  // Strategy 1: Try `which whisper-cli`
  try {
    const output = execSync('which whisper-cli', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const path = output.trim();

    if (path && existsSync(path)) {
      cachedResult = { found: true, path };
      return cachedResult;
    }
  } catch (error) {
    // `which` returns exit code 1 when binary not found, ignore and try fallbacks
  }

  // Strategy 2 & 3: Check Homebrew installation paths
  for (const path of HOMEBREW_PATHS) {
    if (existsSync(path)) {
      cachedResult = { found: true, path };
      return cachedResult;
    }
  }

  // Strategy 4: Binary not found
  cachedResult = { found: false, path: null };
  return cachedResult;
}

/**
 * Clears the cached binary detection result.
 * Use this to force re-detection after installing whisper-cli.
 */
export function clearBinaryCache(): void {
  cachedResult = null;
}
