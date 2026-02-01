/**
 * Database Service
 *
 * Central SQLite database connection and migration management.
 * Uses better-sqlite3 for synchronous, fast SQLite operations.
 */

import Database from 'better-sqlite3'
import { app } from 'electron'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'

const DB_FILE_NAME = 'resume-tailor.db'

/**
 * Get the user data path for storing the database.
 */
function getUserDataPath(): string {
  try {
    return app.getPath('userData')
  } catch {
    // Fallback for when app is not ready
    const homeDir = os.homedir()
    switch (process.platform) {
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'resume-tailor')
      case 'win32':
        return path.join(homeDir, 'AppData', 'Roaming', 'resume-tailor')
      default:
        return path.join(homeDir, '.config', 'resume-tailor')
    }
  }
}

/**
 * Database service class - manages SQLite connection and migrations.
 */
class DatabaseService {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    const userDataPath = getUserDataPath()
    this.dbPath = path.join(userDataPath, DB_FILE_NAME)
  }

  /**
   * Initialize the database connection and run migrations.
   */
  init(): Database.Database {
    if (this.db) {
      return this.db
    }

    // Ensure directory exists
    const dbDir = path.dirname(this.dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    // Open database connection
    this.db = new Database(this.dbPath)

    // Enable WAL mode for better concurrent read performance
    this.db.pragma('journal_mode = WAL')

    // Run migrations
    this.runMigrations()

    return this.db
  }

  /**
   * Get the database instance. Initializes if not already done.
   */
  getDb(): Database.Database {
    if (!this.db) {
      return this.init()
    }
    return this.db
  }

  /**
   * Run database migrations - creates tables if they don't exist.
   */
  private runMigrations(): void {
    if (!this.db) return

    // Create profile table (singleton for user's master resume)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        resume_json TEXT NOT NULL,
        imported_at TEXT,
        source_file TEXT,
        last_modified_at TEXT
      )
    `)

    // Create applications table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        job_title TEXT NOT NULL,
        job_description TEXT,
        job_url TEXT,
        location TEXT,
        employment_type TEXT,
        salary_range TEXT,
        current_status_id TEXT NOT NULL,
        status_history_json TEXT NOT NULL,
        resume_path TEXT,
        cover_letter_path TEXT,
        folder_path TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

    // Create export history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS export_history (
        id TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        job_title TEXT NOT NULL,
        date TEXT NOT NULL,
        resume_path TEXT,
        cover_letter_path TEXT,
        folder_path TEXT NOT NULL
      )
    `)

    // Create settings table (singleton)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        settings_json TEXT NOT NULL
      )
    `)

    // Create API keys table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        provider TEXT PRIMARY KEY,
        encrypted_key TEXT NOT NULL
      )
    `)

    // Create indexes for common queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_export_history_date ON export_history(date DESC);
    `)
  }

  /**
   * Get the database file path.
   */
  getDbPath(): string {
    return this.dbPath
  }

  /**
   * Close the database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService()

// Export the db getter for convenience
export function getDb(): Database.Database {
  return databaseService.getDb()
}
