/**
 * Applications Service
 *
 * Manages job application tracking persistence using SQLite.
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ZodError } from 'zod'
import {
  JobApplicationSchema,
  type JobApplication,
  type ApplicationStatistics,
  type StatusHistoryEntry,
} from '../../schemas/applications.schema'
import { getDb } from './database.service'

/**
 * Legacy applications file name (for migration).
 */
const LEGACY_APPLICATIONS_FILE_NAME = 'applications.json'

/**
 * Error codes for applications operations.
 */
export enum ApplicationsErrorCode {
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  APPLICATION_NOT_FOUND = 'APPLICATION_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

/**
 * Custom error class for applications operations.
 */
export class ApplicationsError extends Error {
  constructor(
    public readonly code: ApplicationsErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApplicationsError'
  }
}

/**
 * Database row type for applications.
 */
interface ApplicationRow {
  id: string
  company_name: string
  job_title: string
  job_description: string | null
  job_url: string | null
  location: string | null
  employment_type: string | null
  salary_range: string | null
  current_status_id: string
  status_history_json: string
  resume_path: string | null
  cover_letter_path: string | null
  folder_path: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Applications Service class for managing job application tracking.
 */
export class ApplicationsService {
  private legacyApplicationsPath: string
  private migrationChecked = false

  constructor() {
    const userDataPath = this.getUserDataPath()
    this.legacyApplicationsPath = path.join(userDataPath, LEGACY_APPLICATIONS_FILE_NAME)
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
      if (!fs.existsSync(this.legacyApplicationsPath)) return

      const content = fs.readFileSync(this.legacyApplicationsPath, 'utf-8')
      const rawData = JSON.parse(content)
      const applications = rawData.applications as JobApplication[]

      if (!Array.isArray(applications)) return

      const db = getDb()
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO applications
        (id, company_name, job_title, job_description, job_url, location, employment_type, salary_range, current_status_id, status_history_json, resume_path, cover_letter_path, folder_path, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const app of applications) {
        insertStmt.run(
          app.id,
          app.companyName,
          app.jobTitle,
          app.jobDescription ?? null,
          app.jobUrl ?? null,
          app.location ?? null,
          app.employmentType ?? null,
          app.salaryRange ?? null,
          app.currentStatusId,
          JSON.stringify(app.statusHistory),
          app.resumePath ?? null,
          app.coverLetterPath ?? null,
          app.folderPath ?? null,
          app.notes ?? null,
          app.createdAt,
          app.updatedAt
        )
      }

      // Rename legacy file to .bak
      fs.renameSync(this.legacyApplicationsPath, this.legacyApplicationsPath + '.bak')
      console.log('Migrated applications from JSON file to SQLite')
    } catch (error) {
      console.error('Failed to migrate legacy applications file:', error)
    }
  }

  /**
   * Convert database row to JobApplication.
   */
  private rowToApplication(row: ApplicationRow): JobApplication {
    return {
      id: row.id,
      companyName: row.company_name,
      jobTitle: row.job_title,
      jobDescription: row.job_description ?? undefined,
      jobUrl: row.job_url ?? undefined,
      location: row.location ?? undefined,
      employmentType: row.employment_type ?? undefined,
      salaryRange: row.salary_range ?? undefined,
      currentStatusId: row.current_status_id,
      statusHistory: JSON.parse(row.status_history_json) as StatusHistoryEntry[],
      resumePath: row.resume_path ?? undefined,
      coverLetterPath: row.cover_letter_path ?? undefined,
      folderPath: row.folder_path ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  /**
   * Retrieves all applications.
   */
  async getAllApplications(): Promise<JobApplication[]> {
    this.migrateFromLegacyFile()

    try {
      const db = getDb()
      const rows = db
        .prepare('SELECT * FROM applications ORDER BY created_at DESC')
        .all() as ApplicationRow[]

      return rows.map(row => this.rowToApplication(row))
    } catch (error) {
      throw new ApplicationsError(
        ApplicationsErrorCode.DATABASE_ERROR,
        `Failed to load applications: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Retrieves a specific application by ID.
   */
  async getApplication(applicationId: string): Promise<JobApplication | null> {
    this.migrateFromLegacyFile()

    try {
      const db = getDb()
      const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId) as
        | ApplicationRow
        | undefined

      return row ? this.rowToApplication(row) : null
    } catch (error) {
      throw new ApplicationsError(
        ApplicationsErrorCode.DATABASE_ERROR,
        `Failed to get application: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Adds a new application.
   */
  async addApplication(application: JobApplication): Promise<void> {
    this.migrateFromLegacyFile()

    try {
      // Validate the application
      JobApplicationSchema.parse(application)

      const db = getDb()
      db.prepare(
        `
        INSERT INTO applications
        (id, company_name, job_title, job_description, job_url, location, employment_type, salary_range, current_status_id, status_history_json, resume_path, cover_letter_path, folder_path, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        application.id,
        application.companyName,
        application.jobTitle,
        application.jobDescription ?? null,
        application.jobUrl ?? null,
        application.location ?? null,
        application.employmentType ?? null,
        application.salaryRange ?? null,
        application.currentStatusId,
        JSON.stringify(application.statusHistory),
        application.resumePath ?? null,
        application.coverLetterPath ?? null,
        application.folderPath ?? null,
        application.notes ?? null,
        application.createdAt,
        application.updatedAt
      )
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ApplicationsError(
          ApplicationsErrorCode.VALIDATION_ERROR,
          `Invalid application: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
          { validationErrors: error.errors }
        )
      }
      throw new ApplicationsError(
        ApplicationsErrorCode.DATABASE_ERROR,
        `Failed to add application: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Updates an existing application.
   */
  async updateApplication(
    applicationId: string,
    updates: Partial<JobApplication>
  ): Promise<JobApplication> {
    this.migrateFromLegacyFile()

    try {
      const existing = await this.getApplication(applicationId)
      if (!existing) {
        throw new ApplicationsError(
          ApplicationsErrorCode.APPLICATION_NOT_FOUND,
          `Application with id "${applicationId}" not found`
        )
      }

      const updatedApplication: JobApplication = {
        ...existing,
        ...updates,
        id: applicationId, // Ensure ID cannot be changed
        updatedAt: new Date().toISOString(),
      }

      // Validate the updated application
      JobApplicationSchema.parse(updatedApplication)

      const db = getDb()
      db.prepare(
        `
        UPDATE applications SET
          company_name = ?, job_title = ?, job_description = ?, job_url = ?,
          location = ?, employment_type = ?, salary_range = ?, current_status_id = ?,
          status_history_json = ?, resume_path = ?, cover_letter_path = ?,
          folder_path = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `
      ).run(
        updatedApplication.companyName,
        updatedApplication.jobTitle,
        updatedApplication.jobDescription ?? null,
        updatedApplication.jobUrl ?? null,
        updatedApplication.location ?? null,
        updatedApplication.employmentType ?? null,
        updatedApplication.salaryRange ?? null,
        updatedApplication.currentStatusId,
        JSON.stringify(updatedApplication.statusHistory),
        updatedApplication.resumePath ?? null,
        updatedApplication.coverLetterPath ?? null,
        updatedApplication.folderPath ?? null,
        updatedApplication.notes ?? null,
        updatedApplication.updatedAt,
        applicationId
      )

      return updatedApplication
    } catch (error) {
      if (error instanceof ApplicationsError) {
        throw error
      }
      if (error instanceof ZodError) {
        throw new ApplicationsError(
          ApplicationsErrorCode.VALIDATION_ERROR,
          `Invalid application update: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
          { validationErrors: error.errors }
        )
      }
      throw new ApplicationsError(
        ApplicationsErrorCode.DATABASE_ERROR,
        `Failed to update application: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Updates an application's status and records in history.
   */
  async updateStatus(
    applicationId: string,
    statusId: string,
    note?: string
  ): Promise<JobApplication> {
    this.migrateFromLegacyFile()

    try {
      const existing = await this.getApplication(applicationId)
      if (!existing) {
        throw new ApplicationsError(
          ApplicationsErrorCode.APPLICATION_NOT_FOUND,
          `Application with id "${applicationId}" not found`
        )
      }

      const now = new Date().toISOString()

      const historyEntry: StatusHistoryEntry = {
        statusId,
        changedAt: now,
        ...(note ? { note } : {}),
      }

      const updatedApplication: JobApplication = {
        ...existing,
        currentStatusId: statusId,
        statusHistory: [...existing.statusHistory, historyEntry],
        updatedAt: now,
      }

      const db = getDb()
      db.prepare(
        `
        UPDATE applications SET
          current_status_id = ?, status_history_json = ?, updated_at = ?
        WHERE id = ?
      `
      ).run(statusId, JSON.stringify(updatedApplication.statusHistory), now, applicationId)

      return updatedApplication
    } catch (error) {
      if (error instanceof ApplicationsError) {
        throw error
      }
      throw new ApplicationsError(
        ApplicationsErrorCode.DATABASE_ERROR,
        `Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Deletes a specific application by ID.
   */
  async deleteApplication(applicationId: string): Promise<void> {
    this.migrateFromLegacyFile()

    try {
      const db = getDb()
      const result = db.prepare('DELETE FROM applications WHERE id = ?').run(applicationId)

      if (result.changes === 0) {
        throw new ApplicationsError(
          ApplicationsErrorCode.APPLICATION_NOT_FOUND,
          `Application with id "${applicationId}" not found`
        )
      }
    } catch (error) {
      if (error instanceof ApplicationsError) {
        throw error
      }
      throw new ApplicationsError(
        ApplicationsErrorCode.DATABASE_ERROR,
        `Failed to delete application: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Gets statistics about applications.
   */
  async getStatistics(): Promise<ApplicationStatistics> {
    this.migrateFromLegacyFile()

    try {
      const db = getDb()

      // Total count
      const totalRow = db.prepare('SELECT COUNT(*) as count FROM applications').get() as {
        count: number
      }

      // This month count
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const thisMonthRow = db
        .prepare('SELECT COUNT(*) as count FROM applications WHERE created_at >= ?')
        .get(startOfMonth) as { count: number }

      // By status
      const statusRows = db
        .prepare(
          'SELECT current_status_id, COUNT(*) as count FROM applications GROUP BY current_status_id'
        )
        .all() as Array<{ current_status_id: string; count: number }>

      const byStatus: Record<string, number> = {}
      for (const row of statusRows) {
        byStatus[row.current_status_id] = row.count
      }

      return {
        total: totalRow.count,
        thisMonth: thisMonthRow.count,
        byStatus,
      }
    } catch (error) {
      throw new ApplicationsError(
        ApplicationsErrorCode.DATABASE_ERROR,
        `Failed to get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Clears all applications.
   */
  async clearApplications(): Promise<void> {
    this.migrateFromLegacyFile()

    try {
      const db = getDb()
      db.prepare('DELETE FROM applications').run()
    } catch (error) {
      throw new ApplicationsError(
        ApplicationsErrorCode.DATABASE_ERROR,
        `Failed to clear applications: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Clears the applications cache - no-op for SQLite version.
   */
  clearCache(): void {
    // No cache in SQLite version
  }
}

// Export a singleton instance
export const applicationsService = new ApplicationsService()
