/**
 * Shell Environment & Binary Detection Utilities
 *
 * Packaged Electron apps don't inherit shell environment, so we need to
 * probe known installation paths directly.
 *
 * Detection Strategy (from https://github.com/pedramamini/Maestro):
 * 1. Direct file system probing of known installation paths (fastest, most reliable)
 * 2. Fall back to which/where command with expanded PATH
 */

import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * Build an expanded PATH that includes common binary installation locations.
 */
export function getSpawnEnv(): NodeJS.ProcessEnv {
  const home = os.homedir()
  const env = { ...process.env }
  const isWindows = process.platform === 'win32'

  let additionalPaths: string[]

  if (isWindows) {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')

    additionalPaths = [
      path.join(home, '.local', 'bin'),
      path.join(appData, 'npm'),
      path.join(localAppData, 'npm'),
      path.join(home, 'scoop', 'shims'),
      path.join(process.env.ChocolateyInstall || 'C:\\ProgramData\\chocolatey', 'bin'),
      path.join(home, '.volta', 'bin'),
    ]
  } else {
    additionalPaths = [
      `${home}/.local/bin`,
      `${home}/.claude/local`,
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/usr/local/bin',
      '/usr/local/sbin',
      `${home}/bin`,
      `${home}/.volta/bin`,
      `${home}/.npm-global/bin`,
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin',
    ]
  }

  const currentPath = env.PATH || ''
  const pathParts = currentPath.split(path.delimiter)

  for (const p of additionalPaths) {
    if (!pathParts.includes(p)) {
      pathParts.unshift(p)
    }
  }

  env.PATH = pathParts.join(path.delimiter)
  return env
}

/**
 * Known installation paths for CLI binaries on Unix (macOS/Linux).
 */
function getUnixKnownPaths(binaryName: string): string[] {
  const home = os.homedir()

  const knownPaths: Record<string, string[]> = {
    claude: [
      `${home}/.claude/local/claude`,
      `${home}/.local/bin/claude`,
      '/opt/homebrew/bin/claude',
      '/usr/local/bin/claude',
      `${home}/.npm-global/bin/claude`,
      `${home}/bin/claude`,
    ],
    codex: [
      `${home}/.local/bin/codex`,
      '/opt/homebrew/bin/codex',
      '/usr/local/bin/codex',
      `${home}/.npm-global/bin/codex`,
    ],
    gemini: [
      `${home}/.local/bin/gemini`,
      '/opt/homebrew/bin/gemini',
      '/usr/local/bin/gemini',
      `${home}/.npm-global/bin/gemini`,
    ],
  }

  return knownPaths[binaryName] || []
}

/**
 * Known installation paths for CLI binaries on Windows.
 */
function getWindowsKnownPaths(binaryName: string): string[] {
  const home = os.homedir()
  const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
  const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')

  const knownPaths: Record<string, string[]> = {
    claude: [
      path.join(home, '.local', 'bin', 'claude.exe'),
      path.join(localAppData, 'Microsoft', 'WinGet', 'Links', 'claude.exe'),
      path.join(appData, 'npm', 'claude.cmd'),
      path.join(localAppData, 'npm', 'claude.cmd'),
    ],
    codex: [
      path.join(appData, 'npm', 'codex.cmd'),
      path.join(localAppData, 'npm', 'codex.cmd'),
      path.join(home, '.local', 'bin', 'codex.exe'),
    ],
    gemini: [path.join(appData, 'npm', 'gemini.cmd'), path.join(localAppData, 'npm', 'gemini.cmd')],
  }

  return knownPaths[binaryName] || []
}

/**
 * Directly probe known installation paths for a binary.
 * This is more reliable than which/where in packaged Electron apps.
 */
async function probeKnownPaths(binaryName: string): Promise<string | null> {
  const isWindows = process.platform === 'win32'
  const pathsToCheck = isWindows ? getWindowsKnownPaths(binaryName) : getUnixKnownPaths(binaryName)

  if (pathsToCheck.length === 0) {
    return null
  }

  // Check all paths in parallel for performance
  const results = await Promise.allSettled(
    pathsToCheck.map(async probePath => {
      if (isWindows) {
        await fs.promises.access(probePath, fs.constants.F_OK)
      } else {
        // On Unix, check both existence and executability
        await fs.promises.access(probePath, fs.constants.F_OK | fs.constants.X_OK)
      }
      return probePath
    })
  )

  // Return the first successful result (maintains priority order)
  for (const result of results) {
    if (result.status === 'fulfilled') {
      console.log(`[probeKnownPaths] Found ${binaryName} at ${result.value}`)
      return result.value
    }
  }

  return null
}

/**
 * Cache for CLI path detection results.
 */
const cliPathCache = new Map<string, string | null>()

/**
 * Detect if a CLI tool is installed and return its path.
 * Uses direct file probing first, then falls back to which/where.
 * Results are cached for performance.
 */
export async function detectCliPath(cliName: string): Promise<string | null> {
  // Return cached result if available
  if (cliPathCache.has(cliName)) {
    return cliPathCache.get(cliName) ?? null
  }

  // 1. First try direct file probing of known installation paths
  const probedPath = await probeKnownPaths(cliName)
  if (probedPath) {
    cliPathCache.set(cliName, probedPath)
    return probedPath
  }

  // 2. Fall back to which/where with expanded PATH
  const command = process.platform === 'win32' ? 'where' : 'which'
  const env = getSpawnEnv()

  try {
    const { stdout } = await execFileAsync(command, [cliName], {
      env,
      encoding: 'utf8',
    })

    if (stdout.trim()) {
      const cliPath = stdout.trim().split('\n')[0] ?? null
      if (cliPath) {
        console.log(`[detectCliPath] Found ${cliName} via ${command} at ${cliPath}`)
        cliPathCache.set(cliName, cliPath)
        return cliPath
      }
    }
  } catch {
    // CLI not found
  }

  console.log(`[detectCliPath] ${cliName} not found`)
  cliPathCache.set(cliName, null)
  return null
}

/**
 * Clear the CLI path cache (for re-detection).
 */
export function clearCliCache(cliName?: string): void {
  if (cliName) {
    cliPathCache.delete(cliName)
  } else {
    cliPathCache.clear()
  }
}
