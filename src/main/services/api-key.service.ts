/**
 * API Key Service
 *
 * Manages secure storage of API keys using Electron's safeStorage API.
 * Also provides CLI detection functionality to identify installed AI tools.
 */

import { safeStorage } from 'electron'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { spawn } from 'child_process'

/**
 * Supported AI providers for API key storage.
 */
export type AIProvider = 'claude' | 'openai' | 'google'

/**
 * Supported CLI tools for detection.
 */
export type CLITool = 'claude' | 'codex' | 'gemini'

/**
 * All supported CLI tool names.
 */
const CLI_TOOLS: CLITool[] = ['claude', 'codex', 'gemini']

/**
 * File name for storing encrypted API keys.
 */
const API_KEYS_FILE_NAME = 'api-keys.json'

/**
 * Error codes for API key operations.
 */
export enum ApiKeyErrorCode {
  ENCRYPTION_NOT_AVAILABLE = 'ENCRYPTION_NOT_AVAILABLE',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  INVALID_PROVIDER = 'INVALID_PROVIDER',
}

/**
 * Custom error class for API key operations.
 */
export class ApiKeyError extends Error {
  constructor(
    public readonly code: ApiKeyErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiKeyError'
  }
}

/**
 * Structure of the encrypted keys file.
 * Keys are stored as base64-encoded encrypted buffers.
 */
interface EncryptedKeysStore {
  claude?: string
  openai?: string
  google?: string
}

/**
 * API Key Service class for managing secure API key storage and CLI detection.
 */
export class ApiKeyService {
  private keysFilePath: string
  private cachedKeys: EncryptedKeysStore | null = null

  constructor() {
    const userDataPath = this.getUserDataPath()
    this.keysFilePath = path.join(userDataPath, API_KEYS_FILE_NAME)
  }

  /**
   * Gets the user data path for storing the keys file.
   * Falls back to a reasonable default if app is not available.
   */
  private getUserDataPath(): string {
    try {
      return app.getPath('userData')
    } catch {
      // Fallback for non-Electron environments (e.g., testing)
      const homeDir = os.homedir()
      switch (process.platform) {
        case 'darwin':
          return path.join(homeDir, 'Library', 'Application Support', 'resume-creator')
        case 'win32':
          return path.join(homeDir, 'AppData', 'Roaming', 'resume-creator')
        default:
          return path.join(homeDir, '.config', 'resume-creator')
      }
    }
  }

  /**
   * Checks if safeStorage encryption is available on this system.
   */
  isEncryptionAvailable(): boolean {
    try {
      return safeStorage.isEncryptionAvailable()
    } catch {
      return false
    }
  }

  /**
   * Loads the encrypted keys store from disk.
   */
  private loadKeysStore(): EncryptedKeysStore {
    if (this.cachedKeys) {
      return this.cachedKeys
    }

    try {
      if (!fs.existsSync(this.keysFilePath)) {
        this.cachedKeys = {}
        return {}
      }

      const content = fs.readFileSync(this.keysFilePath, 'utf-8')
      const parsed = JSON.parse(content) as EncryptedKeysStore
      this.cachedKeys = parsed
      return parsed
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Corrupted file, start fresh
        this.cachedKeys = {}
        return {}
      }
      throw new ApiKeyError(
        ApiKeyErrorCode.FILE_READ_ERROR,
        `Failed to read API keys file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Saves the encrypted keys store to disk.
   */
  private saveKeysStore(store: EncryptedKeysStore): void {
    try {
      const dirPath = path.dirname(this.keysFilePath)
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
      }

      fs.writeFileSync(this.keysFilePath, JSON.stringify(store, null, 2), 'utf-8')
      this.cachedKeys = store
    } catch (error) {
      throw new ApiKeyError(
        ApiKeyErrorCode.FILE_WRITE_ERROR,
        `Failed to write API keys file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Validates that the provider is a valid AIProvider.
   */
  private validateProvider(provider: string): asserts provider is AIProvider {
    if (!['claude', 'openai', 'google'].includes(provider)) {
      throw new ApiKeyError(
        ApiKeyErrorCode.INVALID_PROVIDER,
        `Invalid provider: ${provider}. Must be one of: claude, openai, google`
      )
    }
  }

  /**
   * Saves an API key for the specified provider.
   * The key is encrypted using Electron's safeStorage before being stored.
   */
  saveAPIKey(provider: AIProvider, key: string): void {
    this.validateProvider(provider)

    if (!this.isEncryptionAvailable()) {
      throw new ApiKeyError(
        ApiKeyErrorCode.ENCRYPTION_NOT_AVAILABLE,
        'Encryption is not available on this system. Cannot securely store API keys.'
      )
    }

    try {
      const encrypted = safeStorage.encryptString(key)
      const base64Encrypted = encrypted.toString('base64')

      const store = this.loadKeysStore()
      store[provider] = base64Encrypted
      this.saveKeysStore(store)
    } catch (error) {
      if (error instanceof ApiKeyError) {
        throw error
      }
      throw new ApiKeyError(
        ApiKeyErrorCode.ENCRYPTION_FAILED,
        `Failed to encrypt API key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Checks if an API key exists for the specified provider.
   */
  hasAPIKey(provider: AIProvider): boolean {
    this.validateProvider(provider)

    try {
      const store = this.loadKeysStore()
      return Boolean(store[provider])
    } catch {
      return false
    }
  }

  /**
   * Retrieves the decrypted API key for the specified provider.
   * Returns null if no key exists.
   */
  getAPIKey(provider: AIProvider): string | null {
    this.validateProvider(provider)

    if (!this.isEncryptionAvailable()) {
      throw new ApiKeyError(
        ApiKeyErrorCode.ENCRYPTION_NOT_AVAILABLE,
        'Encryption is not available on this system. Cannot decrypt API keys.'
      )
    }

    try {
      const store = this.loadKeysStore()
      const encryptedBase64 = store[provider]

      if (!encryptedBase64) {
        return null
      }

      const encryptedBuffer = Buffer.from(encryptedBase64, 'base64')
      return safeStorage.decryptString(encryptedBuffer)
    } catch (error) {
      if (error instanceof ApiKeyError) {
        throw error
      }
      throw new ApiKeyError(
        ApiKeyErrorCode.DECRYPTION_FAILED,
        `Failed to decrypt API key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Deletes the API key for the specified provider.
   */
  deleteAPIKey(provider: AIProvider): void {
    this.validateProvider(provider)

    try {
      const store = this.loadKeysStore()
      delete store[provider]
      this.saveKeysStore(store)
    } catch (error) {
      if (error instanceof ApiKeyError) {
        throw error
      }
      throw new ApiKeyError(
        ApiKeyErrorCode.FILE_WRITE_ERROR,
        `Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Clears the cached keys, forcing a reload on next access.
   */
  clearCache(): void {
    this.cachedKeys = null
  }

  /**
   * Detects which AI CLI tools are installed on the system.
   * Returns an array of detected CLI tool names.
   */
  async detectInstalledCLIs(): Promise<CLITool[]> {
    const detected: CLITool[] = []

    const checks = CLI_TOOLS.map(async tool => {
      const isInstalled = await this.checkCLIExists(tool)
      if (isInstalled) {
        detected.push(tool)
      }
    })

    await Promise.all(checks)
    return detected
  }

  /**
   * Checks if a specific CLI tool exists in the system PATH.
   */
  private checkCLIExists(tool: CLITool): Promise<boolean> {
    return new Promise(resolve => {
      // Use 'which' on Unix-like systems, 'where' on Windows
      const command = process.platform === 'win32' ? 'where' : 'which'

      const child = spawn(command, [tool], {
        stdio: ['ignore', 'pipe', 'pipe'],
        // Don't show window on Windows
        windowsHide: true,
      })

      let resolved = false

      child.on('close', code => {
        if (!resolved) {
          resolved = true
          // Exit code 0 means the command was found
          resolve(code === 0)
        }
      })

      child.on('error', () => {
        if (!resolved) {
          resolved = true
          resolve(false)
        }
      })

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          child.kill()
          resolve(false)
        }
      }, 5000)
    })
  }
}

// Export a singleton instance
export const apiKeyService = new ApiKeyService()
