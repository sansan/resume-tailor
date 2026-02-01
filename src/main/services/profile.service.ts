/**
 * Profile Service
 *
 * Manages user profile persistence using SQLite.
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ZodError } from 'zod'
import {
  UserProfileSchema,
  ResumeSchema,
  type UserProfile,
  type Resume,
} from '../../schemas/resume.schema'
import { getDb } from './database.service'

/**
 * Legacy profile file name (for migration).
 */
const LEGACY_PROFILE_FILE_NAME = 'profile.json'

/**
 * Error codes for profile operations.
 */
export enum ProfileErrorCode {
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

/**
 * Custom error class for profile operations.
 */
export class ProfileError extends Error {
  constructor(
    public readonly code: ProfileErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ProfileError'
  }
}

/**
 * Service for managing user profile persistence.
 */
export class ProfileService {
  private legacyProfilePath: string
  private cachedProfile: UserProfile | null = null
  private migrationChecked = false

  constructor() {
    const userDataPath = this.getUserDataPath()
    this.legacyProfilePath = path.join(userDataPath, LEGACY_PROFILE_FILE_NAME)
  }

  /**
   * Gets the user data path for storing profile.
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
      if (!fs.existsSync(this.legacyProfilePath)) return

      const content = fs.readFileSync(this.legacyProfilePath, 'utf-8')
      const rawProfile = JSON.parse(content)
      const profile = UserProfileSchema.parse(rawProfile)

      // Save to database
      const db = getDb()
      const existing = db.prepare('SELECT id FROM profile WHERE id = 1').get()

      if (!existing) {
        db.prepare(
          'INSERT INTO profile (id, resume_json, imported_at, source_file, last_modified_at) VALUES (1, ?, ?, ?, ?)'
        ).run(
          JSON.stringify(profile.resume),
          profile.importedAt ?? null,
          profile.sourceFile ?? null,
          profile.lastModifiedAt ?? null
        )
      }

      // Rename legacy file to .bak
      fs.renameSync(this.legacyProfilePath, this.legacyProfilePath + '.bak')
      console.log('Migrated profile from JSON file to SQLite')
    } catch (error) {
      console.error('Failed to migrate legacy profile file:', error)
    }
  }

  /**
   * Checks if a profile exists.
   */
  hasProfile(): boolean {
    this.migrateFromLegacyFile()

    try {
      const db = getDb()
      const row = db.prepare('SELECT 1 FROM profile WHERE id = 1').get()
      return Boolean(row)
    } catch {
      return false
    }
  }

  /**
   * Loads the user profile from database.
   * Returns null if no profile exists.
   */
  async loadProfile(): Promise<UserProfile | null> {
    if (this.cachedProfile) {
      return { ...this.cachedProfile }
    }

    this.migrateFromLegacyFile()

    try {
      const db = getDb()
      const row = db
        .prepare(
          'SELECT resume_json, imported_at, source_file, last_modified_at FROM profile WHERE id = 1'
        )
        .get() as
        | {
            resume_json: string
            imported_at: string | null
            source_file: string | null
            last_modified_at: string | null
          }
        | undefined

      if (!row) {
        return null
      }

      const resume = ResumeSchema.parse(JSON.parse(row.resume_json))
      const profile: UserProfile = {
        resume,
        importedAt: row.imported_at ?? undefined,
        sourceFile: row.source_file ?? undefined,
        lastModifiedAt: row.last_modified_at ?? undefined,
      }

      this.cachedProfile = profile
      return { ...profile }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ProfileError(
          ProfileErrorCode.DATABASE_ERROR,
          'Profile in database contains invalid JSON',
          { originalError: error.message }
        )
      }
      if (error instanceof ZodError) {
        throw new ProfileError(
          ProfileErrorCode.VALIDATION_ERROR,
          'Profile in database contains invalid data',
          { validationErrors: error.errors }
        )
      }
      throw new ProfileError(
        ProfileErrorCode.DATABASE_ERROR,
        `Failed to load profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Saves the user profile to database.
   */
  async saveProfile(resume: Resume, sourceFile?: string): Promise<UserProfile> {
    this.migrateFromLegacyFile()

    try {
      // Validate resume data
      const validatedResume = ResumeSchema.parse(resume)

      const now = new Date().toISOString()
      const importedAt = this.cachedProfile?.importedAt ?? now
      const finalSourceFile = sourceFile ?? this.cachedProfile?.sourceFile

      const db = getDb()
      const existing = db.prepare('SELECT id FROM profile WHERE id = 1').get()

      if (existing) {
        db.prepare(
          'UPDATE profile SET resume_json = ?, imported_at = ?, source_file = ?, last_modified_at = ? WHERE id = 1'
        ).run(JSON.stringify(validatedResume), importedAt, finalSourceFile ?? null, now)
      } else {
        db.prepare(
          'INSERT INTO profile (id, resume_json, imported_at, source_file, last_modified_at) VALUES (1, ?, ?, ?, ?)'
        ).run(JSON.stringify(validatedResume), importedAt, finalSourceFile ?? null, now)
      }

      const profile: UserProfile = {
        resume: validatedResume,
        importedAt,
        sourceFile: finalSourceFile,
        lastModifiedAt: now,
      }

      this.cachedProfile = profile
      return { ...profile }
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ProfileError(ProfileErrorCode.VALIDATION_ERROR, 'Invalid resume data', {
          validationErrors: error.errors,
        })
      }
      throw new ProfileError(
        ProfileErrorCode.DATABASE_ERROR,
        `Failed to save profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Updates the profile with partial resume data.
   */
  async updateProfile(partialResume: Partial<Resume>): Promise<UserProfile> {
    const currentProfile = await this.loadProfile()
    const currentResume = currentProfile?.resume ?? {
      personalInfo: { name: '', contacts: [] },
      workExperience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
    }

    const mergedResume: Resume = {
      ...currentResume,
      ...partialResume,
    }

    return this.saveProfile(mergedResume)
  }

  /**
   * Gets just the resume data from the profile.
   */
  async getResume(): Promise<Resume | null> {
    const profile = await this.loadProfile()
    return profile?.resume ?? null
  }

  /**
   * Clears the profile (deletes from database).
   */
  async clearProfile(): Promise<void> {
    this.migrateFromLegacyFile()

    const db = getDb()
    db.prepare('DELETE FROM profile WHERE id = 1').run()
    this.cachedProfile = null
  }

  /**
   * Clears the cache.
   */
  clearCache(): void {
    this.cachedProfile = null
  }
}

// Export singleton instance
export const profileService = new ProfileService()
