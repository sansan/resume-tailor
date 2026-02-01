/**
 * API Key Service
 *
 * Manages secure storage of API keys using Electron's safeStorage API.
 * Also provides CLI detection functionality to identify installed AI tools.
 * Uses SQLite for persistence.
 */

import { safeStorage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { detectCliPath } from './providers/shell-env'
import { getDb } from './database.service'

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
 * Legacy file name for migration.
 */
const LEGACY_API_KEYS_FILE_NAME = 'api-keys.json'

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
  DATABASE_ERROR = 'DATABASE_ERROR',
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
 * Structure of the legacy encrypted keys file.
 */
interface LegacyEncryptedKeysStore {
  claude?: string
  openai?: string
  google?: string
}

/**
 * API Key Service class for managing secure API key storage and CLI detection.
 */
export class ApiKeyService {
  private legacyKeysFilePath: string
  private migrationChecked = false

  constructor() {
    const userDataPath = this.getUserDataPath()
    this.legacyKeysFilePath = path.join(userDataPath, LEGACY_API_KEYS_FILE_NAME)
  }

  /**
   * Gets the user data path.
   */
  private getUserDataPath(): string {
    try {
      return app.getPath('userData')
    } catch {
      const homeDir = require('os').homedir()
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
   * Migrate from legacy JSON file to SQLite (one-time).
   */
  private migrateFromLegacyFile(): void {
    if (this.migrationChecked) return
    this.migrationChecked = true

    try {
      if (!fs.existsSync(this.legacyKeysFilePath)) return

      const content = fs.readFileSync(this.legacyKeysFilePath, 'utf-8')
      const legacyStore = JSON.parse(content) as LegacyEncryptedKeysStore

      const db = getDb()
      const insertStmt = db.prepare(
        'INSERT OR IGNORE INTO api_keys (provider, encrypted_key) VALUES (?, ?)'
      )

      for (const provider of ['claude', 'openai', 'google'] as AIProvider[]) {
        const encryptedKey = legacyStore[provider]
        if (encryptedKey) {
          insertStmt.run(provider, encryptedKey)
        }
      }

      // Rename legacy file to .bak
      fs.renameSync(this.legacyKeysFilePath, this.legacyKeysFilePath + '.bak')
      console.log('Migrated API keys from JSON file to SQLite')
    } catch (error) {
      console.error('Failed to migrate legacy API keys file:', error)
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
    this.migrateFromLegacyFile()

    if (!this.isEncryptionAvailable()) {
      throw new ApiKeyError(
        ApiKeyErrorCode.ENCRYPTION_NOT_AVAILABLE,
        'Encryption is not available on this system. Cannot securely store API keys.'
      )
    }

    try {
      const encrypted = safeStorage.encryptString(key)
      const base64Encrypted = encrypted.toString('base64')

      const db = getDb()
      db.prepare('INSERT OR REPLACE INTO api_keys (provider, encrypted_key) VALUES (?, ?)').run(
        provider,
        base64Encrypted
      )
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
    this.migrateFromLegacyFile()

    try {
      const db = getDb()
      const row = db.prepare('SELECT 1 FROM api_keys WHERE provider = ?').get(provider)
      return Boolean(row)
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
    this.migrateFromLegacyFile()

    if (!this.isEncryptionAvailable()) {
      throw new ApiKeyError(
        ApiKeyErrorCode.ENCRYPTION_NOT_AVAILABLE,
        'Encryption is not available on this system. Cannot decrypt API keys.'
      )
    }

    try {
      const db = getDb()
      const row = db
        .prepare('SELECT encrypted_key FROM api_keys WHERE provider = ?')
        .get(provider) as { encrypted_key: string } | undefined

      if (!row) {
        return null
      }

      const encryptedBuffer = Buffer.from(row.encrypted_key, 'base64')
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
    this.migrateFromLegacyFile()

    try {
      const db = getDb()
      db.prepare('DELETE FROM api_keys WHERE provider = ?').run(provider)
    } catch (error) {
      if (error instanceof ApiKeyError) {
        throw error
      }
      throw new ApiKeyError(
        ApiKeyErrorCode.DATABASE_ERROR,
        `Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Clears the cached keys - no-op for SQLite version.
   */
  clearCache(): void {
    // No cache in SQLite version
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
   * Checks if a specific CLI tool exists using direct file probing.
   */
  private async checkCLIExists(tool: CLITool): Promise<boolean> {
    const cliPath = await detectCliPath(tool)
    return cliPath !== null
  }
}

// Export a singleton instance
export const apiKeyService = new ApiKeyService()
