import { z } from 'zod'
import { ResumeSchema } from './resume.schema'
import { CoverLetterSchema } from './cover-letter.schema'

// RefinedResume schema: same structure as Resume, representing the AI-tailored version
// We extend the base schema with optional metadata about the refinement
export const RefinementMetadataSchema = z.object({
  // Keywords from the job posting that were addressed
  targetedKeywords: z.array(z.string()).optional(),
  // Summary of changes made during refinement
  changesSummary: z.string().optional(),
  // Confidence score (0-1) for the refinement quality
  confidenceScore: z.number().min(0).max(1).optional(),
})

export const RefinedResumeSchema = ResumeSchema.extend({
  refinementMetadata: RefinementMetadataSchema.optional(),
})

// GeneratedCoverLetter schema: matches CoverLetter with optional metadata
export const CoverLetterMetadataSchema = z.object({
  // Key points from the resume that were highlighted
  highlightedExperiences: z.array(z.string()).optional(),
  // Tone used in the letter
  tone: z.enum(['formal', 'conversational', 'enthusiastic']).optional(),
})

export const GeneratedCoverLetterSchema = CoverLetterSchema.extend({
  metadata: CoverLetterMetadataSchema.optional(),
})

// Error types for AI responses
export const AIErrorCodeSchema = z.enum([
  'VALIDATION_ERROR', // Response didn't match expected schema
  'TIMEOUT_ERROR', // Claude Code took too long to respond
  'CLI_ERROR', // Claude Code CLI failed to execute
  'PARSE_ERROR', // Failed to parse JSON from response
  'RATE_LIMIT_ERROR', // Rate limit exceeded
  'UNKNOWN_ERROR', // Unknown error occurred
])

export const AIErrorSchema = z.object({
  code: AIErrorCodeSchema,
  message: z.string(),
  details: z.unknown().optional(),
})

// AIResponse wrapper schema with success/error states using discriminated union
export const AISuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    processingTimeMs: z.number().optional(),
  })

export const AIErrorResponseSchema = z.object({
  success: z.literal(false),
  error: AIErrorSchema,
})

// Generic AI response that can contain either success or error
export const createAIResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.discriminatedUnion('success', [AISuccessResponseSchema(dataSchema), AIErrorResponseSchema])

// Pre-built response schemas for common use cases
export const RefinedResumeResponseSchema = createAIResponseSchema(RefinedResumeSchema)
export const GeneratedCoverLetterResponseSchema = createAIResponseSchema(GeneratedCoverLetterSchema)

// ExtractedJobPosting schema: structured data from a job posting
export const ExtractedJobPostingSchema = z.object({
  // Company information
  companyName: z.string().nullish(),
  companyDescription: z.string().nullish(),

  // Job information
  jobTitle: z.string().nullish(),
  location: z.string().nullish(),
  employmentType: z.string().nullish(), // Full-time, Part-time, Contract, etc.
  salaryRange: z.string().nullish(),

  // Key extracted sections
  requirements: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  qualifications: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),

  // Skills mentioned
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),

  // Additional context
  teamInfo: z.string().nullish(),
  applicationDeadline: z.string().nullish(),
})

export const ExtractedJobPostingResponseSchema = createAIResponseSchema(ExtractedJobPostingSchema)

// TypeScript types inferred from Zod schemas
export type RefinementMetadata = z.infer<typeof RefinementMetadataSchema>
export type RefinedResume = z.infer<typeof RefinedResumeSchema>
export type CoverLetterMetadata = z.infer<typeof CoverLetterMetadataSchema>
export type GeneratedCoverLetter = z.infer<typeof GeneratedCoverLetterSchema>
export type ExtractedJobPosting = z.infer<typeof ExtractedJobPostingSchema>
export type AIErrorCode = z.infer<typeof AIErrorCodeSchema>
export type AIError = z.infer<typeof AIErrorSchema>

// Generic types for AI responses
export type AISuccessResponse<T> = {
  success: true
  data: T
  processingTimeMs?: number
}

export type AIErrorResponse = {
  success: false
  error: AIError
}

export type AIResponse<T> = AISuccessResponse<T> | AIErrorResponse

// Specific response types
export type RefinedResumeResponse = AIResponse<RefinedResume>
export type GeneratedCoverLetterResponse = AIResponse<GeneratedCoverLetter>
export type ExtractedJobPostingResponse = AIResponse<ExtractedJobPosting>
