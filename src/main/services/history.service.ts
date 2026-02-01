/**
 * History Service
 *
 * Manages export history persistence using SQLite.
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ZodError } from 'zod'
import {
  HistoryEntrySchema,
  MAX_HISTORY_ENTRIES,
  type ExportHistory,
  type HistoryEntry,
} from '../../schemas/history.schema'
import { getDb } from './database.service'

/**
 * Legacy history file name (for migration).
 */
const LEGACY_HISTORY_FILE_NAME = 'export-history.json'

/**
 * Error codes for history operations.
 */
export enum HistoryErrorCode {
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  ENTRY_NOT_FOUND = 'ENTRY_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
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
  private legacyHistoryPath: string
  private migrationChecked = false

  constructor() {
    const userDataPath = this.getUserDataPath()
    this.legacyHistoryPath = path.join(userDataPath, LEGACY_HISTORY_FILE_NAME)
  }

  /**
   * Gets the user data path.
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
   * Migrate from legacy JSON file to SQLite (one-time).
   */
  private migrateFromLegacyFile(): void {
    if (this.migrationChecked) return
    this.migrationChecked = true

    try {
      if (!fs.existsSync(this.legacyHistoryPath)) return

      const content = fs.readFileSync(this.legacyHistoryPath, 'utf-8')
      const rawHistory = JSON.parse(content)
      const entries = rawHistory.entries as HistoryEntry[]

      if (!Array.isArray(entries)) return

      const db = getDb()
      const insertStmt = db.prepare(
        'INSERT OR IGNORE INTO export_history (id, company_name, job_title, date, resume_path, cover_letter_path, folder_path) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )

      for (const entry of entries) {
        insertStmt.run(
          entry.id,
          entry.companyName,
          entry.jobTitle,
          entry.date,
          entry.resumePath ?? null,
          entry.coverLetterPath ?? null,
          entry.folderPath
        )
      }

      // Rename legacy file to .bak
      fs.renameSync(this.legacyHistoryPath, this.legacyHistoryPath + '.bak')
      console.log('Migrated export history from JSON file to SQLite')
    } catch (error) {
      console.error('Failed to migrate legacy history file:', error)
    }
  }

  /**
   * Loads export history from database.
   */
  async loadHistory(): Promise<ExportHistory> {
    this.migrateFromLegacyFile()

    try {
      const db = getDb()
      const rows = db
        .prepare(
          'SELECT id, company_name, job_title, date, resume_path, cover_letter_path, folder_path FROM export_history ORDER BY date DESC LIMIT ?'
        )
        .all(MAX_HISTORY_ENTRIES) as Array<{
        id: string
        company_name: string
        job_title: string
        date: string
        resume_path: string | null
        cover_letter_path: string | null
        folder_path: string
      }>

      const entries: HistoryEntry[] = rows.map(row => ({
        id: row.id,
        companyName: row.company_name,
        jobTitle: row.job_title,
        date: row.date,
        resumePath: row.resume_path ?? undefined,
        coverLetterPath: row.cover_letter_path ?? undefined,
        folderPath: row.folder_path,
      }))

      return {
        version: 1,
        entries,
      }
    } catch (error) {
      throw new HistoryError(
        HistoryErrorCode.DATABASE_ERROR,
        `Failed to load history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Retrieves recent history entries.
   */
  async getRecentEntries(limit?: number): Promise<HistoryEntry[]> {
    const history = await this.loadHistory()
    const effectiveLimit = limit ?? MAX_HISTORY_ENTRIES
    return history.entries.slice(0, effectiveLimit)
  }

  /**
   * Adds a new entry to the history.
   */
  async addEntry(entry: HistoryEntry): Promise<void> {
    this.migrateFromLegacyFile()

    try {
      // Validate the entry
      HistoryEntrySchema.parse(entry)

      const db = getDb()

      // Insert new entry
      db.prepare(
        'INSERT INTO export_history (id, company_name, job_title, date, resume_path, cover_letter_path, folder_path) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        entry.id,
        entry.companyName,
        entry.jobTitle,
        entry.date,
        entry.resumePath ?? null,
        entry.coverLetterPath ?? null,
        entry.folderPath
      )

      // Trim old entries beyond max
      const count = (
        db.prepare('SELECT COUNT(*) as count FROM export_history').get() as { count: number }
      ).count
      if (count > MAX_HISTORY_ENTRIES) {
        db.prepare(
          'DELETE FROM export_history WHERE id NOT IN (SELECT id FROM export_history ORDER BY date DESC LIMIT ?)'
        ).run(MAX_HISTORY_ENTRIES)
      }
    } catch (error) {
      if (error instanceof ZodError) {
        throw new HistoryError(
          HistoryErrorCode.VALIDATION_ERROR,
          `Invalid history entry: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
          { validationErrors: error.errors }
        )
      }
      throw new HistoryError(
        HistoryErrorCode.DATABASE_ERROR,
        `Failed to add history entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Deletes a specific entry by ID.
   */
  async deleteEntry(entryId: string): Promise<void> {
    this.migrateFromLegacyFile()

    try {
      const db = getDb()
      const result = db.prepare('DELETE FROM export_history WHERE id = ?').run(entryId)

      if (result.changes === 0) {
        throw new HistoryError(
          HistoryErrorCode.ENTRY_NOT_FOUND,
          `History entry with id "${entryId}" not found`
        )
      }
    } catch (error) {
      if (error instanceof HistoryError) {
        throw error
      }
      throw new HistoryError(
        HistoryErrorCode.DATABASE_ERROR,
        `Failed to delete history entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Clears all history entries.
   */
  async clearHistory(): Promise<void> {
    this.migrateFromLegacyFile()

    try {
      const db = getDb()
      db.prepare('DELETE FROM export_history').run()
    } catch (error) {
      throw new HistoryError(
        HistoryErrorCode.DATABASE_ERROR,
        `Failed to clear history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Clears the history cache - no-op for SQLite version.
   */
  clearCache(): void {
    // No cache in SQLite version
  }
}

// Export a singleton instance
export const historyService = new HistoryService()
