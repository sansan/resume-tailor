/**
 * Applications Service
 *
 * Manages job application tracking persistence using a JSON file stored in
 * the user's app data directory. Provides storing, retrieving, updating,
 * and deleting job applications with status tracking.
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ZodError } from 'zod'
import {
  ApplicationsDataSchema,
  JobApplicationSchema,
  DEFAULT_APPLICATIONS_DATA,
  type ApplicationsData,
  type JobApplication,
  type ApplicationStatistics,
  type StatusHistoryEntry,
} from '../../schemas/applications.schema'

/**
 * Applications file name.
 */
const APPLICATIONS_FILE_NAME = 'applications.json'

/**
 * Current applications schema version.
 */
const CURRENT_SCHEMA_VERSION = 1

/**
 * Error codes for applications operations.
 */
export enum ApplicationsErrorCode {
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  APPLICATION_NOT_FOUND = 'APPLICATION_NOT_FOUND',
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
 * Applications Service class for managing job application tracking.
 */
export class ApplicationsService {
  private applicationsPath: string
  private cachedData: ApplicationsData | null = null

  constructor() {
    const userDataPath = this.getUserDataPath()
    this.applicationsPath = path.join(userDataPath, APPLICATIONS_FILE_NAME)
  }

  /**
   * Gets the user data path for storing applications.
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
   * Gets the applications file path.
   */
  getApplicationsFilePath(): string {
    return this.applicationsPath
  }

  /**
   * Loads applications data from the JSON file.
   * Returns empty data if file doesn't exist.
   */
  async loadApplications(): Promise<ApplicationsData> {
    if (this.cachedData) {
      return { ...this.cachedData, applications: [...this.cachedData.applications] }
    }

    try {
      if (!fs.existsSync(this.applicationsPath)) {
        const defaultData = { ...DEFAULT_APPLICATIONS_DATA }
        this.cachedData = defaultData
        return { ...defaultData, applications: [] }
      }

      const content = fs.readFileSync(this.applicationsPath, 'utf-8')
      const rawData = JSON.parse(content)

      const migratedData = this.migrateData(rawData)
      const validatedData = ApplicationsDataSchema.parse(migratedData)

      this.cachedData = validatedData
      return { ...validatedData, applications: [...validatedData.applications] }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ApplicationsError(
          ApplicationsErrorCode.FILE_READ_ERROR,
          'Applications file contains invalid JSON',
          { originalError: error.message }
        )
      }
      if (error instanceof ZodError) {
        throw new ApplicationsError(
          ApplicationsErrorCode.VALIDATION_ERROR,
          `Invalid applications data: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
          { validationErrors: error.errors }
        )
      }
      if (error instanceof ApplicationsError) {
        throw error
      }
      throw new ApplicationsError(
        ApplicationsErrorCode.FILE_READ_ERROR,
        `Failed to load applications: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Retrieves all applications.
   */
  async getAllApplications(): Promise<JobApplication[]> {
    const data = await this.loadApplications()
    return data.applications
  }

  /**
   * Retrieves a specific application by ID.
   */
  async getApplication(applicationId: string): Promise<JobApplication | null> {
    const data = await this.loadApplications()
    return data.applications.find(a => a.id === applicationId) || null
  }

  /**
   * Adds a new application.
   * Applications are added to the front (most recent first).
   */
  async addApplication(application: JobApplication): Promise<void> {
    try {
      // Validate the application
      JobApplicationSchema.parse(application)

      const data = await this.loadApplications()

      // Add new application at the beginning
      data.applications.unshift(application)

      await this.saveApplications(data)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ApplicationsError(
          ApplicationsErrorCode.VALIDATION_ERROR,
          `Invalid application: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
          { validationErrors: error.errors }
        )
      }
      if (error instanceof ApplicationsError) {
        throw error
      }
      throw new ApplicationsError(
        ApplicationsErrorCode.FILE_WRITE_ERROR,
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
    try {
      const data = await this.loadApplications()

      const index = data.applications.findIndex(a => a.id === applicationId)
      if (index === -1) {
        throw new ApplicationsError(
          ApplicationsErrorCode.APPLICATION_NOT_FOUND,
          `Application with id "${applicationId}" not found`
        )
      }

      const existingApplication = data.applications[index]
      if (!existingApplication) {
        throw new ApplicationsError(
          ApplicationsErrorCode.APPLICATION_NOT_FOUND,
          `Application with id "${applicationId}" not found`
        )
      }

      const updatedApplication: JobApplication = {
        ...existingApplication,
        ...updates,
        id: applicationId, // Ensure ID cannot be changed
        updatedAt: new Date().toISOString(),
      }

      // Validate the updated application
      JobApplicationSchema.parse(updatedApplication)

      data.applications[index] = updatedApplication
      await this.saveApplications(data)

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
        ApplicationsErrorCode.FILE_WRITE_ERROR,
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
    try {
      const data = await this.loadApplications()

      const index = data.applications.findIndex(a => a.id === applicationId)
      if (index === -1) {
        throw new ApplicationsError(
          ApplicationsErrorCode.APPLICATION_NOT_FOUND,
          `Application with id "${applicationId}" not found`
        )
      }

      const existingApplication = data.applications[index]
      if (!existingApplication) {
        throw new ApplicationsError(
          ApplicationsErrorCode.APPLICATION_NOT_FOUND,
          `Application with id "${applicationId}" not found`
        )
      }

      const now = new Date().toISOString()

      // Create status history entry
      const historyEntry: StatusHistoryEntry = {
        statusId,
        changedAt: now,
        ...(note ? { note } : {}),
      }

      const updatedApplication: JobApplication = {
        ...existingApplication,
        currentStatusId: statusId,
        statusHistory: [...existingApplication.statusHistory, historyEntry],
        updatedAt: now,
      }

      data.applications[index] = updatedApplication
      await this.saveApplications(data)

      return updatedApplication
    } catch (error) {
      if (error instanceof ApplicationsError) {
        throw error
      }
      throw new ApplicationsError(
        ApplicationsErrorCode.FILE_WRITE_ERROR,
        `Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Deletes a specific application by ID.
   */
  async deleteApplication(applicationId: string): Promise<void> {
    try {
      const data = await this.loadApplications()

      const index = data.applications.findIndex(a => a.id === applicationId)
      if (index === -1) {
        throw new ApplicationsError(
          ApplicationsErrorCode.APPLICATION_NOT_FOUND,
          `Application with id "${applicationId}" not found`
        )
      }

      data.applications.splice(index, 1)
      await this.saveApplications(data)
    } catch (error) {
      if (error instanceof ApplicationsError) {
        throw error
      }
      throw new ApplicationsError(
        ApplicationsErrorCode.FILE_WRITE_ERROR,
        `Failed to delete application: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Gets statistics about applications.
   */
  async getStatistics(): Promise<ApplicationStatistics> {
    const data = await this.loadApplications()
    const applications = data.applications

    // Calculate this month's applications
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthCount = applications.filter(a => {
      const createdAt = new Date(a.createdAt)
      return createdAt >= startOfMonth
    }).length

    // Calculate by status
    const byStatus: Record<string, number> = {}
    for (const app of applications) {
      byStatus[app.currentStatusId] = (byStatus[app.currentStatusId] || 0) + 1
    }

    return {
      total: applications.length,
      thisMonth: thisMonthCount,
      byStatus,
    }
  }

  /**
   * Clears all applications.
   */
  async clearApplications(): Promise<void> {
    try {
      const emptyData: ApplicationsData = {
        ...DEFAULT_APPLICATIONS_DATA,
        applications: [],
      }
      await this.saveApplications(emptyData)
    } catch (error) {
      if (error instanceof ApplicationsError) {
        throw error
      }
      throw new ApplicationsError(
        ApplicationsErrorCode.FILE_WRITE_ERROR,
        `Failed to clear applications: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Clears the applications cache, forcing a reload on next access.
   */
  clearCache(): void {
    this.cachedData = null
  }

  /**
   * Saves applications data to the JSON file.
   */
  private async saveApplications(data: ApplicationsData): Promise<void> {
    try {
      // Ensure the directory exists
      const applicationsDir = path.dirname(this.applicationsPath)
      if (!fs.existsSync(applicationsDir)) {
        fs.mkdirSync(applicationsDir, { recursive: true })
      }

      // Write applications to file
      fs.writeFileSync(this.applicationsPath, JSON.stringify(data, null, 2), 'utf-8')

      // Update cache
      this.cachedData = data
    } catch (error) {
      throw new ApplicationsError(
        ApplicationsErrorCode.FILE_WRITE_ERROR,
        `Failed to save applications: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Migrates applications data from older schema versions.
   */
  private migrateData(rawData: unknown): unknown {
    if (typeof rawData !== 'object' || rawData === null) {
      return rawData
    }

    const data = rawData as Record<string, unknown>
    const version = typeof data.version === 'number' ? data.version : 0

    if (version >= CURRENT_SCHEMA_VERSION) {
      return data
    }

    // Future migrations would go here
    data.version = CURRENT_SCHEMA_VERSION
    return data
  }
}

// Export a singleton instance
export const applicationsService = new ApplicationsService()
