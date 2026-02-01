/**
 * Settings Service
 *
 * Manages application settings persistence using a JSON file stored in
 * the user's app data directory. Provides loading, saving, validation,
 * and migration support.
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

/**
 * Current settings schema version.
 * Increment this when making breaking changes to the schema.
 */
const CURRENT_SCHEMA_VERSION = 1

/**
 * Settings file name.
 */
const SETTINGS_FILE_NAME = 'settings.json'

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
  private settingsPath: string
  private cachedSettings: AppSettings | null = null
  private defaultExportFolderPath: string

  constructor() {
    // Determine the settings file path based on platform
    const userDataPath = this.getUserDataPath()
    this.settingsPath = path.join(userDataPath, SETTINGS_FILE_NAME)

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
      // Use Electron's app.getPath when available
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
   * Gets the user's Documents folder path.
   */
  private getDocumentsPath(): string {
    try {
      return app.getPath('documents')
    } catch {
      // Fallback for non-Electron environments
      const homeDir = os.homedir()
      switch (process.platform) {
        case 'darwin':
          return path.join(homeDir, 'Documents')
        case 'win32':
          return path.join(homeDir, 'Documents')
        default:
          return path.join(homeDir, 'Documents')
      }
    }
  }

  /**
   * Gets the default export folder path.
   */
  getDefaultExportFolderPath(): string {
    return this.defaultExportFolderPath
  }

  /**
   * Gets the settings file path.
   */
  getSettingsFilePath(): string {
    return this.settingsPath
  }

  /**
   * Loads settings from the JSON file.
   * Returns default settings if file doesn't exist.
   */
  async loadSettings(): Promise<AppSettings> {
    // Return cached settings if available
    if (this.cachedSettings) {
      return { ...this.cachedSettings }
    }

    try {
      // Check if settings file exists
      if (!fs.existsSync(this.settingsPath)) {
        const defaultSettings = this.createDefaultSettings()
        this.cachedSettings = defaultSettings
        return { ...defaultSettings }
      }

      // Read and parse settings file
      const content = fs.readFileSync(this.settingsPath, 'utf-8')
      const rawSettings = JSON.parse(content)

      // Check for schema version and migrate if needed
      const migratedSettings = this.migrateSettings(rawSettings)

      // Validate and merge with defaults
      const validatedSettings = this.validateAndMerge(migratedSettings)
      this.cachedSettings = validatedSettings
      return { ...validatedSettings }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new SettingsError(
          SettingsErrorCode.FILE_READ_ERROR,
          'Settings file contains invalid JSON',
          { originalError: error.message }
        )
      }
      if (error instanceof SettingsError) {
        throw error
      }
      throw new SettingsError(
        SettingsErrorCode.FILE_READ_ERROR,
        `Failed to load settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: String(error) }
      )
    }
  }

  /**
   * Saves settings to the JSON file.
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

      // Ensure the directory exists
      const settingsDir = path.dirname(this.settingsPath)
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true })
      }

      // Write settings to file
      fs.writeFileSync(this.settingsPath, JSON.stringify(validatedSettings, null, 2), 'utf-8')

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
        SettingsErrorCode.FILE_WRITE_ERROR,
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
    return this.saveSettings(defaultSettings)
  }

  /**
   * Validates settings without saving.
   *
   * Performs comprehensive validation including:
   * - Zod schema validation
   * - Output folder existence and writability checks
   * - File naming pattern validation
   * - PDF theme value range validation
   * - Prompt template validation
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
   *
   * @deprecated Use validateOutputFolder() for detailed error information.
   */
  isValidOutputFolder(folderPath: string): boolean {
    return this.validateOutputFolder(folderPath).isValid
  }

  /**
   * Validates a folder path and returns detailed validation result.
   *
   * Checks:
   * - Path is not empty or uses default
   * - Path exists (or parent is writable for creation)
   * - Path is a directory, not a file
   * - Path is writable
   */
  validateOutputFolder(folderPath: string): FolderValidationResult {
    // If empty, will use default which we'll create
    if (!folderPath) {
      return { isValid: true }
    }

    try {
      // Check if path exists
      if (!fs.existsSync(folderPath)) {
        // Try to check if parent exists and is writable
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

        // Check if we can write to parent
        try {
          fs.accessSync(parentPath, fs.constants.W_OK)
          // Parent is writable, folder can be created
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

      // Check if it's a directory
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

      // Check if writable
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
      outputFolderPath: '', // Empty means use default
    }
  }

  /**
   * Validates raw settings and merges with defaults.
   */
  private validateAndMerge(rawSettings: unknown): AppSettings {
    try {
      // First, try to parse as partial settings
      const partialSettings = PartialAppSettingsSchema.parse(rawSettings)

      // Deep merge with defaults
      return AppSettingsSchema.parse(
        this.deepMerge(DEFAULT_APP_SETTINGS, partialSettings as Record<string, unknown>)
      )
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        throw new SettingsError(
          SettingsErrorCode.VALIDATION_ERROR,
          `Invalid settings in file: ${validationErrors.join('; ')}`,
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

    // No migrations needed for version 1
    if (version >= CURRENT_SCHEMA_VERSION) {
      return settings
    }

    // Future migrations would go here
    // Example:
    // if (version < 2) {
    //   settings = this.migrateV1ToV2(settings);
    // }

    // Update version
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
        // Recursively merge objects
        result[key] = this.deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[keyof T]
      } else if (sourceValue !== undefined) {
        // Direct assignment for non-object values
        result[key] = sourceValue as T[keyof T]
      }
    }

    return result
  }
}

// Export a singleton instance
export const settingsService = new SettingsService()
