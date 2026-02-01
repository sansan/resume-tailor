import { z } from 'zod'

/**
 * Export History Entry Schema
 *
 * Represents a single export event with paths to generated PDFs.
 */
export const HistoryEntrySchema = z.object({
  /** Unique identifier for this history entry */
  id: z.string().min(1),

  /** Company name from the job application */
  companyName: z.string().min(1),

  /** Job title from the job posting */
  jobTitle: z.string().min(1),

  /** ISO timestamp of when the export occurred */
  date: z.string().datetime(),

  /** Path to the exported resume PDF (optional - may not have exported resume) */
  resumePath: z.string().optional(),

  /** Path to the exported cover letter PDF (optional - may not have exported cover letter) */
  coverLetterPath: z.string().optional(),

  /** Path to the folder containing the exports */
  folderPath: z.string(),
})

/**
 * Export History Schema
 *
 * Contains version for potential migrations and array of history entries.
 */
export const ExportHistorySchema = z.object({
  /** Schema version for migrations */
  version: z.number().default(1),

  /** Array of history entries, newest first */
  entries: z.array(HistoryEntrySchema).default([]),
})

/**
 * TypeScript types inferred from Zod schemas.
 */
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>
export type ExportHistory = z.infer<typeof ExportHistorySchema>

/**
 * Default empty export history.
 */
export const DEFAULT_EXPORT_HISTORY: ExportHistory = {
  version: 1,
  entries: [],
}

/**
 * Maximum number of history entries to keep.
 */
export const MAX_HISTORY_ENTRIES = 20

/**
 * Generate a unique ID for a history entry.
 */
export function generateHistoryEntryId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
