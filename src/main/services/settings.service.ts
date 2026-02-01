/**
 * Settings Service
 *
 * Manages application settings persistence using SQLite.
 * Provides loading, saving, validation, and migration support.
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ZodError } from 'zod'
import {
  AppSettingsSchema,
  PartialAppSettingsSchema,
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type PartialAppSettings,
} from '../../schemas/settings.schema'
import {
  validateSettings as validateSettingsData,
  SettingsValidationErrorCode,
} from '../../shared/settings-validation'
import { getDb } from './database.service'

/**
 * Current settings schema version.
 * Increment this when making breaking changes to the schema.
 */
const CURRENT_SCHEMA_VERSION = 1

/**
 * Legacy settings file name (for migration).
 */
const LEGACY_SETTINGS_FILE_NAME = 'settings.json'

/**
 * Default export folder name (relative to user's Documents folder).
 */
const DEFAULT_EXPORT_FOLDER_NAME = 'cv-rebu-exports'

/**
 * Error codes for settings operations.
 */
export enum SettingsErrorCode {
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MIGRATION_ERROR = 'MIGRATION_ERROR',
  FOLDER_VALIDATION_ERROR = 'FOLDER_VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

/**
 * Custom error class for settings operations.
 */
export class SettingsError extends Error {
  constructor(
    public readonly code: SettingsErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'SettingsError'
  }
}

/**
 * Result of settings validation.
 */
export type SettingsValidationResult =
  | {
      isValid: true
      errors?: undefined
      warnings?: string[]
      fieldErrors?: Record<string, string>
    }
  | {
      isValid: false
      errors: string[]
      warnings?: string[]
      fieldErrors?: Record<string, string>
    }

/**
 * Detailed folder validation result.
 */
export interface FolderValidationResult {
  isValid: boolean
  error?: {
    code: SettingsValidationErrorCode
    message: string
  }
}

/**
 * Settings Service class for managing application settings.
 */
export class SettingsService {
  private cachedSettings: AppSettings | null = null
  private defaultExportFolderPath: string
  private legacySettingsPath: string
  private migrationChecked = false

  constructor() {
    // Set up legacy file path for migration
    const userDataPath = this.getUserDataPath()
    this.legacySettingsPath = path.join(userDataPath, LEGACY_SETTINGS_FILE_NAME)

    // Set up default export folder path
    const documentsPath = this.getDocumentsPath()
    this.defaultExportFolderPath = path.join(documentsPath, DEFAULT_EXPORT_FOLDER_NAME)
  }

  /**
   * Gets the user data path for storing settings.
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
   * Gets the user's Documents folder path.
   */
  private getDocumentsPath(): string {
    try {
      return app.getPath('documents')
    } catch {
      const homeDir = os.homedir()
      return path.join(homeDir, 'Documents')
    }
  }

  /**
   * Gets the default export folder path.
   */
  getDefaultExportFolderPath(): string {
    return this.defaultExportFolderPath
  }

  /**
   * Migrate from legacy JSON file to SQLite (one-time).
   */
  private migrateFromLegacyFile(): void {
    if (this.migrationChecked) return
    this.migrationChecked = true

    try {
      if (!fs.existsSync(this.legacySettingsPath)) return

      // Read legacy file
      const content = fs.readFileSync(this.legacySettingsPath, 'utf-8')
      const rawSettings = JSON.parse(content)
      const migratedSettings = this.migrateSettings(rawSettings)
      const validatedSettings = this.validateAndMerge(migratedSettings)

      // Save to database
      const db = getDb()
      const existing = db.prepare('SELECT id FROM settings WHERE id = 1').get()

      if (!existing) {
        db.prepare('INSERT INTO settings (id, settings_json) VALUES (1, ?)').run(
          JSON.stringify(validatedSettings)
        )
      }

      // Rename legacy file to .bak
      fs.renameSync(this.legacySettingsPath, this.legacySettingsPath + '.bak')
      console.log('Migrated settings from JSON file to SQLite')
    } catch (error) {
      console.error('Failed to migrate legacy settings file:', error)
      // Continue without migration - will use defaults
    }
  }

  /**
   * Loads settings from the database.
   * Returns default settings if none exist.
   */
  async loadSettings(): Promise<AppSettings> {
    // Return cached settings if available
    if (this.cachedSettings) {
      return { ...this.cachedSettings }
    }

    // Check for legacy file migration
    this.migrateFromLegacyFile()

    try {
      const db = getDb()
      const row = db.prepare('SELECT settings_json FROM settings WHERE id = 1').get() as
        | { settings_json: string }
        | undefined

      if (!row) {
        // No settings in database, create defaults
        const defaultSettings = this.createDefaultSettings()
        db.prepare('INSERT INTO settings (id, settings_json) VALUES (1, ?)').run(
          JSON.stringify(defaultSettings)
        )
        this.cachedSettings = defaultSettings
        return { ...defaultSettings }
      }

      // Parse and validate settings
      const rawSettings = JSON.parse(row.settings_json)
      const migratedSettings = this.migrateSettings(rawSettings)
      const validatedSettings = this.validateAndMerge(migratedSettings)

      this.cachedSettings = validatedSettings
      return { ...validatedSettings }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new SettingsError(
          SettingsErrorCode.DATABASE_ERROR,
          'Settings in database contains invalid JSON',
          { originalError: error.message }
        )
      }
      if (error instanceof SettingsError) {
        throw error
      }
      throw new SettingsError(
        SettingsErrorCode.DATABASE_ERROR,
        `Failed to load settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Saves settings to the database.
   *
   * Performs full validation before saving and rejects invalid settings.
   */
  async saveSettings(settings: PartialAppSettings): Promise<AppSettings> {
    try {
      // Load current settings first
      const currentSettings = await this.loadSettings()

      // Deep merge the new settings with current settings
      const mergedSettings = this.deepMerge(currentSettings, settings as Record<string, unknown>)

      // Perform comprehensive validation before saving
      const validationResult = this.validateSettings(mergedSettings)
      if (!validationResult.isValid) {
        throw new SettingsError(
          SettingsErrorCode.VALIDATION_ERROR,
          `Invalid settings: ${validationResult.errors.join('; ')}`,
          {
            validationErrors: validationResult.errors,
            fieldErrors: validationResult.fieldErrors,
          }
        )
      }

      // Validate the merged settings with Zod schema
      const validatedSettings = AppSettingsSchema.parse(mergedSettings)

      // Save to database
      const db = getDb()
      db.prepare('UPDATE settings SET settings_json = ? WHERE id = 1').run(
        JSON.stringify(validatedSettings)
      )

      // Update cache
      this.cachedSettings = validatedSettings
      return { ...validatedSettings }
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        throw new SettingsError(
          SettingsErrorCode.VALIDATION_ERROR,
          `Invalid settings: ${validationErrors.join('; ')}`,
          { validationErrors }
        )
      }
      if (error instanceof SettingsError) {
        throw error
      }
      throw new SettingsError(
        SettingsErrorCode.DATABASE_ERROR,
        `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Resets settings to defaults.
   */
  async resetSettings(): Promise<AppSettings> {
    const defaultSettings = this.createDefaultSettings()

    const db = getDb()
    db.prepare('UPDATE settings SET settings_json = ? WHERE id = 1').run(
      JSON.stringify(defaultSettings)
    )

    this.cachedSettings = defaultSettings
    return { ...defaultSettings }
  }

  /**
   * Validates settings without saving.
   */
  validateSettings(settings: unknown): SettingsValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const fieldErrors: Record<string, string> = {}

    try {
      // Validate against Zod schema first
      const partialResult = PartialAppSettingsSchema.safeParse(settings)
      if (!partialResult.success) {
        for (const error of partialResult.error.errors) {
          const fieldPath = error.path.join('.')
          const message = `${fieldPath}: ${error.message}`
          errors.push(message)
          fieldErrors[fieldPath] = error.message
        }
      }

      // Only proceed with additional validation if we have a valid object
      if (typeof settings === 'object' && settings !== null) {
        const settingsObj = settings as Record<string, unknown>

        // Validate output folder with detailed error reporting
        if ('outputFolderPath' in settingsObj && typeof settingsObj.outputFolderPath === 'string') {
          const folderPath = settingsObj.outputFolderPath
          if (folderPath) {
            const folderValidation = this.validateOutputFolder(folderPath)
            if (!folderValidation.isValid && folderValidation.error) {
              errors.push(`outputFolderPath: ${folderValidation.error.message}`)
              fieldErrors['outputFolderPath'] = folderValidation.error.message
            }
          }
        }

        // Use the shared validation utilities for comprehensive validation
        const dataValidation = validateSettingsData(settings as PartialAppSettings)

        // Add data validation errors
        for (const error of dataValidation.errors) {
          const message = `${error.field}: ${error.message}`
          if (!errors.includes(message)) {
            errors.push(message)
            fieldErrors[error.field] = error.message
          }
        }

        // Add data validation warnings
        for (const warning of dataValidation.warnings) {
          const message = warning.message
          if (!warnings.includes(message)) {
            warnings.push(message)
          }
        }
      }
    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    if (errors.length > 0) {
      const result: SettingsValidationResult = {
        isValid: false,
        errors,
        fieldErrors,
      }
      if (warnings.length > 0) {
        result.warnings = warnings
      }
      return result
    }

    const hasFieldErrors = Object.keys(fieldErrors).length > 0
    const result: SettingsValidationResult = {
      isValid: true,
      ...(hasFieldErrors ? { fieldErrors } : {}),
    }
    if (warnings.length > 0) {
      result.warnings = warnings
    }
    return result
  }

  /**
   * Validates that a folder path exists and is writable.
   */
  isValidOutputFolder(folderPath: string): boolean {
    return this.validateOutputFolder(folderPath).isValid
  }

  /**
   * Validates a folder path and returns detailed validation result.
   */
  validateOutputFolder(folderPath: string): FolderValidationResult {
    if (!folderPath) {
      return { isValid: true }
    }

    try {
      if (!fs.existsSync(folderPath)) {
        const parentPath = path.dirname(folderPath)

        if (!fs.existsSync(parentPath)) {
          return {
            isValid: false,
            error: {
              code: SettingsValidationErrorCode.FOLDER_NOT_EXISTS,
              message: `Folder does not exist and cannot be created. Parent directory "${parentPath}" does not exist.`,
            },
          }
        }

        try {
          fs.accessSync(parentPath, fs.constants.W_OK)
          return { isValid: true }
        } catch {
          return {
            isValid: false,
            error: {
              code: SettingsValidationErrorCode.FOLDER_NOT_WRITABLE,
              message: `Cannot create folder. Parent directory "${parentPath}" is not writable.`,
            },
          }
        }
      }

      const stats = fs.statSync(folderPath)
      if (!stats.isDirectory()) {
        return {
          isValid: false,
          error: {
            code: SettingsValidationErrorCode.FOLDER_IS_FILE,
            message: `The path "${folderPath}" is a file, not a folder. Please select a folder.`,
          },
        }
      }

      try {
        fs.accessSync(folderPath, fs.constants.W_OK)
        return { isValid: true }
      } catch {
        return {
          isValid: false,
          error: {
            code: SettingsValidationErrorCode.FOLDER_NOT_WRITABLE,
            message: `Folder "${folderPath}" is not writable. Please select a different folder or check permissions.`,
          },
        }
      }
    } catch (error) {
      return {
        isValid: false,
        error: {
          code: SettingsValidationErrorCode.FOLDER_INVALID_PATH,
          message: `Invalid folder path: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      }
    }
  }

  /**
   * Ensures the output folder exists, creating it if necessary.
   */
  async ensureOutputFolder(folderPath?: string): Promise<string> {
    const targetPath = folderPath || this.defaultExportFolderPath

    try {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true })
      }
      return targetPath
    } catch (error) {
      throw new SettingsError(
        SettingsErrorCode.FOLDER_VALIDATION_ERROR,
        `Failed to create output folder: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { folderPath: targetPath }
      )
    }
  }

  /**
   * Clears the settings cache, forcing a reload on next access.
   */
  clearCache(): void {
    this.cachedSettings = null
  }

  /**
   * Gets the effective output folder path, using default if not set.
   */
  async getEffectiveOutputFolder(): Promise<string> {
    const settings = await this.loadSettings()
    return settings.outputFolderPath || this.defaultExportFolderPath
  }

  /**
   * Creates default settings with computed default paths.
   */
  private createDefaultSettings(): AppSettings {
    return {
      ...DEFAULT_APP_SETTINGS,
      outputFolderPath: '',
    }
  }

  /**
   * Validates raw settings and merges with defaults.
   */
  private validateAndMerge(rawSettings: unknown): AppSettings {
    try {
      const partialSettings = PartialAppSettingsSchema.parse(rawSettings)
      return AppSettingsSchema.parse(
        this.deepMerge(DEFAULT_APP_SETTINGS, partialSettings as Record<string, unknown>)
      )
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        throw new SettingsError(
          SettingsErrorCode.VALIDATION_ERROR,
          `Invalid settings: ${validationErrors.join('; ')}`,
          { validationErrors }
        )
      }
      throw error
    }
  }

  /**
   * Migrates settings from older schema versions.
   */
  private migrateSettings(rawSettings: unknown): unknown {
    if (typeof rawSettings !== 'object' || rawSettings === null) {
      return rawSettings
    }

    const settings = rawSettings as Record<string, unknown>
    const version = typeof settings.version === 'number' ? settings.version : 0

    if (version >= CURRENT_SCHEMA_VERSION) {
      return settings
    }

    settings.version = CURRENT_SCHEMA_VERSION
    return settings
  }

  /**
   * Deep merges two objects, with source values overriding target values.
   */
  private deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const result = { ...target }

    for (const key of Object.keys(source) as Array<keyof T>) {
      const sourceValue = source[key]
      const targetValue = target[key]

      if (
        sourceValue !== undefined &&
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        result[key] = this.deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[keyof T]
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[keyof T]
      }
    }

    return result
  }
}

// Export a singleton instance
export const settingsService = new SettingsService()
