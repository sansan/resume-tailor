/**
 * Profile Service
 *
 * Manages user profile persistence using JSON file in app data directory.
 * Follows the same pattern as SettingsService.
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

/**
 * Profile file name.
 */
const PROFILE_FILE_NAME = 'profile.json'

/**
 * Error codes for profile operations.
 */
export enum ProfileErrorCode {
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
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
  private profilePath: string
  private cachedProfile: UserProfile | null = null

  constructor() {
    const userDataPath = this.getUserDataPath()
    this.profilePath = path.join(userDataPath, PROFILE_FILE_NAME)
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
   * Gets the profile file path.
   */
  getProfileFilePath(): string {
    return this.profilePath
  }

  /**
   * Checks if a profile exists.
   */
  hasProfile(): boolean {
    return fs.existsSync(this.profilePath)
  }

  /**
   * Loads the user profile from disk.
   * Returns null if no profile exists.
   */
  async loadProfile(): Promise<UserProfile | null> {
    if (this.cachedProfile) {
      return { ...this.cachedProfile }
    }

    if (!fs.existsSync(this.profilePath)) {
      return null
    }

    try {
      const content = fs.readFileSync(this.profilePath, 'utf-8')
      const rawProfile = JSON.parse(content) as unknown
      const profile = UserProfileSchema.parse(rawProfile)
      this.cachedProfile = profile
      return { ...profile }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ProfileError(
          ProfileErrorCode.FILE_READ_ERROR,
          'Profile file contains invalid JSON',
          { originalError: error.message }
        )
      }
      if (error instanceof ZodError) {
        throw new ProfileError(
          ProfileErrorCode.VALIDATION_ERROR,
          'Profile file contains invalid data',
          { validationErrors: error.errors }
        )
      }
      throw new ProfileError(
        ProfileErrorCode.FILE_READ_ERROR,
        `Failed to load profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Saves the user profile to disk.
   */
  async saveProfile(resume: Resume, sourceFile?: string): Promise<UserProfile> {
    try {
      // Validate resume data
      const validatedResume = ResumeSchema.parse(resume)

      const now = new Date().toISOString()
      const profile: UserProfile = {
        resume: validatedResume,
        importedAt: this.cachedProfile?.importedAt ?? now,
        sourceFile: sourceFile ?? this.cachedProfile?.sourceFile,
        lastModifiedAt: now,
      }

      // Ensure directory exists
      const profileDir = path.dirname(this.profilePath)
      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true })
      }

      // Write profile
      fs.writeFileSync(this.profilePath, JSON.stringify(profile, null, 2), 'utf-8')
      this.cachedProfile = profile

      return { ...profile }
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ProfileError(ProfileErrorCode.VALIDATION_ERROR, 'Invalid resume data', {
          validationErrors: error.errors,
        })
      }
      throw new ProfileError(
        ProfileErrorCode.FILE_WRITE_ERROR,
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
   * Clears the profile (deletes the file).
   */
  async clearProfile(): Promise<void> {
    if (fs.existsSync(this.profilePath)) {
      fs.unlinkSync(this.profilePath)
    }
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
