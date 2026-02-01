import { z } from 'zod'

/**
 * Application Status Schema
 *
 * Represents a configurable status that can be assigned to job applications.
 * Users can customize these statuses in settings.
 */
export const ApplicationStatusSchema = z.object({
  /** Unique identifier for this status */
  id: z.string().min(1),

  /** Display label for the status */
  label: z.string().min(1).max(50),

  /** Hex color code for the status badge */
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),

  /** Display order (lower numbers appear first) */
  order: z.number().int().min(0),
})

/**
 * Status History Entry Schema
 *
 * Records when an application's status changed.
 */
export const StatusHistoryEntrySchema = z.object({
  /** Status ID that was set */
  statusId: z.string().min(1),

  /** ISO timestamp of when the status was changed */
  changedAt: z.string().datetime(),

  /** Optional note about the status change */
  note: z.string().optional(),
})

/**
 * Job Application Schema
 *
 * Represents a tracked job application with status and history.
 */
export const JobApplicationSchema = z.object({
  /** Unique identifier for this application */
  id: z.string().min(1),

  /** Company name */
  companyName: z.string().min(1),

  /** Job title */
  jobTitle: z.string().min(1),

  /** Original job description text (optional) */
  jobDescription: z.string().optional(),

  /** URL to the job posting (optional) */
  jobUrl: z.string().url().optional().or(z.literal('')),

  /** Job location (optional) */
  location: z.string().optional(),

  /** Employment type (optional) */
  employmentType: z.string().optional(),

  /** Salary range (optional) */
  salaryRange: z.string().optional(),

  /** Current status ID */
  currentStatusId: z.string().min(1),

  /** History of status changes */
  statusHistory: z.array(StatusHistoryEntrySchema).default([]),

  /** ISO timestamp of when the application was created */
  createdAt: z.string().datetime(),

  /** ISO timestamp of when the application was last updated */
  updatedAt: z.string().datetime(),

  /** Path to the exported resume PDF (optional) */
  resumePath: z.string().optional(),

  /** Path to the exported cover letter PDF (optional) */
  coverLetterPath: z.string().optional(),

  /** Path to the folder containing exported files (optional) */
  folderPath: z.string().optional(),

  /** User notes about this application (optional) */
  notes: z.string().optional(),
})

/**
 * Applications Data Schema
 *
 * Container for all job applications with version for migrations.
 */
export const ApplicationsDataSchema = z.object({
  /** Schema version for migrations */
  version: z.number().default(1),

  /** Array of job applications */
  applications: z.array(JobApplicationSchema).default([]),
})

/**
 * Application Statistics Schema
 *
 * Statistics about job applications.
 */
export const ApplicationStatisticsSchema = z.object({
  /** Total number of applications */
  total: z.number().int().min(0),

  /** Number of applications created this month */
  thisMonth: z.number().int().min(0),

  /** Count of applications by status ID */
  byStatus: z.record(z.string(), z.number().int().min(0)),
})

/**
 * TypeScript types inferred from Zod schemas.
 */
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>
export type StatusHistoryEntry = z.infer<typeof StatusHistoryEntrySchema>
export type JobApplication = z.infer<typeof JobApplicationSchema>
export type ApplicationsData = z.infer<typeof ApplicationsDataSchema>
export type ApplicationStatistics = z.infer<typeof ApplicationStatisticsSchema>

/**
 * Default application statuses.
 * These are used when settings don't have statuses defined.
 */
export const DEFAULT_APPLICATION_STATUSES: ApplicationStatus[] = [
  { id: 'applied', label: 'Applied', color: '#3B82F6', order: 0 }, // Blue
  { id: 'interview-scheduled', label: 'Interview Scheduled', color: '#8B5CF6', order: 1 }, // Purple
  { id: 'interviewed', label: 'Interviewed', color: '#F59E0B', order: 2 }, // Amber
  { id: 'offer-received', label: 'Offer Received', color: '#10B981', order: 3 }, // Green
  { id: 'rejected', label: 'Rejected', color: '#EF4444', order: 4 }, // Red
  { id: 'withdrawn', label: 'Withdrawn', color: '#6B7280', order: 5 }, // Gray
]

/**
 * Default empty applications data.
 */
export const DEFAULT_APPLICATIONS_DATA: ApplicationsData = {
  version: 1,
  applications: [],
}

/**
 * Maximum number of applications to keep (0 = unlimited).
 */
export const MAX_APPLICATIONS = 0

/**
 * Generate a unique ID for a job application.
 */
export function generateApplicationId(): string {
  return `app_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create a new job application with default values.
 */
export function createJobApplication(
  params: Omit<
    JobApplication,
    'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'currentStatusId'
  > & {
    currentStatusId?: string
  }
): JobApplication {
  const now = new Date().toISOString()
  const statusId = params.currentStatusId || 'applied'

  return {
    ...params,
    id: generateApplicationId(),
    currentStatusId: statusId,
    statusHistory: [
      {
        statusId,
        changedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  }
}
