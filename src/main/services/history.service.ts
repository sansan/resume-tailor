/**
 * History Service
 *
 * Manages export history persistence using a JSON file stored in
 * the user's app data directory. Provides storing, retrieving,
 * and clearing export history entries.
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ZodError } from 'zod'
import {
  ExportHistorySchema,
  HistoryEntrySchema,
  DEFAULT_EXPORT_HISTORY,
  MAX_HISTORY_ENTRIES,
  type ExportHistory,
  type HistoryEntry,
} from '../../schemas/history.schema'

/**
 * History file name.
 */
const HISTORY_FILE_NAME = 'export-history.json'

/**
 * Current history schema version.
 */
const CURRENT_SCHEMA_VERSION = 1

/**
 * Error codes for history operations.
 */
export enum HistoryErrorCode {
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  ENTRY_NOT_FOUND = 'ENTRY_NOT_FOUND',
}

/**
 * Custom error class for history operations.
 */
export class HistoryError extends Error {
  constructor(
    public readonly code: HistoryErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'HistoryError'
  }
}

/**
 * History Service class for managing export history.
 */
export class HistoryService {
  private historyPath: string
  private cachedHistory: ExportHistory | null = null

  constructor() {
    const userDataPath = this.getUserDataPath()
    this.historyPath = path.join(userDataPath, HISTORY_FILE_NAME)
  }

  /**
   * Gets the user data path for storing history.
   * Falls back to a reasonable default if app is not available.
   */
  private getUserDataPath(): string {
    try {
      return app.getPath('userData')
    } catch {
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
   * Gets the history file path.
   */
  getHistoryFilePath(): string {
    return this.historyPath
  }

  /**
   * Loads export history from the JSON file.
   * Returns empty history if file doesn't exist.
   */
  async loadHistory(): Promise<ExportHistory> {
    if (this.cachedHistory) {
      return { ...this.cachedHistory, entries: [...this.cachedHistory.entries] }
    }

    try {
      if (!fs.existsSync(this.historyPath)) {
        const defaultHistory = { ...DEFAULT_EXPORT_HISTORY }
        this.cachedHistory = defaultHistory
        return { ...defaultHistory, entries: [] }
      }

      const content = fs.readFileSync(this.historyPath, 'utf-8')
      const rawHistory = JSON.parse(content)

      const migratedHistory = this.migrateHistory(rawHistory)
      const validatedHistory = ExportHistorySchema.parse(migratedHistory)

      this.cachedHistory = validatedHistory
      return { ...validatedHistory, entries: [...validatedHistory.entries] }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new HistoryError(
          HistoryErrorCode.FILE_READ_ERROR,
          'History file contains invalid JSON',
          { originalError: error.message }
        )
      }
      if (error instanceof ZodError) {
        throw new HistoryError(
          HistoryErrorCode.VALIDATION_ERROR,
          `Invalid history data: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
          { validationErrors: error.errors }
        )
      }
      if (error instanceof HistoryError) {
        throw error
      }
      throw new HistoryError(
        HistoryErrorCode.FILE_READ_ERROR,
        `Failed to load history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Retrieves recent history entries (up to MAX_HISTORY_ENTRIES).
   */
  async getRecentEntries(limit?: number): Promise<HistoryEntry[]> {
    const history = await this.loadHistory()
    const effectiveLimit = limit ?? MAX_HISTORY_ENTRIES
    return history.entries.slice(0, effectiveLimit)
  }

  /**
   * Adds a new entry to the history.
   * Entries are added to the front (most recent first).
   * Old entries beyond MAX_HISTORY_ENTRIES are automatically removed.
   */
  async addEntry(entry: HistoryEntry): Promise<void> {
    try {
      // Validate the entry
      HistoryEntrySchema.parse(entry)

      const history = await this.loadHistory()

      // Add new entry at the beginning
      history.entries.unshift(entry)

      // Trim to max entries
      if (history.entries.length > MAX_HISTORY_ENTRIES) {
        history.entries = history.entries.slice(0, MAX_HISTORY_ENTRIES)
      }

      await this.saveHistory(history)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HistoryError(
          HistoryErrorCode.VALIDATION_ERROR,
          `Invalid history entry: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
          { validationErrors: error.errors }
        )
      }
      if (error instanceof HistoryError) {
        throw error
      }
      throw new HistoryError(
        HistoryErrorCode.FILE_WRITE_ERROR,
        `Failed to add history entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Deletes a specific entry by ID.
   */
  async deleteEntry(entryId: string): Promise<void> {
    try {
      const history = await this.loadHistory()

      const index = history.entries.findIndex(e => e.id === entryId)
      if (index === -1) {
        throw new HistoryError(
          HistoryErrorCode.ENTRY_NOT_FOUND,
          `History entry with id "${entryId}" not found`
        )
      }

      history.entries.splice(index, 1)
      await this.saveHistory(history)
    } catch (error) {
      if (error instanceof HistoryError) {
        throw error
      }
      throw new HistoryError(
        HistoryErrorCode.FILE_WRITE_ERROR,
        `Failed to delete history entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Clears all history entries.
   */
  async clearHistory(): Promise<void> {
    try {
      const emptyHistory: ExportHistory = {
        ...DEFAULT_EXPORT_HISTORY,
        entries: [],
      }
      await this.saveHistory(emptyHistory)
    } catch (error) {
      if (error instanceof HistoryError) {
        throw error
      }
      throw new HistoryError(
        HistoryErrorCode.FILE_WRITE_ERROR,
        `Failed to clear history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Clears the history cache, forcing a reload on next access.
   */
  clearCache(): void {
    this.cachedHistory = null
  }

  /**
   * Saves history to the JSON file.
   */
  private async saveHistory(history: ExportHistory): Promise<void> {
    try {
      // Ensure the directory exists
      const historyDir = path.dirname(this.historyPath)
      if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true })
      }

      // Write history to file
      fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2), 'utf-8')

      // Update cache
      this.cachedHistory = history
    } catch (error) {
      throw new HistoryError(
        HistoryErrorCode.FILE_WRITE_ERROR,
        `Failed to save history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Migrates history from older schema versions.
   */
  private migrateHistory(rawHistory: unknown): unknown {
    if (typeof rawHistory !== 'object' || rawHistory === null) {
      return rawHistory
    }

    const history = rawHistory as Record<string, unknown>
    const version = typeof history.version === 'number' ? history.version : 0

    if (version >= CURRENT_SCHEMA_VERSION) {
      return history
    }

    // Future migrations would go here
    history.version = CURRENT_SCHEMA_VERSION
    return history
  }
}

// Export a singleton instance
export const historyService = new HistoryService()
